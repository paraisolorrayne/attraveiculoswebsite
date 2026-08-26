import { describe, it, expect, vi } from 'vitest'
import {
	assinaturaDoVeiculo,
	assinaturaDoPost,
	diffParaSubmeter,
	montarLotes,
	enviarIndexNow,
	urlDaChave,
} from '@/lib/indexnow'

describe('assinaturas — o que conta como "mudou" para o IndexNow', () => {
	it('veículo muda quando preço, status ou publicação mudam; fotos e descrição não', () => {
		const base = { slug: 'porsche-911-2025-1', price: 1150000, status: 'available', updated_at: '2026-08-01' }
		const a = assinaturaDoVeiculo(base)
		expect(assinaturaDoVeiculo({ ...base, price: 1100000 })).not.toBe(a)
		expect(assinaturaDoVeiculo({ ...base, status: 'sold' })).not.toBe(a)
		expect(assinaturaDoVeiculo({ ...base, updated_at: '2026-08-02' })).not.toBe(a)
		expect(assinaturaDoVeiculo({ ...base })).toBe(a)
	})

	it('post muda quando updated_date muda', () => {
		const p = { slug: 'x', published_date: '2025-11-28', updated_date: undefined }
		expect(assinaturaDoPost({ ...p, updated_date: '2026-08-01' })).not.toBe(assinaturaDoPost(p))
	})
})

describe('diffParaSubmeter — só o que mudou, mais o que sumiu', () => {
	const anterior = new Map([
		['https://s/veiculo/a', 'h1'],
		['https://s/veiculo/b', 'h2'],
		['https://s/blog/p', 'p1'],
	])
	const atual = [
		{ url: 'https://s/veiculo/a', assinatura: 'h1' },     // igual
		{ url: 'https://s/veiculo/b', assinatura: 'h2-novo' }, // mudou
		{ url: 'https://s/veiculo/c', assinatura: 'h3' },     // novo
		{ url: 'https://s/blog/p', assinatura: 'p1' },        // igual
	]

	it('novos e alterados entram; iguais não; removidos entram para o motor recrawlar', () => {
		const r = diffParaSubmeter(atual, anterior)
		expect(r.alterados.map(x => x.url).sort()).toEqual(['https://s/veiculo/b', 'https://s/veiculo/c'])
		expect(r.removidos).toEqual([])
	})

	it('URL que saiu do estoque vai na lista de removidos', () => {
		const r = diffParaSubmeter(atual.filter(x => !x.url.endsWith('/a')), anterior)
		expect(r.removidos).toEqual(['https://s/veiculo/a'])
	})

	it('primeira execução (sem estado) submete tudo', () => {
		const r = diffParaSubmeter(atual, new Map())
		expect(r.alterados).toHaveLength(4)
	})
})

describe('montarLotes / enviarIndexNow — o protocolo', () => {
	it('quebra em lotes de no máximo 10.000 URLs', () => {
		const urls = Array.from({ length: 20_001 }, (_, i) => `https://s/${i}`)
		const lotes = montarLotes(urls)
		expect(lotes.map(l => l.length)).toEqual([10_000, 10_000, 1])
	})

	it('lista vazia não gera lote nem chamada', async () => {
		expect(montarLotes([])).toEqual([])
		const fetchMock = vi.fn()
		const r = await enviarIndexNow([], { chave: 'k', host: 'attraveiculos.com.br', fetchImpl: fetchMock })
		expect(fetchMock).not.toHaveBeenCalled()
		expect(r.enviados).toBe(0)
	})

	it('POST em api.indexnow.org com host, key, keyLocation e urlList', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 202 }))
		const r = await enviarIndexNow(['https://attraveiculos.com.br/veiculo/a'], {
			chave: 'abc123', host: 'attraveiculos.com.br', fetchImpl: fetchMock,
		})
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		expect(url).toBe('https://api.indexnow.org/indexnow')
		const body = JSON.parse(String(init.body))
		expect(body).toEqual({
			host: 'attraveiculos.com.br',
			key: 'abc123',
			keyLocation: 'https://attraveiculos.com.br/indexnow/abc123.txt',
			urlList: ['https://attraveiculos.com.br/veiculo/a'],
		})
		expect(r).toEqual({ enviados: 1, lotes: 1, falhas: [] })
	})

	it('resposta fora de 200/202 vira falha reportada, não exceção', async () => {
		const fetchMock = vi.fn(async () => new Response('bad key', { status: 403 }))
		const r = await enviarIndexNow(['https://s/a'], { chave: 'k', host: 's', fetchImpl: fetchMock })
		expect(r.enviados).toBe(0)
		expect(r.falhas[0]).toMatch(/403/)
	})

	it('a chave é publicada em /indexnow/{chave}.txt', () => {
		expect(urlDaChave('https://attraveiculos.com.br', 'abc')).toBe('https://attraveiculos.com.br/indexnow/abc.txt')
	})
})
