import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PROVA DE CONCEITO — não é o servidor final.
 *
 * Existe para responder uma pergunta só: **um cliente MCP consegue conectar num
 * route handler do Next 16?** Se não conseguir, o servidor vira processo
 * separado no pm2 e a arquitetura do spec muda antes de qualquer ferramenta de
 * verdade ser escrita.
 *
 * Deliberadamente SEM SDK. A escolha de biblioteca é decisão da fase seguinte;
 * amarrá-la aqui responderia "a biblioteca X roda?" quando a dúvida é se o
 * ambiente serve MCP. Ver docs/superpowers/plans/2026-08-16-camada-semantica-estoque.md,
 * Task 1.
 *
 * RESULTADO DA VERIFICAÇÃO — 16/08/2026
 * Contrato JSON-RPC conferido por HTTP: `initialize` e `tools/list` respondem, e
 * método desconhecido devolve -32601. Conexão com cliente MCP real: PENDENTE —
 * é o passo que o curl não substitui, e o que decide a arquitetura.
 */

interface RequisicaoJsonRpc {
	jsonrpc?: string
	id?: string | number | null
	method?: string
	params?: Record<string, unknown>
}

const VERSAO_DE_PROTOCOLO_PADRAO = '2025-06-18'

export async function POST(request: NextRequest) {
	let corpo: RequisicaoJsonRpc
	try {
		corpo = await request.json()
	} catch {
		// -32700: parse error, conforme JSON-RPC 2.0.
		return Response.json(
			{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } },
			{ status: 400 },
		)
	}

	const id = corpo.id ?? null

	if (corpo.method === 'initialize') {
		const versaoPedida = typeof corpo.params?.protocolVersion === 'string'
			? corpo.params.protocolVersion
			: VERSAO_DE_PROTOCOLO_PADRAO

		return Response.json({
			jsonrpc: '2.0',
			id,
			result: {
				protocolVersion: versaoPedida,
				capabilities: { tools: {} },
				serverInfo: { name: 'attra-estoque', version: '0.0.1' },
			},
		})
	}

	// Notificação do cliente confirmando o handshake. Não leva resposta.
	if (corpo.method === 'notifications/initialized') {
		return new Response(null, { status: 202 })
	}

	if (corpo.method === 'tools/list') {
		return Response.json({
			jsonrpc: '2.0',
			id,
			result: {
				tools: [{
					name: 'ping',
					description: 'Responde pong. Só existe para provar o transporte.',
					inputSchema: { type: 'object', properties: {}, additionalProperties: false },
				}],
			},
		})
	}

	if (corpo.method === 'tools/call' && corpo.params?.name === 'ping') {
		return Response.json({
			jsonrpc: '2.0',
			id,
			result: { content: [{ type: 'text', text: 'pong' }], isError: false },
		})
	}

	return Response.json({
		jsonrpc: '2.0',
		id,
		error: { code: -32601, message: `Método não suportado: ${corpo.method ?? '(ausente)'}` },
	})
}
