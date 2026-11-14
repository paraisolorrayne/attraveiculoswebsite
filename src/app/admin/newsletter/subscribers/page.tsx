'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { SubscribersAdmin } from './subscribers-admin'

export default function SubscribersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SubscribersAdmin />
    </Suspense>
  )
}

