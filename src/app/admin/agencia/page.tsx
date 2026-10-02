import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'

/** /admin/agencia sem agência: o usuário de agência vai para a dele; o resto, para o hub. */
export default async function AgenciaIndexPage() {
	const admin = await getCurrentAdmin()
	if (!admin) redirect('/admin/login')
	redirect(admin.role === 'agencia' && admin.agencia ? `/admin/agencia/${admin.agencia.slug}` : '/admin')
}
