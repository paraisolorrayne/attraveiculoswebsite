/**
 * Regras dos boletos do financeiro (18/11/2026): como ler a planilha, o que é
 * um telefone e uma data válidos, em que situação o boleto está e o texto do
 * lembrete. Tudo puro, sem banco e sem tela, para o navegador (prévia da
 * planilha) e o servidor (gravação) decidirem igual.
 *
 * A planilha vem do financeiro com nome, vencimento e telefone, às vezes com
 * valor e observação. Ela não tem formato fixo: as colunas são achadas pelo
 * título e, sem título, pelo conteúdo.
 */

export type StatusBoleto = 'aberto' | 'em_negociacao' | 'pago' | 'cancelado'
export const STATUS_DO_BOLETO: readonly StatusBoleto[] = ['aberto', 'em_negociacao', 'pago', 'cancelado']

/**
 * O que a tela mostra: o status gravado, com o aberto dividido pelo que o
 * cliente já respondeu (mandou comprovante, prometeu uma data) e pela data.
 */
export type SituacaoBoleto = 'comprovante' | 'promessa' | 'atraso' | 'hoje' | 'a-vencer' | 'em_negociacao' | 'pago' | 'cancelado'

export const ROTULO_DA_SITUACAO: Record<SituacaoBoleto, string> = {
	comprovante: 'Comprovante para conferir',
	promessa: 'Prometeu pagar',
	atraso: 'Em atraso',
	hoje: 'Vence hoje',
	'a-vencer': 'A vencer',
	em_negociacao: 'Em negociação',
	pago: 'Pago',
	cancelado: 'Cancelado',
}

export interface Boleto {
	id: string
	nome: string
	telefone: string
	email: string | null
	/** AAAA-MM-DD */
	vencimento: string
	valor: number | null
	descricao: string | null
	/** O carro e a placa a que o boleto se refere, quando a planilha informa. */
	carro: string | null
	placa: string | null
	/** "Parcela 3 de 10": `parcela` = 3 e `parcelas` = 10. Boleto avulso não tem. */
	parcela: number | null
	parcelas: number | null
	status: StatusBoleto
	pago_em: string | null
	origem: string
	lote_id: string | null
	lembretes: number
	ultimo_lembrete_em: string | null
	/** Dia em que o cliente disse que paga (AAAA-MM-DD), informado pelo Fykos. */
	promessa_em: string | null
	/** Quando o cliente mandou o comprovante, e o link dele. */
	comprovante_em: string | null
	comprovante_url: string | null
	/** Motivo do último lembrete que não foi entregue; some no próximo que for. */
	falha_envio: string | null
	criado_por_nome: string | null
	criado_em: string
	atualizado_em: string
}

export interface EventoDoBoleto {
	id: string
	tipo: string
	descricao: string | null
	por_nome: string | null
	criado_em: string
}

const DIA_MS = 24 * 60 * 60 * 1000

/** O dia de hoje em São Paulo, como AAAA-MM-DD. */
export function hojeBRT(agora: Date = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)
}

