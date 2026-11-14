import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/admin-auth'
import { BlogAdmin } from './blog-admin'

export default async function AdminBlogPage() {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect('/admin/login')
  }

  // Os filtros da lista ficam na URL (useSearchParams), que exige Suspense.
  return (
    <Suspense fallback={null}>
      <BlogAdmin />
    </Suspense>
  )
}

