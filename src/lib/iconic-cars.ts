/**
 * Iconic Cars — Attra History Cache
 *
 * Curated record of the most notable vehicles that have passed through
 * Attra Veículos. This serves as a permanent portfolio/history page,
 * independent of the live inventory (which removes sold vehicles).
 *
 * Rules:
 *  - No prices shown (historical record only — prices change over time).
 *  - Data is provisioned from past inventory snapshots.
 *  - Photos currently reference the AutoConf S3 bucket. Run POST /api/iconic/snapshot
 *    once with CRON_SECRET to migrate them to Supabase (link-rot prevention).
 *  - Each entry includes a short editorial note about why it's iconic.
 */

export interface IconicCar {
	id: string
	brand: string
	model: string
	version?: string
	year: number
	color: string
	mileage: string
	engine: string
	power: string
	photo: string
	category: 'supercar' | 'luxury' | 'sports' | 'muscle' | 'suv-premium'
	editorial: string
	highlights: string[]
	soldYear: number
}

export const ICONIC_CARS: IconicCar[] = [
	{
		id: 'iconic-ferrari-812-gts',
		brand: 'Ferrari',
		model: '812 GTS',
		version: '6.5 V12 F1-DCT',
		year: 2023,
		color: 'Vermelho',
		mileage: '0 km',
		engine: 'V12 6.5L aspirado',
		power: '795 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/685962/41e75495-695c-4b02-b04c-4202637e8ce0.jpg',
		category: 'supercar',
		editorial: 'O último Ferrari com motor V12 frontal aspirado em versão spider. O 812 GTS entrega 795 cv de pura emoção analógica com teto retrátil em apenas 14 segundos — uma combinação que nunca mais será repetida.',
		highlights: ['V12 aspirado de 6.5L — o mais potente da categoria', 'Teto retrátil em 14 segundos', 'Último V12 frontal aspirado da Ferrari'],
		soldYear: 2025,
	},
	{
		id: 'iconic-ferrari-sf90-stradale',
		brand: 'Ferrari',
		model: 'SF90 Stradale',
		version: '4.0 V8 Bi-Turbo Híbrido',
		year: 2023,
		color: 'Vermelho',
		mileage: '10 km',
		engine: 'V8 4.0L biturbo + 3 motores elétricos',
		power: '1.000 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/910034/3bc5879d-54d6-4b4e-bd95-70a0ee4e870b.jpg',
		category: 'supercar',
		editorial: 'O Ferrari mais potente da história. Combinando motor V8 biturbo com três motores elétricos, o SF90 Stradale entrega 1.000 cv e é capaz de rodar 25 km em modo 100% elétrico — tecnologia de Fórmula 1 nas ruas.',
		highlights: ['1.000 cv — Ferrari mais potente já produzido', '3 motores elétricos + V8 biturbo', 'Modo eDrive para condução 100% elétrica'],
		soldYear: 2025,
	},
	{
		id: 'iconic-ferrari-roma',
		brand: 'Ferrari',
		model: 'Roma',
		version: '3.9 V8 620cv',
		year: 2023,
		color: 'Preto',
		mileage: '2.500 km',
		engine: 'V8 3.9L biturbo',
		power: '620 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/792089/b1b98efe-a864-418e-aafa-2b92e799f47a.jpg',
		category: 'luxury',
		editorial: 'O gran turismo mais elegante da Ferrari moderna. Com design inspirado na era Dolce Vita dos anos 60 e motor V8 biturbo de 620 cv, o Roma combina esportividade italiana com refinamento de grand tourer.',
		highlights: ['Design inspirado nos clássicos dos anos 60', 'Motor V8 biturbo de 620 cv', 'Câmbio de dupla embreagem de 8 velocidades'],
		soldYear: 2025,
	},
	{
		id: 'iconic-mercedes-g63-amg',
		brand: 'Mercedes-Benz',
		model: 'G 63 AMG',
		version: '4.0 V8 Bi-Turbo 4MATIC',
		year: 2025,
		color: 'Preto',
		mileage: '300 km',
		engine: 'V8 4.0L biturbo AMG',
		power: '585 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/787353/663b76cd-4a96-441b-aa25-049f5b28e72a.jpg',
		category: 'suv-premium',
		editorial: 'O ícone off-road transformado em símbolo de poder e exclusividade. O G 63 AMG combina a robustez militar do Classe G com a brutalidade do motor V8 biturbo AMG — um veículo que domina qualquer terreno sem pedir desculpas.',
		highlights: ['Motor V8 4.0L biturbo AMG de 585 cv', 'Chassi militar com 3 bloqueios de diferencial', 'Ícone automobilístico há mais de 40 anos'],
		soldYear: 2025,
	},
	{
		id: 'iconic-mclaren-artura',
		brand: 'McLaren',
		model: 'Artura',
		version: 'Spider',
		year: 2024,
		color: 'Silica White',
		mileage: '0 km',
		engine: 'V6 3.0L biturbo + motor elétrico',
		power: '680 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/982895/b360d07c-aaa0-4c72-b275-4d6ad5ad6c91.jpg',
		category: 'supercar',
		editorial: 'O primeiro McLaren híbrido plug-in. Com chassi em fibra de carbono e motor V6 desenvolvido do zero, combina eficiência com performance brutal em um pacote de apenas 1.395 kg — o futuro dos supercarros.',
		highlights: ['Primeiro McLaren híbrido plug-in', 'Chassi MCLA em fibra de carbono', 'Apenas 1.395 kg com motor elétrico'],
		soldYear: 2025,
	},
	{
		id: 'iconic-porsche-718-gt4-rs',
		brand: 'Porsche',
		model: '718 Cayman GT4 RS',
		version: '4.0 500cv',
		year: 2024,
		color: 'Branco',
		mileage: '220 km',
		engine: 'Boxer 6 4.0L aspirado',
		power: '500 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/784916/02d0ebcb-6074-4927-9890-c65da7fe566e.jpg',
		category: 'sports',
		editorial: 'O motor boxer aspirado do 911 GT3 em um pacote mid-engine compacto e letal. O 718 Cayman GT4 RS é considerado por muitos o melhor carro de piloto da Porsche — mais comunicativo e ágil que o irmão maior.',
		highlights: ['Motor boxer 4.0L do 911 GT3 — 9.000 rpm', 'Motor central — equilíbrio dinâmico perfeito', 'Entradas de ar laterais derivadas de competição'],
		soldYear: 2025,
	},
	{
		id: 'iconic-gmc-hummer-ev',
		brand: 'GMC',
		model: 'Hummer EV',
		version: 'Edition 1 Pickup 4X4',
		year: 2022,
		color: 'Branco',
		mileage: '9.000 km',
		engine: 'Tri-motor elétrico',
		power: '1.000 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/685952/c8b7eb6c-004d-40c0-9c56-6c0424efc78c.jpg',
		category: 'suv-premium',
		editorial: 'O renascimento do Hummer como veículo 100% elétrico. A Edition 1 é a versão mais completa, com tri-motor de 1.000 cv, CrabWalk que permite andar na diagonal e Extract Mode que eleva a suspensão em 15 cm.',
		highlights: ['Tri-motor elétrico de 1.000 cv e 15.592 Nm', 'CrabWalk — rodas traseiras viram até 10°', 'Extract Mode — eleva 15 cm a suspensão'],
		soldYear: 2024,
	},
	{
		id: 'iconic-audi-r8',
		brand: 'Audi',
		model: 'R8',
		version: '5.2 V10 Coupé Quattro S Tronic',
		year: 2021,
		color: 'Cinza',
		mileage: '16.000 km',
		engine: 'V10 5.2L aspirado',
		power: '620 cv',
		photo: 'https://autoconf-production.s3.amazonaws.com/veiculos/fotos/685968/ed6d70b8-c478-4699-9d8e-7b8b96cfaf9a.jpg',
		category: 'supercar',
		editorial: 'O último supercarro com motor V10 aspirado da Audi. Compartilhando DNA com o Lamborghini Huracán, o R8 entrega brutalidade sonora e performance visceral em um pacote surpreendentemente refinado para o dia a dia.',
		highlights: ['Motor V10 5.2L aspirado — som inigualável', 'Tração Quattro integral permanente', 'DNA compartilhado com Lamborghini Huracán'],
		soldYear: 2024,
	},
]

const CATEGORY_LABELS: Record<IconicCar['category'], string> = {
	supercar: 'Supercarro',
	luxury: 'Luxo',
	sports: 'Esportivo',
	muscle: 'Muscle Car',
	'suv-premium': 'SUV Premium',
}

export function getCategoryLabel(category: IconicCar['category']): string {
	return CATEGORY_LABELS[category] || category
}
