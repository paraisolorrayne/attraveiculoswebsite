/**
 * Aviso de clique: o site conta ao CRM, NO MOMENTO DO CLIQUE, que uma visita
 * com tal origem está prestes a mandar mensagem no WhatsApp.
 *
 * POR QUE ASSIM. A mensagem do wa.me era o único canal entre o site e a loja, e
 * por isso a origem viajava dentro do texto que o COMPRADOR enviava
 * (`[ref: ...]`). Isso saiu em 05/08/2026 de propósito. O que sobrou foi
 * perguntar depois — e "depois" só funciona para o lead que vira card, que é a
 * ponta do funil: primeiro contato e descarte nunca viram card e ficariam de
 * fora justamente da conta que o CRM usa para medir cobertura.
 *
 * Avisar na hora resolve os dois: o CRM recebe a origem ANTES da conversa
 * chegar, e vale para todo lead, tenha ele virado card ou não.
 *
 * ISTO NÃO É UM LEAD, e o `tipo` existe para o receptor não confundir. Se este
 * aviso criar usuário ou card do lado de lá, o mesmo lead entra duas vezes: uma
 * por aqui e outra pela entrada real do WhatsApp. O aviso é uma NOTA lateral,
 * guardada à espera da conversa; quem cria o lead continua sendo o WhatsApp.
 *
 * A ligação entre a nota e a conversa continua sendo por TEMPO — é a única
 * chave que existe, porque quem entra pelo WhatsApp nunca se identificou no
 * site. A diferença é quem guarda a nota: antes era o site, esperando o card;
 * agora é o CRM, esperando a mensagem.
 */
import type { RespostaAtribuicao, Toque } from './atribuicao-sessao'

/**
 * Sem `FYKOS_AVISO_CLIQUE_URL` o aviso não sai — mesmo padrão de
 * `FYKOS_WEBHOOK_URL`, e o que permite ligar e desligar sem deploy.
 */
const URL_AVISO = process.env.FYKOS_AVISO_CLIQUE_URL?.trim() || null

/**
 * Teto de espera. O aviso é secundário: o que não pode falhar é o registro do
 * clique, que é o que sustenta a correlação local. CRM lento não pode segurar
 * o beacon do navegador.
 */
const TIMEOUT_MS = 2000

/**
 * Uma reentrega, e só em falha DELES.
 *
 * O receptor pede reentrega no 500 e garante idempotência pelo `clique_id`, e a
 * mesma lógica vale para erro de rede: nos dois casos o aviso pode não ter
 * chegado. Já 4xx é defeito nosso no formato — repetir só gastaria uma segunda
 * recusa idêntica.
 *
 * Uma tentativa extra, não um laço: o objetivo é atravessar o reinício de um
 * processo do outro lado, não sustentar a fila enquanto o CRM está fora. Se
 * estiver fora mesmo, os endpoints de consulta cobrem o backfill.
 */
const ESPERA_ANTES_DE_REPETIR_MS = 400

export interface AvisoDeClique {
	/** Discrimina de um lead. O receptor não deve criar usuário nem card com isto. */
	tipo: 'aviso_clique_site'
	versao: 1
	/** Id do clique no site. Estável: reentrega não deve duplicar a nota. */
	clique_id: string
	clique_em: string
	session_id: string
	pagina: string | null
	veiculo_id: string | null
	first_touch: ToqueDoAviso | null
	last_touch: ToqueDoAviso | null
	/**
	 * O texto exato que o site deixou pré-preenchido no WhatsApp (traz o carro e
	 * a cidade). Sem código na mensagem, é o que deixa o CRM casar este aviso
	 * com a 1ª mensagem da conversa: texto igual + mesmo minuto. Desde 05/10/2026.
	 */
	mensagem: string | null
}

/**
 * Contrato do receptor: mantém os nomes UTM originais em vez de renomeá-los
 * para campos genéricos. Isso evita que a API confunda a campanha etiquetada
 * com uma classificação posterior do CRM.
 */
export interface ToqueDoAviso extends Omit<Toque, 'campaign' | 'content'> {
	utm_campaign: string | null
	utm_content: string | null
}

