'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  RefreshCw,
  Loader2,
  Download,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  ListChecks,
} from 'lucide-react'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import { SaldoMeta } from '@/components/admin/saldo-meta'
import { PERIODOS_DA_META, type PeriodoDaMeta, type SaldoDaMeta } from '@/lib/meta-ads'
import type { EstadoDaMeta } from '@/lib/meta-campanhas'
import {
  BarraDeFiltros,
  BotaoSecundario,
  CampoBusca,
  EstadoErro,
  EstadoVazio,
  ResumoDosFiltros,
  SeletorFiltro,
  useFiltrosUrl,
  type FiltroLigado,
} from '@/components/admin/filtros'
import { termosDaBusca } from '@/lib/crm-busca'
import { cn } from '@/lib/utils'
import { KanbanBoard } from './components/kanban-board'
import { MetricsDashboard } from './components/metrics-dashboard'
import { TaskModal } from './components/task-modal'
import { AnunciosLista, situacaoDoAnuncio, type AnuncioDaLista } from './components/anuncios-lista'
import { ResultadosMeta } from './components/resultados-meta'
import { CampaignModal } from './components/campaign-modal'
import { CreativesBoard } from './components/creatives-board'
import { EstatisticasCampanhas } from '../visitors/campanhas-score'
import type { AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import type { MarketingTask, MarketingStrategy, TaskStatus, CampaignWithVehicles } from '@/types/database'

interface MarketingAdminProps {
  admin: AdminUser
}

type ViewMode = 'campanhas' | 'criativos' | 'kanban' | 'dashboard' | 'estatisticas'

const VISOES: ViewMode[] = ['campanhas', 'criativos', 'kanban', 'dashboard', 'estatisticas']

/**
 * As abas, com o nome do que a pessoa encontra em cada uma (15/11/2026). Os
 * nomes antigos (Campanhas, Criativos, Kanban, Dashboard, Estatísticas)
 * diziam a ferramenta, não o conteúdo. As chaves da URL não mudaram, para os
 * links já salvos continuarem abrindo. "Dashboard" deixou de ser aba: são os
 * indicadores das tarefas e ficam dentro de Tarefas.
 */
const ABAS: { id: ViewMode; rotulo: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'campanhas', rotulo: 'Anúncios', Icon: Megaphone },
  { id: 'estatisticas', rotulo: 'Resultados', Icon: BarChart3 },
  { id: 'criativos', rotulo: 'Criativos a publicar', Icon: ImageIcon },
  { id: 'kanban', rotulo: 'Tarefas', Icon: ListChecks },
]

const SITUACOES = [
  { valor: 'no-ar', rotulo: 'No ar' },
  { valor: 'pausado', rotulo: 'Pausados na Meta' },
  { valor: 'troca', rotulo: 'Trocando o criativo' },
  { valor: 'manual', rotulo: 'Cadastrados à mão' },
  { valor: 'encerrado', rotulo: 'Encerrados' },
] as const

const ORDENS_DOS_ANUNCIOS = [
  { valor: 'recente', rotulo: 'Mais recentes' },
  { valor: 'nome', rotulo: 'Nome (A a Z)' },
] as const

// Tudo na URL: a visão aberta, os filtros das tarefas e a busca das campanhas.
// Recarregar a página ou mandar o link mantém o que estava na tela.
const CHAVES_URL = ['visao', 'q', 'resp', 'prio', 'cat', 'estr', 'prazo', 'camp', 'cid', 'sit', 'ord', 'per', 'editar'] as const
const FILTROS_TAREFAS_VAZIOS = { q: '', resp: '', prio: '', cat: '', estr: '', prazo: '' }

// Mesmos rótulos do modal da tarefa.
const PRIORIDADES = [
  { valor: 'low', rotulo: 'Baixa' },
  { valor: 'medium', rotulo: 'Média' },
  { valor: 'high', rotulo: 'Alta' },
  { valor: 'urgent', rotulo: 'Urgente' },
] as const

