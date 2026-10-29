import type { CSSProperties } from 'react'
import contornos from '../../../public/creative/vendido/ufs.json'
import {
  UBERLANDIA,
  controleDoArco,
  enquadrarBrasil,
  limitesDe,
  type Cidade,
  type ContornoUF,
} from '@content/admin/creative/vendido/calculos'

/**
 * Mapa do Brasil com as rotas saindo de Uberlândia, na seção "Atendemos
 * clientes de todos os estados" de /contato.
 *
 * É o mesmo mapa do Story "Vendido" do gerador (contorno das UFs de
 * public/creative/vendido/ufs.json, o enquadramento e o arco da rota de
 * vendido/calculos.ts), desenhado em SVG para acompanhar o tema claro e o
 * escuro: o contorno usa a cor do texto e as rotas, o vermelho da Attra.
 *
 * As rotas vão para as cidades que a seção cita. Coordenadas: centroide do
 * IBGE, as mesmas de public/creative/vendido/municipios.json.
 */
export const CIDADES_ATENDIDAS: Cidade[] = [
  { nome: 'São Paulo', uf: 'SP', lon: -46.65, lat: -23.65 },
  { nome: 'Rio de Janeiro', uf: 'RJ', lon: -43.46, lat: -22.93 },
  { nome: 'Brasília', uf: 'DF', lon: -47.8, lat: -15.78 },
  { nome: 'Belo Horizonte', uf: 'MG', lon: -43.96, lat: -19.9 },
  { nome: 'Goiânia', uf: 'GO', lon: -49.27, lat: -16.64 },
  { nome: 'Curitiba', uf: 'PR', lon: -49.29, lat: -25.48 },
  { nome: 'Porto Alegre', uf: 'RS', lon: -51.16, lat: -30.1 },
  { nome: 'Salvador', uf: 'BA', lon: -38.51, lat: -12.87 },
  { nome: 'Recife', uf: 'PE', lon: -34.93, lat: -8.04 },
  { nome: 'Fortaleza', uf: 'CE', lon: -38.53, lat: -3.79 },
  { nome: 'Belém', uf: 'PA', lon: -48.46, lat: -1.24 },
  { nome: 'Manaus', uf: 'AM', lon: -60.26, lat: -2.63 },
]

const LARGURA = 1000
const ALTURA = 1000
const MARGEM = 24

const ufs = (contornos as { ufs: ContornoUF[] }).ufs
const projecao = enquadrarBrasil(
  limitesDe(ufs),
  { cx: LARGURA / 2, topo: MARGEM, largura: LARGURA - 2 * MARGEM, fundo: ALTURA - MARGEM, livreAte: ALTURA },
  [],
)
const ponto = (c: Pick<Cidade, 'lon' | 'lat'>) => ({ x: projecao.x(c.lon), y: projecao.y(c.lat) })
const n = (v: number) => Math.round(v * 10) / 10

/** Todas as UFs num caminho só; uma casa decimal basta num quadro de 1000. */
const CONTORNO = ufs
  .flatMap((u) =>
    u.aneis.map((anel) => {
      const pontos: string[] = []
      for (let i = 0; i < anel.length; i += 2) {
        pontos.push(`${n(projecao.x(anel[i] / 100))} ${n(projecao.y(anel[i + 1] / 100))}`)
      }
      return `M${pontos.join('L')}Z`
    }),
  )
  .join('')

const ORIGEM = ponto(UBERLANDIA)
const ROTAS = CIDADES_ATENDIDAS.map((cidade) => {
  const destino = ponto(cidade)
  const ctrl = controleDoArco(ORIGEM, destino)
  const d = ctrl
    ? `M${n(ORIGEM.x)} ${n(ORIGEM.y)}Q${n(ctrl.x)} ${n(ctrl.y)} ${n(destino.x)} ${n(destino.y)}`
    : null
  return { cidade, destino, d }
})

const VIEWBOX_ALTURA = Math.ceil(projecao.altura + 2 * MARGEM)

export function MapaAtendimento({ className }: { className?: string }) {
  return (
    <figure data-revelar="mapa" className={className}>
      <svg
        viewBox={`0 0 ${LARGURA} ${VIEWBOX_ALTURA}`}
        role="img"
        aria-label={`Mapa do Brasil com rotas de entrega saindo de Uberlândia para ${CIDADES_ATENDIDAS.map((c) => c.nome).join(', ')}`}
        className="h-auto w-full text-foreground"
      >
        <defs>
          {ROTAS.map(({ cidade, destino }, i) => (
            <linearGradient
              key={cidade.nome}
              id={`rota-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={n(ORIGEM.x)}
              y1={n(ORIGEM.y)}
              x2={n(destino.x)}
              y2={n(destino.y)}
            >
              <stop offset="0" style={{ stopColor: 'var(--primary)', stopOpacity: 0.3 }} />
              <stop offset="1" style={{ stopColor: 'var(--primary)', stopOpacity: 1 }} />
            </linearGradient>
          ))}
        </defs>

        <path
          d={CONTORNO}
          fill="currentColor"
          fillOpacity={0.045}
          stroke="currentColor"
          strokeOpacity={0.24}
          strokeWidth={1.2}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {ROTAS.map(({ cidade, d }, i) =>
          d ? (
            <path
              key={cidade.nome}
              d={d}
              pathLength={1}
              className="mapa-rota"
              style={{ '--i': i } as CSSProperties}
              fill="none"
              stroke={`url(#rota-${i})`}
              strokeWidth={2.75}
              strokeLinecap="round"
            />
          ) : null,
        )}

        {ROTAS.map(({ cidade, destino }, i) => (
          <g key={cidade.nome} className="mapa-destino" style={{ '--i': i } as CSSProperties}>
            <circle cx={n(destino.x)} cy={n(destino.y)} r={13} fill="none" style={{ stroke: 'var(--primary)' }} strokeOpacity={0.35} strokeWidth={1.5} />
            <circle cx={n(destino.x)} cy={n(destino.y)} r={5.5} style={{ fill: 'var(--primary)' }} />
          </g>
        ))}

        <circle cx={n(ORIGEM.x)} cy={n(ORIGEM.y)} r={18} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
        <circle cx={n(ORIGEM.x)} cy={n(ORIGEM.y)} r={7} fill="currentColor" />
        <text
          x={n(ORIGEM.x - 30)}
          y={n(ORIGEM.y + 8)}
          textAnchor="end"
          fill="currentColor"
          fillOpacity={0.7}
          // Em unidades do desenho: 24 dá ~13 px no computador; no celular o
          // mapa encolhe e 34 mantém o nome em ~12 px.
          className="text-[24px] max-sm:text-[34px]"
          style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 600, letterSpacing: '0.12em' }}
        >
          UBERLÂNDIA
        </text>
      </svg>
    </figure>
  )
}
