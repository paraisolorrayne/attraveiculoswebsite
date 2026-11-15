import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/admin-auth'
import { EngineSoundsAdmin } from './engine-sounds-admin'

export default async function AdminEngineSoundsPage() {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    redirect('/admin/login')
  }

  // Os filtros da lista ficam na URL (useSearchParams pede Suspense).
  return (
    <Suspense fallback={null}>
      <EngineSoundsAdmin />
    </Suspense>
  )
}

