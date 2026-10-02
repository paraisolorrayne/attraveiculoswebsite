/**
 * Como uma das "outras visitas desta pessoa" aparece na lista. Na área da
 * agência, a visita que veio de fora das campanhas dela chega sem fonte e sem
 * campanha (o canal continua no badge) e não abre detalhe — o detalhe dela
 * responderia 404.
 */
export function descreverOutraVisita(o: {
	rotulo_fonte: string | null
	campanha: string | null
	origem_de_fora?: boolean
	atual: boolean
}): { origem: string; abreDetalhe: boolean } {
	if (o.origem_de_fora) return { origem: 'outra origem', abreDetalhe: false }
	const origem = o.campanha && o.campanha !== '(sem campanha)' ? `${o.rotulo_fonte} · ${o.campanha}` : (o.rotulo_fonte ?? '')
	return { origem, abreDetalhe: !o.atual }
}
