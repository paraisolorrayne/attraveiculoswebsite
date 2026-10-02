import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { db } from '@/lib/db'
import { isAdminRole } from '@/lib/auth/roles'
import { agenciaDoUsuario } from '@/lib/auth/usuario-agencia'

// Migrado do Supabase GoTrue → Auth.js/Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Não há mais auth.users: a senha (bcrypt) vive em admin_users.password_hash.
export const dynamic = 'force-dynamic'

// GET /api/admin/users — lista usuários
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [data, agencias] = await Promise.all([
      db.selectFrom('admin_users')
        .select(['id', 'email', 'name', 'role', 'is_active', 'last_login_at', 'ultimo_acesso_em', 'created_at', 'secoes_extras', 'agencia_id'])
        .orderBy('created_at', 'asc')
        .execute(),
      // Para o seletor do papel "Agência" no formulário.
      db.selectFrom('agencias').select(['id', 'nome']).orderBy('nome').execute(),
    ])
    return NextResponse.json({ users: data, agencias })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'query failed' }, { status: 500 })
  }
}

// POST /api/admin/users — cria usuário (bcrypt + admin_users)
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
  const role = isAdminRole(body.role) ? body.role : 'gerente'
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

  const existentes = (await db.selectFrom('agencias').select('id').execute()).map(a => a.id)
  const vinculo = agenciaDoUsuario(role, body.agencia_id, existentes)
  if (!vinculo.ok) {
    return NextResponse.json({ error: vinculo.erro }, { status: 400 })
  }

  const id = randomUUID()
  const password_hash = await bcrypt.hash(password, 10)

  try {
    await db.insertInto('admin_users')
      .values({ id, email, name, role, is_active: true, password_hash, agencia_id: vinculo.agencia_id })
      .execute()
  } catch (insertError) {
    const msg = insertError instanceof Error ? insertError.message : String(insertError)
    const friendly = /duplicate|unique/i.test(msg) ? 'Já existe um usuário com este e-mail' : msg
    return NextResponse.json({ error: friendly }, { status: 400 })
  }

  console.log(`[AdminUsers] ${admin.email} criou ${email} (${role})`)
  return NextResponse.json({ success: true, user: { id, email, name, role, is_active: true } })
}
