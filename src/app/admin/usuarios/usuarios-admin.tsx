'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Shield, User, UserPlus, KeyRound, Loader2, Power, SlidersHorizontal, ArrowDown, ArrowUp, ArrowUpDown, Users } from 'lucide-react'
import { ADMIN_ROLES, ROLE_LABELS, canAccessRoute, AREAS_SO_ADMIN, type AdminRole, type SecoesExtras } from '@/lib/auth/roles'
import { ADMIN_SECTIONS } from '@/lib/admin-sections'
import { CabecalhoPagina } from '@/components/admin/cabecalho-pagina'
import {
  BarraDeFiltros, BotaoSecundario, CampoBusca, EstadoErro, EstadoVazio,
  ResumoDosFiltros, SeletorFiltro, useFiltrosUrl, type FiltroLigado,
} from '@/components/admin/filtros'
import { termosDaBusca } from '@/lib/crm-busca'

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  role: AdminRole
  is_active: boolean
  last_login_at: string | null
  ultimo_acesso_em: string | null
  created_at: string
  secoes_extras?: SecoesExtras | null
  agencia_id?: string | null
}

// Rótulos vêm da fonte única de papéis; a lista antiga só conhecia dois dos
// cinco papéis reais e rebaixava quem fosse editado por esta tela.
const roleLabels = ROLE_LABELS

// Filtros e ordenação da lista, guardados na URL. Sem `ordem`, vale a ordem em
// que a API devolve (data de criação da conta).
const CHAVES_FILTRO = ['q', 'papel', 'situacao', 'ordem', 'dir'] as const
type ColunaOrdem = 'nome' | 'papel' | 'acesso'

const OPCOES_PAPEL = ADMIN_ROLES.map(r => ({ valor: r, rotulo: ROLE_LABELS[r] }))
const OPCOES_SITUACAO = [
  { valor: 'ativo', rotulo: 'Ativos' },
  { valor: 'inativo', rotulo: 'Inativos' },
] as const

/** Cabeçalho de coluna clicável: alterna crescente/decrescente e mostra a seta. */
function ThOrdenavel({
  coluna, rotulo, ordem, dir, aoOrdenar, className = '',
}: {
  coluna: ColunaOrdem
  rotulo: string
  ordem: string
  dir: string
  aoOrdenar: (c: ColunaOrdem) => void
  className?: string
}) {
  const ativa = ordem === coluna
  const Seta = !ativa ? ArrowUpDown : dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <th className={`px-4 ${className}`} aria-sort={ativa ? (dir === 'desc' ? 'descending' : 'ascending') : undefined}>
      <button type="button" onClick={() => aoOrdenar(coluna)}
        className={`flex min-h-10 items-center gap-1.5 uppercase hover:text-foreground ${ativa ? 'text-foreground' : ''}`}>
        {rotulo}
        <Seta className={`w-3.5 h-3.5 ${ativa ? '' : 'opacity-50'}`} />
      </button>
    </th>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    // Fuso da loja, como o resto do painel: sem isto a data mudava com o fuso do navegador.
    timeZone: 'America/Sao_Paulo',
  })
}

