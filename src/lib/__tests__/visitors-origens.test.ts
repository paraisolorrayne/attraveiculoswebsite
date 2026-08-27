import { describe, it, expect } from 'vitest'
import {
	agruparFonteMeio,
	agruparReferenciadores,
	auditarMarcacao,
	tendenciaPorCanal,
	SEM_MEIO,
	type GrupoOrigem,
} from '@/lib/visitors/origens'

function g(p: Partial<GrupoOrigem> & { sessoes: number }): GrupoOrigem {
	return {
		utm_source: null,
		utm_medium: null,
		utm_campaign: null,
		tem_gclid: false,
		tem_fbclid: false,
		tem_ttclid: false,
		referrer_domain: null,
		whatsapp: 0,
		formularios: 0,
		sessoes_com_veiculo: 0,
		...p,
	}
}

describe('agruparFonteMeio — as grafias cruas ficam visíveis embaixo da fonte canônica', () => {
	it('Google, google e google_ads com cpc viram UMA linha, com as três grafias', () => {
		const linhas = agruparFonteMeio([
			g({ utm_source: 'Google', utm_medium: 'cpc', sessoes: 50, whatsapp: 2 }),
			g({ utm_source: 'google', utm_medium: 'CPC', sessoes: 30 }),
			g({ utm_source: 'google_ads', utm_medium: 'cpc', sessoes: 5 }),
		])
		expect(linhas).toHaveLength(1)
		expect(linhas[0].fonte).toBe('google')
		expect(linhas[0].rotulo_fonte).toBe('Google')
		expect(linhas[0].meio).toBe('cpc')
		expect(linhas[0].sessoes).toBe(85)
		expect(linhas[0].whatsapp).toBe(2)
		expect(linhas[0].grafias).toEqual(['Google', 'google', 'google_ads'])
		expect(linhas[0].canal).toBe('busca_paga')
	})

	it('sem UTM nenhuma: fonte "(sem fonte)" e meio "(sem meio)"', () => {
		const [l] = agruparFonteMeio([g({ sessoes: 10 })])
		expect(l.fonte).toBe('(sem fonte)')
		expect(l.meio).toBe(SEM_MEIO)
		expect(l.grafias).toEqual([])
		expect(l.canal).toBe('direto')
	})

	it('referrer linktr.ee sem UTM aparece como fonte Linktree', () => {
		const [l] = agruparFonteMeio([g({ referrer_domain: 'linktr.ee', sessoes: 7 })])
		expect(l.rotulo_fonte).toBe('Linktree (bio do Instagram)')
		expect(l.canal).toBe('social_organico')
	})
})

describe('agruparReferenciadores', () => {
	it('agrupa por host sem www, ignora o próprio domínio e conta quantas traziam UTM', () => {
		const linhas = agruparReferenciadores([
			g({ referrer_domain: 'www.olx.com.br', sessoes: 20, whatsapp: 1 }),
			g({ referrer_domain: 'olx.com.br', utm_source: 'olx', utm_medium: 'referral', sessoes: 5 }),
			g({ referrer_domain: 'attraveiculos.com.br', sessoes: 100 }),
			g({ referrer_domain: 'chatgpt.com', sessoes: 3, whatsapp: 1 }),
		])
		expect(linhas.map(l => l.dominio)).toEqual(['olx.com.br', 'chatgpt.com'])
		expect(linhas[0].sessoes).toBe(25)
		expect(linhas[0].com_utm).toBe(5)
		expect(linhas[1].rotulo_fonte).toBe('ChatGPT')
		expect(linhas[1].canal).toBe('assistente_ia')
	})
})

describe('auditarMarcacao — os problemas reais de UTM', () => {
	it('gclid sem utm_source', () => {
		const p = auditarMarcacao([g({ tem_gclid: true, sessoes: 40 })])
		const item = p.find(x => x.tipo === 'click_id_sem_utm')!
		expect(item.sessoes).toBe(40)
		expect(item.exemplos).toEqual(['gclid'])
	})

	it('fonte sem meio, meio sem fonte, meio desconhecido', () => {
		const p = auditarMarcacao([
			g({ utm_source: 'newsletter', sessoes: 8 }),
			g({ utm_medium: 'cpc', sessoes: 3 }),
			g({ utm_source: 'facebook', utm_medium: 'instagram', sessoes: 12 }),
		])
		expect(p.find(x => x.tipo === 'fonte_sem_meio')?.exemplos).toEqual(['newsletter'])
		expect(p.find(x => x.tipo === 'meio_sem_fonte')?.sessoes).toBe(3)
		expect(p.find(x => x.tipo === 'meio_desconhecido')?.exemplos).toEqual(['instagram'])
	})

	it('campanha e fonte com várias grafias', () => {
		const p = auditarMarcacao([
			g({ utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'Black Friday', sessoes: 10 }),
			g({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'black friday', sessoes: 4 }),
		])
		expect(p.find(x => x.tipo === 'campanha_varias_grafias')?.exemplos[0]).toBe('Black Friday / black friday')
		expect(p.find(x => x.tipo === 'fonte_varias_grafias')?.sessoes).toBe(14)
	})

	it('sessão paga sem campanha e click id contradizendo a fonte', () => {
		const p = auditarMarcacao([
			g({ utm_source: 'facebook', utm_medium: 'cpc', sessoes: 20 }),
			g({ utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'x', tem_gclid: true, sessoes: 2 }),
		])
		expect(p.find(x => x.tipo === 'paga_sem_campanha')?.sessoes).toBe(20)
		expect(p.find(x => x.tipo === 'click_id_contradiz_fonte')?.exemplos).toEqual(['gclid + facebook'])
	})

	it('marcação limpa não gera problema', () => {
		expect(
			auditarMarcacao([g({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'porsche', sessoes: 9 })]),
		).toEqual([])
	})

	it('ordena do problema com mais sessões para o com menos', () => {
		const p = auditarMarcacao([g({ utm_source: 'x', sessoes: 2 }), g({ tem_fbclid: true, sessoes: 50 })])
		expect(p[0].tipo).toBe('click_id_sem_utm')
	})
})

describe('tendenciaPorCanal', () => {
	it('preenche dias vazios e separa por canal', () => {
		const t = tendenciaPorCanal([
			{ ...g({ utm_source: 'google', utm_medium: 'cpc', sessoes: 5, whatsapp: 1 }), dia: '2026-08-01' },
			{ ...g({ sessoes: 2 }), dia: '2026-08-01' },
			{ ...g({ sessoes: 4 }), dia: '2026-08-03' },
		])
		expect(t.map(p => p.dia)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
		expect(t[0]).toMatchObject({ sessoes: 7, whatsapp: 1, por_canal: { busca_paga: 5, direto: 2 } })
		expect(t[1].sessoes).toBe(0)
	})

	it('sem dados devolve lista vazia', () => {
		expect(tendenciaPorCanal([])).toEqual([])
	})
})
