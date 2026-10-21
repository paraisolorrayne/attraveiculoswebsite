'use client'

import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VehiclePaginationProps {
  currentPage: number
  totalPages: number
}

/**
 * Paginação em `<a href>`, não em botão.
 *
 * Com botão + `router.push`, quem não executa JS — robô de busca, de
 * assistente de IA — via só a 1ª página: 12 dos 68 carros tinham link a partir
 * da listagem (auditoria de 20/10/2026). O `Link` mantém a navegação
 * client-side para quem tem JS e entrega a URL de cada página no HTML.
 */
export function VehiclePagination({ currentPage, totalPages }: VehiclePaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const hrefDaPagina = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) {
      params.set('pagina', page.toString())
    } else {
      params.delete('pagina')
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const desativado = 'text-foreground-secondary cursor-not-allowed opacity-50'

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showEllipsisStart = currentPage > 3
    const showEllipsisEnd = currentPage < totalPages - 2

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      if (showEllipsisStart) {
        pages.push('...')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (showEllipsisEnd) {
        pages.push('...')
      }
      
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Paginação">
      {/* Previous */}
      {currentPage === 1 ? (
        <span className={cn('p-2 rounded-lg', desativado)} aria-disabled="true">
          <ChevronLeft className="w-5 h-5" />
        </span>
      ) : (
        <Link
          href={hrefDaPagina(currentPage - 1)}
          rel="prev"
          className="p-2 rounded-lg transition-colors text-foreground hover:bg-background-card"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) =>
          typeof page === 'number' ? (
            <Link
              key={page}
              href={hrefDaPagina(page)}
              className={cn(
                'min-w-10 h-10 px-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center',
                page === currentPage
                  ? 'bg-primary text-white'
                  : 'text-foreground hover:bg-background-card'
              )}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Link>
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-foreground-secondary"
            >
              {page}
            </span>
          )
        )}
      </div>

      {/* Next */}
      {currentPage === totalPages ? (
        <span className={cn('p-2 rounded-lg', desativado)} aria-disabled="true">
          <ChevronRight className="w-5 h-5" />
        </span>
      ) : (
        <Link
          href={hrefDaPagina(currentPage + 1)}
          rel="next"
          className="p-2 rounded-lg transition-colors text-foreground hover:bg-background-card"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}
    </nav>
  )
}

