import type { ReactNode } from 'react'

/** Montserrat dos títulos das páginas institucionais (ficha, /contato, /servicos, /jornada, /sobre). */
export const MONTSERRAT = { fontFamily: 'var(--font-montserrat)' }

/**
 * Serifada (Cormorant Garamond) só nos títulos de destaque, como o nome do
 * carro na seleção da home: o ar editorial num site todo em Montserrat
 * (29/10/2026). Desenha menor que a Montserrat no mesmo corpo: subir ~15%.
 */
export const SERIFADA = { fontFamily: 'var(--font-editorial)' }

interface CabecalhoSecaoProps {
  rotulo: string
  /** Texto, ou texto com a segunda metade em `<span className="text-foreground/65">`. */
  titulo: ReactNode
  texto?: string
  centro?: boolean
  /** Nível do título; h1 só no topo da página. */
  nivel?: 'h1' | 'h2'
}

/**
 * Rótulo vermelho em maiúsculas, título em Montserrat e o texto de apoio: o
 * cabeçalho de seção das páginas institucionais desde 23/10/2026, no lugar da
 * pílula com ícone e do título em Inter negrito com Maiúscula Em Cada Palavra.
 */
export function CabecalhoSecao({ rotulo, titulo, texto, centro = false, nivel = 'h2' }: CabecalhoSecaoProps) {
  const Titulo = nivel
  return (
    <div className={centro ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-rotulo">{rotulo}</p>
      <Titulo
        className={
          nivel === 'h1'
            ? 'mt-4 text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[64px]'
            : 'mt-3 text-3xl font-semibold tracking-tight text-foreground lg:text-[40px] lg:leading-[1.15]'
        }
        style={MONTSERRAT}
      >
        {titulo}
      </Titulo>
      {texto && <p className="mt-5 text-lg leading-relaxed text-foreground-secondary">{texto}</p>}
    </div>
  )
}
