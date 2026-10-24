/**
 * As pessoas da Attra que aparecem no site. Em /jornada, as fotos em pé; em
 * /sobre, dirigindo (as duas séries enviadas em 23/10/2026).
 *
 * Cargos a confirmar com a Attra: só o do Thiago (CEO) aparece em outro ponto
 * do site; sem cargo, a legenda mostra só o nome.
 */
export interface FotoDaEquipe {
  src: string
  /** object-position do recorte (4:5 nas duas páginas). */
  enquadramento: string
}

export interface PessoaDaAttra {
  nome: string
  cargo?: string
  emPe: FotoDaEquipe
  /**
   * Dirigindo, com a mesma gradação nas três (scripts/imagens/gradar-equipe.mjs,
   * modo cinema-escuro): a do Thiago é de cinema e as outras duas de celular.
   */
  noCarro: FotoDaEquipe
}

export const EQUIPE_ATTRA: PessoaDaAttra[] = [
  {
    nome: 'Thiago',
    cargo: 'CEO',
    emPe: { src: '/about/equipe-thiago.jpg', enquadramento: '50% 14%' },
    noCarro: { src: '/about/equipe-thiago-carro-cinema-escuro.jpg', enquadramento: '38% 50%' },
  },
  {
    nome: 'Cris',
    emPe: { src: '/about/equipe-cris.jpg', enquadramento: '50% 24%' },
    noCarro: { src: '/about/equipe-cris-carro-cinema-escuro.jpg', enquadramento: '50% 50%' },
  },
  {
    nome: 'Gabriel',
    emPe: { src: '/about/equipe-gabriel.jpg', enquadramento: '50% 16%' },
    noCarro: { src: '/about/equipe-gabriel-carro-cinema-escuro.jpg', enquadramento: '50% 62%' },
  },
]
