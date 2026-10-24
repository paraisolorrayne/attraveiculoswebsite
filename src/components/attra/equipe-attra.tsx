import Image from 'next/image'
import { MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { EQUIPE_ATTRA } from '@/lib/equipe-attra'

/**
 * A equipe em pé, na /jornada: três fotos 4:5 lado a lado, cada uma abrindo
 * em cortina com um pequeno atraso. No celular, carrossel com rolagem para o
 * lado. No /sobre a equipe aparece dirigindo (EquipeIndice).
 */
export function EquipeAttra({ className }: { className?: string }) {
  return (
    <ul className={`jornada-carrossel -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-8 ${className ?? ''}`}>
      {EQUIPE_ATTRA.map((pessoa, i) => (
        <li key={pessoa.nome} className="w-[72%] shrink-0 snap-start sm:w-auto">
          <figure>
            <div
              data-revelar="cortina"
              style={{ ['--d' as string]: `${i * 0.15}s` }}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-background-soft"
            >
              <Image
                src={pessoa.emPe.src}
                alt={`${pessoa.nome}${pessoa.cargo ? `, ${pessoa.cargo}` : ''} da Attra Veículos`}
                fill
                sizes="(max-width: 640px) 72vw, 33vw"
                className="object-cover"
                style={{ objectPosition: pessoa.emPe.enquadramento }}
              />
            </div>
            <Legenda nome={pessoa.nome} cargo={pessoa.cargo} />
          </figure>
        </li>
      ))}
    </ul>
  )
}

function Legenda({ nome, cargo }: { nome: string; cargo?: string }) {
  return (
    <figcaption className="mt-4 flex items-baseline gap-3">
      <span className="text-lg font-semibold text-foreground" style={MONTSERRAT}>{nome}</span>
      {cargo && <span className="text-[13px] uppercase tracking-[0.14em] text-foreground-secondary">{cargo}</span>}
    </figcaption>
  )
}
