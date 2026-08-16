import { describe, it, expect } from 'vitest'
import { passagemDoVeiculo } from '@/lib/mcp/passagem-do-veiculo'
import type { Rotulos } from '@/lib/mcp/rotulos'
import type { RotulosGravados } from '@/lib/mcp/repositorio-rotulos'

const MACAN = {
	id: 1, brand: 'Porsche', model: 'Macan', version: 'GTS Bi-Turbo',
	year_model: 2024, body_type: 'SUV', doors: 4, mileage: 19_930, price: 499_000,
}

// Rótulos que `derivarRotulos(MACAN, 2026)` de fato produz — SUV 4 portas,
// 19.930 km (< 30.000), R$ 499.000 (>= 250.000). Usado para montar um
// `gravado` que "bate" com o que seria derivado agora, provando o cache.
//
// Anotado como `Rotulos` (não inferido): sem isso os arrays widenam para
// `string[]` e `RotulosGravados` (que exige `RotuloUso[]`/`RotuloComprador[]`/
// `RotuloForca[]`) deixa de aceitar os objetos que os espalham abaixo — é
// exatamente o que dava erro em `npx tsc --noEmit` antes deste conserto.
const ROTULOS_MACAN_ATUAIS: Rotulos = {
	uso: ['viagem', 'urbano', 'familia'], // ordem embaralhada de propósito: a
	comprador: ['executivo', 'familia'],  // comparação do cache não pode
	forca: ['baixa-quilometragem', 'espaco'], // depender de ordem de array.
}

