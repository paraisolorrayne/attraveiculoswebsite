import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { CabecalhoSecao, MONTSERRAT } from '@/components/ui/cabecalho-secao'

const journeySteps = [
  { title: 'Seleção personalizada', line: 'Um consultor encontra o carro certo para o seu perfil.' },
  { title: 'Inspeção rigorosa', line: '200+ itens, documentação e histórico verificados.' },
  { title: 'Logística nacional', line: 'Caminhão fechado e seguro até a sua porta.' },
  { title: 'Entrega das chaves', line: 'Orientação na entrega e suporte depois da venda.' },
]

/**
 * Jornada Attra na home, resumida (29/10/2026): as quatro etapas numa linha,
 * com o fio em cima como os fatos do Posicionamento, e o link para /jornada.
 * Antes eram cards com ícone, um parágrafo de abertura e dois CTAs, logo
 * depois do "Um novo jeito de operar", que dizia quase o mesmo.
 */
export function JourneyPreview() {
  return (
    <section className="bg-background py-16 lg:py-24" id="jornada-attra">
      <Container className="max-w-[max(80%,1280px)]">
        <div data-revelar className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <CabecalhoSecao
            rotulo="Jornada Attra"
            titulo={<>Da seleção à entrega <span className="text-foreground/65">na sua garagem</span></>}
          />
          <Link
            href="/jornada"
            className="alvo-toque inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-medium text-foreground hover:text-primary"
          >
            Conheça a jornada completa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {journeySteps.map((step, i) => (
            <li key={step.title} className="border-t border-border pt-5">
              <p className="text-[13px] font-semibold tracking-[0.16em] text-rotulo">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-2 text-xl font-semibold text-foreground" style={MONTSERRAT}>{step.title}</p>
              <p className="mt-1 text-[15px] leading-snug text-foreground-secondary">{step.line}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
