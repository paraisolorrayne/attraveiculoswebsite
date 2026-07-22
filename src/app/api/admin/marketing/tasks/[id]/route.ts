import { NextRequest, NextResponse } from 'next/server'
import type { Updateable } from 'kysely'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Embeds PostgREST (strategy, assignments→user, comments→user,
// history→changed_by_user) viraram jsonObjectFrom/jsonArrayFrom.
export const dynamic = 'force-dynamic'

// GET - Get single task with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const task = await db.selectFrom('marketing_tasks')
      .selectAll('marketing_tasks')
      .select((eb) => [
        jsonObjectFrom(
          eb.selectFrom('marketing_strategies')
            .select(['marketing_strategies.id', 'marketing_strategies.name', 'marketing_strategies.category'])
            .whereRef('marketing_strategies.id', '=', 'marketing_tasks.strategy_id'),
        ).as('strategy'),
        jsonArrayFrom(
          eb.selectFrom('task_assignments')
            .select(['task_assignments.id', 'task_assignments.user_id'])
            .select((eb2) => [
              jsonObjectFrom(
                eb2.selectFrom('admin_users').select(['admin_users.id', 'admin_users.email', 'admin_users.name'])
                  .whereRef('admin_users.id', '=', 'task_assignments.user_id'),
              ).as('user'),
            ])
            .whereRef('task_assignments.task_id', '=', 'marketing_tasks.id'),
        ).as('assignments'),
        jsonArrayFrom(
          eb.selectFrom('task_comments')
            .select(['task_comments.id', 'task_comments.content', 'task_comments.created_at'])
            .select((eb2) => [
              jsonObjectFrom(
                eb2.selectFrom('admin_users').select(['admin_users.id', 'admin_users.email', 'admin_users.name'])
                  .whereRef('admin_users.id', '=', 'task_comments.user_id'),
              ).as('user'),
            ])
            .whereRef('task_comments.task_id', '=', 'marketing_tasks.id')
            .orderBy('task_comments.created_at', 'desc'),
        ).as('comments'),
        jsonArrayFrom(
          eb.selectFrom('task_status_history')
            .select(['task_status_history.id', 'task_status_history.old_status', 'task_status_history.new_status', 'task_status_history.changed_at'])
            .select((eb2) => [
              jsonObjectFrom(
                eb2.selectFrom('admin_users').select(['admin_users.id', 'admin_users.email', 'admin_users.name'])
                  .whereRef('admin_users.id', '=', 'task_status_history.changed_by'),
              ).as('changed_by_user'),
            ])
            .whereRef('task_status_history.task_id', '=', 'marketing_tasks.id')
            .orderBy('task_status_history.changed_at', 'desc'),
        ).as('history'),
      ])
      .where('marketing_tasks.id', '=', id)
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

    const transformedTask = {
      ...task,
      assignees: (task.assignments ?? []).map((a) => a.user).filter(Boolean),
    }

    return NextResponse.json({ task: transformedTask })
  } catch (error) {
    console.error('Error in task GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update task
export async function PATCH(
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

    // Get current task (status + user_ids das assignments pro gate do gerente)
    const currentTask = await db.selectFrom('marketing_tasks')
      .select('status')
      .select((eb) => [
        jsonArrayFrom(
          eb.selectFrom('task_assignments').select('user_id')
            .whereRef('task_assignments.task_id', '=', 'marketing_tasks.id'),
        ).as('assignments'),
      ])
      .where('id', '=', id)
      .executeTakeFirst()

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check access for gerente
    if (admin.role === 'gerente') {
      const hasAccess = (currentTask.assignments ?? []).some((a) => a.user_id === admin.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      const allowedFields = ['status', 'actual_hours']
      const hasDisallowed = Object.keys(body).some(k => !allowedFields.includes(k))
      if (hasDisallowed) {
        return NextResponse.json({ error: 'You can only update status and hours' }, { status: 403 })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    const allowedUpdateFields = ['title', 'description', 'strategy_id', 'category', 'status', 'priority', 'due_date', 'estimated_hours', 'actual_hours']
    for (const field of allowedUpdateFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    let task
    try {
      task = await db.updateTable('marketing_tasks')
        .set(updateData as Updateable<Database['marketing_tasks']>)
        .where('id', '=', id).returningAll().executeTakeFirst()
    } catch (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    // If status changed, create history entry
    if (body.status && body.status !== currentTask.status) {
      await db.insertInto('task_status_history').values({
        task_id: id,
        old_status: currentTask.status,
        new_status: body.status,
        changed_by: admin.id,
      }).execute()
    }

    // Update assignees if provided (admin only)
    if (admin.role === 'admin' && body.assignees !== undefined) {
      await db.deleteFrom('task_assignments').where('task_id', '=', id).execute()

      if (Array.isArray(body.assignees) && body.assignees.length > 0) {
        const assignments = body.assignees.map((userId: string) => ({
          task_id: id,
          user_id: userId,
          assigned_by: admin.id,
        }))
        await db.insertInto('task_assignments').values(assignments).execute()
      }
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error in task PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
