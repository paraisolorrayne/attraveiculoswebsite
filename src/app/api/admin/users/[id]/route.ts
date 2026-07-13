import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const supabase = createAdminClient()

  // Trava de segurança: nunca deixar o sistema sem nenhum admin ativo
  const desativando = body.is_active === false
  const rebaixando = body.role === 'gerente'
  if (desativando || rebaixando) {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)
    const outros = (admins ?? []).filter(a => (a as { id: string }).id !== id)
    if (outros.length === 0) {
      return NextResponse.json(
        { error: 'Não é possível desativar/rebaixar o último administrador ativo' },
        { status: 400 }
      )
    }
  }

  // Redefinição de senha (via Auth)
  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: 'Senha precisa de pelo menos 8 caracteres' }, { status: 400 })
    }
    const { error } = await supabase.auth.admin.updateUserById(id, { password: body.password })
    if (error) {
      return NextResponse.json({ error: `Falha ao redefinir senha: ${error.message}` }, { status: 500 })
    }
  }

  // Campos de autorização
  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (body.role === 'admin' || body.role === 'gerente') updates.role = body.role
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('admin_users')
      .update(updates as never)
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  console.log(`[AdminUsers] ${admin.email} alterou ${id}:`, Object.keys({ ...updates, ...(body.password ? { password: '***' } : {}) }))
  return NextResponse.json({ success: true })
}
