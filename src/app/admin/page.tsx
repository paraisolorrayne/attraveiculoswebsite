import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { sectionsForRole } from '@/lib/admin-sections'
import { carregarResumo } from '@/lib/admin-resumo'
import { carregarInicio } from '@/lib/admin-inicio'
import { ROLE_LABELS, isAdminRole, type AdminRole } from '@/lib/auth/roles'
import { AdminHome } from './admin-home'

export const dynamic = 'force-dynamic'

const FUSO = 'America/Sao_Paulo'

export default async function AdminHomePage() {
	const admin = await getCurrentAdmin()
	if (!admin) redirect('/admin/login')

	// Agência não tem hub: a área dela é a única coisa que ela vê.
	if (admin.role === 'agencia') redirect(admin.agencia ? `/admin/agencia/${admin.agencia.slug}` : '/admin/login')

	const role = (isAdminRole(admin.role) ? admin.role : 'gerente') as AdminRole
	// A área da agência (Media House) não entra no menu do time da Attra desde
	// 14/11/2026: a página continua existindo e abre pela URL
	// (/admin/agencia/<slug>) para quem tem acesso.
	const sections = sectionsForRole(role, admin.secoes)

	// O resumo só é carregado se o papel enxerga alguma seção — um perfil sem
	// acesso não deve disparar nove contagens para ver uma tela vazia.
	const [resumo, inicio] =
		sections.length > 0
			? await Promise.all([carregarResumo(), carregarInicio({ id: admin.id, role, secoes: admin.secoes })])
			: [null, null]

	// O horário é o da loja, não o do servidor: "Bom dia" precisa concordar com
	// o relógio de quem está lendo, e a VPS pode estar em UTC.
	const agora = new Date()

	return (
		<AdminHome
			nome={(admin.name || admin.email.split('@')[0]).split(' ')[0]}
			papel={ROLE_LABELS[role]}
			role={role}
			hora={Number(agora.toLocaleString('pt-BR', { hour: 'numeric', hour12: false, timeZone: FUSO }))}
			dia={agora.toLocaleDateString('pt-BR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				timeZone: FUSO,
			})}
			sections={sections}
			resumo={resumo}
			inicio={inicio}
		/>
	)
}