/** Dias de `hoje` até o vencimento: negativo = já venceu. */
export function diasAte(vencimento: string, hoje: string): number {
	return Math.round((Date.parse(`${vencimento}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / DIA_MS)
}

export function somarDias(dia: string, n: number): string {
	return new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10)
}

/**
 * A ordem importa e é a mesma dos filtros do banco (boletos-db.ts): pago e
 * cancelado encerram; comprovante recebido pede conferência antes de qualquer
 * outra coisa; promessa só vale enquanto a data prometida não passou.
 */
export function situacaoDoBoleto(
	b: { status: string; vencimento: string; comprovante_em?: string | null; promessa_em?: string | null },
	hoje: string,
): SituacaoBoleto {
	if (b.status === 'pago' || b.status === 'cancelado') return b.status
	if (b.comprovante_em) return 'comprovante'
	if (b.status === 'em_negociacao') return 'em_negociacao'
	if (b.promessa_em && b.promessa_em >= hoje) return 'promessa'
	const dias = diasAte(b.vencimento, hoje)
	return dias < 0 ? 'atraso' : dias === 0 ? 'hoje' : 'a-vencer'
}

/** "vence em 3 dias", "venceu ontem", "vence hoje". */
export function prazoPorExtenso(vencimento: string, hoje: string): string {
	const dias = diasAte(vencimento, hoje)
	if (dias === 0) return 'vence hoje'
	if (dias === 1) return 'vence amanhã'
	if (dias === -1) return 'venceu ontem'
	return dias > 0 ? `vence em ${dias} dias` : `venceu há ${-dias} dias`
}

export const dataBR = (dia: string): string => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`

/* --------------------------------------------------------------- telefone */

/**
 * Telefone brasileiro com DDD, só dígitos e sem o 55. Sem DDD é erro: adivinhar
 * o DDD manda o lembrete para o número de outra pessoa.
 */
export function normalizarTelefone(v: unknown): { telefone: string } | { erro: string } {
	let d = String(v ?? '').replace(/\D/g, '').replace(/^0+/, '')
	if (!d) return { erro: 'sem telefone' }
	if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
	if (d.length === 8 || d.length === 9) return { erro: 'telefone sem DDD' }
	if (d.length !== 10 && d.length !== 11) return { erro: 'telefone inválido' }
	if (d[0] === '0' || d[1] === '0') return { erro: 'DDD inválido' }
	return { telefone: d }
}

/**
 * O telefone como aparece na LISTA: só os quatro últimos dígitos, "****0537".
 * A lista é a tela que fica aberta o dia inteiro e mostra todo mundo de uma
 * vez; o número inteiro só aparece na página do boleto, para quem vai ligar.
 */
export function mascararTelefone(t: string): string {
	const d = t.replace(/\D/g, '')
	return d.length >= 4 ? `****${d.slice(-4)}` : '****'
}

/**
 * O boleto como a lista recebe: sem o telefone inteiro e sem o e-mail. A
 * máscara é aplicada no servidor, e não só na tela, para o número não ir
 * junto na resposta que o navegador guarda.
 */
export type BoletoDaLista = Omit<Boleto, 'telefone' | 'email'> & { telefone_final: string }

export function paraALista(b: Boleto): BoletoDaLista {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { telefone, email, ...resto } = b
	return { ...resto, telefone_final: mascararTelefone(telefone) }
}

/**
 * Quem é o contato, sem ambiguidade: nome, carro e o fim do telefone. A
 * planilha traz só o primeiro nome, e dois clientes "MARIA" só se distinguem assim.
 */
export function identificacaoDoBoleto(b: { nome: string; carro: string | null; telefone_final: string }): string {
	return [b.nome, b.carro, b.telefone_final].filter(Boolean).join(' · ')
}

export function formatarTelefone(t: string): string {
	const d = t.replace(/\D/g, '')
	if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
	if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
	return t
}

/* ------------------------------------------------------------------- data */

const diaValido = (a: number, m: number, d: number): string | null => {
	if (a < 2000 || a > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
	const data = new Date(Date.UTC(a, m - 1, d))
	// 31/02 vira março: só vale se a data montada for a mesma que foi pedida.
	if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null
	return data.toISOString().slice(0, 10)
}

/**
 * Lê uma data de planilha brasileira: dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa,
 * aaaa-mm-dd, o número de série do Excel, ou dd/mm sem ano (assume o ano em
 * que a data fica mais perto de hoje para a frente: em novembro, "15/01" é
 * janeiro do ano que vem). `anoAssumido` diz quando o ano não estava escrito.
 */
function lerDataComAno(v: unknown, hoje: string): { data: string; anoAssumido: boolean } | { erro: string } {
	if (v === null || v === undefined || v === '') return { erro: 'sem vencimento' }
	if (typeof v === 'number') {
		// Número de série do Excel: dias desde 30/12/1899.
		if (v > 20000 && v < 80000) return { data: new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * DIA_MS).toISOString().slice(0, 10), anoAssumido: false }
		return { erro: 'vencimento inválido' }
	}
	const texto = String(v).trim()
	const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/)
	if (iso) {
		const data = diaValido(+iso[1], +iso[2], +iso[3])
		return data ? { data, anoAssumido: false } : { erro: 'vencimento inválido' }
	}
	const br = texto.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2}|\d{4}))?$/)
	if (!br) {
		// Excel exportado como texto às vezes traz o número de série.
		if (/^\d{5}$/.test(texto)) return lerDataComAno(Number(texto), hoje)
		return { erro: 'vencimento inválido' }
	}
	let dia = +br[1]
	let mes = +br[2]
	// 12/25/2026 só faz sentido como mês/dia.
	if (mes > 12 && dia <= 12) [dia, mes] = [mes, dia]
	if (br[3]) {
		const ano = br[3].length === 2 ? 2000 + +br[3] : +br[3]
		const data = diaValido(ano, mes, dia)
		return data ? { data, anoAssumido: false } : { erro: 'vencimento inválido' }
	}
	const anoDeHoje = +hoje.slice(0, 4)
	const neste = diaValido(anoDeHoje, mes, dia)
	if (!neste) return { erro: 'vencimento inválido' }
	// Mais de seis meses para trás: era do ano que vem.
	if (diasAte(neste, hoje) < -180) {
		const proximo = diaValido(anoDeHoje + 1, mes, dia)
		if (proximo) return { data: proximo, anoAssumido: true }
	}
	return { data: neste, anoAssumido: true }
}

