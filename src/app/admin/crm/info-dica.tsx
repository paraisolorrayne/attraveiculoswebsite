'use client'

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

// Renderiza fora do quadro: não alarga a página nem é cortado pelas colunas.
export function InfoDica({ children }: { children: ReactNode }) {
	const ancora = useRef<HTMLSpanElement>(null)
	const id = useId()
	const [posicao, setPosicao] = useState<CSSProperties | null>(null)
	const abrir = () => {
		const rect = ancora.current?.getBoundingClientRect()
		if (!rect) return
		const largura = Math.min(264, window.innerWidth - 24)
		const acima = rect.top > window.innerHeight / 2
		setPosicao({
			position: 'fixed', width: largura,
			left: Math.max(12, Math.min(rect.left + rect.width / 2 - largura / 2, window.innerWidth - largura - 12)),
			...(acima ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
			maxHeight: Math.max(80, acima ? rect.top - 20 : window.innerHeight - rect.bottom - 20),
		})
	}
	useEffect(() => {
		if (!posicao) return
		const fechar = () => setPosicao(null)
		window.addEventListener('resize', fechar)
		window.addEventListener('scroll', fechar, true)
		return () => { window.removeEventListener('resize', fechar); window.removeEventListener('scroll', fechar, true) }
	}, [posicao])
	return (
		<span ref={ancora} className="inline-flex align-middle shrink-0" tabIndex={0} role="button" aria-label="Ajuda" aria-describedby={posicao ? id : undefined}
			onMouseEnter={abrir} onMouseLeave={() => setPosicao(null)} onFocus={abrir} onBlur={() => setPosicao(null)}
			onClick={abrir} onKeyDown={e => {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir() }
				if (e.key === 'Escape' && posicao) { e.stopPropagation(); setPosicao(null) }
			}}>
			<Info className="w-3.5 h-3.5 text-foreground-secondary/70 hover:text-foreground-secondary cursor-help" />
			{posicao && createPortal(<span id={id} role="tooltip" style={posicao}
				className="z-[100] p-3 rounded-lg bg-foreground text-background text-xs leading-relaxed font-normal normal-case tracking-normal text-left shadow-lg pointer-events-none overflow-auto">
				{children}
			</span>, document.body)}
		</span>
	)
}
