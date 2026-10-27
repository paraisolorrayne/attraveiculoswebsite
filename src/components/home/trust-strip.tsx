import {
  Compass,
  Globe2,
  ShieldCheck,
  Search,
  Truck,
  UserCheck,
} from 'lucide-react'
import { Container } from '@/components/ui/container'
import { MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { anosDeMercado } from '@/lib/constants'

const pillars = [
  { icon: Compass,     title: `${anosDeMercado()} anos`, line: 'curando veículos premium' },
  { icon: Globe2,      title: 'Atuação nacional',   line: 'entrega em 27 estados' },
  { icon: Search,      title: 'Curadoria rigorosa', line: 'seleção antes do catálogo' },
  { icon: ShieldCheck, title: 'Inspeção 200+ itens',line: 'procedência verificada' },
  { icon: Truck,       title: 'Entrega segura',     line: 'transporte fechado e seguro' },
  { icon: UserCheck,   title: 'Consultor dedicado', line: 'do primeiro contato à entrega' },
]

/**
 * "Por que confiar na Attra": desde 27/10/2026 logo antes do Posicionamento,
 * em blocos abertos com um fio em cima (como os diferenciais de /jornada e
 * /sobre), no lugar dos ícones em quadradinho centralizados. Sem espaço
 * embaixo: o Posicionamento tem o mesmo fundo e as duas se leem como um bloco.
 */
export function TrustStrip() {
  return (
    <section className="bg-background-soft pt-14 lg:pt-20">
      <Container>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-primary">
          Por que confiar na Attra
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
          {pillars.map(({ icon: Icon, title, line }, i) => (
            <li
              key={title}
              data-revelar
              style={{ ['--d' as string]: `${i * 70}ms` }}
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
      </Container>
    </section>
  )
}