export function lerData(v: unknown, hoje: string): { data: string } | { erro: string } {
	const lida = lerDataComAno(v, hoje)
	return 'erro' in lida ? lida : { data: lida.data }
}

/** O mesmo dia do mês, `meses` depois. Dia 31 em mês de 30 vira o último dia do mês. */
function somarMeses(dia: string, meses: number): string {
	const [a, m, d] = dia.split('-').map(Number)
	const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
	const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
	return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(d, ultimo))).toISOString().slice(0, 10)
}

export const MAXIMO_DE_PARCELAS = 120

/**
 * O vencimento de uma linha da planilha: uma data, ou um intervalo de
 * parcelas mensais como o financeiro escreve, "08/12 A 08/07" ou
 * "04/12 A 04/09/27" (todo dia 8, de dezembro a julho).
 *
 * No intervalo, o começo sem ano segue a regra de `lerData`; o fim sem ano é
 * a primeira vez que aquele dia e mês aparecem depois do começo. `aviso` vem
 * preenchido quando algum ano foi assumido, para a pessoa conferir.
 */
export function lerVencimentos(v: unknown, hoje: string): { datas: string[]; aviso: string | null } | { erro: string } {
	const intervalo = typeof v === 'string' ? v.trim().match(/^(\S+)\s+(?:a|à|ao|ate|até|-|–)\s+(\S+)$/i) : null
	if (!intervalo) {
		const unica = lerDataComAno(v, hoje)
		if ('erro' in unica) return unica
		return { datas: [unica.data], aviso: unica.anoAssumido ? `vencimento sem ano: entendi ${dataBR(unica.data)}` : null }
	}
	const inicio = lerDataComAno(intervalo[1], hoje)
	if ('erro' in inicio) return { erro: 'vencimento inválido' }
	// O fim é lido tendo o começo como "hoje": sem ano, cai na primeira vez depois dele.
	let fim = lerDataComAno(intervalo[2], inicio.data)
	if ('erro' in fim) return { erro: 'vencimento inválido' }
	if (fim.anoAssumido && fim.data < inicio.data) {
		const proximo = diaValido(+fim.data.slice(0, 4) + 1, +fim.data.slice(5, 7), +fim.data.slice(8, 10))
		if (!proximo) return { erro: 'vencimento inválido' }
		fim = { data: proximo, anoAssumido: true }
	}
	if (fim.data < inicio.data) return { erro: 'o fim das parcelas vem antes do começo' }
	if (inicio.data.slice(8) !== fim.data.slice(8)) return { erro: 'o dia do começo e do fim das parcelas é diferente' }
	const meses = (+fim.data.slice(0, 4) - +inicio.data.slice(0, 4)) * 12 + (+fim.data.slice(5, 7) - +inicio.data.slice(5, 7))
	if (meses + 1 > MAXIMO_DE_PARCELAS) return { erro: `mais de ${MAXIMO_DE_PARCELAS} parcelas` }
	const datas = Array.from({ length: meses + 1 }, (_, i) => somarMeses(inicio.data, i))
	return {
		datas,
		aviso: inicio.anoAssumido || fim.anoAssumido ? `vencimento sem ano: entendi ${datas.length} parcelas, de ${dataBR(inicio.data)} a ${dataBR(fim.data)}` : null,
	}
}

