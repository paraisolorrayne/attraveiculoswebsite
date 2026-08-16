import { describe, it, expect, afterEach } from 'vitest'
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

	// Ausência de chave é uma das falhas que devolvem null sem tentar rede —
	// não é um caso de erro, é o contrato: null aqui não trava a sincronização.
	it('devolve null sem chave, sem tentar chamar a rede', async () => {
		delete process.env.GEMINI_API_KEY
		expect(await gerarProsa(V, R)).toBeNull()
	})
})
