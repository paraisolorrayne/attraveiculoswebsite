/**
 * Veículos semelhantes a um que saiu do estoque.
 *
 * O carro é peça única: quando vende, a URL fica. E ela continua circulando —
 * um assistente recomendou `/veiculo/porsche-911-2019-950539` com
 * `utm_source=chatgpt.com` depois de o carro ter sido vendido, e quem clicou
 * encontrou um 404 sem um único link para outro carro.
 *
 * O 404 está certo e fica: quando isso virava redirecionamento, a resposta saía
 * com HTTP 200 durante o streaming e QUALQUER slug inventado passava a ser uma
 * página válida. O que muda é o que a página de 404 mostra.
 *
 * A única informação disponível é o próprio endereço — daí sair tudo do slug.
 */

import { chaveDeComparacao, marcaCasaComFiltro } from './taxonomia-veiculo'
import type { Vehicle } from '@/types'

export interface PedidoDoSlug {
  /** Prefixo de marca+modelo, ainda em forma de slug. */
  prefixo: string
  ano: number | null
  id: string | null
}

/**
 * Extrai o que dá do slug `marca-modelo-ano-id`.
 *
 * Lido de trás para frente, que é a única parte com formato garantido: o id é
 * numérico e vem por último, o ano tem quatro dígitos. O começo é marca e
 * modelo grudados, e separá-los por regra não funciona — "land-rover-defender"
 * e "porsche-911" quebram a mesma regra em pontos diferentes. Por isso a
 * separação é feita depois, comparando com o estoque real.
 */
export function lerSlug(slug: string): PedidoDoSlug {
  const partes = slug.split('-').filter(Boolean)
  let id: string | null = null
  let ano: number | null = null

  if (partes.length && /^\d+$/.test(partes[partes.length - 1])) {
    id = partes.pop()!
  }
  if (partes.length && /^(19|20)\d{2}$/.test(partes[partes.length - 1])) {
    ano = Number(partes.pop())
  }

  return { prefixo: partes.join('-'), ano, id }
}

function slugificar(texto: string | null | undefined): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Quanto um veículo do estoque se parece com o que foi pedido. */
interface Pontuado {
  veiculo: Vehicle
  pontos: number
}

/**
 * Ordena o estoque pela semelhança com o veículo pedido.
 *
 * A escala é deliberadamente grosseira, com degraus largos: mesmo modelo vale
 * muito mais que mesma marca, e mesma marca vale mais que qualquer aproximação
 * por preço. Quem procurava um 911 aceita outro 911 antes de aceitar um Cayenne,
 * e aceita um Cayenne antes de aceitar um BMW da mesma faixa.
 *
 * Preço só desempata. Não é filtro: eliminar por faixa devolveria lista vazia
 * justamente nos casos raros, que é quando a página mais precisa mostrar algo.
 */
export function ordenarPorSemelhanca(
  estoque: Vehicle[],
  pedido: PedidoDoSlug,
): Vehicle[] {
  const prefixo = chaveDeComparacao(pedido.prefixo)

  const pontuados: Pontuado[] = estoque.map(veiculo => {
    const marcaSlug = slugificar(veiculo.brand)
    const modeloSlug = slugificar(veiculo.model)
    const marcaChave = chaveDeComparacao(marcaSlug)
    const modeloChave = chaveDeComparacao(modeloSlug)

    let pontos = 0

    // Marca: o prefixo do slug começa com ela.
    const mesmaMarca =
      marcaChave.length >= 2 && prefixo.startsWith(marcaChave)
    if (mesmaMarca) pontos += 100

    // Modelo: aparece no prefixo, depois da marca. Sem exigir posição exata —
    // "mercedes-glc" e "mercedes-benz-glc" devem casar com o mesmo carro.
    const mesmoModelo =
      modeloChave.length >= 2 && prefixo.includes(modeloChave)
    if (mesmoModelo) pontos += 400

    // Sem marca nem modelo, ainda vale como opção da mesma categoria.
    if (!mesmaMarca && !mesmoModelo) pontos += 10

    // Ano próximo desempata dentro do mesmo degrau.
    if (pedido.ano && veiculo.year_model) {
      pontos += Math.max(0, 20 - Math.abs(veiculo.year_model - pedido.ano) * 4)
    }

    return { veiculo, pontos }
  })

  return pontuados
    .sort((a, b) => b.pontos - a.pontos || b.veiculo.price - a.veiculo.price)
    .map(p => p.veiculo)
}

export interface Semelhantes {
  /** Os veículos a exibir, do mais parecido ao menos. */
  veiculos: Vehicle[]
  /** Marca reconhecida no slug, quando houve — usada no texto da página. */
  marca: string | null
  /** Modelo reconhecido, quando houve. */
  modelo: string | null
}

/**
 * Encontra semelhantes a partir do slug pedido.
 *
 * Devolve marca e modelo reconhecidos para a página poder dizer "não temos mais
 * ESTE Porsche 911, mas temos estes" — que é diferente, para quem chegou de uma
 * recomendação, de um "veículo indisponível" genérico.
 */
export function semelhantesDoSlug(
  estoque: Vehicle[],
  slug: string,
  limite = 4,
): Semelhantes {
  const pedido = lerSlug(slug)
  const prefixo = chaveDeComparacao(pedido.prefixo)

  const marca =
    estoque.find(v => marcaCasaComFiltro(v.brand, pedido.prefixo))?.brand ??
    estoque.find(v => {
      const chave = chaveDeComparacao(v.brand)
      return chave.length >= 2 && prefixo.startsWith(chave)
    })?.brand ??
    null

  const modelo =
    estoque.find(v => {
      const chave = chaveDeComparacao(v.model)
      return chave.length >= 2 && prefixo.includes(chave)
    })?.model ?? null

  return {
    veiculos: ordenarPorSemelhanca(estoque, pedido).slice(0, limite),
    marca,
    modelo,
  }
}
