// Busca livre do quadro do CRM: acha o card pelo nome do cliente, pelo carro,
// pelo telefone ou pelo e-mail.
//
// O quadro só oferecia filtro por vendedor e por período, e nenhum dos dois
// responde "cadê o lead do fulano?" — para achar um cliente específico era
// preciso varrer as cinco colunas no olho. Pedido do gestor (Cris, 11/08).
//
// Duas decisões que o teste fixa:
//
// 1. Acento não conta. Ninguém digita "Cláudio" com acento no campo de busca,
//    mas é assim que o nome chega do CRM. Comparar o texto cru faria a busca
//    falhar justamente nos nomes mais comuns aqui.
// 2. Todas as palavras precisam aparecer, em qualquer posição. Assim
//    "porsche 2023" acha "Porsche 911 Turbo S Coupe 2023" (palavras separadas
//    no original) e "ricardo porsche" cruza cliente com carro numa pergunta só.

/**
 * Minúsculas e sem acento — os dois lados da comparação passam por aqui.
 * NFD separa a letra do acento; a faixa U+0300–U+036F são as marcas soltas.
 */
const normalizar = (s: string): string =>
	s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Palavras da busca, normalizadas. Vazio = não filtra nada. */
export function termosDaBusca(termo: string): string[] {
	return normalizar(termo).split(/\s+/).filter(t => t !== '')
}

/**
 * Campos que a busca varre: quem é o cliente (nome, telefone, e-mail) e qual é
 * o carro (inclusive o da troca). Telefone e e-mail são opcionais para a busca
 * servir a listas que não têm esses campos.
 */
export interface CardBuscavel {
	nome: string | null
	veiculo: string | null
	veiculo_troca: string | null
	telefone?: string | null
	email?: string | null
}

const soDigitos = (s: string): string => s.replace(/\D/g, '')

// Palavra que só tem número e pontuação de telefone: "(34)", "99988-7766", "+55".
const PARECE_TELEFONE = /^[\d+().-]+$/

// Abaixo disso o número é ruído: "911" (o Porsche) casaria com meio mundo de
// telefones. Quatro dígitos já é o final de um celular.
const MINIMO_DIGITOS = 4

/**
 * O telefone chega do CRM de todo jeito ("+5545991242400", "34 99988-7766"),
 * então a comparação é só entre dígitos. Quem digita com o 55 na frente acha o
 * card gravado sem ele.
 */
function telefoneCasa(telefone: string, digitos: string): boolean {
	if (digitos.length < MINIMO_DIGITOS) return false
	if (telefone.includes(digitos)) return true
	return digitos.length >= 12 && digitos.startsWith('55') && telefone.includes(digitos.slice(2))
}

export function cardCasaBusca(c: CardBuscavel, termos: string[]): boolean {
	if (termos.length === 0) return true
	const telefone = soDigitos(c.telefone ?? '')

	// Telefone digitado com espaços ("34 99988 7766") vira várias palavras, e
	// nenhuma delas sozinha diz muito. Se a busca inteira é um número, ela é
	// comparada de uma vez com o telefone.
	if (telefone !== '' && termos.every(t => PARECE_TELEFONE.test(t))) {
		if (telefoneCasa(telefone, soDigitos(termos.join('')))) return true
	}

	const alvo = normalizar([c.nome, c.veiculo, c.veiculo_troca, c.email].filter(Boolean).join(' '))
	return termos.every(t =>
		alvo.includes(t)
		// "ricardo 7766": a palavra que é número também pode ser pedaço do telefone.
		|| (telefone !== '' && PARECE_TELEFONE.test(t) && telefoneCasa(telefone, soDigitos(t))),
	)
}
