'use client'

/**
 * O estado do Gerador de Criativos e o laço de redesenho.
 *
 * A divisão que orienta o arquivo inteiro: TEXTO E NÚMERO vivem em `useState`;
 * IMAGEM vive em `useRef`. Imagem não é serializável, não compara por valor e
 * trocá-la não deve reconciliar árvore nenhuma — só redesenhar. O preço dessa
 * escolha é que o React não enxerga a troca, então quem mexe nas imagens chama
 * `redesenhar()`; o contador `versao` é o que fecha esse laço.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
	ALTURA_STORIES,
	carregar,
	carregarAssets,
	enquadramentoAutomatico,
	ESTADO_INICIAL,
	IMAGENS_VAZIAS,
	render,
	type Assets,
	type EstadoCriativo,
	type FormatoId,
	type ImagensDoOperador,
	type SlotFoto,
} from '@content/admin/creative/gerador'
import { fontesDoGerador } from '@content/admin/creative/gerador/fontes'

/** A logo do operador sobrevive ao F5 — o HTML guardava sob esta mesma chave. */
const CHAVE_LOGO = 'attra_logo'

/**
 * Proxy de mesma origem para a foto do estoque, na resolução NATIVA.
 *
 * Buscar do S3 direto tinge o canvas e o download passa a falhar com
 * SecurityError. E o `w=1920&q=90` não é enfeite: medido em produção
 * (18/08/2026), pedir w=1080 devolvia um terço dos pixels, e a peça saía mole
 * assim que o operador fechava o zoom no carro. Os dois valores precisam
 * constar em next.config.ts — q=95 devolve HTTP 400.
 */
export const urlFotoEstoque = (u: string) =>
	'/_next/image?url=' + encodeURIComponent(u) + '&w=1920&q=90'

export interface Gerador {
	canvasRef: React.RefObject<HTMLCanvasElement | null>
	estado: EstadoCriativo
	imagens: React.RefObject<ImagensDoOperador>
	assets: Assets | null
	pronto: boolean
	erro: string | null
	setErro: (e: string | null) => void
	redesenhar: () => void
	campo: <K extends keyof EstadoCriativo>(chave: K, valor: EstadoCriativo[K]) => void
	trocarFormato: (tipo: FormatoId) => void
	aplicarFoto: (slot: SlotFoto, img: HTMLImageElement) => void
	definirLogo: (img: HTMLImageElement | null, dataUrl?: string) => void
}

export function useGerador(): Gerador {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [estado, setEstado] = useState<EstadoCriativo>(() => structuredClone(ESTADO_INICIAL))
	const imagens = useRef<ImagensDoOperador>(structuredClone(IMAGENS_VAZIAS))
	const [versao, setVersao] = useState(0)
	const [assets, setAssets] = useState<Assets | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	const redesenhar = useCallback(() => setVersao(v => v + 1), [])

	// Assets e fontes antes do primeiro desenho. Sem esperar as fontes, o
	// primeiro measureText mede com a de sistema e o espaçamento sai errado.
	useEffect(() => {
		let vivo = true
		Promise.all([carregarAssets(), fontesDoGerador()])
			.then(([a]) => {
				if (vivo) setAssets(a)
			})
			.catch(e => {
				if (vivo) setErro(e instanceof Error ? e.message : String(e))
			})
		return () => {
			vivo = false
		}
	}, [])

	// A logo que o operador escolheu da última vez.
	useEffect(() => {
		let salva: string | null = null
		try {
			salva = localStorage.getItem(CHAVE_LOGO)
		} catch {
			// modo anônimo ou armazenamento bloqueado: segue com a logo oficial
		}
		if (!salva) return
		let vivo = true
		carregar(salva)
			.then(img => {
				if (!vivo) return
				imagens.current.logo = img
				redesenhar()
			})
			.catch(() => {
				// logo guardada ilegível: não é motivo para atrapalhar a tela
			})
		return () => {
			vivo = false
		}
	}, [redesenhar])

	/**
	 * Um desenho por quadro.
	 *
	 * Arrastar um slider dispara dezenas de eventos, e cada desenho é 1080×1920
	 * com desfoque e textura. Sem o quadro no meio, a barra engasga na mão.
	 *
	 * O preço: em aba OCULTA o navegador não roda quadro nenhum, então a prévia
	 * fica parada até a aba voltar à frente. Para quem olha, é indiferente. Para
	 * quem LÊ o canvas, não: por isso exportar e publicar redesenham por conta
	 * própria antes de ler os pixels, em vez de confiar no que está lá.
	 */
	useEffect(() => {
		if (!assets) return
		const id = requestAnimationFrame(() => {
			const ctx = canvasRef.current?.getContext('2d')
			if (!ctx) return
			try {
				render(ctx, estado, imagens.current, assets, ALTURA_STORIES)
				setErro(null)
			} catch (e) {
				setErro(e instanceof Error ? e.message : String(e))
			}
		})
		return () => cancelAnimationFrame(id)
	}, [estado, versao, assets])

	const campo = useCallback(
		<K extends keyof EstadoCriativo>(chave: K, valor: EstadoCriativo[K]) =>
			setEstado(e => ({ ...e, [chave]: valor })),
		[],
	)

	/**
	 * Troca de formato reenquadra a foto principal.
	 *
	 * O Clássico original é o único que quer a calibração .88/.18, e só em foto
	 * horizontal; todo o resto quer neutro. Sem reenquadrar aqui, sair do
	 * Clássico deixava o carro afundado no formato novo.
	 */
	const trocarFormato = useCallback((tipo: FormatoId) => {
		setEstado(e => {
			const f1 = imagens.current.foto1 ? enquadramentoAutomatico(imagens.current.foto1, tipo) : e.f1
			return { ...e, tipo, f1 }
		})
	}, [])

	const aplicarFoto = useCallback((slot: SlotFoto, img: HTMLImageElement) => {
		imagens.current[slot] = img
		if (slot === 'foto1') {
			setEstado(e => ({ ...e, f1: enquadramentoAutomatico(img, e.tipo) }))
		} else {
			redesenhar()
		}
	}, [redesenhar])

	const definirLogo = useCallback((img: HTMLImageElement | null, dataUrl?: string) => {
		imagens.current.logo = img
		try {
			if (img && dataUrl) localStorage.setItem(CHAVE_LOGO, dataUrl)
			else localStorage.removeItem(CHAVE_LOGO)
		} catch {
			// sem armazenamento a logo vale só para esta sessão
		}
		redesenhar()
	}, [redesenhar])

	return {
		canvasRef,
		estado,
		imagens,
		assets,
		pronto: !!assets,
		erro,
		setErro,
		redesenhar,
		campo,
		trocarFormato,
		aplicarFoto,
		definirLogo,
	}
}
