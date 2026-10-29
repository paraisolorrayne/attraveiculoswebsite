import type { ReactNode } from 'react'

interface SecaoDaFichaProps {
  titulo: string
  subtitulo?: string
  /** Botão ao lado do título (o "copiar" do "Sobre este veículo"). */
  acao?: ReactNode
  children: ReactNode
}

/**
 * Bloco aberto da coluna principal da ficha do veículo: sem caixa em volta
 * (a página separa um bloco do outro com um fio). Até 23/10/2026 cada bloco
 * era um card com borda, e num monitor largo a ficha virava uma pilha de
 * caixotes no meio da tela.
 *
 * Depende do `@container` da coluna: com ela larga (@4xl, 896 px), o título
 * vai para uma coluna à esquerda e o conteúdo ocupa o resto; estreita, o
 * título fica em cima.
 */
export function SecaoDaFicha({ titulo, subtitulo, acao, children }: SecaoDaFichaProps) {
  return (
    <section className="grid gap-6 @4xl:grid-cols-[13rem_minmax(0,1fr)] @4xl:gap-12">
      <header className="flex items-start justify-between gap-4 @4xl:flex-col @4xl:justify-start">
        <div>
          <h2
            className="text-2xl font-medium tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {titulo}
          </h2>
          {subtitulo && <p className="mt-2 text-[15px] text-foreground-secondary">{subtitulo}</p>}
        </div>
        {acao && <div className="shrink-0 @4xl:-ml-2">{acao}</div>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
