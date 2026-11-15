'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Volume2,
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
  Search,
  Loader2,
  Check,
  X,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import {
  BarraDeFiltros, BotaoSecundario, CampoBusca, EstadoErro, EstadoVazio,
  ResumoDosFiltros, SeletorFiltro, useFiltrosUrl, type FiltroLigado,
} from '@/components/admin/filtros'
import { termosDaBusca } from '@/lib/crm-busca'

// Filtros da lista de sons, guardados na URL.
const CHAVES_FILTRO = ['q', 'situacao', 'tipo'] as const
const OPCOES_SITUACAO = [
  { valor: 'ativo', rotulo: 'Ativos' },
  { valor: 'inativo', rotulo: 'Inativos' },
] as const
const OPCOES_TIPO = [
  { valor: 'combustao', rotulo: 'Combustão' },
  { valor: 'eletrico', rotulo: 'Elétrico' },
] as const

interface VehicleSound {
  id: string
  vehicle_id: string
  vehicle_name: string
  vehicle_brand: string
  vehicle_slug: string
  sound_file_url: string
  description: string | null
  icon: string
  is_electric: boolean
  is_active: boolean
  display_order: number
}

interface Vehicle {
  id: string
  slug: string
  brand: string
  model: string
  version: string | null
  year_model: number
}

