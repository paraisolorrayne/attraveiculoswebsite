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
import type { RespostaAtribuicao } from './atribuicao-sessao'

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
	first_touch: RespostaAtribuicao['first_touch']
	last_touch: RespostaAtribuicao['last_touch']
}

/**
 * Monta o aviso. Puro, para o teste poder afirmar o formato.
 *
 * Devolve `null` quando não há origem nenhuma: avisar "chegou alguém, não sei
 * de onde" não ajuda o CRM a decidir nada e ainda gasta uma nota que pode ser
 * casada por engano com a conversa errada. Sem sinal, melhor não avisar.
 */
export function montarAvisoDeClique(
	cliqueId: string,
	/** Aceita o que o Kysely devolve da coluna (`Timestamp`), além de Date. */
	cliqueEm: Date | string | number,
	atribuicao: RespostaAtribuicao | null,
	pagina: string | null,
	veiculoId: string | null,
): AvisoDeClique | null {
	if (!atribuicao) return null
	if (!atribuicao.first_touch && !atribuicao.last_touch) return null

	return {
		tipo: 'aviso_clique_site',
		versao: 1,
		clique_id: cliqueId,
		clique_em: new Date(cliqueEm).toISOString(),
		session_id: atribuicao.session_id,
		pagina,
		veiculo_id: veiculoId,
		first_touch: atribuicao.first_touch,
		last_touch: atribuicao.last_touch,
	}
}

/**
 * Manda o aviso. Nunca lança: erro aqui não pode derrubar o registro do clique.
 *
 * Silencioso em produção e falante fora dela — um aviso que para de sair não
 * dá erro em lugar nenhum, então o log de desenvolvimento é a única chance de
 * alguém perceber antes de o relatório de campanha esvaziar de novo.
 */
export async function enviarAvisoDeClique(aviso: AvisoDeClique | null): Promise<boolean> {
	if (!aviso || !URL_AVISO) return false

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
		if (!resposta.ok && process.env.NODE_ENV !== 'production') {
			console.warn(`[AvisoClique] CRM respondeu ${resposta.status}`)
		}
		return resposta.ok
	} catch (erro) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn('[AvisoClique] falhou:', erro instanceof Error ? erro.message : erro)
		}
		return false
	}
}
