import { describe, it, expect } from 'vitest'
import { generateVehicleDescription, secoesPelaFicha } from '@/lib/vehicle-description-generator'
import { lerFichaDoAnuncio } from '@/lib/ficha-do-anuncio'
import type { Vehicle } from '@/types'

// O S 63 (1142317) como chega da AutoConf em 22/10/2026.
const s63 = {
	id: '1142317', brand: 'Mercedes', model: 'S-63', version: 'AMG S E Performance Aut.',
	year_manufacture: 2025, year_model: 2025, mileage: 1920, is_new: false, color: 'Prata',
	fuel_type: 'Gasolina e Elétrico', transmission: 'Automático', body_type: 'Sedã', category: 'premium',
	horsepower: 802, engine: '4.0 V8 Biturbo Híbrido', options: ['Blindado'], ficha: null,
} as unknown as Vehicle

const fichaDoS63 = lerFichaDoAnuncio({
	descricao: [
		'MOTOR: 4.0 V8 Biturbo Híbrido',
		'POTÊNCIA: 802 cv',
		'TORQUE: 145,8 kgfm',
		'COR: Prata High-Tech Metálico',
		'INTERIOR: Preto',
		'SOM: Burmester',
		'DIFERENCIAIS:',
		'Blindado BSS com vidros Graphene Full Steel',
		'Acabamentos em fibra de carbono',
		'OPCIONAIS:',
		'Travesseiros nos encostos de cabeça',
	].join('\n'),
	acessorios: [{ nome: 'Blindado' }],
})

describe('"Sobre este veículo" com a ficha do molde', () => {
	it('o S 63 sai com motor, torque, cor, interior, som, diferenciais e opcionais da ficha', () => {
		expect(generateVehicleDescription({ ...s63, ficha: fichaDoS63 })).toBe(
			'Este Mercedes S-63 AMG S E Performance Automático 2025 tem motor 4.0 V8 Biturbo Híbrido de 802 cv '
			+ 'e 145,8 kgfm de torque, com câmbio automático. '
			+ 'Com apenas 1.920 km rodados, vem na cor Prata High-Tech Metálico, com interior preto e som Burmester. '
			+ 'Diferenciais deste exemplar: blindado BSS com vidros Graphene Full Steel e acabamentos em fibra de carbono. '
			+ 'Traz ainda travesseiros nos encostos de cabeça.',
		)
	})

	it('com tração, freios, rodas e desempenho, tudo entra; lista longa para em quatro itens', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'MOTOR: 3.8 Boxer Biturbo\nPOTÊNCIA: 650 cv\nCÂMBIO: PDK de 8 marchas\nTRAÇÃO: Integral\n'
				+ 'FREIOS: De carbono-cerâmica\n0-100 KM/H: 2,7 s\nVELOCIDADE MÁXIMA: 330 km/h\nRODAS: Aro 21 forjadas\n'
				+ 'DIFERENCIAIS:\nSport Chrono\nTeto em fibra de carbono\nBancos concha\nLift dianteiro\nPintura especial',
		})
		const texto = generateVehicleDescription({
			...s63, brand: 'Porsche', model: '911', version: 'Turbo S', year_manufacture: 2024, year_model: 2025,
			mileage: 0, is_new: true, color: 'Cinza', horsepower: 650, options: [], ficha,
		})
		expect(texto).toBe(
			'Este Porsche 911 Turbo S 2024/2025 tem motor 3.8 Boxer Biturbo de 650 cv, com câmbio PDK de 8 marchas, '
			+ 'tração integral e freios de carbono-cerâmica. '
			+ 'Acelera de 0 a 100 km/h em 2,7 s e chega a 330 km/h. '
			+ 'Zero quilômetro, vem na cor cinza, com rodas aro 21 forjadas. '
			+ 'Diferenciais deste exemplar: Sport Chrono, teto em fibra de carbono, bancos concha e lift dianteiro.',
		)
	})

	it('não afirma estado de conservação que a ficha não traz', () => {
		const texto = generateVehicleDescription({ ...s63, ficha: fichaDoS63 })
		expect(texto).not.toMatch(/excelente estado|bem cuidado|conservad|garantia|procedência/i)
	})

})

