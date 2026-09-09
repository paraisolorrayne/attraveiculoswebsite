import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'
import { mudancasCrm, podeEditarCrm, validarEdicaoCrm } from '@/lib/crm-edicao'
import { configuracaoRetornoCrm, entregarRetornosCrm } from '@/lib/crm-retorno'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const admin = await getCurrentAdmin()
	if (!admin) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
	if (!podeEditarCrm(admin.role)) return NextResponse.json({ error: 'Sem permissão para editar o CRM.' }, { status: 403 })
	// Atrás do Nginx, a URL interna pode ser localhost. A origem pública vem
	// da configuração confiável, não de um header fornecido pelo chamador.
	const origemPublica = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin
	if (request.headers.get('origin') && request.headers.get('origin') !== origemPublica) {
		return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 })
	}
	let edicao
	try { edicao = validarEdicaoCrm(await request.json()) } catch (error) {
		return NextResponse.json({ error: error instanceof SyntaxError ? 'JSON inválido.' : (error as Error).message }, { status: 400 })
	}
	if (!configuracaoRetornoCrm()) {
		return NextResponse.json({ error: 'O retorno ao sistema precisa ser configurado antes de editar os cards.' }, { status: 503 })
	}
	const { id } = await params
	try {
		const resultado = await db.transaction().execute(async trx => {
			const atual = await trx.selectFrom('crm_cards').selectAll().where('id', '=', id).forUpdate().executeTakeFirst()
			if (!atual) return { error: 'Card não encontrado.', status: 404 } as const
			if (new Date(atual.atualizado_em).getTime() !== Date.parse(edicao.atualizado_em)) {
				return { error: 'Este card recebeu outra atualização. Feche os detalhes, atualize o quadro e tente novamente.', status: 409 } as const
			}
			// Monotônico mesmo se o emissor tiver enviado um timestamp adiantado.
			const agora = new Date(Math.max(Date.now(), new Date(atual.atualizado_em).getTime() + 1))
			let mudancas
			try { mudancas = mudancasCrm(atual, edicao, agora) } catch (error) {
				return { error: (error as Error).message, status: 400 } as const
			}
			if (!mudancas) return { card: atual, eventoId: null }
			const card = await trx.updateTable('crm_cards').set(mudancas).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
			const eventoId = randomUUID()
			// `dados` contém extras recebidos. No retorno só vão as limpezas legadas
			// necessárias, sem reenviar metadados pessoais ou sobrescrever extras.
			const { dados: _dados, ...alteracoes } = mudancas
			void _dados
			const anterior = Object.fromEntries(Object.keys(alteracoes).map(k => [k, atual[k as keyof typeof atual]]))
			const corpo = JSON.stringify({
				versao: 1, evento: 'crm.card.atualizado', origem: 'site_attra', evento_id: eventoId,
				card_id: id, ocorrido_em: agora.toISOString(), base_atualizado_em: atual.atualizado_em,
				autor: { id: admin.id, nome: admin.name, email: admin.email, papel: admin.role },
				anterior, alteracoes,
			})
			await trx.insertInto('crm_eventos_saida').values({ id: eventoId, card_id: id, corpo, entregue_em: null, ultimo_erro: null }).execute()
			return { card, eventoId }
		})
		if ('error' in resultado) return NextResponse.json({ error: resultado.error }, { status: resultado.status })
		let sincronizacao = 'sem_alteracao'
		if (resultado.eventoId) {
			sincronizacao = 'pendente'
			try {
				if (await entregarRetornosCrm(1, resultado.eventoId)) sincronizacao = 'enviado'
			} catch { console.error('[CRM] Retorno pendente; a fila tentará novamente.') }
		}
		return NextResponse.json({ card: resultado.card, sincronizacao })
	} catch {
		console.error('[CRM] Falha ao gravar alteração e evento de retorno.')
		return NextResponse.json({ error: 'Não foi possível salvar a alteração. Atualize o quadro antes de tentar novamente.' }, { status: 500 })
	}
}
