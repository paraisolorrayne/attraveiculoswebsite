import { describe, it, expect } from 'vitest'
import {
	normalizarFormatoCriativo,
	rotuloFormatoCriativo,
	sufixoArquivoCriativo,
	proporcaoFormatoCriativo,
} from '@/lib/marketing-creatives'

describe('normalizarFormatoCriativo — o que o POST /creatives aceita', () => {
	it('aceita os dois formatos que o gerador produz', () => {
		expect(normalizarFormatoCriativo('stories')).toBe('stories')
		expect(normalizarFormatoCriativo('feed')).toBe('feed')
	})

	it('tolera caixa e espaços vindos do multipart', () => {
		expect(normalizarFormatoCriativo(' FEED ')).toBe('feed')
		expect(normalizarFormatoCriativo('Stories')).toBe('stories')
	})

	it('sem campo (cliente antigo) é Stories — o único formato que existia', () => {
		expect(normalizarFormatoCriativo(null)).toBe('stories')
		expect(normalizarFormatoCriativo(undefined)).toBe('stories')
		expect(normalizarFormatoCriativo('')).toBe('stories')
	})

	it('valor desconhecido é rejeitado (null), não silenciosamente virado Stories', () => {
		expect(normalizarFormatoCriativo('reels')).toBeNull()
		expect(normalizarFormatoCriativo(42)).toBeNull()
		expect(normalizarFormatoCriativo({})).toBeNull()
	})
})

describe('apresentação por formato — board e nome de arquivo', () => {
	it('rótulo diz a proporção que a Meta usa', () => {
		expect(rotuloFormatoCriativo('stories')).toBe('Stories 9:16')
		expect(rotuloFormatoCriativo('feed')).toBe('Feed 4:5')
	})

	it('sufixo do arquivo bate com o que o gerador baixa no computador', () => {
		expect(sufixoArquivoCriativo('stories')).toBe('STORIES')
		expect(sufixoArquivoCriativo('feed')).toBe('FEED')
	})

	it('proporção CSS do card', () => {
		expect(proporcaoFormatoCriativo('stories')).toBe('9 / 16')
		expect(proporcaoFormatoCriativo('feed')).toBe('4 / 5')
	})

	it('formato desconhecido gravado no banco não derruba o board: cai em Stories', () => {
		expect(rotuloFormatoCriativo('qualquer')).toBe('Stories 9:16')
		expect(proporcaoFormatoCriativo(null)).toBe('9 / 16')
		expect(sufixoArquivoCriativo(undefined)).toBe('STORIES')
	})
})
