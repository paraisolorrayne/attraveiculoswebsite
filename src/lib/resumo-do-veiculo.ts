/**
 * O texto do botão "copiar" da página do veículo.
 *
 * Formato pedido pela Attra em 16/08/2026, uma linha só:
 *
 *     Ferrari SF90 Spider 2023/2024 | zero quilômetro | R$ 5.500.000,00
 *
 * Antes era um bloco de cinco linhas com rótulos ("Ano:", "Quilometragem:",
 * "Valor:"). Esse texto é colado no WhatsApp do cliente, e lá uma linha só cola
 * melhor do que um bloco.
 *
 * A versão passa pela expansão de abreviação do AutoConf: sem isso o cliente
 * recebe "1500 LARAM. NIGHT ED. BI-TB 4x4 Aut." no WhatsApp.
 */

import { expandirAbreviacoes } from '@/lib/normalizar-abreviacoes'

interface VeiculoDoResumo {
	brand: string
	model: string
	version?: string | null
	year_manufacture?: number | null
	year_model?: number | null
	mileage?: number | null
	price?: number | null
	is_new?: boolean | null
}

/**
 * Preço em reais, com espaço COMUM depois do "R$".
 *
 * O `Intl` do JavaScript separa símbolo e número com espaço não-quebrável
 * (U+00A0). Na tela não se nota; num texto que vai ser colado no WhatsApp, em
 * planilha ou em busca de anúncio, é um caractere invisível diferente do que a
 * pessoa digitaria — e que quebra comparação e busca por texto.
 */
function precoEmReais(valor: number): string {
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
		.format(valor)
		// \u00A0 escrito por escape, e não como caractere literal: invisível no
		// código-fonte é convite para alguém "limpar" sem perceber o que quebrou.
		.replace(/\u00A0/g, ' ')
}

/**
 * Ano de fabricação e modelo, no padrão brasileiro.
 *
 * Colapsa quando são iguais — "2024" em vez de "2024/2024" —, seguindo o que a
 * descrição da página já faz. Se a Attra preferir sempre os dois, é aqui.
 */
function ano(fabricacao: number | null | undefined, modelo: number | null | undefined): string {
	if (fabricacao && modelo && fabricacao !== modelo) return `${fabricacao}/${modelo}`
	return String(modelo ?? fabricacao ?? '')
}

/**
 * Monta a linha de resumo.
 *
 * Segmento sem dado é OMITIDO, nunca preenchido com zero: um veículo sem preço
 * cadastrado sairia como "R$ 0,00", que é afirmação falsa colada no WhatsApp de
 * um cliente. A Attra não trabalha com "sob consulta", então preço ausente é
 * defeito de cadastro — e o resumo deve calar, não inventar.
 */
export function resumoDoVeiculo(v: VeiculoDoResumo): string {
	const nome = [v.brand, v.model, expandirAbreviacoes(v.version)]
		.map(p => (p ?? '').trim())
		.filter(Boolean)
		.join(' ')

	const anoTexto = ano(v.year_manufacture, v.year_model)

	const zeroKm = v.is_new === true || v.mileage === 0
	const km = zeroKm
		? 'zero quilômetro'
		: typeof v.mileage === 'number' && v.mileage > 0
			? `${v.mileage.toLocaleString('pt-BR')} km`
			: null

	const preco = typeof v.price === 'number' && v.price > 0 ? precoEmReais(v.price) : null

	const cabecalho = [nome, anoTexto].filter(Boolean).join(' ')

	return [cabecalho, km, preco].filter(Boolean).join(' | ')
}