/* ------------------------------------------------------------------ valor */

/** "R$ 1.234,56", "1234,56", "1,234.56" ou o número da célula. Vazio é `null`: o valor é opcional. */
export function lerValor(v: unknown): { valor: number | null } | { erro: string } {
	if (v === null || v === undefined || v === '') return { valor: null }
	let n: number
	if (typeof v === 'number') n = v
	else {
		let s = String(v).replace(/r\$/i, '').replace(/\s/g, '')
		if (!s) return { valor: null }
		const virgula = s.lastIndexOf(',')
		const ponto = s.lastIndexOf('.')
		if (virgula >= 0 && ponto >= 0) {
			// O separador que aparece por último é o decimal.
			s = virgula > ponto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
		} else if (virgula >= 0) s = s.replace(',', '.')
		else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
		if (!/^\d+(\.\d+)?$/.test(s)) return { erro: 'valor inválido' }
		n = Number(s)
	}
	if (!Number.isFinite(n) || n <= 0) return { erro: 'valor inválido' }
	if (n > 99_999_999) return { erro: 'valor alto demais' }
	return { valor: Math.round(n * 100) / 100 }
}

/* ------------------------------------------------------- um boleto só */

export interface DadosDoBoleto {
	nome: string
	telefone: string
	email: string | null
	vencimento: string
	valor: number | null
	descricao: string | null
	carro: string | null
	placa: string | null
	parcela: number | null
	parcelas: number | null
}

/**
 * Valida os campos de UM boleto digitado na tela. Devolve os dados prontos ou
 * o erro de cada campo, para o formulário apontar onde está o problema.
 */
