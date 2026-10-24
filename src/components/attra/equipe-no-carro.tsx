import Image from 'next/image'
import { EQUIPE_ATTRA, type PessoaDaAttra } from '@/lib/equipe-attra'
import { cn } from '@/lib/utils'
import { Legenda } from './equipe-attra'

/**
 * A equipe dirigindo, no /sobre, montada como página de revista: o Thiago na
 * horizontal em cima, Cris e Gabriel em pé lado a lado embaixo, cada foto no
 * formato em que foi feita e sem corte a partir de 640 px. As frações da
 * grade de baixo seguem as proporções (4:5 e 9:16), então as duas saem com a
 * mesma altura. Abaixo de 640 px, uma coluna: Thiago em 4:3 e os outros em 4:5.
 *
 * Os três olham para a direita, e por isso as fotos ficam à esquerda do texto
 * da seção (ver /sobre). Proposta do design em 23/10/2026; a versão anterior,
 * com faixa de pista e fotos "andando", foi descartada por ser literal demais.
 */
const [THIAGO, CRIS, GABRIEL] = EQUIPE_ATTRA

function Foto({
  pessoa,
  aspecto,
  enquadramento,
  sizes,
  atraso,
}: {
  pessoa: PessoaDaAttra
  aspecto: string
  enquadramento: string
  sizes: string
  atraso: number
}) {
  return (
    <figure>
      <div
        data-revelar="cortina"
        style={{ ['--d' as string]: `${atraso}s` }}
        className={cn('relative overflow-hidden rounded-2xl bg-background-soft dark:ring-1 dark:ring-white/10', aspecto)}
      >
        <Image
          src={pessoa.noCarro.src}
          alt={`${pessoa.nome}${pessoa.cargo ? `, ${pessoa.cargo}` : ''} da Attra Veículos, dirigindo`}
          fill
          sizes={sizes}
          className={cn('object-cover', enquadramento)}
        />
      </div>
      <Legenda nome={pessoa.nome} cargo={pessoa.cargo} atraso={atraso + 0.5} />
    </figure>
  )
}

export function EquipeNoCarro({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Foto
        pessoa={THIAGO}
        aspecto="aspect-[4/3] sm:aspect-video"
        enquadramento="object-[30%_50%] sm:object-center"
        sizes="(min-width: 1280px) 768px, (min-width: 1024px) 62vw, 100vw"
        atraso={0}
      />
      <div className="mt-10 grid gap-10 sm:grid-cols-[minmax(0,12.8fr)_minmax(0,9fr)] sm:gap-6">
        <Foto
          pessoa={CRIS}
          aspecto="aspect-[4/5]"
          enquadramento="object-center"
          sizes="(min-width: 1280px) 440px, (min-width: 640px) 56vw, 100vw"
          atraso={0}
        />
        <Foto
          pessoa={GABRIEL}
          aspecto="aspect-[4/5] sm:aspect-[9/16]"
          enquadramento="object-[50%_65%] sm:object-center"
          sizes="(min-width: 1280px) 310px, (min-width: 640px) 40vw, 100vw"
          atraso={0.12}
        />
      </div>
    </div>
  )
}
