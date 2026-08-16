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
 *
 * Cada termo entra numa única forma (com acento, singular ou plural conforme
 * o uso comum) porque a checagem casa por PALAVRA INTEIRA sobre o texto
 * normalizado (sem acento, minúsculo) — não precisa duplicar 'ótimo'/'otimo'
 * aqui, a normalização cobre isso. O que precisa estar listado é cada
 * FLEXÃO (espaçoso/espaçosa/espaçosos/espaçosas), porque a normalização não
 * conjuga palavras.
 */
export const TERMOS_PROIBIDOS = [
	'espaçoso', 'espaçosa', 'espaçosos', 'espaçosas',
	'amplo', 'ampla', 'amplos', 'amplas', 'amplitude',
	'confortável', 'confortáveis', 'confortavelmente', 'conforto',
	'espaço real', 'adultos', 'adulto',
	'acima da média', 'abaixo da média',
	'melhor', 'melhores', 'pior', 'piores',
	'mais rápido', 'mais rápida', 'mais veloz',
	'ideal para', 'ideais para', 'perfeito para', 'perfeita para',
	'incrível', 'incríveis', 'imperdível', 'imperdíveis',
	'excelente', 'excelentes', 'ótimo', 'ótima', 'ótimos', 'ótimas',
	'surpreendente', 'surpreendentes', 'referência', 'referências',
]

/** Tira acento e caixa, para comparar termo e prosa na mesma forma. */
function normalizar(texto: string): string {
	return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Escapa caractere especial de regex — termo é dado, não literal de código. */
function escaparRegex(termo: string): string {
	return termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Casa `termo` como palavra (ou frase) inteira dentro de `textoNormalizado`.
 *
 * Deliberadamente NÃO usa `\b` do JavaScript: `\b` se apoia no conjunto
 * `[A-Za-z0-9_]`, então uma letra acentuada já conta como fronteira — "melhor"
 * "casaria" sozinho dentro de qualquer coisa colada a uma vogal acentuada. A
 * fronteira aqui é explícita: início/fim de string ou qualquer caractere que
 * não seja letra ASCII (pós-normalização, sem acento) nem dígito. Frases de
 * duas palavras ("espaço real") funcionam igual — o espaço interno do termo
 * casa literalmente com o espaço no texto.
 */
function contemPalavraInteira(textoNormalizado: string, termo: string): boolean {
	const termoNormalizado = normalizar(termo)
	const padrao = new RegExp(`(^|[^a-z0-9])${escaparRegex(termoNormalizado)}([^a-z0-9]|$)`)
	return padrao.test(textoNormalizado)
}

export function prosaEhAceitavel(prosa: string): { ok: true } | { ok: false; motivo: string } {
	const alvo = normalizar(prosa)
	for (const termo of TERMOS_PROIBIDOS) {
		if (contemPalavraInteira(alvo, termo)) {
			return { ok: false, motivo: `prosa contém termo proibido: "${termo}"` }
		}
	}
	return { ok: true }
}

export const NOME_DO_ROTULO: Record<string, string> = {
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
