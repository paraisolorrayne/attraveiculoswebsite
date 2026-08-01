/**
 * Ponte entre o TRÁFEGO do site (`visitor_sessions`) e a RECEITA do CRM (`crm_cards`).
 *
 * O site já manda o identificador da sessão para o CRM em dois lugares:
 *   - `lead_id` no payload do lead de formulário (`src/lib/fykos.ts` → `visitor_sessions.id`);
 *   - `[ref: <session_id>]` no texto da mensagem do WhatsApp (`src/lib/whatsapp-ref.ts`).
 * O que NÃO existe hoje é o caminho de volta: o receptor `/api/webhook/fykos-crm` nunca recebe
 * nenhum dos dois de volta. Qualquer campo desconhecido que o emissor mandar cai no JSONB
 * `dados` do card — por isso este arquivo PROCURA o identificador lá, em vez de assumir que ele
 * não existe. No dia em que o emissor passar a devolvê-lo, a ligação passa a funcionar sozinha.
 *
 * Enquanto isso não acontece, a ligação possível é por TELEFONE NORMALIZADO entre o card e o
 * perfil identificado no site (`visitor_profiles.phone`, gravado só com dígitos por
 * `/api/tracking/identify`). É uma correspondência mais fraca e o painel precisa dizer isso: as
 * funções aqui devolvem sempre COMO a ligação foi feita, para a UI poder mostrar a cobertura.
 *
 * Arquivo puro: sem I/O, sem banco, sem React.
 */

import { extractWhatsAppRef } from './whatsapp-ref'

/** Etapas do contrato v2 que fecham o card. Venda fechada = `encerrado_ganho` + `valor`. */
export const ETAPA_GANHO = 'encerrado_ganho'
export const ETAPA_PERDIDO = 'encerrado_perdido'

// ──────────────────────────── Telefone ────────────────────────────

/**
 * Chave de comparação de telefone brasileiro: DDD + os 8 últimos dígitos.
 *
 * Descartar o 9º dígito é deliberado. O mesmo cliente aparece como
 * `11 98765-4321` no card e `11 8765-4321` num cadastro antigo (ou vice-versa), e comparar o
 * número inteiro perderia esses casos. O DDD fica na chave porque sem ele oito dígitos casariam
 * pessoas de cidades diferentes.
 *
 * Também derruba o `55` de país quando ele é prefixo de sobra (só quando o número tem MAIS de
 * 11 dígitos — senão `55 98765-4321`, que é DDD de Santa Maria/RS, seria mutilado).
 *
 * Devolve `null` quando não sobra número suficiente para uma comparação segura: sem DDD a
 * chance de colisão entre pessoas diferentes é alta demais para atribuir receita.
 */
export function chaveTelefone(bruto: string | null | undefined): string | null {
  const digitos = (bruto ?? '').replace(/\D/g, '')
  if (!digitos) return null

  const semPais = digitos.length > 11 && digitos.startsWith('55') ? digitos.slice(2) : digitos
  // Fixo = 10 dígitos (DDD + 8), celular = 11 (DDD + 9). Menos que isso não tem DDD.
  if (semPais.length < 10 || semPais.length > 11) return null

  return semPais.slice(0, 2) + semPais.slice(-8)
}

// ──────────────────────────── Chave forte (identificador de sessão) ────────────────────────────

/**
 * Onde um identificador de sessão do site PODERIA aparecer dentro do JSONB `dados` do card.
 * A lista é generosa de propósito: é mais barato procurar em oito nomes do que descobrir daqui
 * a três meses que o emissor mandou o campo com outro nome e ninguém viu.
 *
 * ATENÇÃO ao interpretar: encontrar a chave NÃO significa que ela é nossa. `lead_id`, por
 * exemplo, pode ser o id interno do CRM. Por isso a rota conta separadamente quantos cards
 * TRAZEM cada campo e quantos de fato CASARAM com uma sessão real.
 */
