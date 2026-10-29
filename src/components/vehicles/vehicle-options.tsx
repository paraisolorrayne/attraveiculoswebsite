import { Check } from 'lucide-react'
import { matchOptionToManualTerm } from '@/lib/manual-attra-data'
import { GlossaryTooltip } from './glossary-tooltip'
import { SecaoDaFicha } from './secao-da-ficha'

interface VehicleOptionsProps {
  options: string[]
}

export function VehicleOptions({ options }: VehicleOptionsProps) {
  if (!options || options.length === 0) return null

  // Lista em fios, como a ficha técnica, em colunas conforme a largura.
  return (
    <SecaoDaFicha titulo="Opcionais">
      <ul className="grid gap-x-12 @xl:grid-cols-2 @[78rem]:grid-cols-3">
        {options.map((option, index) => {
          const matchedTerm = matchOptionToManualTerm(option)

          return (
            <li
              key={index}
              className="flex items-center gap-3 border-b border-border/70 py-3.5 text-[17px]"
            >
              <Check className="w-[18px] h-[18px] text-primary flex-shrink-0" />
              {matchedTerm ? (
                <GlossaryTooltip term={matchedTerm}>
                  <span className="text-foreground">{option}</span>
                </GlossaryTooltip>
              ) : (
                <span className="text-foreground">{option}</span>
              )}
            </li>
          )
        })}
      </ul>
    </SecaoDaFicha>
  )
}
