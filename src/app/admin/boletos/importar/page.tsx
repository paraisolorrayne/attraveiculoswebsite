import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { ImportarPlanilha } from './importar-planilha'

export default async function ImportarBoletosPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  if (!canAccessRoute(admin.role, '/admin/boletos', admin.secoes)) redirect('/admin')
  return <ImportarPlanilha />
}