export const CAMPOS_REF_SESSAO = [
  'lead_id',
  'session_id',
  'sessionId',
  'attra_session_id',
  'site_session_id',
  'visitor_session_id',
  'ref',
  'ref_sessao',
] as const

/** Formato do `session_id` gerado no browser (`${timestamp}-${base36}`) ou de um UUID. */
const REF_PLAUSIVEL = /^[\w-]{6,80}$/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `visitor_sessions.id` é UUID e `session_id` não é — a coluna a comparar depende do formato. */
export function pareceUuid(valor: string): boolean {
  return UUID.test(valor)
}

export interface RefSessao {
  /** O identificador encontrado. */
  valor: string
  /** De onde veio — aparece no diagnóstico de cobertura da UI. */
  campo: string
}

/**
 * Procura um identificador de sessão nos extras do card, em duas passadas:
 *   1. os campos nomeados de `CAMPOS_REF_SESSAO`;
 *   2. o marcador `[ref: ...]` dentro de QUALQUER texto dos extras — é assim que o id viaja
 *      quando o cliente clica no WhatsApp, embutido na mensagem que ele mesmo envia.
 * Só olha o primeiro nível e o nível imediatamente abaixo: extras aninhados fundo são ruído.
 */
export function extrairRefSessao(dados: Record<string, unknown> | null | undefined): RefSessao | null {
  if (!dados || typeof dados !== 'object') return null

  for (const campo of CAMPOS_REF_SESSAO) {
    const valor = dados[campo]
    if (typeof valor === 'string' || typeof valor === 'number') {
      const texto = String(valor).trim()
      if (texto && REF_PLAUSIVEL.test(texto)) return { valor: texto, campo }
    }
  }

  for (const [chave, valor] of Object.entries(dados)) {
    const ref = refEmTexto(valor)
    if (ref) return { valor: ref, campo: `${chave} [ref:]` }
  }

  return null
}

/** `[ref: ...]` num texto (ou nos textos de um objeto/array de um nível). */
function refEmTexto(valor: unknown): string | null {
  if (typeof valor === 'string') return extractWhatsAppRef(valor)
  if (valor && typeof valor === 'object') {
    for (const filho of Object.values(valor as Record<string, unknown>)) {
      if (typeof filho === 'string') {
        const ref = extractWhatsAppRef(filho)
        if (ref) return ref
      }
    }
  }
  return null
}

// ──────────────────────────── Escolha da sessão ────────────────────────────

/**
 * Quanto tempo antes do card uma sessão ainda pode ser considerada a origem do lead.
 * 90 dias é o horizonte usual de decisão de compra de carro; atribuir uma venda de hoje a um
 * clique de um ano atrás seria inventar história.
 */
export const JANELA_ATRIBUICAO_DIAS = 90

/**
 * Folga DEPOIS do card: o card nasce quando o CRM registra o lead, que pode ser antes de o
 * cliente terminar a navegação (ou com o relógio do emissor adiantado).
 */
export const TOLERANCIA_APOS_CARD_HORAS = 24

export interface SessaoCandidata {
  id: string
  started_at: Date | string
}

function ms(valor: Date | string): number {
  return valor instanceof Date ? valor.getTime() : new Date(valor).getTime()
}

/**
 * Último clique dentro da janela: entre as sessões da mesma pessoa, a origem do lead é a
 * ÚLTIMA sessão iniciada antes de o card existir. Devolve `null` quando nenhuma sessão cai na
 * janela — nesse caso o card foi reconhecido, mas não tem origem que se possa sustentar, e a
 * rota o contabiliza num balde próprio em vez de empurrá-lo para um canal qualquer.
 */
export function escolherSessaoDoCard<T extends SessaoCandidata>(
  sessoes: T[],
  criadoEm: Date | string,
): T | null {
  const referencia = ms(criadoEm)
  if (!Number.isFinite(referencia)) return null

  const teto = referencia + TOLERANCIA_APOS_CARD_HORAS * 60 * 60 * 1000
  const piso = referencia - JANELA_ATRIBUICAO_DIAS * 24 * 60 * 60 * 1000

  let melhor: T | null = null
  let melhorTs = -Infinity
  for (const sessao of sessoes) {
    const ts = ms(sessao.started_at)
    if (!Number.isFinite(ts) || ts > teto || ts < piso) continue
    if (ts > melhorTs) {
      melhor = sessao
      melhorTs = ts
    }
  }
  return melhor
}

