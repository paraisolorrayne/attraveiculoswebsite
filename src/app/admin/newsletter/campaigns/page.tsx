'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { CampaignsAdmin } from './campaigns-admin'

export default function CampaignsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <CampaignsAdmin />
      </div>
    </Suspense>
  )
}

