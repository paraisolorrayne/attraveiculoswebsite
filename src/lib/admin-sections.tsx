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
import { canAccessRoute, type AdminRole, type SecoesExtras } from '@/lib/auth/roles'

/**
 * Em que parte do trabalho a seção entra. A tela inicial agrupa por isto em vez
 * de despejar as nove numa grade só: quem abre o painel está com uma intenção
 * ("de onde veio o lead de ontem", "publicar um post"), e a intenção mora num
 * grupo, não espalhada entre nove cards de peso igual.
 */
export type GrupoAdmin = 'aquisicao' | 'conteudo' | 'sistema'

export const GRUPOS: { id: GrupoAdmin; titulo: string; resumo: string }[] = [
  { id: 'aquisicao', titulo: 'Aquisição', resumo: 'De onde vêm as visitas e o que vira lead' },
  { id: 'conteudo', titulo: 'Conteúdo', resumo: 'O que o site publica' },
  { id: 'sistema', titulo: 'Sistema', resumo: 'Quem acessa e como o site se comporta' },
]

export interface AdminSection {
  label: string
  href: string
  description: string
  grupo: GrupoAdmin
  Icon: LucideIcon
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { label: 'Marketing', href: '/admin/marketing', description: 'Estratégias, campanhas e tarefas', grupo: 'aquisicao', Icon: Megaphone },
  { label: 'Criativos', href: '/admin/gerador-criativos', description: 'Gerador de criativos para anúncios', grupo: 'aquisicao', Icon: Palette },
  { label: 'Visitantes', href: '/admin/visitors', description: 'Rastreamento e métricas de visita', grupo: 'aquisicao', Icon: BarChart3 },
  { label: 'CRM', href: '/admin/crm', description: 'Funil de leads', grupo: 'aquisicao', Icon: KanbanSquare },
  { label: 'Blog', href: '/admin/blog', description: 'Posts e insights do blog', grupo: 'conteudo', Icon: FileText },
  { label: 'Newsletter', href: '/admin/newsletter/campaigns', description: 'Campanhas e inscritos', grupo: 'conteudo', Icon: MailOpen },
  { label: 'Sons de Motor', href: '/admin/engine-sounds', description: 'Áudios de motor dos veículos', grupo: 'conteudo', Icon: Volume2 },
  { label: 'Usuários', href: '/admin/usuarios', description: 'Contas e papéis do painel', grupo: 'sistema', Icon: Users },
  { label: 'Configurações', href: '/admin/settings', description: 'Ajustes gerais do site', grupo: 'sistema', Icon: Settings },
]

/** Seções que o papel pode acessar (usa a matriz real de rotas). */
export function sectionsForRole(role: AdminRole, secoes?: SecoesExtras | null): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => canAccessRoute(role, s.href, secoes))
}
