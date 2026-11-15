import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { MarketingAdmin } from './marketing-admin'

export default async function AdminMarketingPage() {
  const admin = await getCurrentAdmin()
  
  if (!admin) {
    redirect('/admin/login')
  }

  // Suspense: a visão e os filtros ficam na URL (useSearchParams).
  return (
    <Suspense fallback={null}>
      <MarketingAdmin admin={admin} />
    </Suspense>
  )
}

