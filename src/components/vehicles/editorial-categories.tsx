'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Mountain, Crown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avisarNavegacao } from '@/lib/navegacao'

export interface EditorialCategory {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

export const EDITORIAL_CATEGORIES: EditorialCategory[] = [
  {
    id: 'performance',
    label: 'Ícones de Performance',
    icon: Zap,
    description: 'Superesportivos e máquinas de alta performance',
  },
  {
    id: 'suv-premium',
    label: 'SUVs de Alto Padrão',
    icon: Mountain,
    description: 'SUVs premium para quem exige o melhor',
  },
  {
    id: 'premium',
    label: 'Premium Selecionados',
    icon: Crown,
    description: 'Veículos premium com curadoria Attra',
  },
  {
    id: 'oportunidades',
    label: 'Oportunidades com Padrão Attra',
    icon: Sparkles,
    description: 'Veículos selecionados com excelente custo-benefício',
  },
]

export function EditorialCategoryChips() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('categoria')

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeCategory === categoryId) {
      params.delete('categoria')
    } else {
      params.set('categoria', categoryId)
    }
    params.delete('pagina')
    avisarNavegacao(`/veiculos?${params.toString()}`)
    router.push(`/veiculos?${params.toString()}`)
  }

  // Celular: uma linha só que rola de lado (de borda a borda da tela), para não
  // empurrar a lista para baixo da primeira tela.
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_82%,transparent)] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
      {EDITORIAL_CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const isActive = activeCategory === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            title={cat.description}
            className={cn(
              // Entre 1024 e 1279px um pouco mais compactos, para caberem numa linha
              'inline-flex shrink-0 items-center gap-2 px-4 sm:px-4 min-h-11 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all border lg:gap-1.5 lg:px-3 lg:text-[13px] xl:gap-2 xl:px-4 xl:text-sm',
              isActive
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                : 'bg-background-card border-border text-foreground-secondary hover:border-primary/40 hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{cat.label}</span>
            <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}