const CATEGORIAS = [
  { valor: 'seo', rotulo: 'SEO' },
  { valor: 'social_media', rotulo: 'Social Media' },
  { valor: 'content', rotulo: 'Conteúdo' },
  { valor: 'paid_ads', rotulo: 'Anúncios Pagos' },
  { valor: 'email', rotulo: 'E-mail Marketing' },
  { valor: 'events', rotulo: 'Eventos' },
  { valor: 'partnerships', rotulo: 'Parcerias' },
  { valor: 'other', rotulo: 'Outros' },
] as const

const PRAZOS = [
  { valor: 'atrasadas', rotulo: 'Atrasadas' },
  { valor: 'semana', rotulo: 'Esta semana' },
  { valor: 'sem', rotulo: 'Sem prazo' },
] as const

const SEM_RESPONSAVEL = 'nenhum'

const rotuloDe = (lista: readonly { valor: string; rotulo: string }[], valor: string): string =>
  lista.find(o => o.valor === valor)?.rotulo ?? valor

// Mesmo critério da busca do CRM: minúsculas e sem acento dos dois lados.
const semAcento = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const casaBusca = (texto: string, termos: string[]): boolean => {
  if (termos.length === 0) return true
  const alvo = semAcento(texto)
  return termos.every(t => alvo.includes(t))
}

/** Dia no fuso de quem está olhando, como AAAA-MM-DD (compara como texto). */
function chaveDoDia(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * O prazo é um dia, não um instante: usa só os 10 primeiros caracteres para o
 * fuso não empurrar a tarefa para o dia anterior.
 */
function diaDoPrazo(dueDate: string | null): string | null {
  return dueDate ? String(dueDate).slice(0, 10) : null
}

/** Segunda a domingo da semana corrente. */
function limitesDaSemana(): { hoje: string; inicio: string; fim: string } {
  const agora = new Date()
  const desdeSegunda = (agora.getDay() + 6) % 7
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - desdeSegunda)
  const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6)
  return { hoje: chaveDoDia(agora), inicio: chaveDoDia(inicio), fim: chaveDoDia(fim) }
}

export interface TaskWithDetails extends MarketingTask {
  strategy?: { id: string; name: string; category: string } | null
  assignees?: { id: string; email: string; name: string | null }[]
}

export interface AdminUserBasic {
  id: string
  email: string
  name: string | null
  role?: string
}