// Desde a auditoria de 20/11/2026: sem a ficha, o texto também só traz fatos do
// cadastro. Antes saíam adjetivos por marca ("Este exclusivo Ferrari…",
// "combina exclusividade e paixão italiana"), estado que ninguém conferiu
// ("está em excelente estado") e a lista padrão da AutoConf ("airbag
// motorista, freios abs") num carro de R$ 3 milhões.
describe('"Sobre este veículo" sem a ficha do molde', () => {
	it('o S 63 sai com motor, câmbio, km, cor e motorização, sem adjetivo', () => {
		expect(generateVehicleDescription(s63)).toBe(
			'Este Mercedes S-63 AMG S E Performance Automático 2025 tem motor de 802 cv e câmbio automático. '
			+ 'Com apenas 1.920 km rodados, vem na cor prata, com motorização híbrida. Traz blindado.',
		)
	})

	// A Ferrari 296 GTB (817434) como estava no ar em 20/11/2026.
	const ferrari = {
		...s63, id: '817434', brand: 'Ferrari', model: '296', version: 'GTB', year_manufacture: 2024, year_model: 2024,
		mileage: 2610, color: 'Vermelho', fuel_type: 'Híbrido', category: 'supercar', body_type: 'Cupê', horsepower: null,
		options: ['Alarme', 'Travas elétricas', 'Turbo', 'Vidros elétricos dianteiros', 'Airbag motorista',
			'Airbag passageiro', 'Ar-condicionado', 'Direção hidráulica', 'Farol de neblina', 'Freios ABS'],
	} as unknown as Vehicle

	it('a Ferrari 296 sai sem adjetivo de marca, sem estado presumido e sem a lista padrão da AutoConf', () => {
		const texto = generateVehicleDescription(ferrari)
		expect(texto).toBe('Este Ferrari 296 GTB 2024 tem câmbio automático. Com apenas 2.610 km rodados, vem na cor vermelho, com motorização híbrida.')
		expect(texto).not.toMatch(/exclusiv|paixão|intacta|excelente estado|bem cuidado|airbag|freios abs|travas/i)
	})

	it('item que diferencia o carro (blindagem, teto, som) entra; item de série não', () => {
		const texto = generateVehicleDescription({ ...ferrari, options: ['Airbag motorista', 'Blindado', 'Teto solar', 'Freios ABS'] })
		expect(texto).toMatch(/Traz blindado e teto solar\.$/)
	})
})

describe('Overview, Exterior Design e Interior com a ficha do molde', () => {
	it('o S 63 sai com a cor, o motor e os itens da ficha, cada um na sua seção', () => {
		expect(secoesPelaFicha(s63, fichaDoS63!)).toEqual({
			overview: 'Mercedes S-63 AMG S E Performance Automático 2025, com 1.920 km rodados. '
				+ 'Motor 4.0 V8 Biturbo Híbrido de 802 cv e 145,8 kgfm de torque, com câmbio automático.',
			exterior: 'Pintura Prata High-Tech Metálico. Blindado BSS com vidros Graphene Full Steel.',
			interior: 'Interior preto e som Burmester. Travesseiros nos encostos de cabeça.',
		})
	})

	it('rodas no Exterior, freios e desempenho no Overview; item que não é de fora nem de dentro fica de fora', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'MOTOR: 3.8 Boxer Biturbo\nPOTÊNCIA: 650 cv\nCÂMBIO: PDK de 8 marchas\nTRAÇÃO: Integral\n'
				+ 'FREIOS: De carbono-cerâmica\n0-100 KM/H: 2,7 s\nVELOCIDADE MÁXIMA: 330 km/h\nRODAS: Aro 21 forjadas\n'
				+ 'DIFERENCIAIS:\nSport Chrono\nBancos concha\nFaróis Matrix LED\nLift dianteiro',
		})!
		const secoes = secoesPelaFicha({
			...s63, brand: 'Porsche', model: '911', version: 'Turbo S', year_manufacture: 2024, year_model: 2025,
			mileage: 0, is_new: true, color: 'Cinza', body_type: 'Cupê', horsepower: 650, options: [], ficha,
		}, ficha)
		expect(secoes).toEqual({
			overview: 'Porsche 911 Turbo S 2024/2025, zero quilômetro. Motor 3.8 Boxer Biturbo de 650 cv, com câmbio '
				+ 'PDK de 8 marchas, tração integral e freios de carbono-cerâmica. Acelera de 0 a 100 km/h em 2,7 s e chega a 330 km/h.',
			exterior: 'Pintura cinza, com rodas aro 21 forjadas. Faróis Matrix LED.',
			interior: 'Bancos concha.',
		})
	})

	it('sem interior, som ou item de dentro, a seção Interior fica com o texto fixo do componente', () => {
		const ficha = lerFichaDoAnuncio({ descricao: 'MOTOR: 4.0 V8\nPOTÊNCIA: 802 cv' })!
		expect(secoesPelaFicha(s63, ficha).interior).toBeNull()
	})

	it('sem cor, rodas nem item de fora, o Exterior fica com a carroceria (SUV em maiúsculas)', () => {
		const ficha = lerFichaDoAnuncio({ descricao: 'MOTOR: 4.0 V8\nPOTÊNCIA: 802 cv' })!
		expect(secoesPelaFicha({ ...s63, color: null, body_type: 'SUV' } as unknown as Vehicle, ficha).exterior)
			.toBe('Carroceria SUV.')
	})
})
