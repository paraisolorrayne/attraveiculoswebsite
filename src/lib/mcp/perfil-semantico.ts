/**
 * O texto que vai para o embedding.
 *
 * Hoje o índice guarda só ficha técnica — marca, ano, km, potência. Nada nele
 * diz "família", "porta-malas" ou "fim de semana", então a pergunta que abre o
 * case da Auto Trader ("SUV familiar com bastante espaço") casa mal. Este
 * módulo é o que faz o texto indexado falar a língua da pergunta.
 *
 * A TRAVA DA PROSA é a parte séria. A Attra revisou o exemplo do spec e cortou
 * "espaço real para quatro adultos" — juízo de conforto que a ficha não
 * sustenta. Aqui isso vira regra executável: prosa que afirme conforto, compare
 * com categoria ou use superlativo é DESCARTADA, não corrigida. O erro que se
 * evita não é um adjetivo infeliz numa página; é um assistente afirmando que
 * cabem quatro adultos e o cliente descobrindo no showroom.
 */

import type { Rotulos } from '@/lib/mcp/rotulos'

/**
 * Termos que reprovam a prosa.
 *
 * Comparativos, superlativos e juízos de conforto. A lista é generosa de
 * propósito: descartar prosa boa custa um pouco de qualidade de busca;
 * publicar prosa falsa custa a confiança que o canal inteiro existe para ter.
 */
export const TERMOS_PROIBIDOS = [
	'espaçoso', 'espacoso', 'confortável', 'confortavel', 'conforto',
	'espaço real', 'espaco real', 'adultos',
	'acima da média', 'acima da media', 'melhor', 'pior', 'mais rápido', 'mais rapido',
	'ideal para', 'perfeito para', 'incrível', 'incrivel', 'imperdível', 'imperdivel',
	'excelente', 'ótimo', 'otimo', 'surpreendente', 'referência', 'referencia',
]

export function prosaEhAceitavel(prosa: string): { ok: true } | { ok: false; motivo: string } {
	const alvo = prosa.toLowerCase()
	for (const termo of TERMOS_PROIBIDOS) {
		if (alvo.includes(termo)) {
			return { ok: false, motivo: `prosa contém termo proibido: "${termo}"` }
		}
	}
	return { ok: true }
}

const NOME_DO_ROTULO: Record<string, string> = {
	'urbano': 'uso urbano',
	'viagem': 'viagem',
	'fim-de-semana': 'fim de semana',
	'familia': 'família',
	'pista': 'pista',
	'colecao': 'coleção',
	'primeiro-premium': 'primeiro premium',
	'executivo': 'executivo',
	'entusiasta': 'entusiasta',
	'colecionador': 'colecionador',
	'desempenho': 'desempenho',
	'espaco': 'espaço de carga',
	'exclusividade': 'exclusividade',
	'baixa-quilometragem': 'baixa quilometragem',
	'conforto': 'conforto',
	'liquidez': 'liquidez de revenda',
}

function legivel(rotulos: readonly string[]): string {
	return rotulos.map(r => NOME_DO_ROTULO[r] ?? r).join(', ')
}

/**
 * Monta o texto final.
 *
 * `prosa` reprovada é silenciosamente descartada — a passagem sai sem ela, e a
 * sincronização segue. Índice sem prosa é pior que índice com prosa; índice
 * desatualizado é pior que os dois.
 */
export function montarPassagem(fatual: string, rotulos: Rotulos, prosa: string | null): string {
	const partes = [fatual]

	if (prosa && prosaEhAceitavel(prosa).ok) partes.push(prosa.trim())

	if (rotulos.uso.length > 0) partes.push(`Uso: ${legivel(rotulos.uso)}.`)
	if (rotulos.comprador.length > 0) partes.push(`Perfil: ${legivel(rotulos.comprador)}.`)
	if (rotulos.forca.length > 0) partes.push(`Destaques: ${legivel(rotulos.forca)}.`)

	return partes.join(' ')
}
