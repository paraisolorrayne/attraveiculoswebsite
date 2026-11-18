import { after, NextResponse } from 'next/server'
import { getCurrentAdmin, type AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import type { Autor } from '@/lib/boletos-db'
import { entregarBoletosAoFykos } from '@/lib/boletos-fykos'

/**
 * Quem pode mexer nos boletos: quem abre a seção /admin/boletos (admin, owner
 * e quem recebeu a exceção na tela de Usuários). Devolve o admin ou a resposta
 * de recusa pronta.
 */
export async function exigirBoletos(): Promise<{ admin: AdminUser; autor: Autor } | NextResponse> {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/boletos', admin.secoes)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return { admin, autor: { id: admin.id, nome: admin.name || admin.email.split('@')[0] } }
}

export const ehUuid = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

/**
 * Depois de responder a quem clicou, tenta entregar ao Fykos o que acabou de
 * entrar na fila. Se falhar, o aviso continua na fila e o cron tenta de novo:
 * a tela não espera o Fykos nem quebra por causa dele.
 */
export function despacharAoFykos(): void {
  after(async () => {
    try {
      await entregarBoletosAoFykos()
    } catch (e) {
      console.warn('[boletos] entrega ao Fykos falhou; fica na fila:', e instanceof Error ? e.message : e)
    }
  })
}
