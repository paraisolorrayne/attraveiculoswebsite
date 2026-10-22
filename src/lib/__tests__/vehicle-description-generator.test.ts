import { describe, it, expect } from 'vitest'
import { generateVehicleDescription } from '@/lib/vehicle-description-generator'
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

	it('sem ficha, o texto continua o de antes', () => {
		expect(generateVehicleDescription(s63)).toBe(
			'Este Mercedes S-63 AMG S E Performance Automático 2025 oferece motor de 802 cv e câmbio automático, '
			+ 'aliando desempenho e sofisticação. Com apenas 1.920 km rodados, está em excelente estado. '
			+ 'Apresenta-se na cor prata e motorização gasolina e elétrico. Um veículo premium completo para quem valoriza qualidade.',
		)
	})
})