function toqueDoAviso(toque: Toque | null): ToqueDoAviso | null {
	if (!toque) return null
	const { campaign, content, ...restante } = toque
	return { ...restante, utm_campaign: campaign, utm_content: content }
}

/**
 * Monta o aviso. Puro, para o teste poder afirmar o formato.
 *
 * Devolve `null` apenas se a sessão não puder ser resolvida. Todo clique do
 * site é avisado: sem origem conhecida, os toques vão nulos, mas `session_id`,
 * horário, página e mensagem ainda permitem ao CRM casar a conversa.
 */
export function montarAvisoDeClique(
	cliqueId: string,
	/** Aceita o que o Kysely devolve da coluna (`Timestamp`), além de Date. */
	cliqueEm: Date | string | number,
	atribuicao: RespostaAtribuicao | null,
	pagina: string | null,
	veiculoId: string | null,
	mensagem: string | null = null,
): AvisoDeClique | null {
	if (!atribuicao) return null

	return {
		tipo: 'aviso_clique_site',
		versao: 1,
		clique_id: cliqueId,
		clique_em: new Date(cliqueEm).toISOString(),
		session_id: atribuicao.session_id,
		pagina,
		veiculo_id: veiculoId,
		first_touch: toqueDoAviso(atribuicao.first_touch),
		last_touch: toqueDoAviso(atribuicao.last_touch),
		mensagem,
	}
}

const HOST_WHATSAPP = /^(?:api\.)?wa\.me$|^(?:www\.|api\.)?whatsapp\.com$/i
const MAX_MENSAGEM = 1000

/** O texto pré-preenchido de um link de WhatsApp (`?text=`), decodificado; null se não houver. */
export function mensagemDoLinkWhatsApp(href: unknown): string | null {
	if (typeof href !== 'string') return null
	let url: URL
	try {
		url = new URL(href)
	} catch {
		return null
	}
	if (!/^https?:$/.test(url.protocol) || !HOST_WHATSAPP.test(url.hostname)) return null
	const texto = url.searchParams.get('text')?.trim()
	return texto ? texto.slice(0, MAX_MENSAGEM) : null
}

/**
 * Manda o aviso. Nunca lança: erro aqui não pode derrubar o registro do clique.
 *
 * Toda falha vai para o log (registrarFalha): um aviso que para de sair não dá
 * erro em lugar nenhum, e o log é a única chance de alguém perceber.
 */
export async function enviarAvisoDeClique(aviso: AvisoDeClique | null): Promise<boolean> {
	if (!aviso || !URL_AVISO) return false

	for (let tentativa = 0; tentativa < 2; tentativa++) {
		if (tentativa > 0) await new Promise(r => setTimeout(r, ESPERA_ANTES_DE_REPETIR_MS))

		let status: number | null = null
		try {
			const resposta = await fetch(URL_AVISO, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(process.env.FYKOS_AVISO_CLIQUE_TOKEN
						? { Authorization: `Bearer ${process.env.FYKOS_AVISO_CLIQUE_TOKEN}` }
						: {}),
				},
				body: JSON.stringify(aviso),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			})
			// `ok` cobre o `{"novo":false}` do receptor, que é a idempotência dele
			// funcionando e não um erro: mesmo `clique_id` reentregue não duplica.
			if (resposta.ok) return true
			status = resposta.status
			// 4xx é formato nosso: repetir dá a mesma recusa.
			if (status < 500) {
				registrarFalha(`CRM recusou com ${status}`)
				return false
			}
		} catch (erro) {
			// Rede/timeout: o aviso pode não ter chegado, então vale repetir.
			registrarFalha(erro instanceof Error ? erro.message : String(erro))
		}

		if (tentativa === 1) {
			registrarFalha(`desistiu após 2 tentativas${status ? ` (último: ${status})` : ''}`)
		}
	}

	return false
}

/**
 * Falha de envio vai para o log também em produção (desde 05/10/2026): os
 * avisos caíram de ~150 para 3–13 por dia sem nenhum rastro, porque isto era
 * silencioso. Só o motivo — nunca o conteúdo do aviso.
 */
function registrarFalha(mensagem: string): void {
	console.warn('[AvisoClique]', mensagem)
}
