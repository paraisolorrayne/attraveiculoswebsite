import {
  Compass,
  Globe2,
  ShieldCheck,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react'
import { Container } from '@/components/ui/container'

const pillars = [
  { icon: Compass,     title: '18+ anos',           line: 'curando veículos premium' },
  { icon: Globe2,      title: 'Atuação nacional',   line: 'entrega em 27 estados' },
  { icon: Search,      title: 'Curadoria rigorosa', line: 'seleção antes do catálogo' },
  { icon: ShieldCheck, title: 'Inspeção 200+ itens',line: 'procedência verificada' },
  { icon: Truck,       title: 'Entrega segura',     line: 'transporte fechado e seguro' },
  { icon: UserCheck,   title: 'Consultor dedicado', line: 'do primeiro contato à entrega' },
]

export function TrustStrip() {
  return (
    <section className="py-10 md:py-14 border-y border-border/60 bg-background-card/40">
      <Container size="2xl">
        <p className="text-center text-[11px] uppercase tracking-[0.22em] text-foreground-secondary mb-6">
          Por que confiar na Attra
        </p>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6">
          {pillars.map(({ icon: Icon, title, line }) => (
            <li
              key={title}
              className="flex flex-col items-center text-center px-2"
            >
              <div className="w-10 h-10 mb-2.5 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {title}
              </p>
              <p className="text-xs text-foreground-secondary mt-0.5 leading-snug">
                {line}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
