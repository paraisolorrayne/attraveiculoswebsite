'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, User, UserPlus, KeyRound, Loader2, Power } from 'lucide-react'

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'gerente'
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Marketing',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function UsuariosAdmin({ currentAdminId }: { currentAdminId: string }) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // formulário de criação
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'gerente'>('gerente')
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users')
      const d = await r.json()
      if (r.ok) setUsers(d.users || [])
      else setFeedback({ ok: false, msg: d.error || 'Falha ao carregar usuários' })
    } catch {
      setFeedback({ ok: false, msg: 'Falha ao carregar usuários' })
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
      setFeedback({ ok: false, msg: 'Erro de rede — tente novamente' })
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
      body: JSON.stringify({ email, name, role, password }),
    }, `Usuário ${email} criado`)
    if (ok) {
      setEmail(''); setName(''); setPassword(''); setRole('gerente'); setShowForm(false)
    }
  }

  async function toggleActive(u: AdminUserRow) {
    await callApi(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !u.is_active }),
    }, `${u.email} ${u.is_active ? 'desativado' : 'reativado'}`)
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários do Admin</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Quem acessa o painel e com qual papel
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

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
              <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'gerente')}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                <option value="gerente">Marketing (funções básicas)</option>
                <option value="admin">Administrador (acesso total)</option>
              </select>
            </div>
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

      <div className="bg-background-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-foreground-secondary">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground-secondary uppercase">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3 hidden sm:table-cell">Último login</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
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
                    </span>
                    {!u.is_active && <span className="ml-2 text-xs text-red-500">inativo</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-foreground-secondary">
                    {formatDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => resetPassword(u)} disabled={busy}
                        title="Redefinir senha"
                        className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background transition-colors disabled:opacity-50">
                        <KeyRound className="w-4 h-4" />
                      </button>
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
        )}
      </div>

      <p className="mt-4 text-xs text-foreground-secondary">
        Contas usam e-mail + senha (Supabase Auth). &quot;Marketing&quot; acessa Sons de Motor,
        Criativos, Blog e as próprias tarefas de Marketing. Não é possível desativar o
        último administrador ativo.
      </p>
    </div>
  )
}
