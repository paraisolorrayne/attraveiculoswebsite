'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  Plus,
  RefreshCw,
  LogOut,
  Loader2,
  Download,
  Megaphone,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { KanbanBoard } from './components/kanban-board'
import { MetricsDashboard } from './components/metrics-dashboard'
import { TaskModal } from './components/task-modal'
import { CampaignsBoard } from './components/campaigns-board'
import { CampaignModal } from './components/campaign-modal'
import type { AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import type { MarketingTask, MarketingStrategy, TaskStatus, CampaignWithVehicles, CampaignStatus } from '@/types/database'

interface MarketingAdminProps {
  admin: AdminUser
}

type ViewMode = 'campanhas' | 'kanban' | 'dashboard'

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
  const [viewMode, setViewMode] = useState<ViewMode>('campanhas')
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [strategies, setStrategies] = useState<MarketingStrategy[]>([])
  const [users, setUsers] = useState<AdminUserBasic[]>([])
  const [campaigns, setCampaigns] = useState<CampaignWithVehicles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithVehicles | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
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
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

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

  // Campaign handlers
  const handleCampaignClick = (campaign: CampaignWithVehicles) => {
    setSelectedCampaign(campaign)
    setShowCampaignModal(true)
  }

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setShowCampaignModal(true)
  }

  const handleCampaignSaved = () => {
    setShowCampaignModal(false)
    setSelectedCampaign(null)
    fetchData()
  }

  const handleCampaignStatusChange = async (campaignId: string, newStatus: CampaignStatus) => {
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setCampaigns(prev => prev.map(c =>
          c.id === campaignId ? { ...c, status: newStatus } : c
        ))
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
    }
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Kanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Marketing</h1>
              <p className="text-xs text-foreground-secondary">
                {canManageCampaigns ? 'Gestão de Campanhas' : 'Minhas Tarefas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-foreground-secondary hover:text-foreground hover:bg-background-soft rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-background-card border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('campanhas')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'campanhas'
                  ? "bg-primary text-white"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-soft"
              )}
            >
              <Megaphone className="w-4 h-4" />
              Campanhas
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'kanban'
                  ? "bg-primary text-white"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-soft"
              )}
            >
              <Kanban className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewMode === 'dashboard'
                  ? "bg-primary text-white"
                  : "text-foreground-secondary hover:text-foreground hover:bg-background-soft"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-background-soft transition-colors text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            {(viewMode === 'campanhas' ? canManageCampaigns : isAdmin) && (
              <button
                onClick={viewMode === 'campanhas' ? handleCreateCampaign : handleCreateTask}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {viewMode === 'campanhas' ? 'Nova Campanha' : 'Nova Tarefa'}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : viewMode === 'campanhas' ? (
          <CampaignsBoard
            campaigns={campaigns}
            onCampaignClick={handleCampaignClick}
            onStatusChange={handleCampaignStatusChange}
            isAdmin={canManageCampaigns}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onStatusChange={handleStatusChange}
            isAdmin={isAdmin}
          />
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
      {showCampaignModal && (
        <CampaignModal
          campaign={selectedCampaign}
          isAdmin={canManageCampaigns}
          onClose={() => {
            setShowCampaignModal(false)
            setSelectedCampaign(null)
          }}
          onSaved={handleCampaignSaved}
        />
      )}
    </div>
  )
}

