/**
 * A linha do tempo da Attra, em /sobre e em /jornada. Até 23/10/2026 cada
 * página tinha a sua, com textos diferentes para o mesmo ano ("Primeiro
 * Ferrari Comercializado" × "Primeira Ferrari"; "Maior Dealer do Triângulo
 * Mineiro" × "Consolidação da estrutura empresarial").
 *
 * A confirmar com a Attra: o marco de 2023 ("500 supercarros"), que /servicos
 * e /sobre apresentam como "500+ veículos por ano", e o "maior dealer premium
 * do Triângulo Mineiro" de 2024.
 */
export interface MarcoDaTrajetoria {
  ano: number
  titulo: string
  texto: string
}

export const TRAJETORIA_ATTRA: MarcoDaTrajetoria[] = [
  {
    ano: 2008,
    titulo: 'Fundação em Uberlândia',
    texto: 'A Attra Veículos nasceu com o propósito de oferecer uma experiência diferenciada na compra e venda de veículos, unindo transparência, credibilidade e atendimento personalizado. Fundada como uma empresa familiar, a Attra foi construída sobre valores sólidos, com foco em profissionalização, respeito aos processos e compromisso com o cliente.',
  },
  {
    ano: 2015,
    titulo: 'Primeira Ferrari',
    texto: 'Marco histórico com a venda do primeiro superesportivo italiano. Este momento consolidou a Attra como referência para colecionadores de supercarros no Brasil.',
  },
  {
    ano: 2018,
    titulo: 'Novo showroom',
    texto: 'Inauguração do showroom climatizado de 5.000 m², projetado para exibir cada veículo como uma obra de arte, com iluminação profissional e ambiente exclusivo.',
  },
  {
    ano: 2023,
    titulo: '500+ supercarros',
    texto: 'Mais de 500 supercarros comercializados para colecionadores de todo o Brasil, com clientes em todos os estados.',
  },
  {
    ano: 2024,
    titulo: 'Consolidação da estrutura empresarial',
    texto: 'A gestão da empresa é conduzida de forma estruturada, com papéis bem definidos e hierarquia clara, garantindo decisões estratégicas eficientes e um crescimento sustentável. Essa postura profissional permitiu à Attra Veículos consolidar sua reputação no mercado, sendo a maior dealer premium do Triângulo Mineiro.',
  },
  {
    ano: 2025,
    titulo: 'Expansão de alcance nacional',
    texto: 'Ano marcado por expansão de alcance nacional, com a Attra cada vez mais presente no radar dos principais compradores e entusiastas de supercarros em todo o Brasil.',
  },
  {
    ano: 2026,
    titulo: 'Nova expansão e estrutura',
    texto: 'Segunda grande expansão da estrutura física, com um novo espaço dedicado à experiência do cliente e à curadoria de supercarros, reforçando a presença da Attra como referência premium em nível nacional.',
  },
]
