import { NextRequest, NextResponse } from 'next/server'
import type { Updateable } from 'kysely'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { isAdminRole } from '@/lib/auth/roles'

// Migrado do Supabase GoTrue → Auth.js/Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

// PATCH /api/admin/users/[id] — atualiza nome/papel/ativo e redefine senha
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blocked = await guardSupervisedAction(admin, 'Alterar usuário do admin')
  if (blocked) return blocked

  const { id } = await params
  const body = await request.json()

  // Trava: nunca deixar o sistema sem nenhum admin ativo
  const desativando = body.is_active === false
  const rebaixando = body.role !== undefined && body.role !== 'admin'
  if (desativando || rebaixando) {
    const admins = await db.selectFrom('admin_users').select('id')
      .where('role', '=', 'admin').where('is_active', '=', true).execute()
    const outros = admins.filter(a => a.id !== id)
    if (outros.length === 0) {
      return NextResponse.json(
        { error: 'Não é possível desativar/rebaixar o último administrador ativo' },
        { status: 400 }
      )
    }
  }

  // Redefinição de senha (bcrypt → password_hash)
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Senha precisa de pelo menos 8 caracteres' }, { status: 400 })
    }
    const password_hash = await bcrypt.hash(body.password, 10)
    try {
      await db.updateTable('admin_users').set({ password_hash }).where('id', '=', id).execute()
    } catch (error) {
      return NextResponse.json({ error: `Falha ao redefinir senha: ${error instanceof Error ? error.message : error}` }, { status: 500 })
    }
  }

  // Campos de autorização
  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (isAdminRole(body.role)) updates.role = body.role
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  if (Object.keys(updates).length > 0) {
    try {
      await db.updateTable('admin_users')
        .set(updates as Updateable<Database['admin_users']>)
        .where('id', '=', id).execute()
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'update failed' }, { status: 500 })
    }
  }

  console.log(`[AdminUsers] ${admin.email} alterou ${id}:`, Object.keys({ ...updates, ...(body.password ? { password: '***' } : {}) }))
  return NextResponse.json({ success: true })
}
