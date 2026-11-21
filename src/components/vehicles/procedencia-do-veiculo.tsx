import Link from 'next/link'
import { Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SecaoDaFicha } from './secao-da-ficha'
import { getWhatsAppUrl } from '@/lib/constants'
import { mensagemPedidoDeDocumentos } from '@/lib/mensagem-whatsapp-veiculo'
import type { Vehicle } from '@/types'

// O que /garantia-e-procedencia diz que a Attra faz com todo carro antes de
// vender. Fica igual em toda ficha porque é regra da loja, não dado do carro:
// procedência deste exemplar (donos, revisões, laudo) só entra com documento
// (ficha-do-anuncio.ts tira essas linhas do texto do marketing), e por isso
// vai pelo pedido de documentos, não por texto na página.
const VERIFICACOES = [
  'Documentação consultada no Detran: multas, sinistros e alienação.',
  'Laudo cautelar feito por empresa independente.',
  'Pintura medida com medidor de espessura e desgaste comparado à quilometragem declarada.',
  'Histórico de manutenção: quando é parcial, a Attra informa quais registros existem.',
  'Garantia: as condições deste carro são apresentadas antes da compra.',
]

/**
 * "Procedência" na ficha do veículo (auditoria de 20/11/2026). A página de
 * garantia prometia laudo, histórico e verificação, e a ficha do carro não
 * mostrava nada disso: a garantia era "informada pelo consultor". Aqui a ficha
 * diz o que é verificado e dá a quem ainda avalia uma ação de baixo
 * compromisso: pedir os documentos deste carro.
 */
export function ProcedenciaDoVeiculo({ vehicle }: { vehicle: Vehicle }) {
  return (
    <SecaoDaFicha titulo="Procedência" subtitulo="O que a Attra verifica antes de vender este carro">
      <ul className="grid gap-x-12 @xl:grid-cols-2">
        {VERIFICACOES.map((item) => (
          <li key={item} className="flex items-start gap-3 border-b border-border/70 py-3.5 text-[17px] text-foreground">
            <Check className="mt-1 h-[18px] w-[18px] flex-shrink-0 text-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-4 @xl:flex-row @xl:items-center">
        <Button asChild size="lg" variant="outline" className="text-base">
          <a
            href={getWhatsAppUrl(mensagemPedidoDeDocumentos(vehicle))}
            target="_blank"
            rel="noopener noreferrer"
            data-vehicle-id={vehicle.id}
            className="inline-flex items-center justify-center gap-2"
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
            Receber laudo e histórico deste carro
          </a>
        </Button>
        <Link href="/garantia-e-procedencia" className="alvo-toque text-[15px] font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Como a Attra verifica cada veículo
        </Link>
      </div>
    </SecaoDaFicha>
  )
}
