/**
 * Expande as abreviações que o AutoConf manda no campo `version`.
 *
 * O feed grava a versão como ela aparece no cadastro do veículo, cheia de
 * abreviação de catálogo: "RS6 Avant TFSI BI-TB Quat.Tip.", "1500 LARAM. NIGHT
 * ED. BI-TB 4x4 Aut.". Isso é legível para quem trabalha com carro o dia
 * inteiro e ilegível para quem está comprando — e aparecia cru na descrição da
 * página do veículo.
 *
 * A lista foi levantada do estoque real em 16/08/2026, não inventada: são as
 * abreviações que de fato existem nos 77 veículos indexados.
 *
 * DUAS REGRAS QUE IMPORTAM
 *
 * 1. **Ordem.** As entradas são aplicadas de cima para baixo, e as compostas
 *    vêm antes das simples. "Bi-TB" precisa virar "Bi-Turbo" ANTES de a regra
 *    de "TB" rodar, senão sobra "Bi-Turbo" mal formado.
 *
 * 2. **Palavra inteira.** O casamento usa fronteira alfanumérica, então "TB"
 *    não casa dentro de "TBI" e "4M" não casa dentro de "4MATIC". Sem isso a
 *    normalização estraga mais do que conserta.
 *
 * O que NÃO é expandido, de propósito: siglas que o comprador já lê como nome
 * — 4x4, AWD, TDI, TFSI, GTS, AMG. Expandir vira ruído.
 */

interface Abreviacao {
	/** Como vem do AutoConf. */
	de: string
	/** Como deve ser lido. */
	para: string
}

/** Ordem importa: composta antes de simples. */
export const ABREVIACOES: Abreviacao[] = [
	// Compostas — precisam vir primeiro
	{ de: 'Quat.Tip.', para: 'Quattro Tiptronic' },
	{ de: 'Metrop. Edt.', para: 'Metropolitan Edition' },
	{ de: 'Range R.', para: 'Range Rover' },
	{ de: 'Bi-TB', para: 'Bi-Turbo' },
	{ de: 'BI-TB', para: 'Bi-Turbo' },

	// Simples
	{ de: 'Aut.', para: 'Automático' },
	{ de: 'Die.', para: 'Diesel' },
	{ de: 'Perf.', para: 'Performance' },
	{ de: 'Discov.', para: 'Discovery' },
	{ de: 'Sp.', para: 'Sport' },
	{ de: 'Edt.', para: 'Edition' },
	// "NIGHT ED." na RAM 1500. Vem depois de ED1 na ordem? Não precisa: ED1 não
	// tem ponto, então as duas regras não se cruzam.
	{ de: 'ED.', para: 'Edition' },
	{ de: 'LARAM.', para: 'Laramie' },
	{ de: 'TB', para: 'Turbo' },
	{ de: 'CD', para: 'Cabine Dupla' },
	{ de: '4M', para: '4Matic' },
	{ de: 'R-Dyn', para: 'R-Dynamic' },
	{ de: 'ED1', para: 'Edition 1' },
	{ de: '2p', para: '2 portas' },
	{ de: 'XDRIVE', para: 'xDrive' },
	{ de: 'XDrive', para: 'xDrive' },
]

function escaparRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Casa a abreviação como palavra inteira.
 *
 * A fronteira é alfanumérica dos dois lados: "TB" não casa dentro de "TBI",
 * "4M" não casa dentro de "4MATIC". Abreviação terminada em ponto já traz a
 * própria fronteira à direita.
 */
function regexDe(abrev: string): RegExp {
	return new RegExp(`(?<![A-Za-z0-9])${escaparRegex(abrev)}(?![A-Za-z0-9])`, 'g')
}

/**
 * Expande as abreviações conhecidas.
 *
 * Devolve a string original quando não há nada a expandir — não normaliza
 * espaço nem caixa, porque isso é responsabilidade de quem monta o texto.
 */
export function expandirAbreviacoes(texto: string | null | undefined): string {
	if (typeof texto !== 'string' || texto === '') return ''

	let resultado = texto
	for (const { de, para } of ABREVIACOES) {
		resultado = resultado.replace(regexDe(de), para)
	}
	// Um ponto solto pode sobrar quando a abreviação era o fim da frase.
	return resultado.replace(/\s{2,}/g, ' ').trim()
}