describe('passagemDoVeiculo', () => {
	it('inclui ficha e intenção na mesma passagem', async () => {
		const { passagem: p } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => ({ ok: false, motivo: 'falha' }))
		expect(p).toContain('Porsche')
		expect(p).toContain('19.930 km')
		expect(p.toLowerCase()).toContain('família')
	})

	// A regressão que interessa: hoje a passagem NÃO tem essas palavras.
	it('faz a pergunta do comprador encontrar palavra no texto', async () => {
		const { passagem } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => ({ ok: false, motivo: 'falha' }))
		const p = passagem.toLowerCase()
		for (const termo of ['família', 'viagem', 'baixa quilometragem']) {
			expect(p, `faltou "${termo}"`).toContain(termo)
		}
	})

	it('respeita sobrescrita humana', async () => {
		const { passagem: p } = await passagemDoVeiculo(MACAN, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: [],
			prosa: null, sobrescritoPor: 'cris@attra.com.br',
		}, 2026, async () => ({ ok: false, motivo: 'falha' }))
		expect(p.toLowerCase()).toContain('fim de semana')
		expect(p.toLowerCase()).not.toContain('família')
	})

	it('sai sem prosa quando o gerador falha', async () => {
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => { throw new Error('cota') })
		expect(p).toContain('Porsche')
		expect(prosa).toBeNull()
		expect(origemProsa).toBe('falha')
	})

	// Lado que faltava do `if (prosa == null)`: quando já existe prosa gravada
	// (sync anterior ou override humano), o gerador não deve ser chamado —
	// nem em caso de sucesso, nem de falha.
	it('inclui a prosa quando o gerador tem sucesso', async () => {
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => ({ ok: true, texto: 'Frase gerada pelo modelo.' }))
		expect(p).toContain('Frase gerada pelo modelo.')
		expect(prosa).toBe('Frase gerada pelo modelo.')
		expect(origemProsa).toBe('gerada')
	})

	// --- origemProsa (Conserto 3: a rota precisa saber o que aconteceu) -----
	//
	// `gerarProsa` pode falhar 100% das vezes (chave ausente, modelo com nome
	// errado, cota, timeout, trava) e o único sinal antes disto era um
	// `console.warn` que o build de produção apaga. `origemProsa` é o que a
	// rota usa para contar geradas/cacheadas/reprovadas/falhas na resposta —
	// os dois testes abaixo provam que 'reprovada' e 'falha' não colapsam no
	// mesmo valor, senão a contagem não distinguiria "a trava está reprovando
	// tudo" de "a chave não está configurada".
	it('gerador reprovado pela trava: sai sem prosa e origemProsa é "reprovada"', async () => {
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => ({ ok: false, motivo: 'reprovada' }))
		expect(prosa).toBeNull()
		expect(origemProsa).toBe('reprovada')
		expect(p).toContain('Porsche')
	})

	it('gerador falha por outro motivo (chave, rede, cota): sai sem prosa e origemProsa é "falha"', async () => {
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => ({ ok: false, motivo: 'falha' }))
		expect(prosa).toBeNull()
		expect(origemProsa).toBe('falha')
		expect(p).toContain('Porsche')
	})

	// --- Cache de prosa (Rodada de conserto 1) -------------------------------
	//
	// A rota grava a `prosa` devolvida por `passagemDoVeiculo` em vez de `null`
	// fixo. Sem isso, toda sincronização (cron de 6h) regeraria a prosa do
	// zero — ~300 chamadas de modelo/dia para ~77 veículos que não mudaram, e
	// o texto indexado do mesmo carro variando 4x ao dia sem o carro mudar.

	it('rótulos iguais aos gravados: reusa a prosa do cache e NÃO chama o gerador', async () => {
		const chamadas: string[] = []
		const gravado: RotulosGravados = {
			...ROTULOS_MACAN_ATUAIS,
			prosa: 'Prosa em cache, gerada numa sincronização anterior.',
			sobrescritoPor: null,
		}
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'não deveria ser chamado' }
		})
		expect(chamadas).toHaveLength(0)
		expect(prosa).toBe('Prosa em cache, gerada numa sincronização anterior.')
		expect(p).toContain('Prosa em cache, gerada numa sincronização anterior.')
		expect(origemProsa).toBe('cache')
	})

	it('sem prosa gravada: chama o gerador exatamente uma vez', async () => {
		const chamadas: string[] = []
		const { prosa, origemProsa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'Prosa recém-gerada.' }
		})
		expect(chamadas).toHaveLength(1)
		expect(prosa).toBe('Prosa recém-gerada.')
		expect(origemProsa).toBe('gerada')
	})

	// --- Invalidação de cache quando os rótulos mudam (agravante da rodada 1) -
	//
	// A prosa é gerada A PARTIR dos rótulos. Se o carro cruzou um limiar (ex.:
	// passou de 30.000 km e perdeu `baixa-quilometragem`), a prosa cacheada
	// descreve um carro que já não existe — afirmação falsa no índice, o
	// mesmo dano que a trava de `perfil-semantico.ts` existe para impedir.

	it('rótulos derivados divergem dos gravados: descarta a prosa cacheada e chama o gerador', async () => {
		const chamadas: string[] = []
		// `forca` gravada não tem 'baixa-quilometragem' — diverge do que
		// `derivarRotulos(MACAN, 2026)` produz agora (19.930 km < 30.000).
		const gravado: RotulosGravados = {
			uso: ROTULOS_MACAN_ATUAIS.uso,
			comprador: ROTULOS_MACAN_ATUAIS.comprador,
			forca: ['espaco'],
			prosa: 'Prosa antiga, de antes do carro rodar mais.',
			sobrescritoPor: null,
		}
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'Prosa nova, coerente com os rótulos atuais.' }
		})
		expect(chamadas).toHaveLength(1)
		expect(prosa).toBe('Prosa nova, coerente com os rótulos atuais.')
		expect(p).toContain('Prosa nova, coerente com os rótulos atuais.')
		expect(p).not.toContain('Prosa antiga, de antes do carro rodar mais.')
		expect(origemProsa).toBe('gerada')
	})

	it('linha sobrescrita à mão: mantém a prosa humana mesmo com rótulos derivados divergentes', async () => {
		const chamadas: string[] = []
		const gravado: RotulosGravados = {
			uso: ['fim-de-semana'],
			comprador: ['entusiasta'],
			forca: [], // nada bate com o que seria derivado para o MACAN agora
			prosa: 'Prosa escrita à mão pela Attra.',
			sobrescritoPor: 'cris@attra.com.br',
		}
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'não deveria ser chamado' }
		})
		expect(chamadas).toHaveLength(0)
		expect(prosa).toBe('Prosa escrita à mão pela Attra.')
		expect(p).toContain('Prosa escrita à mão pela Attra.')
		expect(origemProsa).toBe('sobrescrita')
	})

	// --- Conserto 2: prosa reprovada pela trava não pode ficar presa no cache -
	//
	// Dispara em dois caminhos previstos: um termo novo entra em
	// TERMOS_PROIBIDOS depois que a prosa já estava gravada, ou a Attra
	// escreve prosa à mão (sem sobrescrever rótulos) contendo um termo
	// proibido — 'conforto' é rótulo legítimo do vocabulário E termo proibido
	// na prosa. Como os rótulos não mudam sozinhos, sem esta checagem o cache
	// nunca invalidaria e o veículo ficaria PERMANENTEMENTE sem prosa no
	// índice, em silêncio.

	it('prosa gravada que a trava reprovaria hoje: descarta o cache e chama o gerador', async () => {
		const chamadas: string[] = []
		const gravado: RotulosGravados = {
			...ROTULOS_MACAN_ATUAIS, // rótulos batem com os derivados agora —
			prosa: 'SUV com conforto para toda a família.', // só a prosa é o gatilho.
			sobrescritoPor: null,
		}
		const { passagem: p, prosa, origemProsa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'Prosa nova, sem termo proibido.' }
		})
		expect(chamadas).toHaveLength(1)
		expect(prosa).toBe('Prosa nova, sem termo proibido.')
		expect(p).toContain('Prosa nova, sem termo proibido.')
		expect(p).not.toContain('SUV com conforto para toda a família.')
		expect(origemProsa).toBe('gerada')
	})

	// O lado oposto necessário: uma prosa gravada que PASSA na trava não pode
	// disparar regeneração — senão o teste acima não provaria que é a trava
	// causando o cache-miss, e sim algum outro efeito colateral.
	it('prosa gravada que passa na trava: mantém o cache e NÃO chama o gerador', async () => {
		const chamadas: string[] = []
		const gravado: RotulosGravados = {
			...ROTULOS_MACAN_ATUAIS,
			prosa: 'SUV para uso em família e viagem. Baixa quilometragem.',
			sobrescritoPor: null,
		}
		const { prosa, origemProsa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return { ok: true, texto: 'não deveria ser chamado' }
		})
		expect(chamadas).toHaveLength(0)
		expect(prosa).toBe('SUV para uso em família e viagem. Baixa quilometragem.')
		expect(origemProsa).toBe('cache')
	})
})