export function validarBoleto(corpo: Record<string, unknown>, hoje: string): { dados: DadosDoBoleto } | { erros: Record<string, string> } {
	const erros: Record<string, string> = {}
	const nome = String(corpo.nome ?? '').replace(/\s+/g, ' ').trim()
	if (!nome) erros.nome = 'Informe o nome.'
	else if (nome.length > 200) erros.nome = 'Nome longo demais.'
	const tel = normalizarTelefone(corpo.telefone)
	if ('erro' in tel) erros.telefone = tel.erro === 'telefone sem DDD' ? 'Informe o telefone com DDD.' : 'Telefone inválido. Use DDD e número.'
	const data = lerData(corpo.vencimento, hoje)
	if ('erro' in data) erros.vencimento = 'Informe a data de vencimento.'
	const valor = lerValor(corpo.valor)
	if ('erro' in valor) erros.valor = 'Valor inválido.'
	const email = String(corpo.email ?? '').trim() || null
	if (email && !/^\S+@\S+\.\S+$/.test(email)) erros.email = 'E-mail inválido.'
	const descricao = String(corpo.descricao ?? '').trim().slice(0, 500) || null
	const carro = String(corpo.carro ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || null
	const placa = String(corpo.placa ?? '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 20) || null
	if (Object.keys(erros).length > 0 || 'erro' in tel || 'erro' in data || 'erro' in valor) return { erros }
	// O formulário cadastra um boleto só: sem número de parcela.
	return { dados: { nome, telefone: tel.telefone, email, vencimento: data.data, valor: valor.valor, descricao, carro, placa, parcela: null, parcelas: null } }
}

/* --------------------------------------------------------------- planilha */

export type Celula = string | number | null
export type Campo = 'nome' | 'vencimento' | 'telefone' | 'contato' | 'email' | 'valor' | 'carro' | 'placa' | 'descricao'

export const ROTULO_DO_CAMPO: Record<Campo, string> = {
	nome: 'Nome',
	vencimento: 'Vencimento',
	telefone: 'Telefone',
	contato: 'Contato',
	email: 'E-mail',
	valor: 'Valor',
	carro: 'Carro',
	placa: 'Placa',
	descricao: 'Descrição',
}

const semAcento = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const chave = (s: unknown): string => semAcento(String(s ?? '')).replace(/[^a-z0-9]/g, '')

/** O título de uma coluna → o campo que ela é. */
export function campoDoTitulo(titulo: unknown): Campo | null {
	const t = chave(titulo)
	if (!t) return null
	if (t.startsWith('venc') || ['data', 'datavencimento', 'datadevencimento', 'datadovencimento', 'vcto', 'vencto', 'duedate', 'prazo'].includes(t)) return 'vencimento'
	if (t.startsWith('email') || t === 'mail') return 'email'
	if (t.startsWith('telefone') || t.startsWith('celular') || t.startsWith('whats') || ['tel', 'fone', 'cel', 'zap', 'wpp', 'numero', 'telefonecontato'].includes(t)) return 'telefone'
	if (t.startsWith('contato')) return 'contato'
	if (t.startsWith('nome') || ['cliente', 'pessoa', 'sacado', 'pagador', 'devedor', 'name', 'razaosocial'].includes(t)) return 'nome'
	if (t.startsWith('valor') || ['total', 'parcela', 'montante', 'preco', 'quantia'].includes(t)) return 'valor'
	if (t.startsWith('placa')) return 'placa'
	if (t.startsWith('carro') || t.startsWith('veiculo') || t.startsWith('modelo') || ['automovel', 'bem'].includes(t)) return 'carro'
	if (t.startsWith('desc') || t.startsWith('obs') || ['referencia', 'ref', 'historico', 'detalhe', 'detalhes', 'nota', 'notas'].includes(t)) return 'descricao'
	return null
}

const pareceData = (v: Celula): boolean => v !== null && v !== '' && 'data' in lerData(v, '2026-01-01')
const pareceTelefone = (v: Celula): boolean => v !== null && 'telefone' in normalizarTelefone(v)
const pareceEmail = (v: Celula): boolean => typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v.trim())
const vazia = (v: Celula): boolean => v === null || String(v).trim() === ''

/** Sem linha de títulos: acha as colunas pelo que há nelas. */
function colunasPeloConteudo(linhas: Celula[][]): Partial<Record<Campo, number>> {
	const amostra = linhas.slice(0, 20)
	const largura = Math.max(0, ...amostra.map(l => l.length))
	const parte = (i: number, teste: (v: Celula) => boolean): number => {
		const cheias = amostra.map(l => l[i] ?? null).filter(v => !vazia(v))
		return cheias.length === 0 ? 0 : cheias.filter(teste).length / cheias.length
	}
	const achar = (teste: (v: Celula) => boolean, fora: number[]): number | undefined => {
		let melhor: number | undefined
		let nota = 0.6
		for (let i = 0; i < largura; i++) {
			if (fora.includes(i)) continue
			const p = parte(i, teste)
			if (p > nota) [melhor, nota] = [i, p]
		}
		return melhor
	}
	const usadas: number[] = []
	const guardar = (i: number | undefined) => (i !== undefined && usadas.push(i), i)
	const email = guardar(achar(pareceEmail, usadas))
	const vencimento = guardar(achar(pareceData, usadas))
	const telefone = guardar(achar(pareceTelefone, usadas))
	const nome = guardar(achar(v => typeof v === 'string' && /[a-zA-ZÀ-ú]{2}/.test(v), usadas))
	const valor = guardar(achar(v => {
		const lido = lerValor(v)
		return 'valor' in lido && lido.valor !== null
	}, usadas))
	return Object.fromEntries(Object.entries({ nome, vencimento, telefone, email, valor }).filter(([, i]) => i !== undefined)) as Partial<Record<Campo, number>>
}

export interface LinhaLida {
	/** Número da linha na planilha, a contar de 1, como a pessoa vê no Excel. */
	linha: number
	nome: string
	telefone: string
	email: string | null
	vencimento: string
	valor: number | null
	descricao: string | null
	carro: string | null
	placa: string | null
	/** Quando a linha da planilha é um intervalo de parcelas: qual é esta e quantas são. */
	parcela: number | null
	parcelas: number | null
	/** Vazio = a linha pode ser importada. */
	erros: string[]
	/** Não é erro, mas vale conferir (ano que não estava escrito). */
	aviso: string | null
	/**
	 * Preenchido quando a parcela NÃO entra: é de um intervalo e já venceu. Não
	 * dá para saber se foi paga, e cadastrá-la como atrasada faria o cliente
	 * ser cobrado por algo que pode já ter quitado.
	 */
	ignorada: string | null
}

export interface PlanilhaLida {
	/** Em que coluna (0 = A) cada campo foi achado. */
	colunas: Partial<Record<Campo, number>>
	comTitulos: boolean
	linhas: LinhaLida[]
	/** Problema da planilha inteira (falta uma coluna obrigatória). */
	erro: string | null
}

export const MAXIMO_DE_LINHAS = 2000
export const letraDaColuna = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : `coluna ${i + 1}`)

