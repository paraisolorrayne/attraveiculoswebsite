import { describe, it, expect } from 'vitest'
import { canAccessRoute, type SecoesExtras } from '../auth/roles'

/**
 * As exceções por usuário eram avaliadas no layout do admin, mas o middleware
 * chamava `canAccessRoute` com dois argumentos e barrava a rota ANTES — então
 * conceder uma seção na tela de usuários não surtia efeito nenhum para rota
 * fora da matriz do papel. Foi o que travou o Eduardo (marketing) fora de
 * /admin/visitors mesmo com a permissão gravada no banco.
 *
 * Estes testes fixam o contrato dos dois lados: com as seções, concede; sem
 * elas, nega — de modo que qualquer chamada que "esqueça" o terceiro argumento
 * quebre aqui em vez de em produção.
 */
describe('exceções de acesso por usuário', () => {
  const doEduardo: SecoesExtras = {
    '/admin/visitors': true,
    '/admin/marketing': true,
    '/admin/gerador-criativos': true,
  }

  it('concede a seção que o papel não teria', () => {
    expect(canAccessRoute('marketing', '/admin/visitors', doEduardo)).toBe(true)
  })

  it('sem as seções, a mesma rota é negada — o bug que o middleware tinha', () => {
    expect(canAccessRoute('marketing', '/admin/visitors')).toBe(false)
  })

  it('revoga uma seção que o papel teria', () => {
    expect(canAccessRoute('marketing', '/admin/blog', { '/admin/blog': false })).toBe(false)
    expect(canAccessRoute('marketing', '/admin/blog')).toBe(true)
  })

  it('gestão de usuários continua imune a exceção', () => {
    expect(canAccessRoute('marketing', '/admin/usuarios', { '/admin/usuarios': true })).toBe(false)
    expect(canAccessRoute('owner', '/admin/usuarios', { '/admin/usuarios': true })).toBe(false)
  })

  it('admin não é afetado por exceção que tente trancá-lo para fora', () => {
    expect(canAccessRoute('admin', '/admin/visitors', { '/admin/visitors': false })).toBe(true)
  })

  it('o prefixo mais específico ganha do mais genérico', () => {
    const secoes: SecoesExtras = { '/admin/blog': false, '/admin/blog/novo': true }
    expect(canAccessRoute('marketing', '/admin/blog/novo', secoes)).toBe(true)
    expect(canAccessRoute('marketing', '/admin/blog', secoes)).toBe(false)
  })
})
