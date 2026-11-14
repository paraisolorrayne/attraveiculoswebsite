'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Abas da Newsletter. A tela de assinantes existia, mas nenhum link levava a
 * ela: o menu abre só as campanhas. As duas telas mostram estas abas no
 * cabeçalho, no mesmo desenho das abas de visitantes.
 */
const ABAS = [
  { href: '/admin/newsletter/campaigns', rotulo: 'Campanhas' },
  { href: '/admin/newsletter/subscribers', rotulo: 'Assinantes' },
] as const

export function NewsletterAbas() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border" aria-label="Seções da newsletter">
      <div className="flex gap-1 overflow-x-auto">
        {ABAS.map(aba => {
          const ativa = pathname.startsWith(aba.href)
          return (
            <Link
              key={aba.href}
              href={aba.href}
              aria-current={ativa ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors',
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
