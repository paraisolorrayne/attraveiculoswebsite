import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Ingestão do CRM: o Fykos empurra o estado dos leads para cá e o painel
// exibe em modo somente leitura (nenhuma ação manual no admin).
//
// Auth: header X-Webhook-Secret = FYKOS_CRM_SECRET (env).
// Config: defina FYKOS_CRM_SECRET no `.env.local` (arquivo gitignored —
// não versionado de propósito, NUNCA commitar o valor) e no ambiente de
// produção. Sem a env configurada, o webhook responde 500 e nada é gravado.
//
// Etapas fixas do funil (contrato com o backend Python/Fykos):
//   aguardando_vendedor | em_atendimento | sem_atualizacao |
//   encerrado_sucesso | encerrado_perdido
// Extras esperados no JSONB `dados` (exibidos no modal de detalhes do admin):
//   atribuido_em, encerrado_em, observacoes_alerta,
//   ultima_resposta_vendedor: { texto, em }
//
// Payload aceito (um objeto ou lista em `cards`):
//   { "id": "123", "etapa": "negociacao", "nome": "...", "telefone": "...",
//     "email": "...", "veiculo": "...", "valor": 929000, "origem": "...",
//     "vendedor": "...", ...extras }
// Campos extras são preservados em `dados`. Para remover cards:
//   { "remover": ["id1", "id2"] }

interface CardIn {
  id: string | number
  etapa?: string
  nome?: string
  telefone?: string
  email?: string
  veiculo?: string
  valor?: number | string
  origem?: string
  vendedor?: string
  [k: string]: unknown
}

export async function POST(request: NextRequest) {
  const secret = process.env.FYKOS_CRM_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'FYKOS_CRM_SECRET não configurada no servidor' }, { status: 500 })
  }
  if (request.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const agora = new Date().toISOString()

  // Remoções (lead saiu do funil no Fykos)
  const remover = Array.isArray(body.remover) ? body.remover.map(String) : []
  if (remover.length > 0) {
    const { error } = await supabase.from('crm_cards').delete().in('id', remover)
    if (error) {
      return NextResponse.json({ error: `Falha ao remover: ${error.message}` }, { status: 500 })
    }
  }

  // Upserts
  const lista: CardIn[] = Array.isArray(body.cards)
    ? (body.cards as CardIn[])
    : (body.id !== undefined ? [body as unknown as CardIn] : [])

  const invalidos = lista.filter(c => c.id === undefined || c.id === null || !c.etapa)
  if (invalidos.length > 0) {
    return NextResponse.json({ error: 'Todo card precisa de id e etapa' }, { status: 400 })
  }

  if (lista.length > 0) {
    const rows = lista.map(c => {
      const { id, etapa, nome, telefone, email, veiculo, valor, origem, vendedor, ...extras } = c
      return {
        id: String(id),
        etapa: String(etapa),
        nome: nome ?? null,
        telefone: telefone ?? null,
        email: email ?? null,
        veiculo: veiculo ?? null,
        valor: valor !== undefined && valor !== null && valor !== '' ? Number(valor) : null,
        origem: origem ?? null,
        vendedor: vendedor ?? null,
        dados: Object.keys(extras).length > 0 ? extras : null,
        atualizado_em: agora,
      }
    })
    const { error } = await supabase.from('crm_cards').upsert(rows as never, { onConflict: 'id' })
    if (error) {
      return NextResponse.json({ error: `Falha no upsert: ${error.message}` }, { status: 500 })
    }
  }

  console.log(`[FykosCRM] upserts=${lista.length} remoções=${remover.length}`)
  return NextResponse.json({ success: true, upserts: lista.length, remocoes: remover.length })
}
