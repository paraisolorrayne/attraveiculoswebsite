import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Cabeçalho padrão das páginas do admin (14/11/2026): onde estou, o título, o
 * que dá para fazer aqui. Cada tela desenhava o seu, com tamanhos e posições
 * diferentes, e três delas repetiam tema e "Sair", que agora ficam no menu.
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  trilha,
  acoes,
  children,
}: {
  titulo: string
  descricao?: string
  /** Caminho até aqui, só em páginas de detalhe. */
  trilha?: { rotulo: string; href: string }[]
  /** Botões da página, à direita do título. */
  acoes?: React.ReactNode
  /** Abas ou filtros, abaixo do título. */
  children?: React.ReactNode
}) {
  return (
    <header className="w-full px-4 pt-6 sm:px-6 lg:px-8">
      {trilha && trilha.length > 0 && (
        <nav aria-label="Caminho" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-foreground-secondary">
          {trilha.map(t => (
            <span key={t.href} className="flex items-center gap-1">
              <Link href={t.href} className="hover:text-foreground hover:underline">
                {t.rotulo}
              </Link>
              <ChevronRight className="h-4 w-4" />
            </span>
          ))}
          <span className="text-foreground">{titulo}</span>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h1>
          {descricao && <p className="mt-1 text-foreground-secondary">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}
