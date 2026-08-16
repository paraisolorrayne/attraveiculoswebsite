import { describe, it, expect } from 'vitest'
import { montarPassagem, prosaEhAceitavel, NOME_DO_ROTULO } from '@/lib/mcp/perfil-semantico'
import { VOCABULARIO } from '@/lib/mcp/rotulos'
import type { Rotulos } from '@/lib/mcp/rotulos'

const FATUAL = 'Porsche Macan GTS Bi-Turbo 2024. tipo SUV. 19.930 km. R$ 499.000'
const ROTULOS: Rotulos = {
	uso: ['familia', 'viagem', 'urbano'],
	comprador: ['familia', 'executivo'],
	forca: ['baixa-quilometragem'],
}

describe('prosaEhAceitavel', () => {
	// A trava que a própria Attra impôs revisando o exemplo do spec: a prosa
	// não pode afirmar conforto nem comparar com categoria nenhuma.
	it('recusa juízo de conforto', () => {
		expect(prosaEhAceitavel('SUV com espaço real para quatro adultos.').ok).toBe(false)
		expect(prosaEhAceitavel('Interior confortável e espaçoso.').ok).toBe(false)
	})

	it('recusa comparativo e superlativo', () => {
		expect(prosaEhAceitavel('Desempenho acima da média da categoria.').ok).toBe(false)
		expect(prosaEhAceitavel('O mais rápido da linha.').ok).toBe(false)
		expect(prosaEhAceitavel('Ideal para quem viaja.').ok).toBe(false)
	})

	it('aceita reescrita de rótulo e valor de ficha', () => {
		expect(prosaEhAceitavel('SUV premium para uso diário e viagem em família. Baixa quilometragem.').ok).toBe(true)
	})

	it('explica o motivo da recusa', () => {
		const r = prosaEhAceitavel('Interior espaçoso.')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.motivo).toContain('espaçoso')
	})

	// Quase-fronteira: "espaço de carga" contém "espaço" mas nenhum termo
	// proibido inteiro ('espaço real', 'espaçoso'). A lista é generosa, não
	// gatilha em qualquer substring parecida — só nas que estão de fato na lista.
	it('não recusa "espaço de carga", que não contém nenhum termo proibido inteiro', () => {
		expect(prosaEhAceitavel('SUV com espaço de carga para viagem em família.').ok).toBe(true)
	})

	// Segundo exemplo do lado aceito, reaproveitando outro par rótulo/ficha
	// (executivo, baixa quilometragem) para não depender de um único caso feliz.
	it('aceita outra reescrita de rótulo e valor de ficha, sem juízo nem comparação', () => {
		expect(prosaEhAceitavel('Uso executivo, baixa quilometragem, revisões em dia.').ok).toBe(true)
	})

	// Rodada de conserto 1: a checagem casava por substring, então "referência"
	// reprovava "preferência" e "melhor" reprovava "melhoria" — rejeição
	// silenciosa derrubando prosa legítima sem ninguém saber o motivo. Casa por
	// PALAVRA INTEIRA agora; estes quatro pares cobrem os dois lados da fronteira.
	it('não recusa palavra que só contém o termo proibido como substring', () => {
		expect(prosaEhAceitavel('Marca de preferência entre colecionadores.').ok).toBe(true)
		expect(prosaEhAceitavel('Melhorias recentes na suspensão.').ok).toBe(true)
	})

	it('recusa o termo proibido quando aparece como palavra inteira', () => {
		expect(prosaEhAceitavel('Um carro de referência no segmento.').ok).toBe(false)
		expect(prosaEhAceitavel('O melhor exemplar disponível.').ok).toBe(false)
	})

	// "amplo" é a palavra mais comum em anúncio de carro brasileiro para
	// alegar espaço interno, e não estava na lista até esta rodada. A lista só
	// tinha formas masculinas singulares antes — "espaçosa" escapava.
	it('recusa "amplo" e flexões, e "espaçosa"', () => {
		expect(prosaEhAceitavel('SUV com interior amplo para a família.').ok).toBe(false)
		expect(prosaEhAceitavel('Grande amplitude de espaço para bagagem.').ok).toBe(false)
		expect(prosaEhAceitavel('Cabine espaçosa e confortável.').ok).toBe(false)
	})
})

