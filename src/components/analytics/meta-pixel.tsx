'use client'

import { useEffect } from 'react'
import { buscaSegura, trackVehicle } from '@/lib/meta-pixel'

/*
 * Meta Pixel: os eventos que dependem do que a página mostra.
 *
 * O `ViewContent` sai da ficha do veículo e o `Search` da listagem, de onde os
 * dados estão. Nada aqui carrega o pixel: o código-base vem de uma tag do GTM
 * (ver o cabeçalho de `src/lib/meta-pixel.ts`).
 *
 * O `Lead` não sai do navegador (27/11/2026). Clique no WhatsApp não é lead, e
 * formulário enviado também ainda não é: a Attra conta o lead quando ele chega
 * ao vendedor. Esse envio é do attra-py, pela API de Conversões, com o evento
 * `LeadEncaminhadoVendedor`. Até essa data, um ouvinte neste arquivo mandava
 * `Lead` a cada clique em link de WhatsApp. O teste em
 * src/lib/__tests__/clique-nao-e-lead.test.ts impede que volte.
 */

/**
 * `Search` — disparado pela listagem quando houve busca ou filtro.
 *
 * Fica aqui, e não num componente global, porque depende dos RESULTADOS: a
 * `/veiculos` é componente de servidor, filtra em memória e só ela sabe quais
 * carros sobraram. Este componente recebe os ids prontos.
 *
 * Só com busca ou filtro, de propósito. Abrir a listagem e olhar o estoque não
 * é uma pesquisa; mandar `Search` em toda visita encheria o evento de ruído e
 * não diria nada sobre intenção.
 *
 * Os dez primeiros: é o teto que a Meta recomenda para `content_ids` de
 * pesquisa, e são os que a pessoa de fato vê antes de rolar.
 */
export function MetaSearchTracker({
  ids,
  termo,
}: {
  ids: string[]
  termo?: string
}) {
  // Junta em texto para o efeito comparar valor, e não identidade do array —
  // a página remonta a cada navegação e um array novo com os mesmos ids
  // dispararia o evento de novo.
  const chave = ids.join(',')

  useEffect(() => {
    if (!chave) return
    trackVehicle('Search', chave.split(','), buscaSegura(termo))
  }, [chave, termo])

  return null
}
