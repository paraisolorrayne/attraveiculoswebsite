'use client'

/**
 * Casca do Gerador de Criativos: duas abas sobre a mesma porta de entrada.
 *
 *   Criativos      — o gerador de sempre (Clássico, Destaque, Estoque,
 *                    Editorial, Ficha, Clássico Loja). Vive em
 *                    content/admin/gerador-criativos.html e continua servido
 *                    por iframe, intocado.
 *   Story Vendido  — peça 1080×1920 de venda concluída, em React.
 *
 * As duas convivem porque são tecnologias diferentes por um motivo concreto: o
 * HTML é auto-contido e sem módulos, e o Story depende de um módulo ES e de
 * fontes servidas por URL. Ver o cabeçalho de story-vendido-admin.tsx.
 *
 * O iframe é montado UMA vez e escondido com `hidden` em vez de desmontado:
 * remontar recarrega 1,2 MB de HTML e joga fora o trabalho em andamento do
 * operador — fotos escolhidas, sliders ajustados, campos preenchidos.
 */

import { useState } from 'react'
import { StoryVendidoAdmin } from './story-vendido-admin'

const ABAS = [
  { id: 'criativos', rotulo: 'Criativos' },
  { id: 'vendido', rotulo: 'Story Vendido' },
] as const

type Aba = (typeof ABAS)[number]['id']

export function GeradorCriativosAdmin() {
  const [aba, setAba] = useState<Aba>('criativos')

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <nav className="flex shrink-0 gap-1 border-b border-border bg-background-card px-4">
        {ABAS.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            aria-current={aba === a.id ? 'page' : undefined}
            className={
              'border-b-2 px-4 py-3 text-sm font-medium transition-colors ' +
              (aba === a.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground-secondary hover:text-foreground')
            }
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <iframe
          src="/api/admin/marketing/gerador-criativos"
          title="Gerador de Criativos — Attra Veículos"
          className="block h-full w-full border-0"
          hidden={aba !== 'criativos'}
        />
        {aba === 'vendido' && (
          <div className="h-full overflow-y-auto p-4">
            <StoryVendidoAdmin />
          </div>
        )}
      </div>
    </div>
  )
}
