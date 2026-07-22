import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { deleteObject, objectPathFromUrl } from '@/lib/storage/disk'

export const dynamic = 'force-dynamic'

const CREATIVES_BUCKET = 'creatives'

// DELETE — "marcar como publicado": remove o card E a imagem do disco (sem lixo).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const { id } = await params
    const row = await db.selectFrom('marketing_creatives').select(['id', 'image_url'])
      .where('id', '=', id).executeTakeFirst()
    if (!row) return NextResponse.json({ error: 'Criativo não encontrado' }, { status: 404 })

    // Apaga o arquivo (best-effort) e depois a linha.
    const objectPath = objectPathFromUrl(row.image_url, CREATIVES_BUCKET)
    if (objectPath) {
      try { await deleteObject(CREATIVES_BUCKET, objectPath) } catch (e) {
        console.warn('[creatives] falha ao apagar arquivo (sigo apagando a linha):', e)
      }
    }
    await db.deleteFrom('marketing_creatives').where('id', '=', id).execute()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[creatives] DELETE falhou:', error)
    return NextResponse.json({ error: 'Erro ao publicar/remover criativo' }, { status: 500 })
  }
}
