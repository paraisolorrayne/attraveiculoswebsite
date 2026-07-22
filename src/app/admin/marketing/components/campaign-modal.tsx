'use client'

import { useState } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import type { CampaignWithVehicles, CampaignStatus, EndReason } from '@/types/database'
import { END_REASON_LABELS } from '@/types/database'

interface CampaignModalProps {
  campaign: CampaignWithVehicles | null
  isAdmin: boolean
  onClose: () => void
  onSaved: () => void
}

interface VehicleEntry {
  vehicle_name: string
  added_date: string
  notes: string
  ended_date: string
  end_reason: string // '' = ainda no ar
}

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'publicada', label: 'Publicada' },
  { value: 'encerrada_ganho', label: 'Encerrada por Ganho' },
  { value: 'encerrada_desempenho', label: 'Encerrada por Desempenho' },
]

const END_REASON_OPTIONS = (Object.keys(END_REASON_LABELS) as EndReason[]).map((value) => ({
  value,
  label: END_REASON_LABELS[value],
}))

const today = () => new Date().toISOString().slice(0, 10)

export function CampaignModal({ campaign, isAdmin, onClose, onSaved }: CampaignModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(campaign?.name || '')
  const [description, setDescription] = useState(campaign?.description || '')
  const [status, setStatus] = useState<CampaignStatus>(campaign?.status || 'publicada')
  const [vehicles, setVehicles] = useState<VehicleEntry[]>(
    campaign?.vehicles?.map(v => ({
      vehicle_name: v.vehicle_name,
      added_date: v.added_date || '',
      notes: v.notes || '',
      ended_date: v.ended_date || '',
      end_reason: v.end_reason || '',
    })) || [{ vehicle_name: '', added_date: '', notes: '', ended_date: '', end_reason: '' }]
  )

  const addVehicle = () => {
    setVehicles(prev => [...prev, { vehicle_name: '', added_date: '', notes: '', ended_date: '', end_reason: '' }])
  }

  const removeVehicle = (index: number) => {
    setVehicles(prev => prev.filter((_, i) => i !== index))
  }

  const updateVehicle = (index: number, field: keyof VehicleEntry, value: string) => {
    setVehicles(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }

  // Ao escolher um motivo, marca a data de retirada (default hoje); ao limpar, some.
  const setEndReason = (index: number, reason: string) => {
    setVehicles(prev => prev.map((v, i) => {
      if (i !== index) return v
      if (!reason) return { ...v, end_reason: '', ended_date: '' }
      return { ...v, end_reason: reason, ended_date: v.ended_date || today() }
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      const validVehicles = vehicles.filter(v => v.vehicle_name.trim())
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        vehicles: validVehicles.map(v => ({
          vehicle_name: v.vehicle_name.trim(),
          added_date: v.added_date || null,
          notes: v.notes.trim() || null,
          ended_date: v.end_reason ? (v.ended_date || today()) : null,
          end_reason: v.end_reason || null,
        })),
      }

      const url = campaign?.id
        ? `/api/admin/marketing/campaigns/${campaign.id}`
        : '/api/admin/marketing/campaigns'

      const res = await fetch(url, {
        method: campaign?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSaved()
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {campaign ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-background-soft rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nome da Campanha *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
              placeholder="Ex: Campanha Rondon"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none disabled:opacity-50"
              placeholder="Descrição opcional da campanha..."
            />
          </div>

          {/* Status */}
          {campaign && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                disabled={!isAdmin}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground disabled:opacity-50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Veículos / Itens</label>
              {isAdmin && (
                <button
                  type="button"
                  onClick={addVehicle}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {vehicles.map((v, i) => {
                const isEnded = !!v.end_reason
                return (
                  <div key={i} className="bg-background-soft rounded-lg p-2 space-y-2">
                    {/* Linha 1: nome + entrada no ar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground-secondary font-mono min-w-[1.5rem] text-center">{i + 1}</span>
                      <input
                        type="text"
                        value={v.vehicle_name}
                        onChange={(e) => updateVehicle(i, 'vehicle_name', e.target.value)}
                        disabled={!isAdmin}
                        className={`flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground disabled:opacity-50 ${isEnded ? 'line-through opacity-60' : ''}`}
                        placeholder="Nome do veículo / reel"
                      />
                      <input
                        type="date"
                        value={v.added_date}
                        onChange={(e) => updateVehicle(i, 'added_date', e.target.value)}
                        disabled={!isAdmin}
                        title="Entrou no ar em"
                        className="w-[130px] px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground disabled:opacity-50"
                      />
                      {isAdmin && vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicle(i)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Linha 2: retirada do ar (motivo + data) */}
                    <div className="flex items-center gap-2 pl-[calc(1.5rem+0.5rem)]">
                      <span className={`text-xs whitespace-nowrap ${isEnded ? 'text-red-400' : 'text-foreground-secondary'}`}>
                        {isEnded ? 'Retirado do ar:' : 'No ar'}
                      </span>
                      <select
                        value={v.end_reason}
                        onChange={(e) => setEndReason(i, e.target.value)}
                        disabled={!isAdmin}
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground disabled:opacity-50"
                      >
                        <option value="">— No ar (não encerrado) —</option>
                        {END_REASON_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {isEnded && (
                        <input
                          type="date"
                          value={v.ended_date}
                          onChange={(e) => updateVehicle(i, 'ended_date', e.target.value)}
                          disabled={!isAdmin}
                          title="Retirado do ar em"
                          className="w-[130px] px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground disabled:opacity-50"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