describe('NOME_DO_ROTULO', () => {
	// `legivel()` cai no fallback `?? r` quando um slug não está no mapa —
	// isso vazaria o slug cru (ex.: "fim-de-semana") para o texto indexado
	// em silêncio. Este teste garante que todo slug de VOCABULARIO tem
	// tradução, então um rótulo novo sem entrada quebra o teste em vez de
	// vazar em produção.
	it('cobre todo rótulo de VOCABULARIO nos três eixos', () => {
		const todosOsRotulos = [...VOCABULARIO.uso, ...VOCABULARIO.comprador, ...VOCABULARIO.forca]
		for (const rotulo of todosOsRotulos) {
			expect(NOME_DO_ROTULO).toHaveProperty(rotulo)
		}
	})
})

describe('montarPassagem', () => {
	it('junta ficha, prosa e rótulos', () => {
		const p = montarPassagem(FATUAL, ROTULOS, 'SUV premium para uso diário e viagem em família.')
		expect(p).toContain(FATUAL)
		expect(p).toContain('SUV premium para uso diário')
		expect(p).toContain('família')
		expect(p).toContain('executivo')
	})

	// O caso que motivou o projeto: a pergunta da Auto Trader precisa casar.
	it('faz a passagem conter as palavras da pergunta do comprador', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null).toLowerCase()
		expect(p).toContain('família')
		expect(p).toContain('viagem')
	})

	// Índice sem prosa é ruim; índice desatualizado é pior.
	it('funciona sem prosa nenhuma', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null)
		expect(p).toContain(FATUAL)
		expect(p.length).toBeGreaterThan(FATUAL.length)
	})

	it('devolve só o factual quando não há rótulo nem prosa', () => {
		const vazio: Rotulos = { uso: [], comprador: [], forca: [] }
		expect(montarPassagem(FATUAL, vazio, null)).toBe(FATUAL)
	})

	// Prosa reprovada não pode entrar no índice de jeito nenhum — nem em
	// parte. Uma implementação que só podasse a frase ofensiva (em vez de
	// descartar a prosa inteira) passaria num teste que só checasse
	// "quatro adultos" sumiu; por isso a asserção compara a passagem inteira
	// contra a que sairia sem prosa nenhuma.
	it('descarta prosa que não passa na trava — a passagem inteira, não só o trecho ofensivo', () => {
		const comProsaReprovada = montarPassagem(FATUAL, ROTULOS, 'Espaço real para quatro adultos.')
		const semProsaNenhuma = montarPassagem(FATUAL, ROTULOS, null)
		expect(comProsaReprovada).not.toContain('Espaço real para quatro adultos')
		expect(comProsaReprovada).toBe(semProsaNenhuma)
	})

	// Cada eixo de rótulo (uso, comprador, força) decide sozinho se entra na
	// passagem. Os testes acima só exercitam "todos vazios" vs "todos
	// preenchidos" — aqui os dois lados de cada eixo são cobertos isoladamente,
	// para não deixar passar um eixo que vaze rótulo de outro ou que suma
	// quando só ele está vazio.
	it('inclui só o eixo "uso" quando comprador e força estão vazios', () => {
		const r: Rotulos = { uso: ['fim-de-semana'], comprador: [], forca: [] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).toContain('Uso: fim de semana.')
		expect(p).not.toContain('Perfil:')
		expect(p).not.toContain('Destaques:')
	})

	it('inclui só o eixo "comprador" quando uso e força estão vazios', () => {
		const r: Rotulos = { uso: [], comprador: ['entusiasta'], forca: [] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).not.toContain('Uso:')
		expect(p).toContain('Perfil: entusiasta.')
		expect(p).not.toContain('Destaques:')
	})

	it('inclui só o eixo "força" quando uso e comprador estão vazios', () => {
		const r: Rotulos = { uso: [], comprador: [], forca: ['espaco'] }
		const p = montarPassagem(FATUAL, r, null)
		expect(p).not.toContain('Uso:')
		expect(p).not.toContain('Perfil:')
		expect(p).toContain('Destaques: espaço de carga.')
	})
})
