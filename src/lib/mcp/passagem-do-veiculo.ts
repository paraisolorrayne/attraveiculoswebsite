import { buildVehiclePassage } from '@/lib/jina'
import { derivarRotulos, type VeiculoParaRotulo } from '@/lib/mcp/rotulos'
import { montarPassagem } from '@/lib/mcp/perfil-semantico'
import { mesclar, type RotulosGravados } from '@/lib/mcp/repositorio-rotulos'
import type { VeiculoParaProsa } from '@/lib/mcp/prosa'

type Veiculo = VeiculoParaRotulo & VeiculoParaProsa & Parameters<typeof buildVehiclePassage>[0]

/**
 * O gerador de prosa entra por parâmetro para o teste poder injetar falha sem
 * tocar em rede. Falha do gerador vira passagem sem prosa, nunca exceção.
 */
export async function passagemDoVeiculo(
	v: Veiculo,
	gravado: RotulosGravados | undefined,
	anoAtual: number,
	gerador: (v: VeiculoParaProsa, r: ReturnType<typeof derivarRotulos>) => Promise<string | null>,
): Promise<string> {
	const derivado = derivarRotulos(v, anoAtual)
	const final = mesclar(derivado, gravado)

	let prosa = final.prosa
	if (prosa == null) {
		try {
			prosa = await gerador(v, final)
		} catch {
			prosa = null
		}
	}

	return montarPassagem(buildVehiclePassage(v), final, prosa)
}
