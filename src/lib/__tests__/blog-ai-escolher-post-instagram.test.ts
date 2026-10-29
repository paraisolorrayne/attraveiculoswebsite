import { describe, it, expect } from 'vitest'
import { escolherPostDoInstagram, rendeArtigo, textoDaLegenda } from '@/lib/blog-ai/escolher-post-instagram'
import type { IGPost } from '@/lib/blog-ai/instagram-fetcher'

const AGORA = new Date('2026-10-28T12:00:00Z')
const LEGENDA_BOA =
	'Lamborghini Temerário 2026 entregue em Goiânia. Foram um ano e meio de espera pela alocação, ' +
	'e o cliente escolheu o roxo com interior preto. O V8 biturbo híbrido gira até 10.000 rpm. 🔥 #lamborghini @attra.veiculos'

function post(id: string, dias: number, caption = LEGENDA_BOA): IGPost {
	return {
		id,
		permalink: `https://www.instagram.com/p/${id}/`,
		caption,
		media_type: 'IMAGE',
		media_url: `https://cdn/${id}.jpg`,
		timestamp: new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString(),
	}
}

describe('textoDaLegenda', () => {
	it('tira hashtag, menção e emoji', () => {
		expect(textoDaLegenda('Chegou! 🔥\n\n#ferrari #296gts @attra.veiculos')).toBe('Chegou!')
	})
})

describe('rendeArtigo', () => {
	it('legenda com história e números rende', () => {
		expect(rendeArtigo(post('a', 1))).toBe(true)
	})

	it('legenda curta não rende, mesmo cheia de hashtag', () => {
		expect(rendeArtigo(post('a', 1, `Chegou! 🔥 ${'#supercarro '.repeat(30)}`))).toBe(false)
	})

	it('post de serviço não rende', () => {
		expect(rendeArtigo(post('a', 1, `Sorteio de fim de ano! ${LEGENDA_BOA}`))).toBe(false)
	})
})

describe('escolherPostDoInstagram', () => {
	it('pega o mais recente que ainda não virou artigo', () => {
		const escolhido = escolherPostDoInstagram([post('velho', 5), post('novo', 1), post('meio', 3)], new Set(['novo']), AGORA)
		expect(escolhido?.id).toBe('meio')
	})

	it('pula o que não rende artigo', () => {
		const escolhido = escolherPostDoInstagram([post('curto', 1, 'Chegou! 🔥'), post('bom', 2)], new Set(), AGORA)
		expect(escolhido?.id).toBe('bom')
	})

	it('fora da janela de 21 dias, nada', () => {
		expect(escolherPostDoInstagram([post('antigo', 30)], new Set(), AGORA)).toBeNull()
	})
})