export function lerPlanilha(celulas: Celula[][], hoje: string): PlanilhaLida {
	const comConteudo = celulas.map((l, i) => ({ l, numero: i + 1 })).filter(({ l }) => l.some(v => !vazia(v)))
	if (comConteudo.length === 0) return { colunas: {}, comTitulos: false, linhas: [], erro: 'A planilha está vazia.' }

	// A primeira linha é de títulos quando pelo menos dois títulos são reconhecidos.
	const primeira = comConteudo[0].l
	const peloTitulo: Partial<Record<Campo, number>> = {}
	primeira.forEach((titulo, i) => {
		const campo = campoDoTitulo(titulo)
		if (campo && peloTitulo[campo] === undefined) peloTitulo[campo] = i
	})
	const comTitulos = Object.keys(peloTitulo).length >= 2
	const dados = comTitulos ? comConteudo.slice(1) : comConteudo
	const colunas = comTitulos ? peloTitulo : colunasPeloConteudo(dados.map(d => d.l))

	// Planilha só com "Contato" e sem "Telefone": o contato é o telefone.
	if (colunas.telefone === undefined && colunas.contato !== undefined) {
		colunas.telefone = colunas.contato
		delete colunas.contato
	}

	const faltam = (['nome', 'vencimento', 'telefone'] as const).filter(c => colunas[c] === undefined)
	if (faltam.length > 0) {
		return {
			colunas,
			comTitulos,
			linhas: [],
			erro: `Não achei ${faltam.length === 1 ? 'a coluna' : 'as colunas'} ${faltam.map(c => ROTULO_DO_CAMPO[c].toLowerCase()).join(', ')}. Use os títulos Nome, Vencimento e Telefone na primeira linha.`,
		}
	}
	if (dados.length > MAXIMO_DE_LINHAS) {
		return { colunas, comTitulos, linhas: [], erro: `A planilha tem ${dados.length} linhas. O limite é ${MAXIMO_DE_LINHAS} por vez: divida em duas.` }
	}

	const de = (l: Celula[], campo: Campo): Celula => (colunas[campo] === undefined ? null : (l[colunas[campo] as number] ?? null))
	const limpo = (v: Celula): string => String(v ?? '').replace(/\s+/g, ' ').trim()
	const linhas = dados.flatMap(({ l, numero }): LinhaLida[] => {
		const erros: string[] = []
		const nome = limpo(de(l, 'nome'))
		if (!nome) erros.push('sem nome')

		const tel = normalizarTelefone(de(l, 'telefone'))
		if ('erro' in tel) erros.push(tel.erro)
		const venc = lerVencimentos(de(l, 'vencimento'), hoje)
		if ('erro' in venc) erros.push(venc.erro)
		const valor = lerValor(de(l, 'valor'))
		if ('erro' in valor) erros.push(valor.erro)

		let email = limpo(de(l, 'email')) || null
		const notas = [limpo(de(l, 'descricao'))].filter(Boolean)
		// "Contato" ao lado de "Telefone": e-mail, um segundo número ou o nome de alguém.
		const contato = limpo(de(l, 'contato'))
		if (contato) {
			if (pareceEmail(contato) && !email) email = contato
			else {
				const outro = normalizarTelefone(contato)
				if ('telefone' in outro && 'telefone' in tel && outro.telefone === tel.telefone) {
					// O mesmo número repetido: nada a anotar.
				} else notas.push(`Contato: ${contato}`)
			}
		}
		if (email && !pareceEmail(email)) erros.push('e-mail inválido')

		const base = {
			linha: numero,
			nome,
			telefone: 'telefone' in tel ? tel.telefone : limpo(de(l, 'telefone')),
			email,
			valor: 'valor' in valor ? valor.valor : null,
			descricao: notas.join(' · ').slice(0, 500) || null,
			carro: limpo(de(l, 'carro')).slice(0, 120) || null,
			placa: limpo(de(l, 'placa')).toUpperCase().slice(0, 20) || null,
		}
		// Com qualquer erro, a linha aparece uma vez só, do jeito que está na planilha.
		if ('erro' in venc || erros.length > 0) {
			return [{ ...base, vencimento: 'datas' in venc ? venc.datas[0] : limpo(de(l, 'vencimento')), parcela: null, parcelas: null, erros, aviso: null, ignorada: null }]
		}
		const total = venc.datas.length
		return venc.datas.map((vencimento, i) => ({
			...base,
			vencimento,
			parcela: total > 1 ? i + 1 : null,
			parcelas: total > 1 ? total : null,
			erros: [],
			aviso: venc.aviso,
			// Só as parcelas de um intervalo: uma data única já vencida foi escrita assim de propósito.
			ignorada: total > 1 && vencimento < hoje ? 'parcela já vencida' : null,
		}))
	})
	return { colunas, comTitulos, linhas, erro: linhas.length === 0 ? 'A planilha só tem a linha de títulos.' : null }
}

