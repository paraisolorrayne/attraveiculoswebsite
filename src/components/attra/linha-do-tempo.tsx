import { MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { TRAJETORIA_ATTRA } from '@/lib/trajetoria-attra'
import { cn } from '@/lib/utils'

/**
 * Linha do tempo numa coluna só: o ano grande à esquerda e o texto alinhado à
 * esquerda. Em duas colunas alternadas, os textos de tamanhos diferentes
 * deixavam buracos e metade ficava alinhada à direita. Um fio vermelho cresce
 * com a rolagem (.linha-do-tempo em motion.css).
 *
 * `anel` é a cor do aro em volta de cada ponto: a do fundo da seção.
 */
export function LinhaDoTempo({ anel = 'ring-background', className }: { anel?: string; className?: string }) {
  return (
    <ol className={cn('linha-do-tempo relative max-w-4xl', className)}>
      {TRAJETORIA_ATTRA.map((marco) => (
        <li key={marco.ano} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-6 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-10">
          <p className="pt-0.5 text-2xl font-semibold tabular-nums text-primary sm:text-4xl" style={MONTSERRAT}>{marco.ano}</p>
          <div className="relative border-l border-border pb-12 pl-8 sm:pl-10">
            <span aria-hidden="true" className={cn('absolute -left-[5px] top-3 h-[9px] w-[9px] rounded-full bg-primary ring-4', anel)} />
            <h3 className="text-xl font-semibold text-foreground" style={MONTSERRAT}>{marco.titulo}</h3>
            <p className="mt-2 max-w-2xl leading-relaxed text-foreground-secondary">{marco.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
