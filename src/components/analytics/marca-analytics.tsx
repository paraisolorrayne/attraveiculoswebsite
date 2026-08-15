'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { pushAnalyticsEvent } from '@/hooks/use-analytics'
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'
import {
	eventoDePagina,
	eventoDeClique,
	type TipoDePagina,
	type ContextoDaPagina,
} from '@/lib/analytics-marca'

interface Props {
	tipo: TipoDePagina
	marca?: string | null
	modelo?: string | null
	categoria?: string | null
}

/**
 * Dispara os eventos das páginas de marca, modelo e categoria.
 *
 * As páginas são estáticas e renderizadas no servidor; este é o único pedaço
 * cliente delas. Não renderiza nada.
 *
 * CLIQUE POR DELEGAÇÃO — decisão deliberada. Há três implementações diferentes
 * de card de veículo (hub, marca, modelo), todas server components. Envolver
 * cada uma num wrapper cliente quebraria o layout: os cards são filhos diretos
 * de um grid, e um wrapper roubaria o lugar deles como item da grade. Em vez
 * disso, os cards ganham `data-veiculo-*` e um listener só, aqui, lê o link
 * mais próximo do alvo do clique. Card novo entra no relatório sozinho, desde
 * que carregue os atributos.
 */
export function MarcaAnalytics({ tipo, marca, modelo, categoria }: Props) {
	const pathname = usePathname()
	const { getVisitorContext } = useVisitorTracking()

	// getVisitorContext muda de identidade a cada estado do provider; o ref
	// garante que o listener sempre chame a versão mais recente sem precisar ser
	// reinstalado a cada render. A sincronia mora num efeito, não no corpo do
	// componente: escrever em ref durante o render é leitura suja sob
	// renderização concorrente. Declarado ANTES do efeito principal para que já
	// esteja atualizado quando o listener disparar.
	const contextoRef = useRef(getVisitorContext)
	useEffect(() => {
		contextoRef.current = getVisitorContext
	}, [getVisitorContext])

	const jaDisparou = useRef(false)

	useEffect(() => {
		const ctx: ContextoDaPagina = { tipo, marca, modelo, categoria, caminho: pathname }

		// O page view é adiado um macrotask de propósito. Efeitos do React rodam
		// de baixo para cima: o deste componente executa ANTES do init do
		// VisitorTrackingProvider, que é quem lê a UTM da URL. Disparar direto
		// mandaria todo page view sem utm_source. Um setTimeout(0) cai depois do
		// flush de efeitos e do commit do estado do provider.
		const timer = window.setTimeout(() => {
			if (jaDisparou.current) return
			jaDisparou.current = true
			const { nome, params } = eventoDePagina(ctx)
			pushAnalyticsEvent(nome, params, contextoRef.current())
		}, 0)

		const aoClicar = (evento: MouseEvent) => {
			const alvo = evento.target
			if (!(alvo instanceof Element)) return
			const link = alvo.closest<HTMLAnchorElement>('a[data-veiculo-id]')
			if (!link) return

			const { nome, params } = eventoDeClique(
				{
					id: link.dataset.veiculoId,
					marca: link.dataset.veiculoMarca,
					modelo: link.dataset.veiculoModelo,
					slug: link.dataset.veiculoSlug,
				},
				ctx,
			)
			pushAnalyticsEvent(nome, params, contextoRef.current())
		}

		document.addEventListener('click', aoClicar)
		return () => {
			window.clearTimeout(timer)
			document.removeEventListener('click', aoClicar)
		}
	}, [tipo, marca, modelo, categoria, pathname])

	return null
}
