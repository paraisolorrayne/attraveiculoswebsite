import { NextRequest, NextResponse } from 'next/server'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

// POST - Add comment to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Check if task exists and user has access
    const task = await db.selectFrom('marketing_tasks')
      .select('id')
      .select((eb) => [
        jsonArrayFrom(
          eb.selectFrom('task_assignments').select('user_id')
            .whereRef('task_assignments.task_id', '=', 'marketing_tasks.id'),
        ).as('assignments'),
      ])
      .where('id', '=', id)
      .executeTakeFirst()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // For gerente, check if they have access
    if (admin.role === 'gerente') {
      const hasAccess = (task.assignments ?? []).some((a) => a.user_id === admin.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Create comment + retorna com o user embutido
    let comment
    try {
      const inserted = await db.insertInto('task_comments')
        .values({ task_id: id, user_id: admin.id, content: content.trim() })
        .returning('id')
        .executeTakeFirstOrThrow()

      comment = await db.selectFrom('task_comments')
        .selectAll('task_comments')
        .select((eb) => [
          jsonObjectFrom(
            eb.selectFrom('admin_users').select(['admin_users.id', 'admin_users.email', 'admin_users.name'])
              .whereRef('admin_users.id', '=', 'task_comments.user_id'),
          ).as('user'),
        ])
        .where('task_comments.id', '=', inserted.id)
        .executeTakeFirst()
    } catch (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error in comments POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
