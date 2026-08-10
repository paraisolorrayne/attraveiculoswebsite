'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Navegação entre as visões de visitantes.
 *
 * O painel era uma página só, com tudo empilhado: canais, campanhas, mídia
 * paga, termos, veículos, cidades e identificados. Cada bloco respondia a uma
 * pergunta diferente, e quem entrava para responder UMA delas rolava por todas
 * as outras.
 *
 * A divisão segue a pergunta, não a tabela do banco: de onde vêm (aquisição),
 * o que fazem aqui (comportamento), quem são (identificados).
 */
const ABAS = [
  { href: '/admin/visitors', rotulo: 'Visão geral', exato: true },
  { href: '/admin/visitors/comportamento', rotulo: 'Comportamento' },
  { href: '/admin/visitors/veiculos', rotulo: 'Veículos' },
] as const

export function VisitorsNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border" aria-label="Seções de visitantes">
      <div className="flex gap-1 overflow-x-auto">
        {ABAS.map(aba => {
          const ativa = 'exato' in aba && aba.exato ? pathname === aba.href : pathname.startsWith(aba.href)
          return (
            <Link
              key={aba.href}
              href={aba.href}
              aria-current={ativa ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                ativa
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-foreground-secondary hover:text-foreground',
              )}
            >
              {aba.rotulo}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
