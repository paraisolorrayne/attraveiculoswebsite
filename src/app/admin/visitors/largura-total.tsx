'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Modo "largura total": a área da agência ocupa a tela inteira e NUNCA rola
 * para o lado (spec 2026-10-02-area-agencia). As telas atuais seguem como
 * estão — o modo só liga dentro do provider.
 *
 * O que causava rolagem lateral nas tabelas do painel: `whitespace-nowrap`
 * em toda célula, colunas com `min-w-[…]` e gráficos com largura mínima de
 * 640 px dentro de um `overflow-x-auto`. No modo, nada disso vale: colunas
 * secundárias somem em telas menores (e reaparecem ao abrir a linha), e
 * abaixo de `md` cada linha vira um cartão.
 */
const Ctx = createContext(false)

export function LarguraTotalProvider({ children }: { children: ReactNode }) {
	return <Ctx.Provider value={true}>{children}</Ctx.Provider>
}

export const useLarguraTotal = () => useContext(Ctx)

export type Prioridade = 1 | 2 | 3

/** 1 = sempre visível; 2 = a partir de `md`; 3 = a partir de `xl`. */
export function prioridadeDaColuna(indice: number, explicita?: Prioridade): Prioridade {
	if (explicita) return explicita
	return indice <= 2 ? 1 : indice <= 4 ? 2 : 3
}

export function classeDaPrioridade(p: Prioridade): string {
	return p === 1 ? '' : p === 2 ? 'hidden md:table-cell' : 'hidden xl:table-cell'
}

/** Some com o que empurra a tabela para fora da tela. */
export function semLarguraMinima(classe?: string): string {
	return (classe ?? '')
		.replace(/\bmin-w-\[[^\]]+\]/g, '')
		.replace(/\bwhitespace-nowrap\b/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}
