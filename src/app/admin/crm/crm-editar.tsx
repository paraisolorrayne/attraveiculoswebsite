'use client'

import { useState } from 'react'
import { COLUNAS_KANBAN, colunaDoCard, type ColunaKanban } from './crm-constants'
import type { CrmCard } from './crm-card'

export function CrmEditar({ card, vendedores, colunaInicial, habilitado, onSaved }: {
	card: CrmCard
	vendedores: string[]
	colunaInicial?: ColunaKanban['id']
	habilitado: boolean
	onSaved: (card: CrmCard, sincronizacao: string) => void
}) {
	const [coluna, setColuna] = useState(colunaInicial ?? colunaDoCard(card))
	const [vendedor, setVendedor] = useState(card.vendedor ?? '')
	const [motivo, setMotivo] = useState('')
	const [salvando, setSalvando] = useState(false)
	const [erro, setErro] = useState<string | null>(null)
	const mudou = coluna !== colunaDoCard(card) || (vendedor.trim() || null) !== card.vendedor
	const inputClass = 'w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm disabled:opacity-50'

	return <form className="border border-border rounded-lg p-3 space-y-3" onSubmit={async e => {
		e.preventDefault()
		if (salvando || !habilitado || !mudou) return
		setSalvando(true)
		setErro(null)
		try {
			const response = await fetch(`/api/admin/crm/cards/${encodeURIComponent(card.id)}`, {
				method: 'PATCH', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ atualizado_em: card.atualizado_em, coluna, vendedor: vendedor.trim() || null, motivo_encerramento: motivo }),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.')
			onSaved({ ...card, ...data.card }, data.sincronizacao)
		} catch (error) {
			setErro(error instanceof Error ? error.message : 'Falha ao salvar. Atualize o quadro antes de tentar novamente.')
		} finally { setSalvando(false) }
	}}>
		<h3 className="font-medium text-foreground text-sm">Gerenciar atendimento</h3>
		{!habilitado && <p className="text-sm text-foreground-secondary">A edição será liberada quando a conexão de retorno ao sistema estiver configurada.</p>}
		<fieldset disabled={!habilitado || salvando} className="space-y-3">
			<label className="block text-xs text-foreground-secondary">Coluna
				<select aria-label="Coluna" value={coluna} onChange={e => setColuna(e.target.value as ColunaKanban['id'])} className={inputClass}>
					{COLUNAS_KANBAN.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
				</select>
			</label>
			<label className="block text-xs text-foreground-secondary">Vendedor responsável
				<input list="crm-vendedores" value={vendedor} maxLength={150} onChange={e => setVendedor(e.target.value)} placeholder="Sem vendedor" className={inputClass} />
				<datalist id="crm-vendedores">{vendedores.map(v => <option key={v} value={v} />)}</datalist>
			</label>
			<p className="text-xs text-foreground-secondary">Escolha um nome existente ou informe o vendedor. Deixe vazio para retirar a atribuição.</p>
			{coluna === 'perdido' && colunaDoCard(card) !== 'perdido' && <label className="block text-xs text-foreground-secondary">Motivo do encerramento
				<textarea required maxLength={2000} value={motivo} onChange={e => setMotivo(e.target.value)} className={inputClass} />
			</label>}
			<button type="submit" disabled={!mudou || salvando} className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50">
				{salvando ? 'Salvando…' : 'Salvar alterações'}
			</button>
		</fieldset>
		{erro && <p role="alert" className="text-sm text-red-500">{erro}</p>}
	</form>
}
