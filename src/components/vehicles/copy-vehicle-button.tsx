'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Vehicle } from '@/types'
import { resumoDoVeiculo } from '@/lib/resumo-do-veiculo'

export function CopyVehicleButton({ vehicle }: { vehicle: Vehicle }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        // Formato e regras vivem em `resumoDoVeiculo`, testado — este texto é
        // colado no WhatsApp do cliente, então vale ter teste em cima dele.
        const textToCopy = resumoDoVeiculo(vehicle)

        try {
            await navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    return (
        <button
            onClick={handleCopy}
            className="p-2 text-foreground-secondary hover:text-white transition-colors hover:bg-white/5 rounded-md flex items-center justify-center cursor-pointer"
            title="Copiar informações do veículo"
            aria-label="Copiar informações básicas do veículo"
        >
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
        </button>
    )
}
