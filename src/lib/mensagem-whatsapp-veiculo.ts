import type { Vehicle } from '@/types'
import { formatPrice } from '@/lib/utils'

/**
 * Texto pré-preenchido do WhatsApp na ficha. Fica fora dos componentes de
 * cliente porque a página (servidor) e a caixa "Interessado?" (cliente)
 * precisam do mesmo texto: o consultor recebe o carro e o preço de qualquer
 * botão da ficha.
 */
export function mensagemWhatsAppDoVeiculo(vehicle: Vehicle): string {
  if (vehicle.status === 'sold') {
    return `Olá! Vi que o ${vehicle.brand} ${vehicle.model} ${vehicle.year_model} já foi vendido. Gostaria de saber se há algum similar disponível.`
  }
  return `Olá! Tenho interesse no ${vehicle.brand} ${vehicle.model} ${vehicle.year_model}. Valor: ${formatPrice(vehicle.price)}. Gostaria de mais informações.`
}

/**
 * Ação de baixo compromisso da ficha (auditoria de 20/11/2026): quem ainda
 * avalia pede os documentos deste carro, sem marcar visita. Os itens são os
 * que /garantia-e-procedencia diz que a Attra verifica antes de vender.
 */
export function mensagemPedidoDeDocumentos(vehicle: Vehicle): string {
  return `Olá! Estou avaliando o ${vehicle.brand} ${vehicle.model} ${vehicle.year_model} (${formatPrice(vehicle.price)}). `
    + 'Antes de decidir, gostaria de receber o laudo cautelar, o histórico de manutenção, '
    + 'a lista de opcionais de fábrica e as condições de garantia deste carro.'
}
