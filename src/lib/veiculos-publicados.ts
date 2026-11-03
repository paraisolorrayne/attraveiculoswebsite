/**
 * Ficha de carro vendido (handoff de SEO de 02/11/2026, Tarefa 1).
 *
 * Até aqui, carro vendido virava 404: quando sai da AutoConf, o site não sabe
 * mais nada dele. O Ahrefs contava 427 URLs com 404, quase todas `/veiculo/`, e
 * as fichas continuavam recomendadas por assistentes e linkadas por fora.
 *
 * A regra:
 * - carro que a listagem já mostrou e que saiu há até 90 dias: a ficha fica no
 *   ar (200) com o selo "Vendido", "Quero um igual" e os similares;
 * - depois disso, redirect permanente para /comprar/{marca} (ou /veiculos, se a
 *   marca não tem página);
 * - slug no formato da AutoConf (marca-modelo-ano-id) que o registro, em dia,
 *   não conhece, porque o carro saiu antes de o registro existir: o mesmo
 *   redirect;
 * - qualquer outro slug, ou registro sem dados recentes (AutoConf fora do ar):
 *   404, como antes. Um slug inventado nunca vira página, e uma falha da
 *   AutoConf nunca vira redirect permanente.
 *
 * O registro (`veiculos_publicados`) é gravado a cada leitura ampla da
 * listagem, no máximo uma vez a cada 10 minutos por processo. Sem a tabela
 * (migration 20261102 ainda não aplicada), tudo aqui falha em silêncio e a
 * ficha volta ao 404 de antes.
 */

import { db } from '@/lib/db'
import { SEO_BRANDS } from '@/lib/seo-brands'
import type { Vehicle } from '@/types'

/** Quanto tempo a ficha de um vendido fica no ar antes do redirect. */
export const DIAS_NO_AR_DEPOIS_DE_VENDIDO = 90

const INTERVALO_DE_REGISTRO_MS = 10 * 60 * 1000
let ultimoRegistro = 0

/** Fotos guardadas por carro: a capa e algumas para a galeria do vendido. */
const FOTOS_GUARDADAS = 6

/** Já passou o intervalo desde o último registro deste processo. */
export function registroPendente(agora = Date.now()): boolean {
  return agora - ultimoRegistro >= INTERVALO_DE_REGISTRO_MS
}

/**
 * Grava os carros da listagem no registro. Fire-and-forget: erro só vai para
 * o log, a listagem não espera.
 */
export async function registrarVeiculosPublicados(veiculos: Vehicle[]): Promise<void> {
  const agora = Date.now()
  if (!veiculos.length || !registroPendente(agora)) return
  ultimoRegistro = agora
  try {
    const visto = new Date(agora)
    await db.insertInto('veiculos_publicados')
      .values(veiculos.filter(v => /^\d+$/.test(String(v.id))).map(v => ({
        autoconf_id: String(v.id),
        slug: v.slug,
        marca: v.brand || null,
        dados: { ...v, photos: (v.photos ?? []).slice(0, FOTOS_GUARDADAS) },
        ultimo_visto: visto,
      })))
      .onConflict(oc => oc.column('autoconf_id').doUpdateSet(eb => ({
        slug: eb.ref('excluded.slug'),
        marca: eb.ref('excluded.marca'),
        dados: eb.ref('excluded.dados'),
        ultimo_visto: eb.ref('excluded.ultimo_visto'),
      })))
      .execute()
  } catch (error) {
    ultimoRegistro = 0
    console.error('[veiculos-publicados] registro falhou:', error)
  }
}

/** Até quanto tempo sem gravar o registro ainda vale como "em dia". */
const REGISTRO_EM_DIA_MS = 60 * 60 * 1000

