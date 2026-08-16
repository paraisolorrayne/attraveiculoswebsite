import { buildVehiclePassage } from '@/lib/jina'
import { derivarRotulos, type Rotulos, type VeiculoParaRotulo } from '@/lib/mcp/rotulos'
import { montarPassagem } from '@/lib/mcp/perfil-semantico'
import { mesclar, type RotulosGravados } from '@/lib/mcp/repositorio-rotulos'
import type { VeiculoParaProsa } from '@/lib/mcp/prosa'

type Veiculo = VeiculoParaRotulo & VeiculoParaProsa & Parameters<typeof buildVehiclePassage>[0]

export interface PassagemComProsa {
	passagem: string
	/** Prosa realmente usada nesta passagem — cache, sobrescrita ou recém-gerada.
	 *  A rota usa isso para gravar, evitando regenerar a cada sincronização. */
	prosa: string | null
}

/** Compara dois conjuntos de rótulos ignorando ordem de array — comparação por
 *  ordem faria o cache "errar" toda hora sem nenhum rótulo ter de fato mudado. */
function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false
	const sa = [...a].sort()
	const sb = [...b].sort()
	return sa.every((v, i) => v === sb[i])
}

/** Rótulos derivados agora batem com os que foram gravados da última vez? */
function mesmosRotulos(a: Rotulos, b: Rotulos): boolean {
	return mesmoConjunto(a.uso, b.uso) && mesmoConjunto(a.comprador, b.comprador) && mesmoConjunto(a.forca, b.forca)
}

/**
 * O gerador de prosa entra por parâmetro para o teste poder injetar falha sem
 * tocar em rede. Falha do gerador vira passagem sem prosa, nunca exceção.
 */
export async function passagemDoVeiculo(
	v: Veiculo,
	gravado: RotulosGravados | undefined,
	anoAtual: number,
	gerador: (v: VeiculoParaProsa, r: ReturnType<typeof derivarRotulos>) => Promise<string | null>,
): Promise<PassagemComProsa> {
	const derivado = derivarRotulos(v, anoAtual)

	// Prosa cacheada foi gerada A PARTIR dos rótulos de quando foi escrita. Se
	// o carro cruzou um limiar (ex.: passou de 30.000 km) e os rótulos
	// derivados agora divergem dos gravados, o cache descreve um carro que já
	// não existe — "baixa quilometragem" vira afirmação falsa no índice. É o
	// mesmo dano que a trava de `perfil-semantico.ts` existe para impedir, só
	// que entrando pela gravação em vez do texto do modelo. Sobrescrita
	// humana (`sobrescritoPor`) é decisão humana e não sofre essa invalidação
	// — só a prosa DERIVADA pelo cache é descartada, nunca a escrita à mão.
	const gravadoEfetivo =
		gravado != null && gravado.sobrescritoPor == null && !mesmosRotulos(derivado, gravado)
			? { ...gravado, prosa: null }
			: gravado

	const final = mesclar(derivado, gravadoEfetivo)

	let prosa = final.prosa
	if (prosa == null) {
		try {
			prosa = await gerador(v, final)
		} catch {
			prosa = null
		}
	}

	return { passagem: montarPassagem(buildVehiclePassage(v), final, prosa), prosa }
}