// ──────────────────────────── Classificação da ligação card ↔ sessão ────────────────────────────

/** Qualquer coleção que saiba responder "este card está aqui?" — um `Set` ou um `Map`. */
export interface ConjuntoDeCards {
  has(cardId: string): boolean
}

/**
 * Quais perfis identificados precisam ter as sessões buscadas para o fallback por telefone.
 *
 * A regra é uma só e é exatamente onde já se errou: o card só dispensa o telefone quando o
 * identificador dele RESOLVEU numa sessão. Card que trouxe candidato e não casou continua
 * precisando do telefone — descartá-lo aqui faz as sessões dele nunca serem consultadas, e aí o
 * painel afirma "sem visita na janela" sobre algo que ninguém olhou. Como `lead_id` é o primeiro
 * campo procurado, um emissor que mande o id interno dele nesse campo apagaria a ligação por
 * telefone da base inteira, em silêncio.
 */
export function perfisParaFallbackPorTelefone(entrada: {
  /** Chave de telefone de cada card que tem uma (`chaveTelefone` já aplicada). */
  chavesTelefonePorCard: ReadonlyMap<string, string>
  /** Cards cuja chave forte resolveu numa sessão real — não os que só trazem candidato. */
  cardsComChaveForteResolvida: ConjuntoDeCards
  perfisPorTelefone: ReadonlyMap<string, string[]>
}): Set<string> {
  const alvo = new Set<string>()
  for (const [cardId, chave] of entrada.chavesTelefonePorCard) {
    if (entrada.cardsComChaveForteResolvida.has(cardId)) continue
    for (const id of entrada.perfisPorTelefone.get(chave) ?? []) alvo.add(id)
  }
  return alvo
}

/** Como o card foi ligado a uma sessão. */
export type MetodoLigacao = 'chave_forte' | 'telefone'

/** Por que o card NÃO foi ligado a nenhuma sessão. */
export type MotivoSemLigacao = 'sem_telefone' | 'telefone_sem_perfil' | 'telefone_sem_sessao'

export interface EntradaLigacao<T extends SessaoCandidata> {
  /**
   * A sessão que o identificador do card resolveu DE VERDADE — não o identificador em si.
   *
   * `null` tanto quando o card não trazia identificador nenhum quanto quando trazia um que não
   * existe em `visitor_sessions` (o id interno do CRM chegando em `lead_id`, por exemplo). Os dois
   * casos são o mesmo para quem decide: não há ligação, então o telefone ainda vale como caminho.
   * Confundir "tem candidato" com "casou" apagaria a ligação por telefone de toda a base no dia em
   * que o emissor resolvesse mandar o id dele nesse campo.
   */
  sessaoChaveForte: T | null
  /** O card traz um telefone comparável (`chaveTelefone` devolveu chave). */
  temTelefone: boolean
  /** Esse telefone existe em pelo menos um perfil identificado do site. */
  telefoneTemPerfil: boolean
  /** Sessões dos perfis desse telefone, antes do filtro de janela. */
  sessoesDoTelefone: T[]
  criadoEm: Date | string
}

export interface ResultadoLigacao<T> {
  sessao: T | null
  /** Preenchido exatamente quando `sessao` existe. */
  metodo: MetodoLigacao | null
  /** Preenchido exatamente quando `sessao` é `null`. */
  motivo: MotivoSemLigacao | null
}

/**
 * Decide, para UM card, se existe sessão de origem e — quando não existe — por quê.
 *
 * O valor desta função é ser a única dona da classificação: cada card sai com exatamente um
 * `metodo` OU exatamente um `motivo`, nunca os dois e nunca nenhum. É isso que faz os contadores
 * de cobertura do painel serem uma partição de verdade (excludentes e somando o total) em vez de
 * baldes que se sobrepõem e não fecham com o número de leads.
 */
