import type { Vehicle } from '@/types'
import { formatMileage, formatPrice } from '@/lib/utils'
import { nomeDoVeiculo } from '@/lib/identidade-do-veiculo'
import { comRotulo, emMinuscula, juntarComE } from '@/lib/vehicle-description-generator'

export interface PerguntaDoVeiculo {
	question: string
	answer: string
}

/**
 * FAQ da ficha, montada só com o que o anúncio informa.
 *
 * Nada de ficha técnica de referência aqui. Até 20/10/2026 a FAQ completava o
 * anúncio com a tabela de `vehicle-datasheet.ts`, que tem uma versão por modelo
 * e casa por palavra-chave: o 911 Carrera GTS Cabriolet 2026 saía com "2.981 cc
 * e 385 cv" (o Carrera base da geração anterior), e o mesmo acontecia em 20
 * das 68 fichas. A FAQ vira FAQPage no JSON-LD, que é o texto que
 * buscadores e assistentes citam — dado errado ali vira resposta errada.
 * Atributo que o anúncio não traz fica de fora; não se infere pelo nome.
 *
 * Desde 23/10/2026 lê também a ficha do molde da AutoConf
 * (`ficha-do-anuncio.ts`), como a ficha técnica e o "Sobre este veículo": o
 * campo da ficha vence o do cadastro ("Prata High-Tech Metálico" no lugar de
 * "Prata", "145,8 kgfm" no lugar de Nm), e entram desempenho, cor e
 * acabamento e os diferenciais, cada um só quando o molde traz. A garantia
 * continua fora da ficha: a resposta não afirma nada que o consultor não
 * confirme com a documentação.
 */
export function perguntasDoVeiculo(vehicle: Vehicle): PerguntaDoVeiculo[] {
	const name = nomeDoVeiculo(vehicle) || 'veículo'
	const ficha = vehicle.ficha ?? null
	const faqs: PerguntaDoVeiculo[] = []

	faqs.push({
		question: `Qual o preço do ${name} na Attra Veículos?`,
		answer: `O ${name} ${vehicle.year_model} está disponível por ${formatPrice(vehicle.price)} na Attra Veículos. ${vehicle.mileage === 0 ? 'Este veículo é 0 km.' : `Este veículo possui ${formatMileage(vehicle.mileage)} rodados.`} Entre em contato para condições de financiamento e formas de pagamento.`,
	})

	// Cor e acabamento ganham pergunta própria quando o molde descreve o
	// exemplar; sem ele, a cor do cadastro segue nas especificações.
	const acabamento = juntarComE([
		ficha?.interior ? comRotulo('interior', ficha.interior) : '',
		ficha?.som ? comRotulo('som', ficha.som, false) : '',
		ficha?.rodas ? comRotulo('rodas', ficha.rodas) : '',
	])
	// A cor do molde é nome de pintura e fica como foi escrita.
	const cor = ficha?.cor ?? vehicle.color?.toLowerCase() ?? ''
	const temPerguntaDeCor = Boolean(ficha?.cor || acabamento)

	const potencia = ficha?.potencia ?? (vehicle.horsepower ? `${vehicle.horsepower} cv` : null)
	const torque = ficha?.torque ?? (vehicle.torque ? `${vehicle.torque} Nm` : null)
	let motor = ficha?.motor ? comRotulo('motor', ficha.motor, false) : ''
	if (potencia) motor = motor ? `${motor} de ${potencia}` : `${potencia} de potência`
	if (torque) motor = motor ? `${motor} e ${torque} de torque` : `${torque} de torque`
	const cambio = ficha?.cambio ?? vehicle.transmission
	const especificacoes = juntarComE([
		motor,
		cambio ? comRotulo('câmbio', cambio) : '',
		ficha?.tracao ? comRotulo('tração', ficha.tracao) : '',
		ficha?.freios ? comRotulo('freios', ficha.freios) : '',
		vehicle.fuel_type ? `combustível ${vehicle.fuel_type.toLowerCase()}` : '',
		!temPerguntaDeCor && cor ? `cor ${cor}` : '',
	])
	if (especificacoes) {
		faqs.push({
			question: `Quais as especificações do ${name} ${vehicle.year_model}?`,
			answer: `O ${name} ${vehicle.year_model} tem ${especificacoes}.`,
		})
	}

	const zeroACem = ficha?.aceleracao_0_100
	const velocidade = ficha?.velocidade_maxima
	if (zeroACem || velocidade) {
		faqs.push({
			question: zeroACem
				? `Quanto o ${name} faz de 0 a 100 km/h?`
				: `Qual a velocidade máxima do ${name}?`,
			answer: zeroACem && velocidade
				? `O ${name} acelera de 0 a 100 km/h em ${zeroACem} e chega a ${velocidade}.`
				: zeroACem
					? `O ${name} acelera de 0 a 100 km/h em ${zeroACem}.`
					: `O ${name} chega a ${velocidade} de velocidade máxima.`,
		})
	}

	if (temPerguntaDeCor) {
		faqs.push({
			question: `Qual a cor e o acabamento do ${name}?`,
			answer: cor
				? `Este ${name} vem na cor ${cor}${acabamento ? `, com ${acabamento}` : ''}.`
				: `Este ${name} vem com ${acabamento}.`,
		})
	}

	const diferenciais = ficha?.diferenciais ?? []
	const opcionais = ficha?.opcionais ?? []
	if (diferenciais.length > 0 || opcionais.length > 0) {
		const frases = [
			diferenciais.length > 0 ? `Diferenciais deste exemplar: ${juntarComE(diferenciais.map(emMinuscula))}.` : '',
			opcionais.length > 0
				? `${diferenciais.length > 0 ? 'Traz ainda' : 'Este exemplar traz'} ${juntarComE(opcionais.map(emMinuscula))}.`
				: '',
		]
		faqs.push({
			question: `Quais os diferenciais deste ${name}?`,
			answer: frases.filter(Boolean).join(' '),
		})
	}

	// Sem "garantia integral" nem prazo: o feed não informa a garantia de cada
	// carro (e importado 0 km nem sempre tem garantia de fábrica no Brasil).
	faqs.push({
		question: `O ${name} possui garantia?`,
		answer: `As condições de garantia deste ${name} são informadas pelo consultor da Attra junto com a documentação do veículo. Todos os veículos da Attra passam por curadoria técnica antes de serem disponibilizados para venda.`,
	})

	faqs.push({
		question: `A Attra entrega o ${name} em todo o Brasil?`,
		answer: `Sim, a Attra Veículos realiza entrega nacional com logística especializada para veículos de alto valor. O ${name} pode ser entregue em qualquer cidade do Brasil com transporte em caminhão fechado, seguro completo e rastreamento em tempo real.`,
	})

	if (vehicle.mileage > 0) {
		faqs.push({
			question: `Qual a quilometragem do ${name}?`,
			answer: `Este ${name} ${vehicle.year_model} possui ${formatMileage(vehicle.mileage)} rodados. O veículo passou por inspeção da equipe técnica da Attra antes de ser anunciado.`,
		})
	}

	return faqs
}
