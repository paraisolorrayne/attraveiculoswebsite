// Constantes centralizadas do site Attra Veículos

// Número de WhatsApp oficial da Attra
export const WHATSAPP_NUMBER = '5534999444747'

// Número de telefone comercial
export const PHONE_NUMBER = '+553430143232'
export const PHONE_DISPLAY = '(34) 3014-3232'

// Telefone secundário (não WhatsApp)
export const PHONE_NUMBER_2 = '+553432260202'
export const PHONE_DISPLAY_2 = '(34) 3226-0202'

// Celular
export const CELLPHONE_NUMBER = '+5534999444747'
export const CELLPHONE_DISPLAY = '(34) 99944-4747'

// Endereço — confirmado pela Attra em 02/08/2026 como fonte de verdade (é o
// que o rodapé do site publica). O JSON-LD declarava antes "Av. Rondon
// Pacheco, 4600 - Tibery" e um SEGUNDO endereço na Av. João Naves de Ávila com
// o MESMO CEP — dois logradouros de bairros diferentes não compartilham CEP,
// ou seja, havia endereço errado no ar.
export const ADDRESS = {
  street: 'Av. Rondon Pacheco, 1670',
  neighborhood: 'Vigilato Pereira',
  city: 'Uberlândia',
  state: 'MG',
  postalCode: '38408-343',
  country: 'Brasil',
}

/**
 * Coordenadas da loja, tiradas da ficha do Google Meu Negócio da Attra
 * (kgmid /g/11smhqv2fh) em 04/08/2026.
 *
 * Conferidas de forma independente antes de publicar: o Plus Code que o Google
 * exibe para a ficha é `3PCF+69`, e reencodificar estas coordenadas em Open
 * Location Code devolve exatamente `3PCF+69`. Pino errado no mapa manda o
 * cliente para o lugar errado, então a coordenada só entra conferida.
 */
export const GEO = {
  latitude: -18.9293967,
  longitude: -48.2765108,
} as const

/**
 * Ficha no Google Maps pelo CID da própria ficha (0x211fb2e704f9db01 em
 * decimal), lido da URL canônica do Maps. Testado: abre a Attra, com o mesmo
 * endereço, telefone e Plus Code do painel.
 */
export const MAPA_URL = 'https://maps.google.com/?cid=2386823032820325121'

/**
 * Horário de atendimento — FONTE ÚNICA (rodapé, JSON-LD e llms.txt leem daqui).
 *
 * Valores da ficha do Google Meu Negócio, conferida em 04/08/2026 e escolhida
 * como fonte de verdade pela Lorrayne. O rodapé publicava "Seg-Sex 8h às 18h /
 * Sábado 8h às 13h", que diverge do Google nos dois turnos — e no sábado a
 * diferença é grande: abre uma hora depois e fecha meia hora antes. Quem
 * confiasse no site chegaria com a loja fechada.
 */
export const OPENING_HOURS = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:30', closes: '18:00' },
  { days: ['Saturday'], opens: '09:00', closes: '12:30' },
] as const

/**
 * Rótulos de exibição do horário. O texto estava escrito à mão em QUATRO
 * lugares além do rodapé (página de contato e seção de localização da home),
 * e todos ficaram para trás quando o horário mudou. Quem for exibir horário
 * usa uma destas constantes — não escreve de novo.
 */
export const HORARIO_SEMANA = 'Seg-Sex: 8h30 às 18h'
export const HORARIO_SABADO = 'Sábado: 9h às 12h30'
export const HORARIO_RESUMIDO = `${HORARIO_SEMANA} · ${HORARIO_SABADO}`
export const HORARIO_UMA_LINHA = `${HORARIO_SEMANA} | Sáb: 9h às 12h30`

/**
 * Perfis oficiais da Attra em outras plataformas.
 *
 * Entram no `sameAs` do JSON-LD, que é como buscador e LLM confirmam que o
 * site, a ficha do Google e os anúncios em marketplace são a MESMA empresa.
 * Sem isso, cada presença é uma entidade solta e a reputação não se soma —
 * era um dos pontos da auditoria de visibilidade em LLM.
 *
 * Só entra perfil VERIFICADO, e verificado significa: nome, cidade, telefone e
 * estoque conferidos contra o site. Conferidos em 05–07/08/2026.
 *
 * FICARAM DE FORA, de propósito:
 *
 * - Mobiauto (attra-veiculos-multimarcas-1542): é a Attra — logo e telefone
 *   batem —, mas publica OUTRO endereço (Av. João Pinheiro, 2564, CEP
 *   38400-714) e está com zero veículo. Ligar a entidade a um perfil que
 *   contradiz o endereço piora exatamente o sinal que o sameAs existe para
 *   reforçar. Entra quando o cadastro for corrigido.
 *
 * - Wanderboat e agregadores do gênero: raspam dados do Google e a Attra não
 *   os controla. São derivados da ficha que já linkamos direto, então não
 *   somam autoridade — e não há como corrigir um erro publicado lá.
 */
