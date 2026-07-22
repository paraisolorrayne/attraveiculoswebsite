import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { putObject } from '@/lib/storage/disk'

// Fila de criativos para publicar no patrocinado (ponte Gerador → board).
export const dynamic = 'force-dynamic'

const CREATIVES_BUCKET = 'creatives'
const MAX_BYTES = 15 * 1024 * 1024 // 15MB (PNG 1080×1920 fica ~2-4MB)

// GET — lista os criativos pendentes (quem acessa o board de Marketing).
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  try {
    const creatives = await db.selectFrom('marketing_creatives').selectAll()
      .orderBy('created_at', 'desc').execute()
    return NextResponse.json({ creatives })
  } catch (error) {
    console.error('[creatives] GET falhou:', error)
    return NextResponse.json({ error: 'Erro ao listar criativos' }, { status: 500 })
  }
}

// POST — recebe o PNG do Gerador (multipart) e cria o card. Quem gera criativos
// (admin/operador/marketing/gerente) pode enviar ao patrocinado.
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/gerador-criativos')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    const vehicleName = (form.get('vehicle_name') as string | null)?.trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo (file) é obrigatório' }, { status: 400 })
    }
    if (file.type !== 'image/png') {
      return NextResponse.json({ error: 'Só PNG é aceito' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande (máx 15MB)' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const imageUrl = await putObject(CREATIVES_BUCKET, `pending/${randomUUID()}.png`, bytes)

    const row = await db.insertInto('marketing_creatives').values({
      image_url: imageUrl,
      vehicle_name: vehicleName,
      created_by: admin.id,
      created_by_name: admin.name || admin.email.split('@')[0],
      status: 'pendente',
    }).returningAll().executeTakeFirst()

    return NextResponse.json({ creative: row }, { status: 201 })
  } catch (error) {
    console.error('[creatives] POST falhou:', error)
    return NextResponse.json({ error: 'Erro ao salvar criativo' }, { status: 500 })
  }
}
