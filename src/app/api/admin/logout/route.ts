import { NextResponse } from 'next/server'
import { signOut } from '@/lib/admin-auth-supabase'

// Migrado do Supabase GoTrue → Auth.js (ver docs/MIGRACAO_POSTGRES_PURO.md).
export async function POST() {
  try {
    await signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 })
  }
}
