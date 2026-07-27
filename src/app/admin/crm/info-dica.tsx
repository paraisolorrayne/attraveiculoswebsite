'use client'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

// Tooltip (i) acessível: abre no hover e no foco de teclado, sem JS de estado.
export function InfoDica({ children }: { children: ReactNode }) {
	return (
		<span className="relative inline-flex group/dica align-middle" tabIndex={0} aria-label="Ajuda">
			<Info className="w-3.5 h-3.5 text-foreground-secondary/70 hover:text-foreground-secondary cursor-help" />
			<span
				role="tooltip"
				className="invisible opacity-0 group-hover/dica:visible group-hover/dica:opacity-100 group-focus/dica:visible group-focus/dica:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-40 w-60 p-2.5 rounded-lg bg-foreground text-background text-[11px] leading-snug font-normal normal-case tracking-normal text-left shadow-lg pointer-events-none"
			>
				{children}
			</span>
		</span>
	)
}
