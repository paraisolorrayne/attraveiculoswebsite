import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { GERADOR_CRIATIVOS_HTML } from './gerador-html'

export const dynamic = 'force-dynamic'

// GET - Serve o Gerador de Criativos (ferramenta standalone embutida via iframe)
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return new NextResponse(GERADOR_CRIATIVOS_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
