/**
 * Onde cada foto do dossiê aparece — o mapa que faltava.
 *
 * Até aqui `Dossie.fotos` era uma lista achatada na ordem em que o estoque
 * devolveu, e o significado de cada posição vivia espalhado por `documento.ts`
 * (`fotos[1]` era o herói da visão geral, `slice(3,6)` era a tira dos
 * diferenciais). O operador não escolhia nada: se a foto boa do carro fosse a
 * décima da API, ela caía na galeria e a capa ficava com a primeira, fosse ela
 * qual fosse. A dica do formulário chegava a explicar o mapeamento em prosa —
 * sinal de que a informação existia e a tela não.
 *
 * Aqui o mapa vira dado. A posição continua a mesma que `documento.ts` lê (não
 * mexi no documento), mas agora tem nome, rótulo e página, e a tela consegue
 * mostrar slot por slot.
 */
import { FOTOS_FIXAS, FOTOS_POR_PAGINA_GALERIA, type Dossie } from './tipos'

export interface SlotDeFoto {
	/**
	 * Posição em `Dossie.fotos`, ou `'final'` para a contracapa — que não é
	 * posição nenhuma, ver `CONTRACAPA` abaixo.
	 */
	indice: number | 'final'
	rotulo: string
	/** Onde aparece, para o operador se situar sem abrir a prévia. */
	pagina: string
}

/** Quantas fotos a tira da página de Diferenciais consome. */
export const FOTOS_DA_TIRA = 3

/**
 * A contracapa é um slot à parte, e não mais "a última foto da lista".
 *
 * `paginaFinal` usava `fotos[fotos.length - 1]`, o que fazia a última foto da
 * galeria aparecer duas vezes no mesmo documento — uma na galeria e outra
 * fechando. Ninguém escolheu isso; foi o que sobrou de tratar a lista como
 * posição. Agora ela tem campo próprio, e o documento cai no comportamento
 * antigo só enquanto o campo estiver vazio.
 */
export const CONTRACAPA = 'final' as const

/**
 * Os slots do dossiê atual. A quantidade da galeria depende de
 * `paginasDeGaleria`, então a lista é calculada, não constante.
 */
export function slotsDoDossie(d: Dossie): SlotDeFoto[] {
	const slots: SlotDeFoto[] = [
		{ indice: 0, rotulo: 'Capa', pagina: 'Capa' },
		{ indice: 1, rotulo: 'Destaque', pagina: 'Visão geral' },
		{ indice: 2, rotulo: 'Retrato', pagina: 'Ficha técnica' },
	]
	for (let i = 0; i < FOTOS_DA_TIRA; i++) {
		slots.push({
			indice: FOTOS_FIXAS + i,
			rotulo: `Tira ${i + 1}`,
			pagina: 'Diferenciais',
		})
	}
	const primeiraDaGaleria = FOTOS_FIXAS + FOTOS_DA_TIRA
	for (let p = 0; p < d.paginasDeGaleria; p++) {
		for (let i = 0; i < FOTOS_POR_PAGINA_GALERIA; i++) {
			slots.push({
				indice: primeiraDaGaleria + p * FOTOS_POR_PAGINA_GALERIA + i,
				rotulo: `Galeria ${p * FOTOS_POR_PAGINA_GALERIA + i + 1}`,
				pagina: `Galeria · página ${p + 1}`,
			})
		}
	}
	slots.push({ indice: CONTRACAPA, rotulo: 'Contracapa', pagina: 'Contracapa' })
	return slots
}

/** A foto de um slot, ou '' se ainda não tem. */
export function fotoDoSlot(d: Dossie, slot: SlotDeFoto): string {
	if (slot.indice === CONTRACAPA) return d.fotoFinal
	return d.fotos[slot.indice] ?? ''
}

/**
 * Devolve um dossiê com a foto trocada naquele slot.
 *
 * Preenche os buracos com string vazia em vez de deixar o array esburacado:
 * trocar a Galeria 4 num dossiê que só tem 6 fotos precisa esticar a lista, e
 * um `undefined` no meio quebraria o `.map` do documento.
 */
export function comFotoNoSlot(d: Dossie, slot: SlotDeFoto, url: string): Dossie {
	if (slot.indice === CONTRACAPA) return { ...d, fotoFinal: url }
	const fotos = [...d.fotos]
	while (fotos.length <= slot.indice) fotos.push('')
	fotos[slot.indice] = url
	return { ...d, fotos }
}