/**
 * Texto colado do Excel (colunas separadas por tabulação) ou um CSV (ponto e
 * vírgula ou vírgula, com aspas). Devolve as células como texto.
 */
export function lerTexto(texto: string): Celula[][] {
	const limpo = texto.replace(/^﻿/, '')
	const primeira = limpo.split(/\r?\n/, 1)[0] ?? ''
	const conta = (c: string) => primeira.split(c).length - 1
	const separador = conta('\t') > 0 ? '\t' : conta(';') >= conta(',') && conta(';') > 0 ? ';' : ','
	const linhas: Celula[][] = []
	let linha: Celula[] = []
	let celula = ''
	let entreAspas = false
	const fecharCelula = () => {
		linha.push(celula.trim() === '' ? null : celula.trim())
		celula = ''
	}
	for (let i = 0; i < limpo.length; i++) {
		const c = limpo[i]
		if (entreAspas) {
			if (c === '"' && limpo[i + 1] === '"') {
				celula += '"'
				i++
			} else if (c === '"') entreAspas = false
			else celula += c
		} else if (c === '"' && celula === '') entreAspas = true
		else if (c === separador) fecharCelula()
		else if (c === '\n' || c === '\r') {
			if (c === '\r' && limpo[i + 1] === '\n') i++
			fecharCelula()
			linhas.push(linha)
			linha = []
		} else celula += c
	}
	if (celula !== '' || linha.length > 0) {
		fecharCelula()
		linhas.push(linha)
	}
	return linhas
}

