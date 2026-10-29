import { describe, it, expect, vi } from 'vitest'
import { lerFichaDoAnuncio, opcionaisDoVeiculo, potenciaEmCv } from '@/lib/ficha-do-anuncio'

vi.mock('@/lib/inventory-snapshot', () => ({
	appendVehicleToSnapshot: vi.fn(),
	loadLatestAdsHomeSnapshot: vi.fn(),
	loadLatestListSnapshot: vi.fn(),
	loadLatestVehicleSnapshot: vi.fn(),
	saveInventorySnapshot: vi.fn(),
	InventorySnapshotSources: { list: 'l', vehicle: 'v', adsHome: 'a' },
}))

// Como o marketing salvou o Mercedes S 63 (1142317) em 22/10/2026.
const S63 = [
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
].join('\n')

describe('lerFichaDoAnuncio — o molde da Descrição Customizada da AutoConf', () => {
	it('lê a ficha do S 63 como o marketing escreveu', () => {
		expect(lerFichaDoAnuncio({ descricao: S63, modelo_nome: 'S 63 AMG E Performance', potencia: null })).toEqual({
			motor: '4.0 V8 Biturbo Híbrido',
			potencia: '802 cv',
			torque: '145,8 kgfm',
			cambio: null,
			tracao: null,
			aceleracao_0_100: null,
			velocidade_maxima: null,
			cor: 'Prata High-Tech Metálico',
			interior: 'Preto',
			som: 'Burmester',
			rodas: null,
			freios: null,
			diferenciais: ['Blindado BSS com vidros Graphene Full Steel', 'Acabamentos em fibra de carbono'],
			opcionais: ['Travesseiros nos encostos de cabeça'],
		})
	})

	it('sem ficha para o texto padrão da AutoConf, vazio ou nulo', () => {
		expect(lerFichaDoAnuncio({ descricao: 'A procura de um Lamborghini Temerário? Veículo sem garantia.' })).toBeNull()
		expect(lerFichaDoAnuncio({ descricao: '   ' })).toBeNull()
		expect(lerFichaDoAnuncio({ descricao: null })).toBeNull()
		expect(lerFichaDoAnuncio({})).toBeNull()
	})

	it('sem ficha para texto corrido sem a linha MOTOR (o Aston de 21/10)', () => {
		expect(lerFichaDoAnuncio({
			descricao: 'Aston Martin Vantage S 2026, 460 km, 680 cv, 81,6 kgfm, 0-100 km/h em 3,3 s, Podium Green.',
		})).toBeNull()
	})

	it('o texto antes do MOTOR fica de fora', () => {
		const ficha = lerFichaDoAnuncio({ descricao: `Um S 63 único no Brasil.\nCOR: Azul\n${S63}` })
		expect(ficha?.motor).toBe('4.0 V8 Biturbo Híbrido')
		expect(ficha?.cor).toBe('Prata High-Tech Metálico')
		expect(JSON.stringify(ficha)).not.toContain('único no Brasil')
	})

	it('lê o HTML do editor da AutoConf, com entidades e lista', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: '<p>MOTOR: 4.0 V8</p><p>POT&Ecirc;NCIA:&nbsp;510 cv</p><p>C&acirc;mbio: Autom&aacute;tico de 8 marchas<br>'
				+ 'DIFERENCIAIS:</p><ul><li>Teto em fibra de carbono</li><li>Bancos &#8220;Sport Plus&#8221;</li></ul>',
		})
		expect(ficha).toMatchObject({
			motor: '4.0 V8',
			potencia: '510 cv',
			cambio: 'Automático de 8 marchas',
			diferenciais: ['Teto em fibra de carbono', 'Bancos “Sport Plus”'],
		})
	})

	it('aceita rótulo sem acento, em minúscula e os nomes do primeiro molde', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'Motor: 3.8 V8\nPotencia: 720 cv\n0 a 100 km/h: 2,9 s\nTracao: traseira\n'
				+ 'DESTAQUES: Lift dianteiro; Carbono\nEQUIPAMENTOS:\n- Câmera 360°\n• Som Bowers & Wilkins',
		})
		expect(ficha).toMatchObject({
			motor: '3.8 V8',
			potencia: '720 cv',
			aceleracao_0_100: '2,9 s',
			tracao: 'traseira',
			diferenciais: ['Lift dianteiro', 'Carbono'],
			opcionais: ['Câmera 360°', 'Som Bowers & Wilkins'],
		})
	})

	it('tira garantia, procedência, preço, contato e valor provisório, linha a linha', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: [
				'MOTOR: 4.0 V8',
				'RODAS: a confirmar',
				'FREIOS: ?',
				'DIFERENCIAIS:',
				'Único dono',
				'Revisões na concessionária',
				'Garantia de fábrica até 2027',
				'Aceita troca, chame no WhatsApp (34) 99944-4747',
				'Freios de carbono-cerâmica',
				'OPCIONAIS:',
				'Manual e chave reserva',
				'Sport Chrono',
			].join('\n'),
		})
		expect(ficha).toMatchObject({
			motor: '4.0 V8',
			rodas: null,
			freios: null,
			diferenciais: ['Freios de carbono-cerâmica'],
			opcionais: ['Sport Chrono'],
		})
	})

	it('número fora do formato não sai (unidade errada ou ponto decimal)', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'MOTOR: 4.0 V8\nPOTÊNCIA: 600 hp\nTORQUE: 800 Nm\n0-100 KM/H: 3.3 s\nVELOCIDADE MÁXIMA: 325 km/h',
		})
		expect(ficha).toMatchObject({
			potencia: null,
			torque: null,
			aceleracao_0_100: null,
			velocidade_maxima: '325 km/h',
		})
	})

	it('potência que briga com o cadastro não sai; o resto da ficha fica', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'MOTOR: 4.0 V8 Biturbo\nPOTÊNCIA: 680 cv\nTORQUE: 81,6 kgfm',
			modelo_nome: 'Vantage Cupê 4.0 V8 510cv',
		})
		expect(ficha?.potencia).toBeNull()
		expect(ficha?.torque).toBe('81,6 kgfm')
	})

	it('potência igual à do cadastro sai', () => {
		const ficha = lerFichaDoAnuncio({ descricao: 'MOTOR: 4.0 V8\nPOTÊNCIA: 510 cv', potencia: 510 })
		expect(ficha?.potencia).toBe('510 cv')
	})

	it('carro blindado perde 0-100 e velocidade máxima de fábrica', () => {
		const texto = 'MOTOR: 4.0 V8\n0-100 KM/H: 3,4 s\nVELOCIDADE MÁXIMA: 250 km/h'
		const peloCadastro = lerFichaDoAnuncio({ descricao: texto, acessorios: [{ nome: 'Blindado' }] })
		expect(peloCadastro).toMatchObject({ aceleracao_0_100: null, velocidade_maxima: null })

		const pelaFicha = lerFichaDoAnuncio({ descricao: `${texto}\nDIFERENCIAIS:\nBlindagem nível III-A` })
		expect(pelaFicha).toMatchObject({ aceleracao_0_100: null, velocidade_maxima: null })

		expect(lerFichaDoAnuncio({ descricao: texto })).toMatchObject({ aceleracao_0_100: '3,4 s', velocidade_maxima: '250 km/h' })
	})

	it('rótulo repetido com valores diferentes não sai; rótulo fora do molde é ignorado', () => {
		const ficha = lerFichaDoAnuncio({ descricao: 'MOTOR: 4.0 V8\nCOR: Verde\nCOR: Podium Green\nPINTURA: Podium Green' })
		expect(ficha?.cor).toBeNull()
		expect(JSON.stringify(ficha)).not.toContain('Podium')
	})

	it('só MOTOR com valor provisório e nada mais: sem ficha', () => {
		expect(lerFichaDoAnuncio({ descricao: 'MOTOR: a confirmar' })).toBeNull()
	})
})

