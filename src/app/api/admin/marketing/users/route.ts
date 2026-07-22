import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

// GET - List all admin users for assignment
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await db.selectFrom('admin_users')
      .select(['id', 'email', 'name', 'role'])
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute()

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in users GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

