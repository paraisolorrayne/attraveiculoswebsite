import { buildVehiclePassage } from '@/lib/jina'
import { derivarRotulos, type Rotulos, type VeiculoParaRotulo } from '@/lib/mcp/rotulos'
import { montarPassagem, prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import { mesclar, type RotulosGravados } from '@/lib/mcp/repositorio-rotulos'
import type { VeiculoParaProsa, ResultadoProsa } from '@/lib/mcp/prosa'

type Veiculo = VeiculoParaRotulo & VeiculoParaProsa & Parameters<typeof buildVehiclePassage>[0]

/** O que aconteceu com a prosa nesta chamada.
 *
 *  A rota usa isso para contar por lote (geradas/cacheadas/reprovadas/falhas)
 *  no JSON de resposta. Sem esse sinal, `gerarProsa` podia falhar 100% das
 *  vezes — chave ausente, cota, timeout, trava — e a rota responderia 200 sem
 *  nenhum jeito de distinguir "a trava está reprovando tudo" de "a chave não
 *  está configurada". `sobrescrita` conta junto com `cache` na rota (nenhuma
 *  chamada ao gerador aconteceu nos dois casos); ver justificativa no
 *  relatório da onda final. */
export type OrigemProsa = 'cache' | 'sobrescrita' | 'gerada' | 'reprovada' | 'falha'

export interface PassagemComProsa {
	passagem: string
	/** Prosa realmente usada nesta passagem — cache, sobrescrita ou recém-gerada.
	 *  A rota usa isso para gravar, evitando regenerar a cada sincronização. */
	prosa: string | null
	origemProsa: OrigemProsa
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
	gerador: (v: VeiculoParaProsa, r: Rotulos) => Promise<ResultadoProsa>,
): Promise<PassagemComProsa> {
	const derivado = derivarRotulos(v, anoAtual)

	// Prosa gravada que a TRAVA reprovaria hoje não pode ficar presa no cache
	// pra sempre: se ela chegou ao banco antes de um termo entrar em
	// TERMOS_PROIBIDOS, ou foi digitada à mão sem passar pela trava (ex.:
	// 'conforto' é rótulo legítimo do vocabulário e termo proibido na prosa),
	// os rótulos nunca mudam sozinhos — e sem essa checagem o cache nunca
	// invalidaria, o veículo ficaria PERMANENTEMENTE sem prosa no índice, em
	// silêncio. Mesmo `sobrescritoPor == null` do bloco abaixo: ela só
	// dispara sobre prosa que a REGRA escreveu, nunca sobre sobrescrita
	// humana de verdade (`sobrescritoPor` setado).
	const prosaGravadaReprovada = gravado?.prosa != null && !prosaEhAceitavel(gravado.prosa).ok

	// Prosa cacheada foi gerada A PARTIR dos rótulos de quando foi escrita. Se
	// o carro cruzou um limiar (ex.: passou de 30.000 km) e os rótulos
	// derivados agora divergem dos gravados, o cache descreve um carro que já
	// não existe — "baixa quilometragem" vira afirmação falsa no índice. É o
	// mesmo dano que a trava de `perfil-semantico.ts` existe para impedir, só
	// que entrando pela gravação em vez do texto do modelo. Sobrescrita
	// humana (`sobrescritoPor`) é decisão humana e não sofre essa invalidação
	// — só a prosa DERIVADA pelo cache é descartada, nunca a escrita à mão.
	const gravadoEfetivo =
		gravado != null && gravado.sobrescritoPor == null && (!mesmosRotulos(derivado, gravado) || prosaGravadaReprovada)
			? { ...gravado, prosa: null }
			: gravado

	const final = mesclar(derivado, gravadoEfetivo)

	let prosa = final.prosa
	// Valor de `prosa != null` é só um placeholder — substituído no bloco
	// abaixo sempre que o gerador é de fato chamado.
	let origemProsa: OrigemProsa = prosa != null ? (final.sobrescritoPor != null ? 'sobrescrita' : 'cache') : 'falha'

	if (prosa == null) {
		try {
			const resultado = await gerador(v, final)
			if (resultado.ok) {
				prosa = resultado.texto
				origemProsa = 'gerada'
			} else {
				prosa = null
				origemProsa = resultado.motivo
			}
		} catch {
			prosa = null
			origemProsa = 'falha'
		}
	}

	return { passagem: montarPassagem(buildVehiclePassage(v), final, prosa), prosa, origemProsa }
}
