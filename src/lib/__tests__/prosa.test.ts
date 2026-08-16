import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { gerarProsa, montarPrompt } from '@/lib/mcp/prosa'
import { prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

const V = { brand: 'Porsche', model: 'Macan', year_model: 2024, body_type: 'SUV', mileage: 19_930 }
const R: Rotulos = { uso: ['familia', 'viagem'], comprador: ['executivo'], forca: ['baixa-quilometragem'] }

describe('montarPrompt', () => {
	it('proíbe explicitamente comparativo e juízo de conforto', () => {
		const p = montarPrompt(V, R).toLowerCase()
		expect(p).toContain('não use')
		expect(p).toContain('confortável')
		expect(p).toContain('acima da média')
	})

	it('passa só os fatos da ficha e os rótulos', () => {
		const p = montarPrompt(V, R)
		expect(p).toContain('Porsche')
		expect(p).toContain('SUV')
		expect(p).toContain('família')
	})

	// O modelo não pode receber espaço para inventar o que não está na ficha.
	it('manda o modelo não acrescentar fato', () => {
		expect(montarPrompt(V, R).toLowerCase()).toContain('não acrescente')
	})

	// Os dois lados da condição de quilometragem: presente entra na ficha,
	// ausente não vira "undefined km" nem qualquer outro texto espúrio.
	it('inclui a quilometragem na ficha quando ela é informada', () => {
		expect(montarPrompt(V, R)).toContain('19.930 km')
	})

	it('omite a quilometragem quando ela não é informada', () => {
		const semKm = montarPrompt({ ...V, mileage: null }, R)
		expect(semKm).not.toContain('km')
		expect(semKm).not.toContain('undefined')
		expect(semKm).not.toContain('null')
	})

	// Os dois lados do fallback de lista vazia: rótulo presente vira nome
	// legível; ausência de rótulos não deixa a linha em branco.
	it('usa "(nenhum)" quando não há rótulo de uso nem de comprador', () => {
		const vazio: Rotulos = { uso: [], comprador: [], forca: [] }
		const p = montarPrompt(V, vazio)
		expect(p).toContain('Uso: (nenhum)')
		expect(p).toContain('Perfil de comprador: (nenhum)')
	})
})

describe('trava aplicada à saída', () => {
	// A defesa real não é o prompt — é a validação depois. Os dois lados:
	// prosa fiel à ficha passa, prosa com juízo de conforto é descartada.
	it('a prosa gerada ainda passa pela trava', () => {
		expect(prosaEhAceitavel('SUV para uso em família e viagem. Baixa quilometragem.').ok).toBe(true)
		expect(prosaEhAceitavel('SUV confortável para a família.').ok).toBe(false)
	})
})

describe('gerarProsa — falha sem chamar rede', () => {
	const chaveOriginal = process.env.GEMINI_API_KEY

	afterEach(() => {
		if (chaveOriginal === undefined) delete process.env.GEMINI_API_KEY
		else process.env.GEMINI_API_KEY = chaveOriginal
	})

	// Ausência de chave é uma das falhas que devolvem `ok: false` sem tentar
	// rede — não é um caso de erro, é o contrato: isso aqui não trava a
	// sincronização. `motivo: 'falha'` (e não 'reprovada') é o que permite a
	// rota contar "chave não configurada" separado de "trava reprovando".
	it('devolve ok:false, motivo:falha sem chave, sem tentar chamar a rede', async () => {
		delete process.env.GEMINI_API_KEY
		expect(await gerarProsa(V, R)).toEqual({ ok: false, motivo: 'falha' })
	})
})

describe('gerarProsa — trava aplicada à resposta do modelo (fetch mockado)', () => {
	// Sem chave, gerarProsa sai antes de chegar na chamada de rede — por isso
	// esse describe precisa da própria chave, senão os dois testes abaixo
	// nunca exerceriam a linha que estamos protegendo.
	const chaveOriginal = process.env.GEMINI_API_KEY

	beforeEach(() => {
		process.env.GEMINI_API_KEY = 'chave-de-teste'
	})

	afterEach(() => {
		if (chaveOriginal === undefined) delete process.env.GEMINI_API_KEY
		else process.env.GEMINI_API_KEY = chaveOriginal
		vi.unstubAllGlobals()
	})

	/** Mocka `fetch` para devolver `texto` no formato de resposta do Gemini — sem rede real. */
	function mockarRespostaDoGemini(texto: string) {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					candidates: [{ content: { parts: [{ text: texto }] } }],
				}),
			}),
		)
	}

	// O ponto sério da task: se a validação da saída for removida de dentro de
	// gerarProsa, é aqui — e só aqui — que isso fica vermelho. prosaEhAceitavel
	// isolada continua verde porque ela nunca deixou de funcionar; o que falta
	// sem essa chamada é gerarProsa PARAR de usá-la.
	//
	// `motivo: 'reprovada'` (não 'falha') é o que permite a rota separar "a
	// trava está reprovando tudo" de "a chave/rede/cota está com problema" na
	// contagem que ela devolve no JSON.
	it('descarta e devolve ok:false, motivo:reprovada quando o modelo devolve prosa que a trava reprova', async () => {
		mockarRespostaDoGemini('SUV com interior amplo e confortável para a família.')
		expect(await gerarProsa(V, R)).toEqual({ ok: false, motivo: 'reprovada' })
	})

	// O par necessário: sem esse lado, um teste que sempre espera ok:false não
	// prova que a trava está filtrando — só que gerarProsa sempre falha.
	it('devolve ok:true com a prosa quando o modelo devolve texto que passa na trava', async () => {
		mockarRespostaDoGemini('SUV para uso em família e viagem. Baixa quilometragem.')
		expect(await gerarProsa(V, R)).toEqual({ ok: true, texto: 'SUV para uso em família e viagem. Baixa quilometragem.' })
	})
})
