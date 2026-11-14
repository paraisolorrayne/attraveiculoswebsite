'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { paginaAmpla } from '@/lib/navegacao'

/**
 * O <main> do site. Nas páginas internas sem desenho próprio para tela larga
 * ele leva a classe .pagina-ampla, que faz o conteúdo crescer com a tela
 * (ver paginaAmpla e globals.css).
 */
export function MainDaPagina({ children }: { children: React.ReactNode }) {
  const ampla = paginaAmpla(usePathname())
  return <main className={cn('flex-1', ampla && 'pagina-ampla')}>{children}</main>
}