describe('potenciaEmCv e opcionaisDoVeiculo', () => {
	it('tira o número da potência da ficha', () => {
		expect(potenciaEmCv(lerFichaDoAnuncio({ descricao: S63 }))).toBe(802)
		expect(potenciaEmCv(null)).toBeNull()
	})

	it('opcionais do molde primeiro, sem repetir os do catálogo', () => {
		expect(opcionaisDoVeiculo({
			options: ['Alarme', 'Câmera 360°', 'Blindado'],
			ficha: { ...lerFichaDoAnuncio({ descricao: 'MOTOR: V8\nOPCIONAIS:\nCamera 360°\nTeto solar' })! },
		})).toEqual(['Camera 360°', 'Teto solar', 'Alarme', 'Blindado'])
		expect(opcionaisDoVeiculo({ options: null, ficha: null })).toEqual([])
	})
})

describe('mapAutoConfToVehicle com a ficha do molde', () => {
	it('a ficha vai para o veículo e completa motor e potência que o cadastro não tem', async () => {
		const { mapAutoConfToVehicle } = await import('@/lib/autoconf-api')
		const vehicle = mapAutoConfToVehicle({
			id: 1142317, modelo_nome: 'S 63 AMG E Performance', modelopai_nome: 'S 63', marca_nome: 'Mercedes-Benz',
			anofabricacao: '2025', anomodelo: '2025', km: 1200, valorvenda: '1500000', potencia: null,
			cor_nome: 'Prata', fotos: [], acessorios: [{ nome: 'Blindado' }], acessorios_destaque: [],
			descricao: S63,
		} as unknown as Parameters<typeof mapAutoConfToVehicle>[0])
		expect(vehicle.ficha?.torque).toBe('145,8 kgfm')
		expect(vehicle.engine).toBe('4.0 V8 Biturbo Híbrido')
		expect(vehicle.horsepower).toBe(802)
		expect(vehicle.color).toBe('Prata')
		// O texto bruto não vai para o objeto público.
		expect(vehicle).not.toHaveProperty('descricao')
	})

	it('sem descrição (a lista da AutoConf), ficha nula e motor como antes', async () => {
		const { mapAutoConfToVehicle } = await import('@/lib/autoconf-api')
		const vehicle = mapAutoConfToVehicle({
			id: 1, modelo_nome: '911 Carrera', modelopai_nome: '911', marca_nome: 'Porsche',
			anofabricacao: '2024', anomodelo: '2024', km: 0, valorvenda: '900000', potencia: 394, fotos: [],
		} as unknown as Parameters<typeof mapAutoConfToVehicle>[0])
		expect(vehicle.ficha).toBeNull()
		expect(vehicle.engine).toBeNull()
		expect(vehicle.horsepower).toBe(394)
	})
})