/**
 * Dois boletos são o mesmo quando batem telefone, vencimento, valor e carro
 * (com a placa). O carro entra porque o mesmo cliente pode ter dois carros
 * com parcela de mesmo valor no mesmo dia.
 */
export function chaveDeDuplicata(b: { telefone: string; vencimento: string; valor: number | null; carro?: string | null; placa?: string | null }): string {
	return `${b.telefone}|${b.vencimento}|${b.valor === null ? '' : b.valor.toFixed(2)}|${chave(b.carro)}${chave(b.placa)}`
}

/** "DEFENDER · ABC-1D23 · parcela 3 de 10": a que o boleto se refere, numa linha. */
export function referenciaDoBoleto(b: { carro: string | null; placa: string | null; parcela: number | null; parcelas: number | null }): string | null {
	return [b.carro, b.placa, b.parcela && b.parcelas ? `parcela ${b.parcela} de ${b.parcelas}` : null].filter(Boolean).join(' · ') || null
}

/* --------------------------------------------------------------- lembrete */

function primeiroNome(nome: string): string {
	const p = nome.trim().split(/\s+/)[0] ?? ''
	// Planilha costuma vir em maiúsculas: "MARIA" vira "Maria".
	return p === p.toUpperCase() || p === p.toLowerCase() ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p
}

const dinheiro = (n: number): string => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** O texto que abre no WhatsApp. Muda conforme o boleto vai vencer, vence hoje ou já venceu. */
export function mensagemDeLembrete(
	b: { nome: string; vencimento: string; valor: number | null; carro?: string | null; parcela?: number | null; parcelas?: number | null },
	hoje: string,
): string {
	const dias = diasAte(b.vencimento, hoje)
	const parcela = b.parcela && b.parcelas ? `parcela ${b.parcela} de ${b.parcelas}` : null
	// "do veículo X" serve para qualquer carro: não dá para saber se é "do Porsche" ou "da Ferrari".
	const resto = `${b.carro ? ` do veículo ${b.carro}` : ''}${b.valor ? `, de ${dinheiro(b.valor)},` : ''}`
	const dia = `${b.vencimento.slice(8, 10)}/${b.vencimento.slice(5, 7)}`
	const oi = `Olá, ${primeiroNome(b.nome)}! Aqui é da Attra Veículos.`
	if (dias < 0) {
		return `${oi} Não identificamos o pagamento ${parcela ? `da ${parcela}` : 'do boleto'}${resto} que venceu em ${dia}. Consegue verificar para a gente? Se já pagou, pode desconsiderar esta mensagem.`
	}
	const quando = dias === 0 ? `vence hoje (${dia})` : dias === 1 ? `vence amanhã (${dia})` : `vence em ${dia}`
	return `${oi} Passando para lembrar que ${parcela ? `a ${parcela}` : 'o boleto'}${resto} ${quando}. Se já pagou, pode desconsiderar esta mensagem. Qualquer dúvida, estou à disposição.`
}

export const linkDoWhatsapp = (telefone: string, mensagem: string): string =>
	`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`
