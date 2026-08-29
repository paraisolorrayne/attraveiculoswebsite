import { describe, it, expect } from 'vitest'
import {
	ehMacroNaoSubstituida,
	papeisDaPlataforma,
	plataformaDaMarcacao,
	plataformaDominante,
	termoEhNomeDeAnuncio,
	termoEhPalavraChave,
} from '@/lib/visitors/marcacao-plataforma'

describe('plataformaDaMarcacao — quem montou o link', () => {
	it('reconhece a Meta em qualquer grafia usada nos anúncios', () => {
		expect(plataformaDaMarcacao({ utm_source: 'facebook' })).toBe('meta')
		expect(plataformaDaMarcacao({ utm_source: 'ig' })).toBe('meta')
		expect(plataformaDaMarcacao({ utm_source: 'Meta' })).toBe('meta')
	})

	it('reconhece Google e TikTok; o resto é "outra"', () => {
		expect(plataformaDaMarcacao({ utm_source: 'google' })).toBe('google')
		expect(plataformaDaMarcacao({ utm_source: 'tiktok' })).toBe('tiktok')
		expect(plataformaDaMarcacao({ utm_source: 'parceiro-x' })).toBe('outra')
	})

	it('sem utm_source, o click id decide', () => {
		expect(plataformaDaMarcacao({ fbclid: 'x' })).toBe('meta')
		expect(plataformaDaMarcacao({ gclid: 'x' })).toBe('google')
	})
})

describe('o que utm_term significa em cada plataforma', () => {
	it('Google: palavra-chave buscada', () => {
		expect(termoEhPalavraChave({ utm_source: 'google', utm_medium: 'cpc' })).toBe(true)
		expect(termoEhNomeDeAnuncio({ utm_source: 'google' })).toBe(false)
	})

	it('Meta: nome do anúncio — NÃO é intenção de busca', () => {
		expect(termoEhNomeDeAnuncio({ utm_source: 'facebook', utm_medium: 'cpc' })).toBe(true)
		expect(termoEhPalavraChave({ utm_source: 'facebook' })).toBe(false)
	})

	it('fonte desconhecida não entra em nenhum dos dois grupos', () => {
		expect(termoEhPalavraChave({ utm_source: 'parceiro-x' })).toBe(false)
		expect(termoEhNomeDeAnuncio({ utm_source: 'parceiro-x' })).toBe(false)
	})
})

describe('papeisDaPlataforma — o rótulo que a tela mostra', () => {
	it('na Meta, utm_content é conjunto e utm_term é anúncio', () => {
		const p = papeisDaPlataforma('meta')
		expect(p.conteudo.titulo).toBe('Conjunto de anúncios')
		expect(p.termo.titulo).toBe('Anúncio (criativo)')
	})

	it('no Google, utm_term é palavra-chave', () => {
		expect(papeisDaPlataforma('google').termo.titulo).toBe('Palavra-chave')
	})

	it('plataforma desconhecida mantém o nome técnico, sem inventar significado', () => {
		expect(papeisDaPlataforma('outra').termo.titulo).toBe('utm_term')
	})
})

describe('plataformaDominante', () => {
	it('escolhe a plataforma com mais sessões, ignorando fontes sem plataforma', () => {
		expect(
			plataformaDominante([
				{ fonte: 'parceiro', sessoes: 900 },
				{ fonte: 'facebook', sessoes: 200 },
				{ fonte: 'google', sessoes: 50 },
			]),
		).toBe('meta')
	})

	it('sem nenhuma plataforma conhecida, devolve "outra"', () => {
		expect(plataformaDominante([{ fonte: 'parceiro', sessoes: 10 }])).toBe('outra')
		expect(plataformaDominante([])).toBe('outra')
	})
})

describe('ehMacroNaoSubstituida — macro que a plataforma não expandiu', () => {
	it('pega a macro da Meta e a do Google', () => {
		expect(ehMacroNaoSubstituida('{{campaign.name}}')).toBe(true)
		expect(ehMacroNaoSubstituida('{{adset.name}}')).toBe(true)
		expect(ehMacroNaoSubstituida('{keyword}')).toBe(true)
		expect(ehMacroNaoSubstituida('{campaignid}')).toBe(true)
	})

	it('nome real de campanha ou anúncio passa', () => {
		expect(ehMacroNaoSubstituida('[EB] [SITE] Visitas ao site')).toBe(false)
		expect(ehMacroNaoSubstituida('Reels - Estoque')).toBe(false)
		expect(ehMacroNaoSubstituida('')).toBe(false)
		expect(ehMacroNaoSubstituida(null)).toBe(false)
	})
})
