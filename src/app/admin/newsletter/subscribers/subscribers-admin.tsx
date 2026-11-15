'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Loader2, X, Check, Download,
  Upload, Users, UserCheck, UserX, ChevronLeft, ChevronRight
} from 'lucide-react'
import type { NewsletterSubscriber } from '@/types/database'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import {
  BarraDeFiltros, BotaoSecundario, CampoBusca, EstadoErro, EstadoVazio,
  ResumoDosFiltros, useFiltrosUrl, type FiltroLigado,
} from '@/components/admin/filtros'
import { NewsletterAbas } from '../newsletter-abas'

// Busca, aba e página ficam na URL: recarregar ou mandar o link mantém a lista.
const CHAVES_FILTRO = ['q', 'status', 'pagina'] as const
type Situacao = 'all' | 'active' | 'inactive'

export function SubscribersAdmin() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const { valores: filtro, definir } = useFiltrosUrl(CHAVES_FILTRO)
  const search = filtro.q.trim()
  const statusFilter: Situacao = filtro.status === 'active' || filtro.status === 'inactive' ? filtro.status : 'all'
  const page = Math.max(1, parseInt(filtro.pagina, 10) || 1)
  const [total, setTotal] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [importText, setImportText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
  const limit = 50

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true)
    setErroCarga(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), status: statusFilter })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/newsletter/subscribers?${params}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      // Antes a falha ia só para o console e a tela dizia "nenhum assinante".
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSubscribers(data.subscribers || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching subscribers:', error)
      setErroCarga('Não foi possível carregar os assinantes.')
    } finally {
      setIsLoading(false)
    }
  }, [router, page, statusFilter, search])

  useEffect(() => { fetchSubscribers() }, [fetchSubscribers])

  const showFeedbackMsg = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleAddSubscriber = async () => {
    if (!newEmail) { showFeedbackMsg('error', 'Email é obrigatório'); return }
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro')
      showFeedbackMsg('success', 'Assinante adicionado!')
      setShowAddModal(false)
      setNewEmail('')
      setNewName('')
      fetchSubscribers()
    } catch (error) {
      showFeedbackMsg('error', error instanceof Error ? error.message : 'Erro')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImport = async () => {
    const lines = importText.split('\n').filter(l => l.trim())
    if (lines.length === 0) { showFeedbackMsg('error', 'Nenhum email para importar'); return }
    setIsSaving(true)
    try {
      const subscribers = lines.map(line => {
        const parts = line.split(',').map(p => p.trim())
        return { email: parts[0], name: parts[1] || undefined }
      })
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribers }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro')
      const data = await res.json()
      showFeedbackMsg('success', `${data.imported || 0} assinantes importados!`)
      setShowImportModal(false)
      setImportText('')
      fetchSubscribers()
    } catch (error) {
      showFeedbackMsg('error', error instanceof Error ? error.message : 'Erro')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (sub: NewsletterSubscriber) => {
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !sub.is_active }),
      })
      if (!res.ok) throw new Error('Erro')
      fetchSubscribers()
    } catch (error) {
      showFeedbackMsg('error', error instanceof Error ? error.message : 'Erro')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este assinante?')) return
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro')
      showFeedbackMsg('success', 'Assinante removido!')
      fetchSubscribers()
    } catch (error) {
      showFeedbackMsg('error', error instanceof Error ? error.message : 'Erro')
    }
  }

  const handleExport = () => {
    window.open(`/api/admin/newsletter/subscribers/export?status=${statusFilter}`, '_blank')
  }

  const totalPages = Math.ceil(total / limit)

  // Mudar busca ou aba volta para a primeira página.
  const limparFiltros = () => definir({ q: '', status: '', pagina: '' })
  const irParaPagina = (n: number) => definir({ pagina: n > 1 ? String(n) : '' })
  const filtrosLigados: FiltroLigado[] = []
  if (search) filtrosLigados.push({ rotulo: `Busca: ${search}`, aoRemover: () => definir({ q: '', pagina: '' }) })
  if (statusFilter !== 'all') {
    filtrosLigados.push({
      rotulo: `Situação: ${statusFilter === 'active' ? 'Ativos' : 'Inativos'}`,
      aoRemover: () => definir({ status: '', pagina: '' }),
    })
  }

  return (
    <>
    <CabecalhoPagina
      titulo="Newsletter"
      descricao="Quem recebe as campanhas"
      acoes={
        <>
          <button onClick={() => setShowImportModal(true)}
            className="flex min-h-10 items-center gap-2 px-4 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground-secondary">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={handleExport}
            className="flex min-h-10 items-center gap-2 px-4 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground-secondary">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex min-h-10 items-center gap-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            <Plus className="w-5 h-5" /> Adicionar
          </button>
        </>
      }
    >
      <NewsletterAbas />
    </CabecalhoPagina>
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
        }`}>
          {feedback.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {feedback.message}
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-3">
        <BarraDeFiltros>
          <CampoBusca valor={filtro.q} aoMudar={v => definir({ q: v, pagina: '' })} placeholder="Buscar por email ou nome" />
          <div className="flex gap-2" role="group" aria-label="Situação">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => definir({ status: s === 'all' ? '' : s, pagina: '' })}
                aria-pressed={statusFilter === s}
                className={`flex min-h-11 items-center px-3 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-white' : 'border border-border text-foreground-secondary hover:bg-background-soft'
                }`}>
                {s === 'all' ? <Users className="w-4 h-4 inline mr-1" /> : s === 'active' ? <UserCheck className="w-4 h-4 inline mr-1" /> : <UserX className="w-4 h-4 inline mr-1" />}
                {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
        </BarraDeFiltros>
        {/* O servidor só devolve o total já filtrado, então a contagem é a do filtro. */}
        {!isLoading && !erroCarga && (
          <ResumoDosFiltros total={total} mostrando={total}
            nome={['assinante', 'assinantes']} filtros={filtrosLigados} aoLimpar={limparFiltros} />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : erroCarga ? (
        <EstadoErro texto={erroCarga} aoTentar={fetchSubscribers} />
      ) : subscribers.length === 0 && filtrosLigados.length > 0 ? (
        <EstadoVazio
          Icon={Users}
          titulo="Nenhum assinante com esses filtros"
          texto="Mude a busca ou a situação para ver outros assinantes."
          acao={<BotaoSecundario onClick={limparFiltros}>Limpar filtros</BotaoSecundario>}
        />
      ) : subscribers.length === 0 && page > 1 ? (
        // Página que deixou de existir (link antigo ou assinantes removidos).
        <EstadoVazio
          Icon={Users}
          titulo="Esta página não tem assinantes"
          acao={<BotaoSecundario onClick={() => irParaPagina(1)}>Voltar para a primeira página</BotaoSecundario>}
        />
      ) : subscribers.length === 0 ? (
        <EstadoVazio
          Icon={Users}
          titulo="Nenhum assinante cadastrado"
          texto="Adicione um assinante ou importe uma lista de emails."
          acao={
            <button onClick={() => setShowAddModal(true)}
              className="flex min-h-10 items-center gap-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" /> Adicionar assinante
            </button>
          }
        />
      ) : (
        <div className="bg-background-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-soft">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Inscrito</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-foreground-secondary uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-background-soft transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{sub.email}</td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">{sub.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">{sub.source}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>{sub.is_active ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-secondary">{new Date(sub.subscribed_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleToggleActive(sub)} className="p-1.5 rounded hover:bg-background transition-colors" title={sub.is_active ? 'Desativar' : 'Ativar'}>
                      {sub.is_active ? <UserX className="w-4 h-4 text-foreground-secondary" /> : <UserCheck className="w-4 h-4 text-foreground-secondary" />}
                    </button>
                    <button onClick={() => handleDelete(sub.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!erroCarga && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-secondary">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => irParaPagina(page - 1)} disabled={page <= 1} aria-label="Página anterior"
              className="flex h-10 w-10 items-center justify-center border border-border rounded-lg hover:bg-background-soft disabled:opacity-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => irParaPagina(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Próxima página"
              className="flex h-10 w-10 items-center justify-center border border-border rounded-lg hover:bg-background-soft disabled:opacity-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-card rounded-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Adicionar Assinante</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-background rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">Email *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1">Nome</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" placeholder="Nome do assinante" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={handleAddSubscriber} disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background-card rounded-xl border border-border w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Importar Assinantes</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-background rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground-secondary">Cole os emails abaixo, um por linha. Formato: email ou email,nome</p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={10}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm font-mono"
                placeholder="email@exemplo.com,João Silva&#10;outro@email.com&#10;..." />
              <p className="text-xs text-foreground-secondary">{importText.split('\n').filter(l => l.trim()).length} emails para importar</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={handleImport} disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