export function UsuariosAdmin({ currentAdminId }: { currentAdminId: string }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const { valores: filtro, definir } = useFiltrosUrl(CHAVES_FILTRO)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // formulário de criação
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminRole>('marketing')
  // Só para o papel "Agência": a qual agência o usuário pertence.
  const [agenciaId, setAgenciaId] = useState('')
  const [agencias, setAgencias] = useState<{ id: string; nome: string }[]>([])
  const [editandoPermissoes, setEditandoPermissoes] = useState<AdminUserRow | null>(null)
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErroCarga(null)
    try {
      const r = await fetch('/api/admin/users')
      const d = await r.json()
      if (r.ok) {
        setUsers(d.users || [])
        setAgencias(d.agencias || [])
      }
      // Falha de carga fica no lugar da lista, com "Tentar de novo" (antes era
      // um aviso em cima de uma tabela vazia).
      else setErroCarga(d.error || 'Falha ao carregar usuários')
    } catch {
      setErroCarga('Falha ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function callApi(input: RequestInfo, init: RequestInit, okMsg: string) {
    setBusy(true)
    setFeedback(null)
    try {
      const r = await fetch(input, init)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setFeedback({ ok: false, msg: d.message || d.error || `Falha (HTTP ${r.status})` })
        return false
      }
      setFeedback({ ok: true, msg: okMsg })
      await load()
      return true
    } catch {
      setFeedback({ ok: false, msg: 'Erro de rede. Tente novamente' })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const ok = await callApi('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, password, ...(role === 'agencia' ? { agencia_id: agenciaId } : {}) }),
    }, `Usuário ${email} criado`)
    if (ok) {
      setEmail(''); setName(''); setPassword(''); setRole('marketing'); setAgenciaId(''); setShowForm(false)
    }
  }

  async function toggleActive(u: AdminUserRow) {
    await callApi(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !u.is_active }),
    }, `${u.email} ${u.is_active ? 'desativado' : 'reativado'}`)
  }

  async function salvarPermissoes(u: AdminUserRow, secoes: SecoesExtras) {
    await callApi(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secoes_extras: secoes }),
    }, `Permissões de ${u.email} atualizadas`)
    setEditandoPermissoes(null)
  }

  async function resetPassword(u: AdminUserRow) {
    const nova = window.prompt(`Nova senha para ${u.email} (mínimo 8 caracteres):`)
    if (!nova) return
    await callApi(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nova }),
    }, `Senha de ${u.email} redefinida`)
  }

  // Busca por nome ou e-mail (sem acento, todas as palavras), papel, situação e
  // ordenação, tudo sobre a lista inteira que a API devolve.
  const visiveis = useMemo(() => {
    const termos = termosDaBusca(filtro.q)
    const lista = users.filter(u => {
      if (filtro.papel && u.role !== filtro.papel) return false
      if (filtro.situacao === 'ativo' && !u.is_active) return false
      if (filtro.situacao === 'inativo' && u.is_active) return false
      if (termos.length === 0) return true
      const alvo = termosDaBusca(`${u.name ?? ''} ${u.email}`).join(' ')
      return termos.every(t => alvo.includes(t))
    })
    const sinal = filtro.dir === 'desc' ? -1 : 1
    const nome = (u: AdminUserRow) => u.name || u.email
    if (filtro.ordem === 'nome') {
      lista.sort((a, b) => sinal * nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }))
    } else if (filtro.ordem === 'papel') {
      lista.sort((a, b) =>
        sinal * ROLE_LABELS[a.role].localeCompare(ROLE_LABELS[b.role], 'pt-BR') ||
        nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }))
    } else if (filtro.ordem === 'acesso') {
      // Quem nunca acessou fica sempre no fim, nas duas direções.
      lista.sort((a, b) => {
        const ta = a.ultimo_acesso_em ? new Date(a.ultimo_acesso_em).getTime() : null
        const tb = b.ultimo_acesso_em ? new Date(b.ultimo_acesso_em).getTime() : null
        if (ta === null && tb === null) return 0
        if (ta === null) return 1
        if (tb === null) return -1
        return sinal * (ta - tb)
      })
    }
    return lista
  }, [users, filtro.q, filtro.papel, filtro.situacao, filtro.ordem, filtro.dir])

  // Clique no cabeçalho: mesma coluna inverte; coluna nova começa crescente
  // (último acesso começa pelo mais recente).
  const ordenarPor = (coluna: ColunaOrdem) => {
    if (filtro.ordem === coluna) definir({ dir: filtro.dir === 'desc' ? 'asc' : 'desc' })
    else definir({ ordem: coluna, dir: coluna === 'acesso' ? 'desc' : 'asc' })
  }

  // A ordenação não é filtro: não vira etiqueta nem é desfeita pelo "Limpar filtros".
  const limparFiltros = () => definir({ q: '', papel: '', situacao: '' })
  const filtrosLigados: FiltroLigado[] = []
  if (filtro.q) filtrosLigados.push({ rotulo: `Busca: ${filtro.q}`, aoRemover: () => definir({ q: '' }) })
  if (filtro.papel) {
    const rotulo = (ROLE_LABELS as Record<string, string>)[filtro.papel] ?? filtro.papel
    filtrosLigados.push({ rotulo: `Papel: ${rotulo}`, aoRemover: () => definir({ papel: '' }) })
  }
  if (filtro.situacao) {
    const rotulo = OPCOES_SITUACAO.find(o => o.valor === filtro.situacao)?.rotulo ?? filtro.situacao
    filtrosLigados.push({ rotulo: `Situação: ${rotulo}`, aoRemover: () => definir({ situacao: '' }) })
  }

  return (
    <>
    <CabecalhoPagina
      titulo="Usuários"
      descricao="Quem acessa o painel e com qual papel"
      acoes={
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex min-h-10 items-center gap-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Novo usuário
        </button>
      }
    />
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${feedback.ok
          ? 'bg-green-500/10 text-green-600 border border-green-500/30'
          : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
          {feedback.msg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-5 bg-background-card border border-border rounded-xl space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">Nome</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">Papel</label>
              <select value={role} onChange={e => setRole(e.target.value as AdminRole)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                {ADMIN_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            {role === 'agencia' && (
              <div>
                <label className="block text-xs font-medium text-foreground-secondary mb-1">Agência</label>
                <select required value={agenciaId} onChange={e => setAgenciaId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                  <option value="">Escolha…</option>
                  {agencias.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-foreground-secondary">Este usuário só verá a área desta agência.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1">Senha inicial (mín. 8)</label>
              <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Peça para trocar no 1º acesso"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground" />
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar usuário
          </button>
        </form>
      )}

      <div className="mb-4 space-y-3">
        <BarraDeFiltros>
          <CampoBusca valor={filtro.q} aoMudar={v => definir({ q: v })} placeholder="Buscar por nome ou e-mail" />
          <SeletorFiltro rotulo="Papel" valor={filtro.papel} aoMudar={v => definir({ papel: v })} opcoes={OPCOES_PAPEL} />
          <SeletorFiltro rotulo="Situação" valor={filtro.situacao} aoMudar={v => definir({ situacao: v })} opcoes={OPCOES_SITUACAO} />
        </BarraDeFiltros>
        {!loading && !erroCarga && users.length > 0 && (
          <ResumoDosFiltros total={users.length} mostrando={visiveis.length}
            nome={['usuário', 'usuários']} filtros={filtrosLigados} aoLimpar={limparFiltros} />
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-foreground-secondary">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      ) : erroCarga ? (
        <EstadoErro texto={erroCarga} aoTentar={load} />
      ) : users.length === 0 ? (
        <EstadoVazio
          Icon={Users}
          titulo="Nenhum usuário cadastrado"
          acao={<BotaoSecundario onClick={() => setShowForm(true)}><UserPlus className="w-4 h-4" />Novo usuário</BotaoSecundario>}
        />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          Icon={Users}
          titulo="Nenhum usuário com esses filtros"
          texto="Mude a busca, o papel ou a situação para ver outros usuários."
          acao={<BotaoSecundario onClick={limparFiltros}>Limpar filtros</BotaoSecundario>}
        />
      ) : (
        <div className="bg-background-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground-secondary uppercase">
                <ThOrdenavel coluna="nome" rotulo="Usuário" ordem={filtro.ordem} dir={filtro.dir} aoOrdenar={ordenarPor} />
                <ThOrdenavel coluna="papel" rotulo="Papel" ordem={filtro.ordem} dir={filtro.dir} aoOrdenar={ordenarPor} />
                <ThOrdenavel coluna="acesso" rotulo="Último acesso" ordem={filtro.ordem} dir={filtro.dir} aoOrdenar={ordenarPor} className="hidden sm:table-cell" />
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(u => (
                <tr key={u.id} className={`border-b border-border last:border-0 ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.name || u.email}</div>
                    <div className="text-xs text-foreground-secondary">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs
                      ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {roleLabels[u.role]}
                      {u.role === 'agencia' && u.agencia_id && (
                        <> · {agencias.find(a => a.id === u.agencia_id)?.nome ?? 'agência'}</>
                      )}
                    </span>
                    {!u.is_active && <span className="ml-2 text-xs text-red-500">inativo</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-foreground-secondary">
                    {/* Acesso = última visita ao painel; login = última vez que digitou a senha. */}
                    <div className="text-foreground">{formatDate(u.ultimo_acesso_em)}</div>
                    <div className="text-xs">login: {formatDate(u.last_login_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => resetPassword(u)} disabled={busy}
                        title="Redefinir senha"
                        className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background transition-colors disabled:opacity-50">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      {u.id !== currentAdminId && u.role !== 'admin' && u.role !== 'agencia' && (
                        <button onClick={() => setEditandoPermissoes(u)} disabled={busy}
                          title="Editar acesso às seções"
                          className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background transition-colors disabled:opacity-50">
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      )}
                      {u.id !== currentAdminId && (
                        <button onClick={() => toggleActive(u)} disabled={busy}
                          title={u.is_active ? 'Desativar' : 'Reativar'}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${u.is_active
                            ? 'text-red-500 hover:bg-red-500/10'
                            : 'text-green-600 hover:bg-green-500/10'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-foreground-secondary">
        Contas usam e-mail + senha. O papel define o acesso padrão; use o botão de
        permissões para liberar ou bloquear seções de uma pessoa específica sem
        mudar o papel dela. Não é possível desativar o último administrador ativo.
      </p>

      {editandoPermissoes && (
        <PainelPermissoes
          usuario={editandoPermissoes}
          busy={busy}
          onFechar={() => setEditandoPermissoes(null)}
          onSalvar={secoes => salvarPermissoes(editandoPermissoes, secoes)}
        />
      )}
    </div>
    </>
  )
}

/**
 * Edição das exceções de acesso de UMA pessoa.
 *
 * Cada seção tem três estados: seguir o padrão do papel, liberar ou bloquear.
 * O padrão é mostrado com o que ele significa na prática ("padrão: liberado" /
 * "padrão: sem acesso") para o admin não precisar decorar a matriz de papéis.
 * A gestão de usuários aparece somente-leitura: nenhuma exceção a concede.
 */
function PainelPermissoes({
	usuario,
	busy,
	onFechar,
	onSalvar,
}: {
	usuario: AdminUserRow
	busy: boolean
	onFechar: () => void
	onSalvar: (secoes: SecoesExtras) => void
}) {
	const [secoes, setSecoes] = useState<SecoesExtras>(usuario.secoes_extras ?? {})

	const definir = (href: string, valor: 'padrao' | 'liberar' | 'bloquear') => {
		setSecoes(atual => {
			const proximo = { ...atual }
			if (valor === 'padrao') delete proximo[href]
			else proximo[href] = valor === 'liberar'
			return proximo
		})
	}

	const estado = (href: string): 'padrao' | 'liberar' | 'bloquear' => {
		if (!(href in secoes)) return 'padrao'
		return secoes[href] ? 'liberar' : 'bloquear'
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onFechar}>
			<div
				className="bg-background-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
				onClick={e => e.stopPropagation()}
			>
				<div className="p-4 border-b border-border">
					<h2 className="text-lg font-semibold text-foreground">Acesso de {usuario.name || usuario.email}</h2>
					<p className="text-xs text-foreground-secondary mt-1">
						Papel atual: {ROLE_LABELS[usuario.role]}. As exceções abaixo valem só para esta pessoa.
					</p>
				</div>

				<div className="p-4 overflow-y-auto space-y-2">
					{ADMIN_SECTIONS.map(secao => {
						const soAdmin = AREAS_SO_ADMIN.some(p => secao.href.startsWith(p))
						const padraoLibera = canAccessRoute(usuario.role, secao.href)
						const atual = estado(secao.href)
						return (
							<div key={secao.href} className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
								<div className="min-w-0">
									<div className="text-sm text-foreground truncate">{secao.label}</div>
									<div className="text-xs text-foreground-secondary">
										{soAdmin
											? 'Exclusivo do Administrador'
											: `Padrão do papel: ${padraoLibera ? 'liberado' : 'sem acesso'}`}
									</div>
								</div>
								{soAdmin ? (
									<span className="text-xs text-foreground-secondary whitespace-nowrap">—</span>
								) : (
									<div className="flex gap-1 flex-shrink-0">
										{([
											['padrao', 'Padrão'],
											['liberar', 'Liberar'],
											['bloquear', 'Bloquear'],
										] as const).map(([valor, rotulo]) => (
											<button
												key={valor}
												type="button"
												onClick={() => definir(secao.href, valor)}
												className={`px-2 py-1 rounded-md text-xs border transition-colors ${
													atual === valor
														? valor === 'liberar'
															? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/40'
															: valor === 'bloquear'
																? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40'
																: 'bg-background text-foreground border-foreground-secondary/40'
														: 'border-border text-foreground-secondary hover:text-foreground'
												}`}
											>
												{rotulo}
											</button>
										))}
									</div>
								)}
							</div>
						)
					})}
				</div>

				<div className="p-4 border-t border-border flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onFechar}
						className="px-4 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground transition-colors"
					>
						Cancelar
					</button>
					<button
						type="button"
						disabled={busy}
						onClick={() => onSalvar(secoes)}
						className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						Salvar
					</button>
				</div>
			</div>
		</div>
	)
}