export function ligarCardASessao<T extends SessaoCandidata>(
  entrada: EntradaLigacao<T>,
): ResultadoLigacao<T> {
  if (entrada.sessaoChaveForte) {
    return { sessao: entrada.sessaoChaveForte, metodo: 'chave_forte', motivo: null }
  }
  if (!entrada.temTelefone) return { sessao: null, metodo: null, motivo: 'sem_telefone' }
  if (!entrada.telefoneTemPerfil) return { sessao: null, metodo: null, motivo: 'telefone_sem_perfil' }

  const sessao = escolherSessaoDoCard(entrada.sessoesDoTelefone, entrada.criadoEm)
  if (sessao) return { sessao, metodo: 'telefone', motivo: null }
  return { sessao: null, metodo: null, motivo: 'telefone_sem_sessao' }
}

// ──────────────────────────── Vocabulário de origem do CRM ────────────────────────────

export const ORIGEM_CRM_AUSENTE = '(sem origem)'

/**
 * A coluna `origem` do CRM usa um vocabulário PRÓPRIO, que não é o `utm_source` do site e não
 * tem tradução automática para os canais de `traffic-channel.ts`. Em vez de mapear na marra
 * (`patrocinado` → social pago seria chute: pode ser Google, Meta ou portal), o painel mostra o
 * vocabulário como ele é, com a leitura assumida escrita ao lado.
 */
export const ORIGENS_CRM: Record<string, { rotulo: string; leitura: string }> = {
  patrocinado: {
    rotulo: 'Patrocinado',
    leitura: 'Mídia paga. Não diz qual plataforma nem qual campanha — não dá para separar Google de Meta.',
  },
  site: {
    rotulo: 'Site',
    leitura: 'Lead nascido de formulário do site. Não diz por qual canal a pessoa chegou ao site.',
  },
  organico: {
    rotulo: 'Orgânico',
    leitura: 'O CRM declarou que não veio de mídia paga. Não diz se foi busca, indicação ou loja.',
  },
  [ORIGEM_CRM_AUSENTE]: {
    // Sem número fixo no texto: quantos leads chegam assim é justamente a coluna "Leads" da linha,
    // que muda a cada período. Afirmar "metade da base" seria número que a tela não sustenta.
    rotulo: 'Sem origem',
    leitura: 'O CRM não informou a origem destes leads. Não significa que não tenham vindo de mídia.',
  },
}

export function origemCrmInfo(origem: string): { rotulo: string; leitura: string } {
  return (
    ORIGENS_CRM[origem] ?? {
      rotulo: origem,
      leitura: 'Valor novo, ainda sem leitura definida com o time comercial.',
    }
  )
}

// ──────────────────────────── Agregação ────────────────────────────

export interface CardParaAtribuir {
  etapa: string
  valor: number | null
}

export interface AgregadoReceita {
  cards: number
  ganhos: number
  perdidos: number
  abertos: number
  /** Soma de `valor` dos cards ganhos. Só cards ganhos entram — proposta não é receita. */
  receita: number
  /** Ganhos sem `valor` preenchido: a receita da linha está subestimada nessa medida. */
  ganhos_sem_valor: number
}

export function novoAgregado(): AgregadoReceita {
  return { cards: 0, ganhos: 0, perdidos: 0, abertos: 0, receita: 0, ganhos_sem_valor: 0 }
}

export function somarCard(alvo: AgregadoReceita, card: CardParaAtribuir): void {
  alvo.cards += 1
  if (card.etapa === ETAPA_GANHO) {
    alvo.ganhos += 1
    const valor = Number(card.valor)
    if (Number.isFinite(valor) && valor > 0) alvo.receita += valor
    else alvo.ganhos_sem_valor += 1
  } else if (card.etapa === ETAPA_PERDIDO) {
    alvo.perdidos += 1
  } else {
    alvo.abertos += 1
  }
}
