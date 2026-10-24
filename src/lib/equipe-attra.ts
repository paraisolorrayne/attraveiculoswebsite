/**
 * As pessoas da Attra que aparecem no site. Em /jornada, as fotos em pé; em
 * /sobre, dirigindo (as duas séries enviadas em 23/10/2026).
 *
 * Cargos a confirmar com a Attra: só o do Thiago (CEO) aparece em outro ponto
 * do site; sem cargo, a legenda mostra só o nome.
 */
export interface PessoaDaAttra {
  nome: string
  cargo?: string
  /** Em pé, 9:16. Recortada em 4:5 na /jornada; o valor é o object-position. */
  emPe: { src: string; enquadramento: string }
  /** Dirigindo, no formato em que foi feita (ver EquipeNoCarro). */
  noCarro: { src: string; largura: number; altura: number }
}

export const EQUIPE_ATTRA: PessoaDaAttra[] = [
  {
    nome: 'Thiago',
    cargo: 'CEO',
    emPe: { src: '/about/equipe-thiago.jpg', enquadramento: '50% 14%' },
    noCarro: { src: '/about/equipe-thiago-carro.jpg', largura: 1600, altura: 900 },
  },
  {
    nome: 'Cris',
    emPe: { src: '/about/equipe-cris.jpg', enquadramento: '50% 24%' },
    noCarro: { src: '/about/equipe-cris-carro.jpg', largura: 960, altura: 1200 },
  },
  {
    nome: 'Gabriel',
    emPe: { src: '/about/equipe-gabriel.jpg', enquadramento: '50% 16%' },
    noCarro: { src: '/about/equipe-gabriel-carro.jpg', largura: 960, altura: 1707 },
  },
]
