import { NextRequest, NextResponse } from 'next/server'
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Embeds PostgREST (strategy, assignments→user) viraram jsonObjectFrom/jsonArrayFrom.
export const dynamic = 'force-dynamic'

// GET - List all marketing tasks
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    let query = db.selectFrom('marketing_tasks')
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
                eb2.selectFrom('admin_users')
                  .select(['admin_users.id', 'admin_users.email', 'admin_users.name'])
                  .whereRef('admin_users.id', '=', 'task_assignments.user_id'),
              ).as('user'),
            ])
            .whereRef('task_assignments.task_id', '=', 'marketing_tasks.id'),
        ).as('assignments'),
      ])
      .orderBy('created_at', 'desc')

    if (status) query = query.where('status', '=', status)
    if (category) query = query.where('category', '=', category)
    if (priority) query = query.where('priority', '=', priority)

    // For gerente role, filter to only assigned tasks
    if (admin.role === 'gerente') {
      const assignments = await db.selectFrom('task_assignments').select('task_id')
        .where('user_id', '=', admin.id).execute()
      const taskIds = assignments.map(a => a.task_id)
      if (taskIds.length === 0) {
        return NextResponse.json({ tasks: [] })
      }
      query = query.where('id', 'in', taskIds)
    }

    const tasks = await query.execute()

    // Transform: achata assignees a partir de assignments[].user
    const transformedTasks = tasks.map(task => ({
      ...task,
      assignees: (task.assignments ?? []).map((a) => a.user).filter(Boolean),
    }))

    return NextResponse.json({ tasks: transformedTasks })
  } catch (error) {
    console.error('Error in tasks GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new marketing task (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create tasks' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, strategy_id, category, priority, due_date, estimated_hours, assignees } = body

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })
    }

    let task
    try {
      task = await db.insertInto('marketing_tasks').values({
        title,
        description: description || null,
        strategy_id: strategy_id || null,
        category,
        status: 'backlog',
        priority: priority || 'medium',
        due_date: due_date || null,
        estimated_hours: estimated_hours || null,
        actual_hours: null,
        created_by: admin.id,
      }).returningAll().executeTakeFirstOrThrow()
    } catch (taskError) {
      console.error('Error creating task:', taskError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Create assignments if provided
    if (assignees && Array.isArray(assignees) && assignees.length > 0) {
      const assignments = assignees.map((userId: string) => ({
        task_id: task!.id,
        user_id: userId,
        assigned_by: admin.id,
      }))
      try {
        await db.insertInto('task_assignments').values(assignments).execute()
      } catch (assignError) {
        console.error('Error creating assignments:', assignError)
      }
    }

    // Create status history entry
    await db.insertInto('task_status_history').values({
      task_id: task.id,
      old_status: null,
      new_status: 'backlog',
      changed_by: admin.id,
    }).execute()

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error in tasks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
