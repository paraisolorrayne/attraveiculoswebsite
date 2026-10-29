import {
  Compass,
  Globe2,
  ShieldCheck,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react'
import { MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { anosDeMercado } from '@/lib/constants'
import { cn } from '@/lib/utils'

const pillars = [
  { icon: Compass,     title: `${anosDeMercado()} anos`, line: 'curando veículos premium' },
  { icon: Globe2,      title: 'Atuação nacional',   line: 'entrega em 27 estados' },
  { icon: Search,      title: 'Curadoria rigorosa', line: 'seleção antes do catálogo' },
  { icon: ShieldCheck, title: 'Inspeção 200+ itens',line: 'procedência verificada' },
  { icon: Truck,       title: 'Entrega segura',     line: 'transporte fechado e seguro' },
  { icon: UserCheck,   title: 'Consultor dedicado', line: 'do primeiro contato à entrega' },
]

/**
 * Os seis fatos do antigo "Por que confiar na Attra", em blocos abertos com um
 * fio em cima. Desde 29/10/2026 não é mais uma seção: fecha a seção de
 * Posicionamento (about-section-expanded.tsx), que juntou o "Por que confiar",
 * o "Mais do que carros" e o "Um novo jeito de operar". As três diziam a mesma
 * coisa (curadoria, relação, alcance nacional) em sequência.
 */
export function ProvasDaAttra({ className }: { className?: string }) {
  return (
    <ul className={cn('grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6', className)}>
      {pillars.map(({ icon: Icon, title, line }, i) => (
        <li
          key={title}
          data-revelar
          style={{ ['--d' as string]: `${i * 50}ms` }}
          className="border-t border-border pt-5"
        >
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-4 text-[17px] font-semibold text-foreground" style={MONTSERRAT}>
            {title}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-foreground-secondary">
            {line}
          </p>
        </li>
      ))}
    </ul>
  )
}