export function EngineSoundsAdmin() {
  const [sounds, setSounds] = useState<VehicleSound[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const { valores: filtro, definir, limpar } = useFiltrosUrl(CHAVES_FILTRO)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSoundData, setNewSoundData] = useState({
    description: '',
    icon: '🏎️',
    is_electric: false,
  })
  const [editingSound, setEditingSound] = useState<VehicleSound | null>(null)
  const [editFormData, setEditFormData] = useState({
    vehicle_name: '',
    description: '',
    icon: '🏎️',
    is_electric: false,
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()

  // Fetch existing sounds
  useEffect(() => {
    fetchSounds()
  }, [])

  const fetchSounds = async () => {
    try {
      const res = await fetch('/api/admin/engine-sounds')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      // Antes a falha ia só para o console e a tela dizia "nenhum som cadastrado".
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSounds(data.sounds || [])
      setErroCarga(null)
    } catch (error) {
      console.error('Error fetching sounds:', error)
      setErroCarga('Não foi possível carregar os sons de motor.')
    } finally {
      setIsLoading(false)
    }
  }

  // Search vehicles from inventory
  const searchVehicles = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/vehicles?search=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await res.json()
      setVehicles(data.vehicles || [])
    } catch (error) {
      console.error('Error searching vehicles:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/engine-sounds/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setUploadedFile({ url: data.url, name: file.name })
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle logout

  // Play/pause audio
  const togglePlay = (soundUrl: string, id: string) => {
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = soundUrl
        audioRef.current.play()
        setPlayingId(id)
      }
    }
  }

  // Create new sound association
  const createSound = async () => {
    if (!selectedVehicle || !uploadedFile) {
      alert('Selecione um veículo e faça upload de um arquivo de áudio')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/engine-sounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: selectedVehicle.id,
          vehicle_name: `${selectedVehicle.brand} ${selectedVehicle.model}${selectedVehicle.version ? ` ${selectedVehicle.version}` : ''}`,
          vehicle_brand: selectedVehicle.brand,
          vehicle_slug: selectedVehicle.slug,
          sound_file_url: uploadedFile.url,
          description: newSoundData.description || null,
          icon: newSoundData.icon,
          is_electric: newSoundData.is_electric,
          display_order: sounds.length,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create sound')
      }

      await fetchSounds()
      resetForm()
    } catch (error) {
      console.error('Error creating sound:', error)
      alert(error instanceof Error ? error.message : 'Erro ao criar associação')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete sound
  const deleteSound = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este som?')) return

    try {
      const res = await fetch(`/api/admin/engine-sounds/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await fetchSounds()
    } catch (error) {
      console.error('Error deleting sound:', error)
      alert('Erro ao remover som')
    }
  }

  // Toggle active status
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/engine-sounds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      await fetchSounds()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  // Reset form
  const resetForm = () => {
    setShowAddForm(false)
    setSelectedVehicle(null)
    setUploadedFile(null)
    setSearchQuery('')
    setVehicles([])
    setNewSoundData({ description: '', icon: '🏎️', is_electric: false })
  }

  // Open edit modal
  const openEditModal = (sound: VehicleSound) => {
    setEditingSound(sound)
    setEditFormData({
      vehicle_name: sound.vehicle_name,
      description: sound.description || '',
      icon: sound.icon,
      is_electric: sound.is_electric,
    })
  }

  // Save edit
  const saveEdit = async () => {
    if (!editingSound) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/engine-sounds/${editingSound.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: editFormData.vehicle_name,
          description: editFormData.description || null,
          icon: editFormData.icon,
          is_electric: editFormData.is_electric,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await fetchSounds()
      setEditingSound(null)
    } catch (error) {
      console.error('Error updating sound:', error)
      alert('Erro ao atualizar som')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Busca por veículo ou marca (sem acento, todas as palavras), situação e tipo.
  const visiveis = useMemo(() => {
    const termos = termosDaBusca(filtro.q)
    return sounds.filter(s => {
      if (filtro.situacao === 'ativo' && !s.is_active) return false
      if (filtro.situacao === 'inativo' && s.is_active) return false
      if (filtro.tipo === 'eletrico' && !s.is_electric) return false
      if (filtro.tipo === 'combustao' && s.is_electric) return false
      if (termos.length === 0) return true
      const alvo = termosDaBusca(`${s.vehicle_name ?? ''} ${s.vehicle_brand ?? ''}`).join(' ')
      return termos.every(t => alvo.includes(t))
    })
  }, [sounds, filtro.q, filtro.situacao, filtro.tipo])

  const filtrosLigados: FiltroLigado[] = []
  if (filtro.q) filtrosLigados.push({ rotulo: `Busca: ${filtro.q}`, aoRemover: () => definir({ q: '' }) })
  if (filtro.situacao) {
    const rotulo = OPCOES_SITUACAO.find(o => o.valor === filtro.situacao)?.rotulo ?? filtro.situacao
    filtrosLigados.push({ rotulo: `Situação: ${rotulo}`, aoRemover: () => definir({ situacao: '' }) })
  }
  if (filtro.tipo) {
    const rotulo = OPCOES_TIPO.find(o => o.valor === filtro.tipo)?.rotulo ?? filtro.tipo
    filtrosLigados.push({ rotulo: `Tipo: ${rotulo}`, aoRemover: () => definir({ tipo: '' }) })
  }

  return (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <CabecalhoPagina titulo="Sons de motor" descricao="Áudios de motor dos veículos" />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <BarraDeFiltros className="min-w-0 flex-1">
            <CampoBusca valor={filtro.q} aoMudar={v => definir({ q: v })} placeholder="Buscar por veículo ou marca" />
            <SeletorFiltro rotulo="Situação" valor={filtro.situacao} aoMudar={v => definir({ situacao: v })} opcoes={OPCOES_SITUACAO} />
            <SeletorFiltro rotulo="Tipo" valor={filtro.tipo} aoMudar={v => definir({ tipo: v })} opcoes={OPCOES_TIPO} />
          </BarraDeFiltros>
          <div className="flex gap-3">
            <button
              onClick={fetchSounds}
              className="flex min-h-11 items-center gap-2 px-4 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex min-h-11 items-center gap-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Som
            </button>
          </div>
        </div>

        <div className="mb-6 min-h-8">
          {!isLoading && !erroCarga && sounds.length > 0 && (
            <ResumoDosFiltros total={sounds.length} mostrando={visiveis.length}
              nome={['som', 'sons']} filtros={filtrosLigados} aoLimpar={limpar} />
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : erroCarga ? (
          <EstadoErro texto={erroCarga} aoTentar={() => { setIsLoading(true); fetchSounds() }} />
        ) : (
          <>
            {/* Existing Sounds List */}
            {sounds.length === 0 ? (
              <div className="text-center py-20 bg-background-card border border-border rounded-2xl">
                <Volume2 className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Nenhum som cadastrado
                </h2>
                <p className="text-foreground-secondary mb-6">
                  Adicione sons de motor aos veículos do estoque
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Primeiro Som
                </button>
              </div>
            ) : visiveis.length === 0 ? (
              <EstadoVazio
                Icon={Volume2}
                titulo="Nenhum som com esses filtros"
                texto="Mude a busca, a situação ou o tipo para ver outros sons."
                acao={<BotaoSecundario onClick={limpar}>Limpar filtros</BotaoSecundario>}
              />
            ) : (
              <div className="grid gap-4">
                {visiveis.map((sound) => (
                  <div
                    key={sound.id}
                    className="bg-background-card border border-border rounded-xl p-4 flex items-center gap-4"
                  >
                    <span className="text-3xl">{sound.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {sound.vehicle_name}
                      </h3>
                      <p className="text-sm text-foreground-secondary">
                        {sound.description || 'Sem descrição'}
                        {sound.is_electric && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            EV
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Play Button */}
                      <button
                        onClick={() => togglePlay(sound.sound_file_url, sound.id)}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Ouvir som"
                      >
                        {playingId === sound.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(sound)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      {/* Active Toggle */}
                      <button
                        onClick={() => toggleActive(sound.id, sound.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          sound.is_active
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                        title={sound.is_active ? 'Ativo (clique para desativar)' : 'Inativo (clique para ativar)'}
                      >
                        {sound.is_active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteSound(sound.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add Sound Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Adicionar Som de Motor</h2>
                <button onClick={resetForm} className="text-foreground-secondary hover:text-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Step 1: Search Vehicle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  1. Buscar Veículo do Estoque
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchVehicles()}
                    placeholder="Ex: Ferrari 812, Porsche 911..."
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                  />
                  <button
                    onClick={searchVehicles}
                    disabled={isSearching}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                {vehicles.length > 0 && !selectedVehicle && (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        className="w-full px-4 py-2 text-left hover:bg-background-soft text-foreground border-b border-border last:border-0"
                      >
                        {v.brand} {v.model} {v.version || ''} ({v.year_model})
                      </button>
                    ))}
                  </div>
                )}
                {selectedVehicle && (
                  <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                    <span className="text-foreground">
                      ✓ {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.version || ''}
                    </span>
                    <button onClick={() => setSelectedVehicle(null)} className="text-foreground-secondary hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Upload Audio */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  2. Upload do Arquivo de Áudio (.mp3 ou .wav)
                </label>
                {!uploadedFile ? (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-foreground-secondary mb-2" />
                        <span className="text-sm text-foreground-secondary">Clique para selecionar</span>
                      </>
                    )}
                    <input type="file" accept=".mp3,.wav,audio/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                    <span className="text-foreground">✓ {uploadedFile.name}</span>
                    <button onClick={() => setUploadedFile(null)} className="text-foreground-secondary hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Additional Info */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">3. Descrição (opcional)</label>
                  <input
                    type="text"
                    value={newSoundData.description}
                    onChange={(e) => setNewSoundData({ ...newSoundData, description: e.target.value })}
                    placeholder="Ex: V12 naturalmente aspirado"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">Ícone</label>
                    <select
                      value={newSoundData.icon}
                      onChange={(e) => setNewSoundData({ ...newSoundData, icon: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="🏎️">🏎️ Supercarro</option>
                      <option value="🔥">🔥 Esportivo</option>
                      <option value="⚡">⚡ Elétrico/Performance</option>
                      <option value="🏁">🏁 Corrida</option>
                      <option value="🦅">🦅 Americano</option>
                      <option value="🚀">🚀 Turbo</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSoundData.is_electric}
                        onChange={(e) => setNewSoundData({ ...newSoundData, is_electric: e.target.checked })}
                        className="w-5 h-5 rounded border-border"
                      />
                      <span className="text-foreground">Elétrico</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={createSound}
                disabled={!selectedVehicle || !uploadedFile || isCreating}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Salvar Som
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Edit Sound Modal */}
        {editingSound && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-card border border-border rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Editar Som</h2>
                <button onClick={() => setEditingSound(null)} className="text-foreground-secondary hover:text-foreground">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Vehicle Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Nome do Veículo</label>
                <input
                  type="text"
                  value={editFormData.vehicle_name}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicle_name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Ex: V12 naturalmente aspirado"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                />
              </div>

              {/* Icon and Electric */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">Ícone</label>
                  <select
                    value={editFormData.icon}
                    onChange={(e) => setEditFormData({ ...editFormData, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="🏎️">🏎️ Supercarro</option>
                    <option value="🔥">🔥 Esportivo</option>
                    <option value="⚡">⚡ Elétrico/Performance</option>
                    <option value="🏁">🏁 Corrida</option>
                    <option value="🦅">🦅 Americano</option>
                    <option value="🚀">🚀 Turbo</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.is_electric}
                      onChange={(e) => setEditFormData({ ...editFormData, is_electric: e.target.checked })}
                      className="w-5 h-5 rounded border-border"
                    />
                    <span className="text-foreground">Elétrico</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={saveEdit}
                disabled={!editFormData.vehicle_name.trim() || isSavingEdit}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

