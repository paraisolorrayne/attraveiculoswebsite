import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'

export default async function GeradorCriativosPage() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  return (
    <iframe
      src="/api/admin/marketing/gerador-criativos"
      title="Gerador de Criativos — Attra Veículos"
      className="w-full border-0 block"
      style={{ height: 'calc(100vh - 4rem)' }}
    />
  )
}
