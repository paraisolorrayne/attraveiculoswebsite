import { getCurrentAdmin, type AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute, isAdminRole, type AdminRole } from './roles'

/**
 * Admin autenticado E com acesso à seção — ou `null`.
 *
 * As rotas de API do admin checavam `admin.role !== 'admin'` na mão, o que
 * ignora as permissões concedidas por usuário. O efeito era uma tela que abre
 * e não carrega: o Eduardo (marketing) recebeu `/admin/visitors` pelas seções
 * extras, a página passou a abrir, e as três chamadas dela devolveram 401
 * porque exigiam o papel `admin`.
 *
 * Passa a valer a MESMA regra da página, e num lugar só, para as duas pontas
 * não voltarem a divergir.
 */
export async function adminComAcessoA(rota: string): Promise<AdminUser | null> {
  const admin = await getCurrentAdmin()
  if (!admin) return null
  const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
  return canAccessRoute(role, rota, admin.secoes) ? admin : null
}