/**
 * O que o registro sabe de um carro:
 * - `vendido`: estava numa listagem e não veio na última;
 * - `no_estoque`: veio na última listagem. Se a ficha não carregou, foi falha
 *   passageira da AutoConf, e a página segue o 404 de sempre;
 * - `desconhecido`: o registro está em dia (gravado na última hora) e nunca
 *   viu o carro. Ou saiu antes de o registro existir, ou o slug é inventado;
 * - `sem_registro`: tabela vazia, velha ou fora do ar. Sem saber se a AutoConf
 *   está de pé, não decide nada: 404, nunca redirect permanente.
 */
export type SituacaoNoRegistro =
  | { tipo: 'vendido'; veiculo: Vehicle; saiuEm: Date }
  | { tipo: 'no_estoque' | 'desconhecido' | 'sem_registro' }

export async function situacaoNoRegistro(autoconfId: string, agora = new Date()): Promise<SituacaoNoRegistro> {
  try {
    const ultima = await db.selectFrom('veiculos_publicados')
      .select(eb => eb.fn.max('ultimo_visto').as('quando'))
      .executeTakeFirst()
    const ultimaListagem = ultima?.quando ? new Date(ultima.quando as Date) : null
    if (!ultimaListagem) return { tipo: 'sem_registro' }

    const linha = /^\d+$/.test(autoconfId)
      ? await db.selectFrom('veiculos_publicados').select(['dados', 'ultimo_visto'])
        .where('autoconf_id', '=', autoconfId).executeTakeFirst()
      : undefined
    if (linha) {
      const saiuEm = new Date(linha.ultimo_visto)
      return saiuEm.getTime() >= ultimaListagem.getTime()
        ? { tipo: 'no_estoque' }
        : { tipo: 'vendido', veiculo: linha.dados as unknown as Vehicle, saiuEm }
    }
    return agora.getTime() - ultimaListagem.getTime() <= REGISTRO_EM_DIA_MS
      ? { tipo: 'desconhecido' }
      : { tipo: 'sem_registro' }
  } catch (error) {
    console.error('[veiculos-publicados] consulta falhou:', error)
    return { tipo: 'sem_registro' }
  }
}

/** Saiu há mais de 90 dias: hora do redirect. */
export function vendidoHaMuitoTempo(saiuEm: Date, agora = new Date()): boolean {
  return agora.getTime() - saiuEm.getTime() > DIAS_NO_AR_DEPOIS_DE_VENDIDO * 24 * 60 * 60 * 1000
}

/**
 * Como a marca aparece no começo do slug quando difere do slug de /comprar.
 * O slug da ficha vem de `marca_nome` da AutoConf ("Mercedes", "Land Rover").
 */
const APELIDOS_DE_MARCA: Record<string, string> = {
  'mercedes': 'mercedes-benz',
  'mercedes-amg': 'mercedes-benz',
  'range-rover': 'land-rover',
  'rolls': 'rolls-royce',
}

const slugificar = (texto: string) => texto
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

/**
 * Para onde vai a ficha de um vendido: /comprar/{marca} quando a marca tem
 * página, /veiculos quando não tem.
 *
 * A marca vem do próprio carro quando o registro o conhece; senão, do começo
 * do slug.
 */
export function destinoDoVendido(slug: string, marca?: string | null): string {
  const candidatos = marca ? [slugificar(marca)] : []
  const partes = slug.split('-')
  for (let n = Math.min(3, partes.length); n >= 1; n--) candidatos.push(partes.slice(0, n).join('-'))
  for (const candidato of candidatos) {
    const alvo = APELIDOS_DE_MARCA[candidato] ?? candidato
    if (SEO_BRANDS.some(b => b.slug === alvo)) return `/comprar/${alvo}`
  }
  return '/veiculos'
}

/**
 * Slug no formato que a AutoConf gera (`marca-modelo-ano-id`). Só esses ganham
 * redirect sem estar no registro: um endereço qualquer continua 404.
 */
export function slugDaAutoConf(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-(?:19|20)\d{2}-\d{4,}$/.test(slug)
}
