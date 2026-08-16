import { GEMINI_TEXT_MODEL } from '@/lib/gemini-config'
import { NOME_DO_ROTULO, prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

/** Troca o código do rótulo (ex.: 'familia') pelo nome legível (ex.: 'família'). */
function legivel(rotulos: readonly string[]): string {
	return rotulos.map(r => NOME_DO_ROTULO[r] ?? r).join(', ')
}

export interface VeiculoParaProsa {
	brand?: string | null
	model?: string | null
	year_model?: number | null
	body_type?: string | null
	mileage?: number | null
}

/**
 * O prompt pede prosa seca — mas a defesa de verdade é a validação da saída.
 * Prompt é pedido; `prosaEhAceitavel` é regra. Um modelo que ignora a
 * instrução tem a resposta descartada, não corrigida.
 */
export function montarPrompt(v: VeiculoParaProsa, rotulos: Rotulos): string {
	const ficha = [v.brand, v.model, v.year_model, v.body_type].filter(Boolean).join(' ')
	return [
		'Escreva UMA frase curta em português descrevendo o perfil de uso deste veículo.',
		'',
		`Ficha: ${ficha}${v.mileage != null ? `, ${v.mileage.toLocaleString('pt-BR')} km` : ''}`,
		`Uso: ${legivel(rotulos.uso) || '(nenhum)'}`,
		`Perfil de comprador: ${legivel(rotulos.comprador) || '(nenhum)'}`,
		'',
		'REGRAS:',
		'- Não acrescente nenhum fato que não esteja acima.',
		'- Não use comparativo nem superlativo: nada de "melhor", "mais rápido", "acima da média".',
		'- Não use juízo de conforto: nada de "confortável", "espaçoso", "espaço para N adultos".',
		'- Não use "ideal para" nem "perfeito para".',
		'- Máximo de 20 palavras.',
	].join('\n')
}

/**
 * Resultado de uma tentativa de gerar prosa.
 *
 * Antes disto, `gerarProsa` devolvia `string | null` para TUDO — chave
 * ausente, modelo com nome errado, cota, timeout ou trava reprovando —, e o
 * único sinal era um `console.warn` que o build de produção apaga
 * (`removeConsole: true` em `next.config.ts`). A rota respondia 200 mesmo se
 * 100% das prosas falhassem, sem jeito nenhum de saber por quê.
 *
 * `motivo: 'reprovada'` e `motivo: 'falha'` existem para poder contar cada um
 * separado na resposta da rota: "a trava está reprovando tudo" e "a chave não
 * está configurada" são dois problemas diferentes, e ficavam indistinguíveis
 * atrás do mesmo `null`.
 */
export type ResultadoProsa =
	| { ok: true; texto: string }
	| { ok: false; motivo: 'reprovada' | 'falha' }

/**
 * `ok: false` em qualquer falha — rede, cota, chave ausente (`motivo:
 * 'falha'`), ou prosa reprovada na trava (`motivo: 'reprovada'`).
 *
 * `ok: false` não é erro: a passagem sai só com ficha e rótulos, e a
 * sincronização segue. Índice desatualizado é pior que índice sem prosa.
 */
export async function gerarProsa(v: VeiculoParaProsa, rotulos: Rotulos): Promise<ResultadoProsa> {
	const chave = process.env.GEMINI_API_KEY
	if (!chave) return { ok: false, motivo: 'falha' }

	try {
		const resposta = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${chave}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: montarPrompt(v, rotulos) }] }],
					generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
				}),
				signal: AbortSignal.timeout(15_000),
			},
		)
		if (!resposta.ok) return { ok: false, motivo: 'falha' }

		const dados = await resposta.json()
		const texto: string | undefined = dados?.candidates?.[0]?.content?.parts?.[0]?.text
		if (!texto) return { ok: false, motivo: 'falha' }

		const limpo = texto.trim()
		if (!prosaEhAceitavel(limpo).ok) {
			console.warn('[Prosa] descartada pela trava:', limpo.slice(0, 120))
			return { ok: false, motivo: 'reprovada' }
		}
		return { ok: true, texto: limpo }
	} catch {
		return { ok: false, motivo: 'falha' }
	}
}
