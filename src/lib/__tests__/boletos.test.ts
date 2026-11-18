import { describe, it, expect } from 'vitest'
import {
	campoDoTitulo, chaveDeDuplicata, diasAte, formatarTelefone, lerData, lerPlanilha, lerTexto, lerValor,
	linkDoWhatsapp, mensagemDeLembrete, normalizarTelefone, prazoPorExtenso, situacaoDoBoleto,
} from '@/lib/boletos'

const HOJE = '2026-11-18'

describe('telefone', () => {
	it('aceita os jeitos comuns de escrever e guarda só DDD + número', () => {
		expect(normalizarTelefone('(34) 99999-0000')).toEqual({ telefone: '34999990000' })
		expect(normalizarTelefone('+55 34 99999-0000')).toEqual({ telefone: '34999990000' })
		expect(normalizarTelefone('5534999990000')).toEqual({ telefone: '34999990000' })
		expect(normalizarTelefone('034 3222-0000')).toEqual({ telefone: '3432220000' })
		// Célula numérica do Excel.
		expect(normalizarTelefone(34999990000)).toEqual({ telefone: '34999990000' })
	})

	it('não adivinha DDD nem aceita número quebrado', () => {
		expect(normalizarTelefone('99999-0000')).toEqual({ erro: 'telefone sem DDD' })
		expect(normalizarTelefone('3222-0000')).toEqual({ erro: 'telefone sem DDD' })
		expect(normalizarTelefone('')).toEqual({ erro: 'sem telefone' })
		expect(normalizarTelefone(null)).toEqual({ erro: 'sem telefone' })
		expect(normalizarTelefone('123')).toEqual({ erro: 'telefone inválido' })
		expect(normalizarTelefone('349999900001234')).toEqual({ erro: 'telefone inválido' })
	})

	it('formata para leitura', () => {
		expect(formatarTelefone('34999990000')).toBe('(34) 99999-0000')
		expect(formatarTelefone('3432220000')).toBe('(34) 3222-0000')
	})
})

