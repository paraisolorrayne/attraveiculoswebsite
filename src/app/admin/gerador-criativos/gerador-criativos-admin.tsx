'use client'

/**
 * Casca do Gerador de Criativos: duas abas sobre a mesma porta de entrada.
 *
 *   Criativos      — Clássico, Destaque, Estoque, Editorial, Ficha e Clássico
 *                    Loja. Stories 1080×1920 e Feed 1080×1350.
 *   Story Vendido  — peça 1080×1920 de venda concluída.
 *
 * As duas são React sobre o mesmo desenho em módulo ES (content/admin/creative/).
 * Até 30/08/2026 a aba Criativos era um iframe para um HTML de 1,2 MB com o
 * desenho embutido num <script> sem módulos e as imagens em base64. Ele saiu:
 * o desenho virou content/admin/creative/gerador/, provado idêntico ao pixel
 * em 35 casos antes da troca (scripts/regressao-gerador/).
 *
 * As abas ficam MONTADAS e escondidas com `hidden`, não desmontadas: trocar de
 * aba e voltar não pode jogar fora o trabalho em andamento do operador — fotos
 * escolhidas, sliders ajustados, campos preenchidos.
 */

import { useState } from 'react'
import { CriativosAdmin } from './criativos/criativos-admin'
import { DossieAdmin } from './dossie/dossie-admin'
import { StoryVendidoAdmin } from './story-vendido-admin'

const ABAS = [
  { id: 'criativos', rotulo: 'Criativos' },
  { id: 'vendido', rotulo: 'Story Vendido' },
  { id: 'dossie', rotulo: 'Dossiê' },
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

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div hidden={aba !== 'criativos'}>
          <CriativosAdmin />
        </div>
        <div hidden={aba !== 'vendido'}>
          <StoryVendidoAdmin />
        </div>
        <div hidden={aba !== 'dossie'}>
          <DossieAdmin visivel={aba === 'dossie'} />
        </div>
      </div>
    </div>
  )
}
