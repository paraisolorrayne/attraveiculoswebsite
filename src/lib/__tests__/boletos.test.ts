import { describe, it, expect } from 'vitest'
import {
	campoDoTitulo, chaveDeDuplicata, diasAte, formatarTelefone, lerData, lerPlanilha, lerTexto, lerValor, lerVencimentos,
	linkDoWhatsapp, mensagemDeLembrete, normalizarTelefone, prazoPorExtenso, referenciaDoBoleto, situacaoDoBoleto,
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
		const vazio = { carro: null, placa: null, parcela: null, parcelas: null, aviso: null, ignorada: null }
		expect(p.linhas).toEqual([
			{ linha: 2, nome: 'MARIA DA SILVA', telefone: '34999990000', email: null, vencimento: '2026-12-05', valor: 1234.56, descricao: null, erros: [], ...vazio },
			{ linha: 4, nome: 'João Souza', telefone: '34988887777', email: null, vencimento: '2026-12-05', valor: 800, descricao: null, erros: [], ...vazio },
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

describe('parcelas: o vencimento como o financeiro escreve', () => {
	const datas = (v: unknown) => {
		const r = lerVencimentos(v, HOJE)
		return 'erro' in r ? r.erro : r.datas
	}

	it('um intervalo vira uma data por mês, no mesmo dia', () => {
		// De dezembro deste ano a julho do ano que vem.
		expect(datas('08/12 A 08/07')).toEqual(['2026-12-08', '2027-01-08', '2027-02-08', '2027-03-08', '2027-04-08', '2027-05-08', '2027-06-08', '2027-07-08'])
		expect(datas('10/12 A 10/02')).toEqual(['2026-12-10', '2027-01-10', '2027-02-10'])
		// Só o fim com ano.
		expect(datas('04/12 A 04/09/27')).toHaveLength(10)
		expect(datas('04/12 A 04/09/27')[9]).toBe('2027-09-04')
		// Em novembro, "20/01" é janeiro do ano que vem; o fim vem depois do começo.
		expect(datas('20/01 A 20/10')).toHaveLength(10)
		expect(datas('20/01 A 20/10')[0]).toBe('2027-01-20')
		expect(datas('20/01 A 20/10')[9]).toBe('2027-10-20')
		// Outras grafias do "a".
		expect(datas('08/12 a 08/01')).toEqual(['2026-12-08', '2027-01-08'])
		expect(datas('08/12 até 08/01')).toEqual(['2026-12-08', '2027-01-08'])
		expect(datas('08/12/2026 - 08/01/2027')).toEqual(['2026-12-08', '2027-01-08'])
	})

	it('dia 31 cai no último dia dos meses mais curtos', () => {
		expect(datas('31/01/2027 A 31/03/2027')).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
	})

	it('uma data só continua sendo uma data', () => {
		expect(datas('2027-05-15')).toEqual(['2027-05-15'])
		expect(datas('15/05/2027')).toEqual(['2027-05-15'])
		expect(datas(46361)).toEqual(['2026-12-05'])
	})

	it('avisa quando o ano não estava escrito, para a pessoa conferir', () => {
		expect(lerVencimentos('08/12 A 08/07', HOJE)).toMatchObject({ aviso: 'vencimento sem ano: entendi 8 parcelas, de 08/12/2026 a 08/07/2027' })
		expect(lerVencimentos('25/11', HOJE)).toMatchObject({ aviso: 'vencimento sem ano: entendi 25/11/2026' })
		expect(lerVencimentos('08/12/2026 A 08/07/2027', HOJE)).toMatchObject({ aviso: null })
		expect(lerVencimentos('15/05/2027', HOJE)).toMatchObject({ aviso: null })
	})

	it('recusa intervalo que não fecha', () => {
		expect(datas('08/12 A 15/07')).toBe('o dia do começo e do fim das parcelas é diferente')
		expect(datas('08/12/2027 A 08/07/2027')).toBe('o fim das parcelas vem antes do começo')
		expect(datas('08/12 A semana que vem')).toBe('vencimento inválido')
		expect(datas('08/01/2027 A 08/01/2040')).toBe('mais de 120 parcelas')
	})
})

describe('a planilha de cobrança do financeiro (carro, placa, valor da parcela, vencimento, cliente, contato)', () => {
	const planilha = [
		['CARRO', 'PLACA', 'VALOR PARCELA', 'VENCIMENTO', 'CLIENTE', 'CONTATO'],
		['PANAMERA', 'AAA-1A11', 62500, '20/01 A 20/10', 'Fulano ', null],
		['DEFENDER', 'BBB-2B22', 680000, '2027-05-15', 'BELTRANO', '34 99999-0001'],
		['RANGE ROVER SPORT', 'CCC-3C33', 42000, '08/12 A 08/07', 'SICRANO', '34 99999-0002'],
		['DEFENDER', '0KM', 50000, '08/12 A 08/07', 'SICRANO', '34 99999-0002'],
		['CAYENNE', 'DDD-4D44', 28420, '10/09 A 10/02', 'ZUTANO', '34 99999-0003'],
	]
	const p = lerPlanilha(planilha, HOJE)

	it('reconhece as colunas, com o contato valendo como telefone', () => {
		expect(p.erro).toBeNull()
		expect(p.colunas).toEqual({ carro: 0, placa: 1, valor: 2, vencimento: 3, nome: 4, telefone: 5 })
	})

	it('cada linha vira as parcelas dela, com carro, placa e o número da parcela', () => {
		const range = p.linhas.filter(l => l.linha === 4)
		expect(range).toHaveLength(8)
		expect(range[0]).toMatchObject({ nome: 'SICRANO', telefone: '34999990002', carro: 'RANGE ROVER SPORT', placa: 'CCC-3C33', valor: 42000, vencimento: '2026-12-08', parcela: 1, parcelas: 8, erros: [], ignorada: null })
		expect(range[7]).toMatchObject({ vencimento: '2027-07-08', parcela: 8, parcelas: 8 })
		// Data única: um boleto só, sem número de parcela.
		expect(p.linhas.filter(l => l.linha === 3)).toMatchObject([{ vencimento: '2027-05-15', valor: 680000, parcela: null, parcelas: null }])
	})

	it('linha sem contato fica de fora inteira, uma vez só', () => {
		expect(p.linhas.filter(l => l.linha === 2)).toMatchObject([{ nome: 'Fulano', erros: ['sem telefone'], parcela: null }])
	})

	it('o mesmo cliente com dois carros no mesmo dia não é duplicado', () => {
		const a = p.linhas.find(l => l.linha === 4 && l.parcela === 1)!
		const b = p.linhas.find(l => l.linha === 5 && l.parcela === 1)!
		expect(a.vencimento).toBe(b.vencimento)
		expect(chaveDeDuplicata(a)).not.toBe(chaveDeDuplicata(b))
		// Mesmo valor, carros diferentes: continua não sendo duplicado.
		expect(chaveDeDuplicata({ ...a, valor: 50000 })).not.toBe(chaveDeDuplicata(b))
		// E a mesma parcela lida de novo é.
		expect(chaveDeDuplicata(a)).toBe(chaveDeDuplicata({ ...a, nome: 'Outro nome' } as typeof a))
	})

	it('parcela de um intervalo que já venceu não é criada; data única vencida é', () => {
		// 10/09 A 10/02 em 18/11: setembro, outubro e novembro já passaram.
		const cayenne = p.linhas.filter(l => l.linha === 6)
		expect(cayenne.map(l => [l.vencimento, l.parcela, l.ignorada])).toEqual([
			['2026-09-10', 1, 'parcela já vencida'],
			['2026-10-10', 2, 'parcela já vencida'],
			['2026-11-10', 3, 'parcela já vencida'],
			['2026-12-10', 4, null],
			['2027-01-10', 5, null],
			['2027-02-10', 6, null],
		])
		const unica = lerPlanilha([['Nome', 'Vencimento', 'Telefone'], ['Maria', '10/11/2026', '34 99999-0000']], HOJE)
		expect(unica.linhas[0]).toMatchObject({ vencimento: '2026-11-10', ignorada: null, erros: [] })
	})

	it('descreve o boleto numa linha e no lembrete', () => {
		const l = p.linhas.find(x => x.linha === 4 && x.parcela === 3)!
		expect(referenciaDoBoleto(l)).toBe('RANGE ROVER SPORT · CCC-3C33 · parcela 3 de 8')
		expect(referenciaDoBoleto({ carro: null, placa: null, parcela: null, parcelas: null })).toBeNull()
		const m = mensagemDeLembrete(l, HOJE)
		expect(m).toContain('Olá, Sicrano!')
		expect(m).toContain('a parcela 3 de 8 do veículo RANGE ROVER SPORT, de R$')
		expect(m).toContain('vence em 08/02')
		const atrasada = mensagemDeLembrete({ ...l, vencimento: '2026-11-08', valor: null }, HOJE)
		expect(atrasada).toContain('o pagamento da parcela 3 de 8 do veículo RANGE ROVER SPORT que venceu em 08/11')
		expect(m + atrasada).not.toMatch(/—| – /)
	})
})

describe('telefone protegido na lista', async () => {
	const { identificacaoDoBoleto, mascararTelefone, paraALista } = await import('@/lib/boletos')

	it('mostra só os quatro últimos dígitos', () => {
		expect(mascararTelefone('34999990537')).toBe('****0537')
		expect(mascararTelefone('(34) 3222-0000')).toBe('****0000')
		expect(mascararTelefone('12')).toBe('****')
	})

	it('o boleto da lista não leva o telefone inteiro nem o e-mail', () => {
		const b = {
			id: 'x', nome: 'MARIA', telefone: '34999990537', email: 'maria@exemplo.com', vencimento: '2026-12-08', valor: 50000, descricao: null,
			carro: 'DEFENDER', placa: '0KM', parcela: 1, parcelas: 8, status: 'aberto' as const, pago_em: null, origem: 'planilha', lote_id: null, lembretes: 0,
			ultimo_lembrete_em: null, promessa_em: null, comprovante_em: null, comprovante_url: null, falha_envio: null, criado_por_nome: null, criado_em: '', atualizado_em: '',
		}
		const daLista = paraALista(b)
		expect(daLista.telefone_final).toBe('****0537')
		expect(JSON.stringify(daLista)).not.toContain('34999990537')
		expect(JSON.stringify(daLista)).not.toContain('maria@exemplo.com')
		// Nome, carro e fim do telefone: o que distingue dois clientes de mesmo primeiro nome.
		expect(identificacaoDoBoleto(daLista)).toBe('MARIA · DEFENDER · ****0537')
		expect(identificacaoDoBoleto({ nome: 'Maria', carro: null, telefone_final: '****0000' })).toBe('Maria · ****0000')
	})
})
