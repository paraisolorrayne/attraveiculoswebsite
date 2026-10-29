/**
 * Qual post do Instagram da Attra vira o próximo artigo do blog.
 *
 * Desde 28/10/2026 o blog sai do Instagram, 3 vezes por semana, e não mais
 * do review/comparativo diário inventado a partir do estoque: o Instagram tem
 * o que o texto de IA não tinha (a história do carro, o número que o
 * vendedor contou, a entrega). Um post só serve se a legenda tiver substância;
 * "Chegou! 🔥 #ferrari" não dá artigo.
 */

import type { IGPost } from './instagram-fetcher'

/** Post mais antigo que isso já foi visto por quem segue a Attra. */
export const JANELA_DIAS = 21

/** Texto mínimo da legenda, sem hashtag, menção e emoji, para render artigo. */
export const MINIMO_DE_TEXTO = 140

/** Sorteio, vaga, aviso de horário: post de serviço, não de carro. */
const NAO_E_PAUTA = /\b(sorteio|giveaway|vaga|contratando|feriado|hor[áa]rio de funcionamento|estaremos fechados|live\b)/i

/** A legenda sem hashtags, menções, emoji e linhas vazias. */
export function textoDaLegenda(legenda: string): string {
	return legenda
		.replace(/#[\p{L}\p{N}_]+/gu, ' ')
		.replace(/@[\w.]+/g, ' ')
		.replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, ' ')
		.split('\n')
		.map(l => l.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n')
}

export function rendeArtigo(post: Pick<IGPost, 'caption'>): boolean {
	const texto = textoDaLegenda(post.caption ?? '')
	return texto.length >= MINIMO_DE_TEXTO && !NAO_E_PAUTA.test(texto)
}

/**
 * O post mais recente da janela que ainda não virou artigo e rende artigo.
 * null quando não há: o blog espera o próximo post em vez de inventar pauta.
 */
export function escolherPostDoInstagram(posts: IGPost[], usados: Set<string>, agora = new Date()): IGPost | null {
	const corte = agora.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000
	return (
		[...posts]
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.find(p => new Date(p.timestamp).getTime() >= corte && !usados.has(p.id) && rendeArtigo(p)) ?? null
	)
}
