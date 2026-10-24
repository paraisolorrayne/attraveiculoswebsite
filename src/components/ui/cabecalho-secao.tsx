/** Montserrat dos títulos das páginas institucionais (ficha, /contato, /servicos, /jornada, /sobre). */
export const MONTSERRAT = { fontFamily: 'var(--font-montserrat)' }

interface CabecalhoSecaoProps {
  rotulo: string
  titulo: string
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
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-primary">{rotulo}</p>
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
