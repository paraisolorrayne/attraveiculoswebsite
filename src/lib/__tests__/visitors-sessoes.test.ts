import { describe, it, expect } from 'vitest'
import {
	descreverSessao,
	filtrarSessoes,
	montarJornadas,
	ordenarSessoes,
	paginar,
	temProblema,
	type SessaoCrua,
	type ToqueCru,
} from '@/lib/visitors/sessoes'

function s(p: Partial<SessaoCrua> & { session_id: string }): SessaoCrua {
	return {
		started_at: '2026-08-20T12:00:00Z',
		duration_seconds: null,
		city: null,
		region: null,
		device_type: null,
		referrer_domain: null,
		utm_source: null,
		utm_medium: null,
		utm_campaign: null,
		utm_content: null,
		utm_term: null,
		utm_id: null,
		gclid: null,
		fbclid: null,
		ttclid: null,
		entrada: '/',
		entrada_veiculo: null,
		veiculos: 0,
		contacted_whatsapp: false,
		submitted_form: false,
		...p,
	}
}

const SESSOES = [
	s({ session_id: 'a', utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'Porsche 911', contacted_whatsapp: true }),
	s({ session_id: 'b', gclid: 'x', entrada: '/veiculo/porsche-911' }),
	s({ session_id: 'c', referrer_domain: 'www.linktr.ee', submitted_form: true }),
	s({ session_id: 'd', utm_source: 'facebook', utm_medium: 'cpc', utm_id: '123' }),
	s({ session_id: 'e' }),
].map(descreverSessao)

describe('descreverSessao', () => {
	it('canal, fonte, meio e campanha (com queda para o ID) de cada sessão', () => {
		expect(SESSOES[0]).toMatchObject({ canal: 'busca_paga', fonte: 'google', meio: 'cpc', campanha: 'Porsche 911', chave_campanha: 'porsche 911' })
		expect(SESSOES[1]).toMatchObject({ canal: 'busca_paga', fonte: 'google', meio: '(sem meio)', chave_campanha: null })
		expect(SESSOES[2]).toMatchObject({ canal: 'social_organico', rotulo_fonte: 'Linktree (bio do Instagram)' })
		expect(SESSOES[3]).toMatchObject({ canal: 'social_pago', campanha: 'campanha #123', chave_campanha: 'campanha #123' })
		expect(SESSOES[4]).toMatchObject({ canal: 'direto', fonte: '(sem fonte)' })
	})
})

describe('filtrarSessoes — os filtros que as outras abas linkam', () => {
	const ids = (f: Parameters<typeof filtrarSessoes>[1]) => filtrarSessoes(SESSOES, f).map(x => x.session_id)

	it('por canal, fonte, meio e campanha', () => {
		expect(ids({ canal: 'busca_paga' })).toEqual(['a', 'b'])
		expect(ids({ fonte: 'google', meio: 'cpc' })).toEqual(['a'])
		expect(ids({ campanha: 'campanha #123' })).toEqual(['d'])
	})

	it('por referrer (sem www) e por página de entrada', () => {
		expect(ids({ referrer: 'linktr.ee' })).toEqual(['c'])
		expect(ids({ entrada: '/veiculo/porsche-911' })).toEqual(['b'])
	})

	it('por conversão', () => {
		expect(ids({ conversao: 'qualquer' })).toEqual(['a', 'c'])
		expect(ids({ conversao: 'formulario' })).toEqual(['c'])
		expect(ids({ conversao: 'nenhuma' })).toEqual(['b', 'd', 'e'])
	})

	it('por problema de marcação e por sessão específica', () => {
		expect(ids({ problema: 'click_id_sem_utm' })).toEqual(['b'])
		expect(ids({ problema: 'paga_sem_campanha' })).toEqual(['b'])
		expect(ids({ sessao: 'e' })).toEqual(['e'])
	})
})

describe('temProblema', () => {
	it('gclid com fonte facebook contradiz', () => {
		const x = descreverSessao(s({ session_id: 'x', utm_source: 'facebook', utm_medium: 'cpc', gclid: 'g' }))
		expect(temProblema(x, 'click_id_contradiz_fonte')).toBe(true)
		expect(temProblema(SESSOES[0], 'click_id_contradiz_fonte')).toBe(false)
	})
	it('meio fora do vocabulário', () => {
		const x = descreverSessao(s({ session_id: 'x', utm_source: 'facebook', utm_medium: 'instagram' }))
		expect(temProblema(x, 'meio_desconhecido')).toBe(true)
	})
})

describe('paginar', () => {
	it('recorta e trava a página nos limites', () => {
		const itens = Array.from({ length: 120 }, (_, i) => i)
		expect(paginar(itens, 3, 50)).toMatchObject({ pagina: 3, paginas: 3 })
		expect(paginar(itens, 3, 50).itens).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119])
		expect(paginar(itens, 99, 50).pagina).toBe(3)
		expect(paginar([], 1, 50)).toEqual({ pagina: 1, paginas: 1, itens: [] })
	})
})

