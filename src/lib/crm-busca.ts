// Busca livre do quadro do CRM: acha o card pelo nome do cliente ou pelo carro.
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

/** Campos que a busca varre: quem é o cliente e qual é o carro (inclusive o da troca). */
export interface CardBuscavel {
	nome: string | null
	veiculo: string | null
	veiculo_troca: string | null
}

export function cardCasaBusca(c: CardBuscavel, termos: string[]): boolean {
	if (termos.length === 0) return true
	const alvo = normalizar([c.nome, c.veiculo, c.veiculo_troca].filter(Boolean).join(' '))
	return termos.every(t => alvo.includes(t))
}
