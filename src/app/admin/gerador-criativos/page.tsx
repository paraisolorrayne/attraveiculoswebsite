import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { GeradorCriativosAdmin } from './gerador-criativos-admin'

export default async function GeradorCriativosPage() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  return <GeradorCriativosAdmin />
}
