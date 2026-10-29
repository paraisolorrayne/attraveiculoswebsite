import Link from 'next/link'
import type { Vehicle } from '@/types'
import { findSEOBrand } from '@/lib/seo-brands'
import { normalizarMarca } from '@/lib/marca-normalizacao'

/**
 * Marcas de assinatura, na ordem da faixa. Só entram as que têm página em
 * /comprar (é de lá que vem o nome) e só aparecem quando há carro delas no
 * estoque: a faixa nunca anuncia marca sem carro. O link vai para /veiculos
 * já filtrado pela marca (27/10/2026; antes ia para /comprar/{marca}), com o
 * valor no formato do filtro "Marca" de lá, para ele aparecer escolhido.
 * Chevrolet fica de fora de propósito: no estoque ela é o Corvette, e o nome
 * da marca ao lado de Ferrari diz menos do que o carro.
 */
const ORDEM = [
  'ferrari', 'lamborghini', 'mclaren', 'porsche', 'aston-martin', 'rolls-royce',
  'bentley', 'mercedes-benz', 'bmw', 'audi', 'land-rover',
]

export interface MarcaDaFaixa {
  slug: string
  nome: string
  quantidade: number
}

export function marcasDaFaixa(estoque: Vehicle[]): MarcaDaFaixa[] {
  const contagem = new Map<string, number>()
  for (const v of estoque) {
    const slug = normalizarMarca(v.brand)
    if (slug) contagem.set(slug, (contagem.get(slug) ?? 0) + 1)
  }
  return ORDEM.flatMap((slug) => {
    const marca = findSEOBrand(slug)
    const quantidade = contagem.get(slug) ?? 0
    return marca && quantidade > 0 ? [{ slug, nome: marca.name, quantidade }] : []
  })
}

function Lista({ marcas, copia = false }: { marcas: MarcaDaFaixa[]; copia?: boolean }) {
  return (
    <ul
      className={`${copia ? 'faixa-marcas__copia' : 'flex'} items-center`}
      aria-hidden={copia || undefined}
    >
      {marcas.map((m) => (
        <li key={m.slug} className="flex items-center">
          <Link
            href={`/veiculos?marca=${encodeURIComponent(m.nome.toLowerCase())}`}
            tabIndex={copia ? -1 : undefined}
            className="group flex items-baseline px-6 py-2 md:px-9"
          >
            <span
              className="whitespace-nowrap font-light tracking-tight text-foreground/70 transition-colors group-hover:text-foreground
                         text-[clamp(1.75rem,3.2vw,2.75rem)]"
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              {m.nome}
            </span>
            {/* A quantidade fica só para leitor de tela: ao lado do nome, num
                corpo pequeno e em outra fonte, destoava da marca. */}
            <span className="sr-only">, {m.quantidade} {m.quantidade === 1 ? 'carro' : 'carros'} em estoque</span>
          </Link>
          <span aria-hidden="true" className="block h-1.5 w-1.5 rotate-45 bg-primary" />
        </li>
      ))}
    </ul>
  )
}

export function FaixaDeMarcas({ marcas }: { marcas: MarcaDaFaixa[] }) {
  if (marcas.length < 3) return null

  return (
    <nav aria-label="Estoque por marca" className="border-b border-border/60 py-6 md:py-8">
      <div className="faixa-marcas__janela">
        <div className="faixa-marcas__trilho">
          <Lista marcas={marcas} />
          <Lista marcas={marcas} copia />
        </div>
      </div>
    </nav>
  )
}
