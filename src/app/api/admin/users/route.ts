import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Gestão de usuários do admin — restrito ao papel `admin`.
// Autenticação = Supabase Auth; autorização = linha ativa em admin_users.

// GET /api/admin/users — lista usuários
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ users: data })
}

// POST /api/admin/users — cria usuário (Auth + admin_users, com rollback)
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const blocked = await guardSupervisedAction(admin, 'Criar usuário do admin')
  if (blocked) return blocked

  const body = await request.json()
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const role = body.role === 'admin' ? 'admin' : 'gerente'
  const password = String(body.password || '')

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Senha precisa de pelo menos 8 caracteres' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1) usuário no Auth (e-mail já confirmado — contas internas)
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError || !created.user) {
    return NextResponse.json(
      { error: `Falha ao criar no Auth: ${authError?.message ?? 'sem detalhes'}` },
      { status: 400 }
    )
  }

  // 2) autorização em admin_users (rollback do Auth se falhar)
  const { error: insertError } = await supabase.from('admin_users').insert({
    id: created.user.id,
    email,
    name,
    role,
    is_active: true,
  } as never)

  if (insertError) {
    await supabase.auth.admin.deleteUser(created.user.id)
    return NextResponse.json(
      { error: `Falha ao autorizar usuário: ${insertError.message}` },
      { status: 500 }
    )
  }

  console.log(`[AdminUsers] ${admin.email} criou ${email} (${role})`)
  return NextResponse.json({
    success: true,
    user: { id: created.user.id, email, name, role, is_active: true },
  })
}
