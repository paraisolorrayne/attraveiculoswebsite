import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { CrmAdmin } from './crm-admin'

export default async function AdminCrmPage() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }
  if (!['admin', 'owner'].includes(admin.role)) {
    redirect('/admin/engine-sounds')
  }

  return <CrmAdmin />
}