export const PERFIS_OFICIAIS = [
  'https://instagram.com/attra.veiculos',
  'https://facebook.com/attraveiculos',
  'https://youtube.com/@attraveiculos',
  'https://www.olx.com.br/perfil/attra-veiculos-d0a2ec98',
  'https://www.webmotors.com.br/carros/mg/loja.attra-veiculos-3840973',
] as const

// Email
export const EMAIL = 'faleconosco@attraveiculos.com.br'

// URLs
export const SITE_URL = 'https://attraveiculos.com.br'

// Seção Editorial (Blog/Insights) - Configurável para testes A/B
export const EDITORIAL_SECTION = {
  menuLabel: 'Insights',           // Label exibido no menu de navegação
  alternatives: ['Garage', 'Lab', 'Editorial', 'Universe'], // Alternativas para testes futuros
  route: '/blog',                  // Rota mantida para SEO
  seoTitle: 'Blog Attra',          // Título otimizado para SEO
  brandName: 'Attra Insights',     // Nome da marca editorial
} as const

/**
 * Safra âncora nov–dez/2025 — eixo "Comprar bem" (procedência, curadoria,
 * decisão patrimonial). Promovida a conteúdo âncora pela spec do canal
 * editorial (docs/superpowers/specs/2026-07-24-attra-editorial-design.md,
 * §Triagem "Promover"). Recebe destaque na /blog e prioridade no linker.
 */
export const ANCHOR_POST_SLUGS: string[] = [
  'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva-para-seu-supercarro-do-que-o-uso-consciente',
  'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-garantia',
  'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro',
  'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio',
  'o-risco-oculto-em-supercarros-como-garantir-a-procedencia-e-proteger-seu-investimento',
  'superesportivos-o-que-nao-te-contam-sobre-a-compra-e-como-a-attra-garante-seu-patrimonio',
  'o-risco-oculto-no-supercarro-dos-seus-sonhos-por-que-a-procedencia-e-mais-importante-que-a-marca',
  'a-ilusao-do-supercarro-perfeito-como-a-curadoria-da-attra-protege-seu-patrimonio',
  'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca-na-compra-do-seu-supercarro',
  'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros-acima-de-r-500-mil',
  'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege-seu-investimento',
]

// Páginas SEO que devem usar WhatsApp direto (não chat widget)
const SEO_PAGE_PREFIXES = [
  '/comprar/modelo/',
  '/preco/',
  '/comprar/condicao/',
  '/comprar/faixa-preco/',
  '/comprar/perfil/',
  '/guia/',
  '/importacao/',
  '/importacao-de-veiculos-de-luxo',
  '/por-que-comprar-na-attra',
  '/garantia-e-procedencia',
  '/como-funciona-entrega-brasil',
]

export const isSeoPage = (path: string): boolean =>
  SEO_PAGE_PREFIXES.some(prefix => path.startsWith(prefix))

// Função helper para gerar link do WhatsApp
export function getWhatsAppUrl(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${WHATSAPP_NUMBER}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}


/**
 * Ano de fundação da Attra. Confirmado pela Lorrayne em 28/08/2026 — antes o
 * site alternava entre 2008, 2009 e 2010, e entre "15+", "16+", "17" e "18+"
 * anos de mercado na mesma navegação.
 */
export const ANO_FUNDACAO = 2008

/**
 * Anos de mercado, contados sempre a partir do ano corrente: em 2026, 18.
 *
 * Existe para o número nunca mais ser digitado à mão. A regra é a que a
 * Lorrayne definiu — ano atual menos 2008 —, sem considerar o mês: a marca
 * conta o ano cheio, e não a data exata do aniversário.
 *
 * `hoje` é injetável só para o teste poder fixar a data; em produção ninguém
 * passa argumento.
 */
export function anosDeMercado(hoje: Date = new Date()): number {
  return hoje.getFullYear() - ANO_FUNDACAO
}
