import { describe, it, expect } from 'vitest'
import { mensagemPedidoDeDocumentos } from '@/lib/mensagem-whatsapp-veiculo'
import type { Vehicle } from '@/types'

const ferrari = { brand: 'Ferrari', model: '296', year_model: 2024, price: 2_990_000, status: 'available' } as unknown as Vehicle

// Auditoria de 20/11/2026: a ficha só tinha ações de alto compromisso (falar
// com consultor, ligar, financiar). Quem ainda avalia pede os documentos.
describe('pedido de documentos pelo WhatsApp', () => {
	it('cita o carro, o preço e os documentos que a página de garantia promete', () => {
		const texto = mensagemPedidoDeDocumentos(ferrari)
		expect(texto).toContain('Ferrari 296 2024')
		expect(texto).toMatch(/R\$\s?2\.990\.000/)
		expect(texto).toMatch(/laudo cautelar/)
		expect(texto).toMatch(/histórico de manutenção/)
		expect(texto).toMatch(/garantia/)
		expect(texto).toMatch(/opcionais de fábrica/)
	})
})
