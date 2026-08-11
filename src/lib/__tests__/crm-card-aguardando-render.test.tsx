import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CardKanban, type CrmCard } from '@/app/admin/crm/crm-card'

// BRT = UTC-3
const brt = (iso: string) => new Date(`${iso}-03:00`).getTime()

/** O card real do David de Foz: proposta de R$ 1,25 mi parada na fila. */
const base: CrmCard = {
	id: 'c1', etapa: 'novo', nome: 'David', telefone: '+5545991242400', email: null,
	veiculo: 'Porsche 911 Turbo S Coupe 2023', valor: 1250000, origem: 'patrocinado',
	vendedor: 'Cláudio Antônio', fonte_evento: 'alerta', situacao: 'aguardando_contato',
	andamento: null, impedimento: null, proxima_acao: null, proxima_acao_em: null,
	motivo_encerramento: null, veiculo_troca: null,
	atribuido_em: '2026-08-10T12:27:18Z', // 09:27 BRT
	primeiro_contato_em: null, encerrado_em: null, criado_em: null,
	atualizado_em: '2026-08-10T12:27:19Z', dados: null,
}

const render = (card: CrmCard, aguardando: boolean, agora: number) =>
	renderToStaticMarkup(
		<CardKanban card={card} encerrada={false} aguardando={aguardando} agora={agora} onSelect={() => {}} />,
	)

describe('CardKanban na coluna Aguardando aceite', () => {
	it('mostra o tempo sem aceite e a hora do alerta', () => {
		const html = render(base, true, brt('2026-08-10T13:31:00'))
		expect(html).toContain('sem aceite')
		expect(html).toContain('alertado 09:27')
	})

	it('4h de espera pinta o card de vermelho', () => {
		const html = render(base, true, brt('2026-08-10T13:31:00')) // 4h04 comerciais
		expect(html).toContain('4,1h sem aceite')
		expect(html).toMatch(/bg-red-500\/15/)
	})

	it('não mostra dois relógios: a faixa de espera substitui o tempo corrido', () => {
		// "14h" (corrido) e "2h sem aceite" (comercial) no mesmo card, para o
		// mesmo lead, se contradizem aos olhos de quem lê.
		const html = render(base, true, brt('2026-08-10T13:31:00'))
		const relogios = html.match(/>\d+(,\d)?h(min)?</g) ?? []
		expect(relogios).toHaveLength(0) // o único tempo está dentro do texto "4,1h sem aceite"
		expect(html).toContain('4,1h sem aceite')
	})

	it('sem data de alerta o tempo corrido genérico volta a aparecer', () => {
		const html = render({ ...base, atribuido_em: null }, true, brt('2026-08-10T13:31:00'))
		expect(html).toMatch(/text-\[11px\] text-foreground-secondary">\d/)
	})

	it('espera curta não alarma', () => {
		const html = render(base, true, brt('2026-08-10T10:00:00')) // 33min
		expect(html).toContain('Esperando aceite')
		expect(html).not.toMatch(/bg-red-500\/15/)
		expect(html).not.toContain('sem aceite')
	})

	it('a faixa de espera só aparece nessa coluna', () => {
		const html = render({ ...base, etapa: 'em_atendimento' }, false, brt('2026-08-10T13:31:00'))
		expect(html).not.toContain('sem aceite')
		expect(html).not.toContain('Esperando aceite')
	})

	it('card sem data de alerta entra na coluna sem inventar relógio', () => {
		const html = render({ ...base, atribuido_em: null }, true, brt('2026-08-10T13:31:00'))
		expect(html).toContain('David') // o card renderiza
		expect(html).not.toContain('sem aceite')
		expect(html).not.toContain('alertado')
	})

	it('o link de WhatsApp não duplica o código do país', () => {
		const html = render(base, true, brt('2026-08-10T13:31:00'))
		expect(html).toContain('https://wa.me/5545991242400')
		expect(html).not.toContain('wa.me/555')
	})

	it('a situação aguardando_contato tem rótulo humano, não o enum cru', () => {
		const html = render(base, true, brt('2026-08-10T13:31:00'))
		expect(html).toContain('Aguardando contato')
		expect(html).not.toContain('aguardando_contato')
	})
})