describe('data de vencimento', () => {
	it('lê os formatos brasileiros e o ISO', () => {
		expect(lerData('05/12/2026', HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('5/12/26', HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('05-12-2026', HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('05.12.2026', HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('2026-12-05', HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('2026-12-05T00:00:00.000Z', HOJE)).toEqual({ data: '2026-12-05' })
	})

	it('lê o número de série do Excel', () => {
		// 46361 = 05/12/2026 no Excel.
		expect(lerData(46361, HOJE)).toEqual({ data: '2026-12-05' })
		expect(lerData('46361', HOJE)).toEqual({ data: '2026-12-05' })
	})

	it('sem ano, assume a data mais próxima para a frente', () => {
		expect(lerData('25/11', HOJE)).toEqual({ data: '2026-11-25' })
		// Em novembro, "15/01" é janeiro do ano que vem.
		expect(lerData('15/01', HOJE)).toEqual({ data: '2027-01-15' })
		// Venceu há pouco: continua neste ano.
		expect(lerData('10/11', HOJE)).toEqual({ data: '2026-11-10' })
	})

	it('mês/dia só quando não há outra leitura', () => {
		expect(lerData('12/25/2026', HOJE)).toEqual({ data: '2026-12-25' })
		// Ambíguo é dia/mês, como no Brasil.
		expect(lerData('03/04/2026', HOJE)).toEqual({ data: '2026-04-03' })
	})

	it('recusa data que não existe', () => {
		expect(lerData('31/02/2026', HOJE)).toEqual({ erro: 'vencimento inválido' })
		expect(lerData('amanhã', HOJE)).toEqual({ erro: 'vencimento inválido' })
		expect(lerData('', HOJE)).toEqual({ erro: 'sem vencimento' })
		expect(lerData(12, HOJE)).toEqual({ erro: 'vencimento inválido' })
	})
})

describe('valor', () => {
	it('lê dinheiro brasileiro, americano e número', () => {
		expect(lerValor('R$ 1.234,56')).toEqual({ valor: 1234.56 })
		expect(lerValor('1234,5')).toEqual({ valor: 1234.5 })
		expect(lerValor('1,234.56')).toEqual({ valor: 1234.56 })
		expect(lerValor('1.500')).toEqual({ valor: 1500 })
		expect(lerValor('1500.5')).toEqual({ valor: 1500.5 })
		expect(lerValor(899.999)).toEqual({ valor: 900 })
	})

	it('vazio é sem valor; lixo e zero são erro', () => {
		expect(lerValor('')).toEqual({ valor: null })
		expect(lerValor(null)).toEqual({ valor: null })
		expect(lerValor('a combinar')).toEqual({ erro: 'valor inválido' })
		expect(lerValor(0)).toEqual({ erro: 'valor inválido' })
		expect(lerValor('-50')).toEqual({ erro: 'valor inválido' })
	})
})

describe('planilha', () => {
	it('acha as colunas pelo título, em qualquer ordem e grafia', () => {
		expect(campoDoTitulo('Nome do Cliente')).toBe('nome')
		expect(campoDoTitulo('VENCIMENTO')).toBe('vencimento')
		expect(campoDoTitulo('Data de Vencimento')).toBe('vencimento')
		expect(campoDoTitulo('Telefone')).toBe('telefone')
		expect(campoDoTitulo('WhatsApp')).toBe('telefone')
		expect(campoDoTitulo('Contato')).toBe('contato')
		expect(campoDoTitulo('Valor (R$)')).toBe('valor')
		expect(campoDoTitulo('Observações')).toBe('descricao')
		expect(campoDoTitulo('Banco')).toBeNull()

		const p = lerPlanilha(
			[
				['Vencimento', 'Telefone', 'Nome', 'Valor'],
				['05/12/2026', '(34) 99999-0000', 'MARIA DA SILVA', '1.234,56'],
				[null, null, null, null],
				[46361, 34988887777, 'João Souza', 800],
			],
			HOJE,
		)
		expect(p.erro).toBeNull()
		expect(p.comTitulos).toBe(true)
		expect(p.linhas).toEqual([
			{ linha: 2, nome: 'MARIA DA SILVA', telefone: '34999990000', email: null, vencimento: '2026-12-05', valor: 1234.56, descricao: null, erros: [] },
			{ linha: 4, nome: 'João Souza', telefone: '34988887777', email: null, vencimento: '2026-12-05', valor: 800, descricao: null, erros: [] },
		])
	})

	it('a planilha do financeiro: nome, vencimento, telefone e contato', () => {
		const p = lerPlanilha(
			[
				['Nome', 'Vencimento', 'Telefone', 'Contato'],
				['Maria', '25/11/2026', '34 99999-0000', 'maria@exemplo.com'],
				['João', '26/11/2026', '34 98888-7777', 'Ana (esposa) 34 97777-6666'],
				['Pedro', '27/11/2026', '34 96666-5555', '(34) 96666-5555'],
			],
			HOJE,
		)
		expect(p.linhas.map(l => [l.email, l.descricao, l.erros])).toEqual([
			['maria@exemplo.com', null, []],
			[null, 'Contato: Ana (esposa) 34 97777-6666', []],
			// O mesmo número repetido não vira anotação.
			[null, null, []],
		])
	})

	it('só "Contato", sem "Telefone": o contato é o telefone', () => {
		const p = lerPlanilha([['Nome', 'Vencimento', 'Contato'], ['Maria', '25/11/2026', '34 99999-0000']], HOJE)
		expect(p.erro).toBeNull()
		expect(p.linhas[0].telefone).toBe('34999990000')
	})

	it('sem linha de títulos, acha as colunas pelo conteúdo', () => {
		const p = lerPlanilha(
			[
				['Maria da Silva', '25/11/2026', '34 99999-0000'],
				['João Souza', '26/11/2026', '34 98888-7777'],
			],
			HOJE,
		)
		expect(p.comTitulos).toBe(false)
		expect(p.colunas).toMatchObject({ nome: 0, vencimento: 1, telefone: 2 })
		expect(p.linhas).toHaveLength(2)
		expect(p.linhas[0].linha).toBe(1)
	})

	it('aponta o erro de cada linha sem derrubar as outras', () => {
		const p = lerPlanilha(
			[
				['Nome', 'Vencimento', 'Telefone'],
				['Maria', '25/11/2026', '99999-0000'],
				['', '31/02/2026', '34 98888-7777'],
				['Pedro', '27/11/2026', '34 96666-5555'],
			],
			HOJE,
		)
		expect(p.linhas.map(l => l.erros)).toEqual([['telefone sem DDD'], ['sem nome', 'vencimento inválido'], []])
	})

	it('diz qual coluna obrigatória faltou', () => {
		const p = lerPlanilha([['Nome', 'Valor'], ['Maria', '100']], HOJE)
		expect(p.linhas).toEqual([])
		expect(p.erro).toContain('vencimento')
		expect(p.erro).toContain('telefone')
		expect(lerPlanilha([], HOJE).erro).toBe('A planilha está vazia.')
		expect(lerPlanilha([['Nome', 'Vencimento', 'Telefone']], HOJE).erro).toBe('A planilha só tem a linha de títulos.')
	})
})

describe('texto colado e CSV', () => {
	it('colado do Excel vem separado por tabulação', () => {
		expect(lerTexto('Nome\tVencimento\tTelefone\nMaria\t25/11/2026\t34 99999-0000\n')).toEqual([
			['Nome', 'Vencimento', 'Telefone'],
			['Maria', '25/11/2026', '34 99999-0000'],
		])
	})

	it('CSV com ponto e vírgula, aspas e valor com vírgula', () => {
		const linhas = lerTexto('﻿Nome;Vencimento;Telefone;Valor\r\n"Silva, Maria";25/11/2026;34 99999-0000;"1.234,56"\r\n')
		expect(linhas).toEqual([
			['Nome', 'Vencimento', 'Telefone', 'Valor'],
			['Silva, Maria', '25/11/2026', '34 99999-0000', '1.234,56'],
		])
		expect(lerPlanilha(linhas, HOJE).linhas[0]).toMatchObject({ nome: 'Silva, Maria', valor: 1234.56, erros: [] })
	})

	it('CSV com vírgula e célula vazia', () => {
		expect(lerTexto('Nome,Vencimento,Telefone\nMaria,,34999990000')).toEqual([
			['Nome', 'Vencimento', 'Telefone'],
			['Maria', null, '34999990000'],
		])
	})
})

describe('situação e prazo', () => {
	it('o aberto se divide pela data; o resto é o status gravado', () => {
		expect(situacaoDoBoleto({ status: 'aberto', vencimento: '2026-11-17' }, HOJE)).toBe('atraso')
		expect(situacaoDoBoleto({ status: 'aberto', vencimento: HOJE }, HOJE)).toBe('hoje')
		expect(situacaoDoBoleto({ status: 'aberto', vencimento: '2026-11-19' }, HOJE)).toBe('a-vencer')
		expect(situacaoDoBoleto({ status: 'pago', vencimento: '2026-11-01' }, HOJE)).toBe('pago')
		expect(situacaoDoBoleto({ status: 'em_negociacao', vencimento: '2026-11-01' }, HOJE)).toBe('em_negociacao')
	})

	it('conta os dias sem escorregar na virada do ano', () => {
		expect(diasAte('2027-01-02', '2026-12-30')).toBe(3)
		expect(prazoPorExtenso(HOJE, HOJE)).toBe('vence hoje')
		expect(prazoPorExtenso('2026-11-19', HOJE)).toBe('vence amanhã')
		expect(prazoPorExtenso('2026-11-17', HOJE)).toBe('venceu ontem')
		expect(prazoPorExtenso('2026-11-28', HOJE)).toBe('vence em 10 dias')
		expect(prazoPorExtenso('2026-11-08', HOJE)).toBe('venceu há 10 dias')
	})

	it('duplicado é o mesmo telefone, vencimento e valor', () => {
		const a = { telefone: '34999990000', vencimento: '2026-12-05', valor: 100 }
		expect(chaveDeDuplicata(a)).toBe(chaveDeDuplicata({ ...a, valor: 100.0 }))
		expect(chaveDeDuplicata(a)).not.toBe(chaveDeDuplicata({ ...a, valor: null }))
		expect(chaveDeDuplicata(a)).not.toBe(chaveDeDuplicata({ ...a, vencimento: '2026-12-06' }))
	})
})

describe('lembrete', () => {
	const b = { nome: 'MARIA DA SILVA', vencimento: '2026-11-25', valor: 1234.56 }

	it('antes de vencer lembra; depois de vencer pergunta; nunca usa travessão', () => {
		const antes = mensagemDeLembrete(b, HOJE)
		expect(antes).toContain('Olá, Maria!')
		expect(antes).toContain('vence em 25/11')
		expect(antes).toMatch(/R\$\s1\.234,56/)
		expect(mensagemDeLembrete({ ...b, vencimento: HOJE }, HOJE)).toContain('vence hoje (18/11)')
		expect(mensagemDeLembrete({ ...b, vencimento: '2026-11-19' }, HOJE)).toContain('vence amanhã (19/11)')
		const depois = mensagemDeLembrete({ ...b, vencimento: '2026-11-10', valor: null }, HOJE)
		expect(depois).toContain('venceu em 10/11')
		expect(depois).not.toContain('R$')
		for (const m of [antes, depois]) expect(m).not.toMatch(/—| – /)
	})

	it('o link leva o 55 e o texto codificado', () => {
		expect(linkDoWhatsapp('34999990000', 'Olá, Maria!')).toBe('https://wa.me/5534999990000?text=Ol%C3%A1%2C%20Maria!')
	})
})
