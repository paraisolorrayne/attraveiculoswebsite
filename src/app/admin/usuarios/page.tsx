import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { UsuariosAdmin } from './usuarios-admin'

export default async function AdminUsuariosPage() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }
  if (admin.role !== 'admin') {
    redirect('/admin/engine-sounds')
  }

  // Os filtros da lista ficam na URL (useSearchParams pede Suspense).
  return (
    <Suspense fallback={null}>
      <UsuariosAdmin currentAdminId={admin.id} />
    </Suspense>
  )
}
