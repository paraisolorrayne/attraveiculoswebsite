'use client'

import { useEffect } from 'react'
import { buscaSegura, trackVehicle, vehicleIdFromPath } from '@/lib/meta-pixel'

/**
 * Meta Pixel — a parte que precisa escutar a página inteira.
 *
 * O `ViewContent` e o `Search` são disparados de onde os dados estão (a ficha
 * do veículo e a listagem). O `Lead` de WhatsApp não tem um lugar só: são 37
 * arquivos com link `wa.me` — botão flutuante, ficha, cards, guias, blog — e a
 * ficha sozinha tem 7 botões. Marcar um por um significa esquecer alguns hoje e
 * todos os que forem criados depois.
 *
 * Então vale aqui a mesma escolha já feita para o pixel do OpenAI, no arquivo
 * ao lado: um ouvinte só, na fase de captura, que continua valendo para link
 * novo. Roda antes de qualquer handler que pare a propagação, e mede ANTES da
 * navegação — a aba do WhatsApp abre em seguida.
 *
 * Este componente NÃO carrega o pixel: o código-base vem de uma tag do GTM.
 * Ver o cabeçalho de `src/lib/meta-pixel.ts`.
 */
function WhatsAppLeadTracker() {
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Element | null
      const link = alvo?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"]')
      if (!link) return

      // Mesmas duas origens do pixel do OpenAI, na mesma ordem: o card de
      // listagem se identifica por `data-vehicle-id` (o caminho é só
      // `/veiculos` e o href não diz de que carro o botão é); na ficha, o id
      // sai do próprio caminho, que termina nele.
      //
      // Sem nenhum dos dois o evento não sai. Um `Lead` sem `content_ids` é o
      // defeito que esta mudança existe para consertar — e clique de WhatsApp
      // no blog ou na home não é lead de veículo nenhum.
      const doBotao = link.closest<HTMLElement>('[data-vehicle-id]')?.dataset.vehicleId
      const naFicha = vehicleIdFromPath(window.location.pathname)

      trackVehicle('Lead', [doBotao ?? naFicha])
    }

    document.addEventListener('click', aoClicar, { capture: true })
    return () => document.removeEventListener('click', aoClicar, { capture: true })
  }, [])

  return null
}

export function MetaPixel() {
  return <WhatsAppLeadTracker />
}

/**
 * `Search` — disparado pela listagem quando houve busca ou filtro.
 *
 * Fica aqui, e não no `MetaPixel` global, porque depende dos RESULTADOS: a
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