describe('montarJornadas — primeira × última origem', () => {
	const t = (p: Partial<ToqueCru> & { fingerprint_id: string; session_id: string; started_at: string }): ToqueCru => ({
		utm_source: null, utm_medium: null, utm_campaign: null, utm_id: null,
		gclid: null, fbclid: null, ttclid: null, referrer_domain: null,
		contacted_whatsapp: true, submitted_form: false, ...p,
	})

	it('cruza o primeiro toque com a sessão que converteu e monta a matriz por canal', () => {
		const convertidas = [
			t({ fingerprint_id: 'f1', session_id: 's3', started_at: '2026-08-20T10:00:00Z' }), // direto
			t({ fingerprint_id: 'f2', session_id: 's9', started_at: '2026-08-21T10:00:00Z', utm_source: 'google', utm_medium: 'cpc' }),
			t({ fingerprint_id: 'f3', session_id: 's5', started_at: '2026-08-22T10:00:00Z' }), // só uma sessão
		]
		const primeiras = [
			t({ fingerprint_id: 'f1', session_id: 's1', started_at: '2026-08-10T10:00:00Z', utm_source: 'facebook', utm_medium: 'cpc' }),
			t({ fingerprint_id: 'f2', session_id: 's7', started_at: '2026-08-19T10:00:00Z', referrer_domain: 'chatgpt.com' }),
			t({ fingerprint_id: 'f3', session_id: 's5', started_at: '2026-08-22T10:00:00Z' }),
		]
		const r = montarJornadas(convertidas, primeiras, { f1: 3, f2: 2, f3: 1 })
		expect(r.visitantes_uma_sessao).toBe(1)
		expect(r.jornadas).toHaveLength(2)
		const f1 = r.jornadas.find(j => j.fingerprint_id === 'f1')!
		expect(f1).toMatchObject({ sessoes: 3, dias: 10 })
		expect(f1.primeira.canal).toBe('social_pago')
		expect(f1.conversao.canal).toBe('direto')
		expect(r.matriz).toEqual([
			{ primeira: 'social_pago', conversao: 'direto', jornadas: 1 },
			{ primeira: 'assistente_ia', conversao: 'busca_paga', jornadas: 1 },
		].sort((a, b) => b.jornadas - a.jornadas))
	})

	it('um visitante que converteu duas vezes conta uma jornada', () => {
		const c = [
			t({ fingerprint_id: 'f1', session_id: 's2', started_at: '2026-08-20T10:00:00Z' }),
			t({ fingerprint_id: 'f1', session_id: 's3', started_at: '2026-08-25T10:00:00Z' }),
		]
		const p = [t({ fingerprint_id: 'f1', session_id: 's1', started_at: '2026-08-01T10:00:00Z' })]
		expect(montarJornadas(c, p, { f1: 3 }).jornadas).toHaveLength(1)
	})
})

describe('filtros por coluna e ordenação (29/08/2026)', () => {
	const linhas = [
		s({ session_id: 'a', city: 'Uberlândia', region: 'Minas Gerais', device_type: 'mobile', veiculos: 3, duration_seconds: 200 }),
		s({ session_id: 'b', city: 'São Paulo', region: 'São Paulo', device_type: 'desktop', veiculos: 0, duration_seconds: 30 }),
		s({ session_id: 'c', city: null, region: null, device_type: 'mobile', veiculos: 1, duration_seconds: null }),
	].map(descreverSessao)
	const ids = (f: Parameters<typeof filtrarSessoes>[1]) => filtrarSessoes(linhas, f).map(x => x.session_id)

	it('cidade casa cidade ou estado, sem caixa', () => {
		expect(ids({ cidade: 'uberl' })).toEqual(['a'])
		expect(ids({ cidade: 'são paulo' })).toEqual(['b'])
	})

	it('aparelho casa exato', () => {
		expect(ids({ aparelho: 'mobile' })).toEqual(['a', 'c'])
	})

	it('veículos e duração aceitam mínimo e máximo', () => {
		expect(ids({ veiculos_min: 1 })).toEqual(['a', 'c'])
		expect(ids({ veiculos_max: 0 })).toEqual(['b'])
		expect(ids({ duracao_min: 100 })).toEqual(['a'])
	})

	it('sessão sem duração não passa em filtro de duração — ausência não é zero', () => {
		expect(ids({ duracao_max: 60 })).toEqual(['b'])
	})

	it('ordena por coluna, com vazios no fim, e ignora coluna desconhecida', () => {
		expect(ordenarSessoes(linhas, { chave: 'veiculos', direcao: 'desc' }).map(x => x.session_id)).toEqual(['a', 'c', 'b'])
		expect(ordenarSessoes(linhas, { chave: 'duracao', direcao: 'asc' }).map(x => x.session_id)).toEqual(['b', 'a', 'c'])
		expect(ordenarSessoes(linhas, { chave: 'inventada', direcao: 'asc' })).toBe(linhas)
	})

	it('ordena por contato: WhatsApp na frente de formulário, e sem contato por último', () => {
		const comContato = [
			s({ session_id: 'x' }),
			s({ session_id: 'y', submitted_form: true }),
			s({ session_id: 'z', contacted_whatsapp: true }),
		].map(descreverSessao)
		expect(ordenarSessoes(comContato, { chave: 'contato', direcao: 'desc' }).map(x => x.session_id)).toEqual(['z', 'y', 'x'])
	})
})
