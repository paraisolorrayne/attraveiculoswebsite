'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type Params = Record<string, string | number | undefined>

/**
 * Para onde os painéis de Visitantes apontam.
 *
 * Padrão = o painel da Attra (`/api/admin/visitors/<aba>` e links em
 * `/admin/visitors`). A área da agência (spec 2026-10-02) troca as duas bases
 * e acrescenta seus filtros a toda chamada, reaproveitando os mesmos painéis.
 * `modo: 'agencia'` esconde o que a agência não pode ver (receita em R$,
 * perfis identificados).
 */
export interface VisitantesApi {
	api: (aba: string, params?: Params) => string
	link: (caminho: string) => string
	modo: 'attra' | 'agencia'
	/**
	 * Período compartilhado entre as abas. Na área da agência o período fica no
	 * topo (e na URL) e vale para todas; no painel da Attra cada aba tem o seu.
	 */
	periodo?: { dias: number; setDias: (d: number) => void }
}

export function comParams(base: string, params?: Params): string {
	const q = new URLSearchParams()
	for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') q.set(k, String(v))
	const s = q.toString()
	return s ? `${base}?${s}` : base
}

/** Abas cuja rota no painel da Attra tem outro nome. */
const ROTA_ADMIN: Record<string, string> = { sessao: 'session-explore' }

export const API_DO_ADMIN: VisitantesApi = {
	api: (aba, params) => comParams(`/api/admin/visitors/${ROTA_ADMIN[aba] ?? aba}`, params),
	link: caminho => `/admin/visitors${caminho}`,
	modo: 'attra',
}

const Ctx = createContext<VisitantesApi>(API_DO_ADMIN)

export const useVisitantesApi = () => useContext(Ctx)

export function VisitantesApiProvider({ valor, children }: { valor: VisitantesApi; children: ReactNode }) {
	return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/** O período da aba: o compartilhado do contexto, quando existe; senão, um local. */
export function useDias(inicial = 30): [number, (d: number) => void] {
	const { periodo } = useContext(Ctx)
	const [local, setLocal] = useState(inicial)
	return periodo ? [periodo.dias, periodo.setDias] : [local, setLocal]
}
