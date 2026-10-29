import { Star, Trophy, Shield, Sparkles } from 'lucide-react'

interface EditorialSectionProps {
  brand: string
  model: string
  year: number
  description?: string
  isCollectible?: boolean
  isRare?: boolean
}

export function EditorialSection({ brand, model, year, description, isCollectible, isRare }: EditorialSectionProps) {
  // Generate compelling editorial content based on vehicle
  const getEditorialContent = () => {
    const brandDescriptions: Record<string, string> = {
      Ferrari: 'nascido nas lendárias oficinas de Maranello, carrega o DNA de décadas de domínio nas pistas de corrida mais exigentes do mundo',
      Lamborghini: 'uma declaração de ousadia italiana, projetado para transformar cada quilômetro em uma experiência visceral e inesquecível',
      Porsche: 'a culminação de mais de 70 anos de engenharia alemã obsessiva, onde cada detalhe serve a um único propósito: a perfeição',
      McLaren: 'forjado com a mesma filosofia que conquistou campeonatos de Fórmula 1, representa o ápice da tecnologia automobilística britânica',
      'Audi': 'a expressão máxima do conceito "Vorsprung durch Technik", unindo luxo discreto a performance devastadora',
      BMW: 'a tradição de criar a "máquina de dirigir definitiva" elevada ao seu máximo potencial',
      'Mercedes-Benz': 'um século de inovação automobilística condensado em uma máquina que define novos padrões de excelência',
      Cadillac: 'o renascimento do luxo americano, combinando presença imponente com desempenho que desafia expectativas',
    }

    const defaultDesc = 'uma verdadeira obra de engenharia que transcende a categoria de automóvel para se tornar objeto de desejo'
    
    return brandDescriptions[brand] || defaultDesc
  }

  return (
    <section className="bg-background-soft border-y border-border py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-sm font-medium text-primary uppercase tracking-wider">
            Por que este carro é especial
          </h2>
        </div>

        {/* Editorial content */}
        <div className="space-y-6">
          <p className="text-3xl lg:text-4xl font-light text-foreground leading-relaxed">
            O <span className="font-bold">{brand} {model} {year}</span> é mais que um automóvel: é {getEditorialContent()}.
          </p>

          {description && (
            <p className="text-lg text-foreground-secondary leading-relaxed">
              {description}
            </p>
          )}

          {/* Highlights */}
          <div className="grid sm:grid-cols-3 gap-6 pt-8 border-t border-border">
            {isCollectible && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Potencial Colecionável</h4>
                  <p className="text-sm text-foreground-secondary">
                    Modelos como este tendem a valorizar com o tempo
                  </p>
                </div>
              </div>
            )}

            {isRare && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Exclusividade</h4>
                  <p className="text-sm text-foreground-secondary">
                    Pouquíssimas unidades no Brasil
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Garantia Attra</h4>
                <p className="text-sm text-foreground-secondary">
                  Inspeção de 200 itens e documentação verificada
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

