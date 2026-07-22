import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

// GET - Get marketing metrics/analytics
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Tasks (o embed de assignments não era usado no cálculo — removido)
    let tasksQuery = db.selectFrom('marketing_tasks')
      .select(['id', 'status', 'category', 'priority', 'created_at', 'due_date', 'estimated_hours', 'actual_hours'])

    // For gerente, only get assigned tasks
    if (admin.role === 'gerente') {
      const assignments = await db.selectFrom('task_assignments').select('task_id')
        .where('user_id', '=', admin.id).execute()

      const taskIds = assignments.map(a => a.task_id)
      if (taskIds.length === 0) {
        return NextResponse.json({
          metrics: {
            totalTasks: 0,
            byStatus: {},
            byCategory: {},
            byPriority: {},
            completionRate: 0,
            overdueCount: 0,
            avgCompletionTime: 0,
          }
        })
      }
      tasksQuery = tasksQuery.where('id', 'in', taskIds)
    }

    const tasks = await tasksQuery.execute()

    const now = new Date()
    
    // Calculate metrics
    const totalTasks = tasks?.length || 0
    
    const byStatus: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    let completedCount = 0
    let failedCount = 0
    let overdueCount = 0
    let totalEstimatedHours = 0
    let totalActualHours = 0

    tasks?.forEach(task => {
      // Count by status
      byStatus[task.status] = (byStatus[task.status] || 0) + 1
      
      // Count by category
      byCategory[task.category] = (byCategory[task.category] || 0) + 1
      
      // Count by priority
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1
      
      // Count completed/failed
      if (task.status === 'completed') completedCount++
      if (task.status === 'failed') failedCount++
      
      // Count overdue (not completed and past due date)
      if (task.due_date && task.status !== 'completed' && task.status !== 'failed') {
        if (new Date(task.due_date) < now) {
          overdueCount++
        }
      }
      
      // Sum hours
      if (task.estimated_hours) totalEstimatedHours += Number(task.estimated_hours)
      if (task.actual_hours) totalActualHours += Number(task.actual_hours)
    })

    const completionRate = totalTasks > 0 
      ? Math.round((completedCount / totalTasks) * 100) 
      : 0
    
    const successRate = (completedCount + failedCount) > 0
      ? Math.round((completedCount / (completedCount + failedCount)) * 100)
      : 0

    // Get recent status changes for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentHistory = await db.selectFrom('task_status_history')
      .select(['new_status', 'changed_at'])
      .where('changed_at', '>=', thirtyDaysAgo)
      .where('new_status', '=', 'completed')
      .execute()

    const completionsLast30Days = recentHistory.length

    return NextResponse.json({
      metrics: {
        totalTasks,
        byStatus,
        byCategory,
        byPriority,
        completionRate,
        successRate,
        overdueCount,
        completionsLast30Days,
        totalEstimatedHours,
        totalActualHours,
        hoursEfficiency: totalEstimatedHours > 0 
          ? Math.round((totalActualHours / totalEstimatedHours) * 100) 
          : 0,
      }
    })
  } catch (error) {
    console.error('Error in metrics GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