export function MarketingAdmin({ admin }: MarketingAdminProps) {
  const { valores, definir } = useFiltrosUrl(CHAVES_URL)
  // Estatísticas por campanha são dados do painel de visitantes: a aba só existe
  // para quem já vê Visitantes (a rota também barra, com a mesma regra).
  const podeVerEstatisticas = canAccessRoute(admin.role, '/admin/visitors', admin.secoes)
  // Visão ausente ou desconhecida cai na padrão (Anúncios).
  const viewMode: ViewMode = VISOES.includes(valores.visao as ViewMode) ? (valores.visao as ViewMode) : 'campanhas'
  // A padrão não aparece na URL, para o link limpo continuar abrindo Anúncios.
  const setViewMode = (v: ViewMode) => definir({ visao: v === 'campanhas' ? '' : v })
  const emTarefas = viewMode === 'kanban' || viewMode === 'dashboard'
  const periodo: PeriodoDaMeta = valores.per in PERIODOS_DA_META ? (valores.per as PeriodoDaMeta) : '30d'
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [strategies, setStrategies] = useState<MarketingStrategy[]>([])
  const [users, setUsers] = useState<AdminUserBasic[]>([])
  const [campaigns, setCampaigns] = useState<CampaignWithVehicles[]>([])
  const [meta, setMeta] = useState<EstadoDaMeta | null>(null)
  const [saldo, setSaldo] = useState<SaldoDaMeta | null>(null)
  const [atualizandoMeta, setAtualizandoMeta] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithVehicles | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setErroCarga(null)
    try {
      const [tasksRes, strategiesRes, usersRes, campaignsRes] = await Promise.all([
        fetch('/api/admin/marketing/tasks'),
        fetch('/api/admin/marketing/strategies'),
        fetch('/api/admin/marketing/users'),
        fetch('/api/admin/marketing/campaigns'),
      ])

      if (tasksRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const [tasksData, strategiesData, usersData, campaignsData] = await Promise.all([
        tasksRes.json(),
        strategiesRes.json(),
        usersRes.json(),
        campaignsRes.json(),
      ])

      setTasks(tasksData.tasks || [])
      setStrategies(strategiesData.strategies || [])
      setUsers(usersData.users || [])
      setCampaigns(campaignsData.campaigns || [])
      setMeta(campaignsData.meta ?? null)
      setSaldo(campaignsData.saldo ?? null)

      // Falha não pode parecer quadro vazio. Estratégias e usuários só alimentam
      // o modal e os filtros, então a falha deles não derruba a tela.
      const falhas = [!tasksRes.ok && 'as tarefas', !campaignsRes.ok && 'as campanhas'].filter(Boolean)
      if (falhas.length > 0) setErroCarga(`Não foi possível carregar ${falhas.join(' e ')}.`)
    } catch (error) {
      console.error('Error fetching data:', error)
      setErroCarga('Não foi possível carregar os dados do Marketing.')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])


  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleCreateTask = () => {
    setSelectedTask(null)
    setShowTaskModal(true)
  }

  const handleTaskSaved = () => {
    setShowTaskModal(false)
    setSelectedTask(null)
    fetchData()
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/admin/marketing/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        // Update local state optimistically
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        ))
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  // "Atualizar da Meta": sincroniza agora e recarrega o quadro.
  const atualizarDaMeta = async () => {
    setAtualizandoMeta(true)
    try {
      const r = await fetch('/api/admin/marketing/campaigns/meta', { method: 'POST' })
      const d = await r.json().catch(() => null)
      if (d?.meta) setMeta(d.meta)
      if (r.ok) await fetchData()
    } catch {
      setMeta(m => (m ? { ...m, erro: 'Não foi possível falar com o servidor.' } : m))
    } finally {
      setAtualizandoMeta(false)
    }
  }

  // Campaign handlers
  const handleCampaignClick = (campaign: CampaignWithVehicles) => {
    // Com busca ligada o quadro recebe a campanha só com os veículos que casam:
    // o modal precisa da campanha inteira, senão salvaria a lista cortada.
    setSelectedCampaign(campaigns.find(c => c.id === campaign.id) ?? campaign)
    setShowCampaignModal(true)
  }

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setShowCampaignModal(true)
  }

  const handleCampaignSaved = () => {
    setShowCampaignModal(false)
    setSelectedCampaign(null)
    if (valores.editar) definir({ editar: '' })
    fetchData()
  }

  // O card do board é o veículo, então quem muda de coluna é ele — e só ele.
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Title', 'Category', 'Status', 'Priority', 'Due Date', 'Assignees'].join(','),
      ...tasks.map(t => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.category,
        t.status,
        t.priority,
        t.due_date || '',
        t.assignees?.map(a => a.name || a.email).join('; ') || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-tasks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const isAdmin = admin.role === 'admin'
  // Gestão de campanhas é de quem acessa o painel de Marketing (admin/owner/marketing/gerente),
  // não só do admin — o Eduardo (marketing) precisa registrar/retirar itens e pôr o motivo.
  const canManageCampaigns = canAccessRoute(admin.role, '/admin/marketing')

  // ---- Filtros das tarefas (no cliente, sobre o que já foi carregado) ----
  const aoBuscarTarefa = useCallback((v: string) => definir({ q: v }), [definir])
  const aoBuscarCampanha = useCallback((v: string) => definir({ camp: v }), [definir])
  const limparFiltrosTarefas = () => definir(FILTROS_TAREFAS_VAZIOS)

  // Só quem tem tarefa atribuída entra no filtro de Responsável.
  const responsaveis = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const t of tasks) for (const a of t.assignees ?? []) mapa.set(a.id, a.name || a.email)
    return [...mapa.entries()]
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
  }, [tasks])

  const opcoesResponsavel = useMemo(
    () => [...responsaveis, { valor: SEM_RESPONSAVEL, rotulo: 'Sem responsável' }],
    [responsaveis],
  )

  const opcoesEstrategia = useMemo(
    () => strategies.map(e => ({ valor: e.id, rotulo: e.name })),
    [strategies],
  )

  const tarefasFiltradas = useMemo(() => {
    const termos = termosDaBusca(valores.q)
    const { hoje, inicio, fim } = limitesDaSemana()
    return tasks.filter(t => {
      if (!casaBusca(t.title, termos)) return false
      if (valores.resp === SEM_RESPONSAVEL) {
        if ((t.assignees ?? []).length > 0) return false
      } else if (valores.resp && !(t.assignees ?? []).some(a => a.id === valores.resp)) return false
      if (valores.prio && t.priority !== valores.prio) return false
      if (valores.cat && t.category !== valores.cat) return false
      if (valores.estr && t.strategy_id !== valores.estr) return false
      const dia = diaDoPrazo(t.due_date)
      // Atrasada: prazo antes de hoje e ainda não concluída (vencer hoje não conta).
      if (valores.prazo === 'atrasadas' && !(dia !== null && dia < hoje && t.status !== 'completed')) return false
      if (valores.prazo === 'semana' && !(dia !== null && dia >= inicio && dia <= fim)) return false
      if (valores.prazo === 'sem' && dia !== null) return false
      return true
    })
  }, [tasks, valores.q, valores.resp, valores.prio, valores.cat, valores.estr, valores.prazo])

  const filtrosTarefas: FiltroLigado[] = []
  if (valores.q) filtrosTarefas.push({ rotulo: `Busca: ${valores.q}`, aoRemover: () => definir({ q: '' }) })
  if (valores.resp) filtrosTarefas.push({ rotulo: `Responsável: ${rotuloDe(opcoesResponsavel, valores.resp)}`, aoRemover: () => definir({ resp: '' }) })
  if (valores.prio) filtrosTarefas.push({ rotulo: `Prioridade: ${rotuloDe(PRIORIDADES, valores.prio)}`, aoRemover: () => definir({ prio: '' }) })
  if (valores.cat) filtrosTarefas.push({ rotulo: `Categoria: ${rotuloDe(CATEGORIAS, valores.cat)}`, aoRemover: () => definir({ cat: '' }) })
  if (valores.estr) filtrosTarefas.push({ rotulo: `Estratégia: ${rotuloDe(opcoesEstrategia, valores.estr)}`, aoRemover: () => definir({ estr: '' }) })
  if (valores.prazo) filtrosTarefas.push({ rotulo: `Prazo: ${rotuloDe(PRAZOS, valores.prazo)}`, aoRemover: () => definir({ prazo: '' }) })

  // ---- Busca das campanhas: por veículo ou pelo nome da campanha ----
  const totalVeiculos = useMemo(() => campaigns.reduce((n, c) => n + (c.vehicles ?? []).length, 0), [campaigns])
  const campanhasFiltradas = useMemo(() => {
    const termos = termosDaBusca(valores.camp)
    if (termos.length === 0) return campaigns
    return campaigns
      .map(c => ({
        ...c,
        // Nome da campanha casa: mostra todos os veículos dela. Senão, só os que casam.
        vehicles: casaBusca(c.name, termos)
          ? c.vehicles ?? []
          : (c.vehicles ?? []).filter(v => casaBusca(v.vehicle_name, termos)),
      }))
      .filter(c => c.vehicles.length > 0)
  }, [campaigns, valores.camp])
  // Um card por carro anunciado, com a situação e a ordem escolhidas.
  const anuncios = useMemo(() => {
    const itens: AnuncioDaLista[] = campanhasFiltradas.flatMap(campanha =>
      (campanha.vehicles ?? []).map(veiculo => ({ veiculo, campanha })),
    )
    const filtrados = itens.filter(i => (!valores.sit || situacaoDoAnuncio(i.veiculo) === valores.sit) && (!valores.cid || i.campanha.id === valores.cid))
    const dia = (i: AnuncioDaLista) => String(i.veiculo.added_date ?? i.veiculo.created_at ?? '')
    return [...filtrados].sort((a, b) =>
      valores.ord === 'nome'
        ? a.veiculo.vehicle_name.localeCompare(b.veiculo.vehicle_name, 'pt-BR')
        : valores.ord === 'recente'
          ? dia(b).localeCompare(dia(a))
          // Padrão: quem mais gastou nos últimos 30 dias primeiro.
          : Number(b.veiculo.meta_gasto_30d ?? 0) - Number(a.veiculo.meta_gasto_30d ?? 0),
    )
  }, [campanhasFiltradas, valores.sit, valores.cid, valores.ord])
  const opcoesDeCampanha = useMemo(
    () => campaigns.filter(c => (c.vehicles ?? []).length > 0).map(c => ({ valor: c.id, rotulo: c.name })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
    [campaigns],
  )
  const filtrosDosAnuncios = [
    valores.camp && { rotulo: `Busca: ${valores.camp}`, aoRemover: () => definir({ camp: '' }) },
    valores.cid && { rotulo: `Campanha: ${rotuloDe(opcoesDeCampanha, valores.cid)}`, aoRemover: () => definir({ cid: '' }) },
    valores.sit && { rotulo: `Situação: ${rotuloDe(SITUACOES, valores.sit)}`, aoRemover: () => definir({ sit: '' }) },
  ].filter((f): f is { rotulo: string; aoRemover: () => void } => !!f)
  const limparFiltrosDosAnuncios = () => definir({ camp: '', sit: '', cid: '' })

  // `?editar=<id>`: a página do anúncio manda para cá já com a campanha aberta.
  const campanhaDaUrl = valores.editar ? campaigns.find(c => c.id === valores.editar) ?? null : null

  return (
    <div className="min-h-screen bg-background">
      <CabecalhoPagina titulo="Marketing" descricao={canManageCampaigns ? 'Anúncios, resultados, criativos e tarefas' : 'Minhas tarefas'} />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Abas à esquerda, ações da aba à direita. */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border">
          <nav className="-mb-px flex flex-wrap gap-1" aria-label="Seções do Marketing">
            {ABAS.filter(a => a.id !== 'estatisticas' || meta?.ligada || podeVerEstatisticas).map(({ id, rotulo, Icon }) => {
              const ativa = id === 'kanban' ? emTarefas : viewMode === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-2 border-b-2 px-4 text-base font-medium transition-colors',
                    ativa ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {rotulo}
                </button>
              )
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2 pb-2">
            {emTarefas && (
              <BotaoSecundario onClick={handleExport}>
                <Download className="w-4 h-4" />
                Exportar tarefas
              </BotaoSecundario>
            )}
            {viewMode !== 'estatisticas' && (
              <BotaoSecundario onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                Atualizar
              </BotaoSecundario>
            )}
            {((viewMode === 'campanhas' && canManageCampaigns) || (emTarefas && isAdmin)) && (
              <button
                onClick={viewMode === 'campanhas' ? handleCreateCampaign : handleCreateTask}
                className="flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                {viewMode === 'campanhas' ? 'Cadastrar anúncio à mão' : 'Nova tarefa'}
              </button>
            )}
          </div>
        </div>

        {emTarefas && (
          <div className="mb-4 inline-flex gap-1 rounded-lg border border-border bg-background-card p-1" role="group" aria-label="Como ver as tarefas">
            {([['kanban', 'Quadro'], ['dashboard', 'Indicadores']] as const).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                aria-pressed={viewMode === id}
                onClick={() => setViewMode(id)}
                className={cn(
                  'min-h-10 rounded-md px-4 text-sm font-medium transition-colors',
                  viewMode === id ? 'bg-primary text-white' : 'text-foreground-secondary hover:text-foreground',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'campanhas' ? (
          <div className="space-y-4">
            {erroCarga && <EstadoErro texto={erroCarga} aoTentar={fetchData} />}
            {saldo && <SaldoMeta saldo={saldo} />}
            {meta && (meta.ligada || isAdmin) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background-card px-4 py-3 text-sm">
                <span className={meta.erro ? 'text-amber-600 dark:text-amber-400' : 'text-foreground-secondary'}>
                  {!meta.ligada
                    ? 'Meta Ads não está ligada a este painel: falta gravar o token no servidor do site.'
                    : meta.erro
                      ? `A Meta não respondeu na última leitura (${meta.erro}). O quadro mostra o que já estava salvo.`
                      : meta.em
                        ? `Anúncios da Meta lidos às ${new Date(meta.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Anúncio novo entra sozinho na lista.`
                        : 'Lendo os anúncios da Meta. Atualize em instantes.'}
                </span>
                {meta.ligada && canManageCampaigns && (
                  <BotaoSecundario onClick={atualizarDaMeta} disabled={atualizandoMeta}>
                    <RefreshCw className={cn('w-4 h-4', atualizandoMeta && 'animate-spin')} />
                    Atualizar da Meta
                  </BotaoSecundario>
                )}
              </div>
            )}
            {campaigns.length === 0 ? (
              // Com erro de carga, o aviso acima já explica: não afirmar que está vazio.
              !erroCarga && (
                <EstadoVazio
                  Icon={Megaphone}
                  titulo="Nenhum anúncio ainda"
                  texto="Os anúncios no ar na Meta aparecem aqui sozinhos, um card por carro."
                  acao={canManageCampaigns ? (
                    <BotaoSecundario onClick={handleCreateCampaign}>
                      <Plus className="w-4 h-4" />
                      Nova campanha
                    </BotaoSecundario>
                  ) : undefined}
                />
              )
            ) : (
              <>
                <BarraDeFiltros>
                  <CampoBusca valor={valores.camp} aoMudar={aoBuscarCampanha} placeholder="Buscar por carro ou campanha" />
                  {opcoesDeCampanha.length > 1 && (
                    <SeletorFiltro rotulo="Campanha" valor={valores.cid} aoMudar={v => definir({ cid: v })} opcoes={opcoesDeCampanha} todos="Todas" />
                  )}
                  <SeletorFiltro rotulo="Situação" valor={valores.sit} aoMudar={v => definir({ sit: v })} opcoes={SITUACOES} todos="Todas" />
                  <SeletorFiltro rotulo="Ordenar" valor={valores.ord} aoMudar={v => definir({ ord: v })} opcoes={ORDENS_DOS_ANUNCIOS} todos="Maior gasto" />
                </BarraDeFiltros>
                <ResumoDosFiltros
                  total={totalVeiculos}
                  mostrando={anuncios.length}
                  nome={['anúncio', 'anúncios']}
                  filtros={filtrosDosAnuncios}
                  aoLimpar={limparFiltrosDosAnuncios}
                />
                {anuncios.length === 0 ? (
                  <EstadoVazio
                    Icon={Megaphone}
                    titulo="Nenhum anúncio com esses filtros"
                    texto="Há anúncios cadastrados, mas nenhum combina com a busca ou com a situação escolhida."
                    acao={<BotaoSecundario onClick={limparFiltrosDosAnuncios}>Limpar filtros</BotaoSecundario>}
                  />
                ) : (
                  <AnunciosLista itens={anuncios} aoAbrirCampanha={handleCampaignClick} podeEditar={canManageCampaigns} aoMudar={meta?.ligada && canManageCampaigns ? fetchData : undefined} />
                )}
              </>
            )}
          </div>
        ) : viewMode === 'criativos' ? (
          <CreativesBoard />
        ) : viewMode === 'kanban' ? (
          <div className="space-y-4">
            {erroCarga && <EstadoErro texto={erroCarga} aoTentar={fetchData} />}
            {tasks.length === 0 ? (
              !erroCarga && (
                <EstadoVazio
                  Icon={ListChecks}
                  titulo={isAdmin ? 'Nenhuma tarefa ainda' : 'Nenhuma tarefa para você'}
                  texto={isAdmin
                    ? 'Crie a primeira tarefa para começar a organizar o quadro.'
                    : 'Quando uma tarefa for atribuída a você, ela aparece aqui.'}
                  acao={isAdmin ? (
                    <BotaoSecundario onClick={handleCreateTask}>
                      <Plus className="w-4 h-4" />
                      Nova tarefa
                    </BotaoSecundario>
                  ) : undefined}
                />
              )
            ) : (
              <>
                <BarraDeFiltros>
                  <CampoBusca valor={valores.q} aoMudar={aoBuscarTarefa} placeholder="Buscar tarefa pelo título" />
                  <SeletorFiltro rotulo="Responsável" valor={valores.resp} aoMudar={v => definir({ resp: v })} opcoes={opcoesResponsavel} />
                  <SeletorFiltro rotulo="Prioridade" valor={valores.prio} aoMudar={v => definir({ prio: v })} opcoes={PRIORIDADES} todos="Todas" />
                  <SeletorFiltro rotulo="Categoria" valor={valores.cat} aoMudar={v => definir({ cat: v })} opcoes={CATEGORIAS} todos="Todas" />
                  {opcoesEstrategia.length > 0 && (
                    <SeletorFiltro rotulo="Estratégia" valor={valores.estr} aoMudar={v => definir({ estr: v })} opcoes={opcoesEstrategia} todos="Todas" />
                  )}
                  <SeletorFiltro rotulo="Prazo" valor={valores.prazo} aoMudar={v => definir({ prazo: v })} opcoes={PRAZOS} todos="Qualquer" />
                </BarraDeFiltros>
                <ResumoDosFiltros
                  total={tasks.length}
                  mostrando={tarefasFiltradas.length}
                  nome={['tarefa', 'tarefas']}
                  filtros={filtrosTarefas}
                  aoLimpar={limparFiltrosTarefas}
                />
                {tarefasFiltradas.length === 0 ? (
                  <EstadoVazio
                    Icon={ListChecks}
                    titulo="Nenhuma tarefa com esses filtros"
                    texto="Há tarefas no quadro, mas nenhuma combina com a busca ou com os filtros escolhidos."
                    acao={<BotaoSecundario onClick={limparFiltrosTarefas}>Limpar filtros</BotaoSecundario>}
                  />
                ) : (
                  <KanbanBoard
                    tasks={tarefasFiltradas}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    isAdmin={isAdmin}
                  />
                )}
              </>
            )}
          </div>
        ) : viewMode === 'estatisticas' ? (
          meta?.ligada ? (
            <ResultadosMeta periodo={periodo} aoMudarPeriodo={p => definir({ per: p === '30d' ? '' : p })} comLinkDoSite={podeVerEstatisticas} />
          ) : podeVerEstatisticas ? (
            // Sem a Meta ligada, fica a tabela das campanhas que trazem visita ao site.
            <EstatisticasCampanhas />
          ) : (
            <EstadoVazio Icon={BarChart3} titulo="Meta Ads não está ligada" texto="Os resultados dos anúncios aparecem aqui quando o token da Meta estiver gravado no servidor." />
          )
        ) : (
          <MetricsDashboard isAdmin={isAdmin} />
        )}
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          strategies={strategies}
          users={users}
          isAdmin={isAdmin}
          currentUserId={admin.id}
          onClose={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          onSaved={handleTaskSaved}
        />
      )}

      {/* Campaign Modal */}
      {(showCampaignModal || campanhaDaUrl) && (
        <CampaignModal
          key={campanhaDaUrl?.id ?? selectedCampaign?.id ?? 'nova'}
          campaign={campanhaDaUrl ?? selectedCampaign}
          isAdmin={canManageCampaigns}
          onClose={() => {
            setShowCampaignModal(false)
            setSelectedCampaign(null)
            if (valores.editar) definir({ editar: '' })
          }}
          onSaved={handleCampaignSaved}
        />
      )}
    </div>
  )
}

