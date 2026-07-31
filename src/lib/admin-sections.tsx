/**
 * Seções do painel admin — fonte única usada pela landing (/admin) e pelo header.
 * A visibilidade é decidida pela matriz de papéis (canAccessRoute), não por
 * listas hardcoded — assim owner/operador/marketing veem o que lhes cabe.
 */
import {
  Volume2, Palette, FileText, Megaphone, MailOpen,
  KanbanSquare, BarChart3, Users, Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { canAccessRoute, type AdminRole } from '@/lib/auth/roles'

export interface AdminSection {
  label: string
  href: string
  description: string
  Icon: LucideIcon
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { label: 'Sons de Motor', href: '/admin/engine-sounds', description: 'Áudios de motor dos veículos', Icon: Volume2 },
  { label: 'Criativos', href: '/admin/gerador-criativos', description: 'Gerador de criativos para anúncios', Icon: Palette },
  { label: 'Blog', href: '/admin/blog', description: 'Posts e insights do blog', Icon: FileText },
  { label: 'Marketing', href: '/admin/marketing', description: 'Estratégias, campanhas e tarefas', Icon: Megaphone },
  { label: 'Newsletter', href: '/admin/newsletter/campaigns', description: 'Campanhas e inscritos', Icon: MailOpen },
  { label: 'CRM', href: '/admin/crm', description: 'Funil de leads', Icon: KanbanSquare },
  { label: 'Visitantes', href: '/admin/visitors', description: 'Rastreamento e métricas de visita', Icon: BarChart3 },
  { label: 'Usuários', href: '/admin/usuarios', description: 'Contas e papéis do painel', Icon: Users },
  { label: 'Configurações', href: '/admin/settings', description: 'Ajustes gerais do site', Icon: Settings },
]

/** Seções que o papel pode acessar (usa a matriz real de rotas). */
export function sectionsForRole(role: AdminRole): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => canAccessRoute(role, s.href))
}
