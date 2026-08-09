/**
 * Páginas de modelo derivadas do ESTOQUE, e não de uma lista escrita à mão.
 *
 * As 13 páginas curadas cobrem só modelo-vitrine — 911, M3, RS6, Cayenne. O
 * estoque real tem Q5, GLC, A5, X2, e é justamente aí que mora a metade
 * acessível do inventário: 17 dos 71 carros abaixo de R$ 400 mil.
 *
 * Isso ficou visível num teste real: perguntado sobre um GLC 220 em Uberlândia,
 * um assistente não citou a Attra — que tinha o carro no pátio. Não existia a
 * página que responderia à pergunta: `/comprar/mercedes-benz/glc` era 404.
 *
 * TODO texto aqui sai de dado do estoque — quantidade, anos, faixa de preço,
 * versões, câmbio, combustível. Nada de especificação inventada: a página
 * afirma só o que a loja tem, e por isso não envelhece nem mente. Descrição
 * editorial continua sendo trabalho humano, e é o que distingue estas das
 * curadas.
 */

import type { Vehicle } from '@/types'
import type { SEOModel } from '../seo-brands'
import { SEO_BRANDS } from '../seo-brands'
import { chaveDeComparacao, classificarCarroceria, marcaCasaComFiltro } from '../taxonomia-veiculo'

/**
 * O nome do modelo na página curada casa com o do estoque?
 *
 * Os dois vocabulários não coincidem: a página diz "G 63 AMG" e o estoque diz
 * "G-63"; a página diz "AMG GT" e o estoque diz "GT". Comparar as strings como
 * vêm faz a página afirmar que não há carro nenhum — foi o que aconteceu com as
 * QUATRO G-63 e com o GT 63 S E Performance, todos no pátio e invisíveis na
 * própria página do modelo.
 *
 * Um contém o outro, depois de reduzidos a chave. O piso de 2 caracteres evita
 * que um nome curto degenere em curinga.
 */
export function modeloCasa(nomeDaPagina: string, modeloDoEstoque: string | null | undefined): boolean {
  const pagina = chaveDeComparacao(nomeDaPagina)
  const estoque = chaveDeComparacao(modeloDoEstoque)
  if (pagina.length < 2 || estoque.length < 2) return false
  return pagina.includes(estoque) || estoque.includes(pagina)
}

/** Filtra o estoque de um modelo de página, marca e modelo juntos. */
export function veiculosDoModelo<T extends { brand: string | null; model: string | null }>(
  veiculos: T[],
  nomeDaMarca: string,
  nomeDoModelo: string,
): T[] {
  return veiculos.filter(
    v => marcaCasaComFiltro(v.brand, nomeDaMarca) && modeloCasa(nomeDoModelo, v.model),
  )
}

/** Mínimo de unidades para gerar página. Uma só já justifica: é uma venda. */
const MINIMO_UNIDADES = 1

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function reais(valor: number): string {
  return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`
}

/** Categoria da página a partir da carroceria já classificada. */
function categoriaDoModelo(veiculos: Vehicle[]): SEOModel['category'] {
  const carrocerias = classificarCarroceria({
    carroceria: veiculos[0].body_type,
    marca: veiculos[0].brand,
    modelo: veiculos[0].model,
    versao: veiculos[0].version,
    portas: veiculos[0].doors,
  })
  if (carrocerias.includes('suv')) return 'suv'
  if (carrocerias.includes('sedan')) return 'sedan'
  if (carrocerias.includes('cupe')) return 'coupe'
  if (carrocerias.includes('conversivel')) return 'gt'
  return 'luxury'
}

function unico<T>(valores: T[]): T[] {
  return [...new Set(valores)]
}

export interface ModeloDoEstoque {
  brandSlug: string
  modelSlug: string
  /** Nome da marca como está no estoque, para casar com os veículos. */
  brandName: string
  model: SEOModel
  unidades: number
}

/**
 * Deriva um modelo a partir dos veículos daquele modelo.
 *
 * A descrição é montada com números reais e nada além disso. Um comprador que
 * pesquisa "GLC em Uberlândia" quer saber se tem, quantos, de que ano e por
 * quanto — e é exatamente isso que a página responde na primeira linha.
 */
function derivarModelo(brandSlug: string, marca: string, modelo: string, veiculos: Vehicle[]): ModeloDoEstoque {
  const precos = veiculos.map(v => v.price).filter(p => p > 0).sort((a, b) => a - b)
  const anos = veiculos.map(v => v.year_model).filter(Boolean).sort()
  const versoes = unico(veiculos.map(v => v.version).filter((v): v is string => !!v))
  const combustiveis = unico(veiculos.map(v => v.fuel_type).filter(Boolean))
  const cambios = unico(veiculos.map(v => v.transmission).filter(Boolean))
  const nomeCompleto = `${marca} ${modelo}`

  const faixa =
    precos.length === 0
      ? ''
      : precos[0] === precos[precos.length - 1]
        ? ` por ${reais(precos[0])}`
        : ` de ${reais(precos[0])} a ${reais(precos[precos.length - 1])}`

  const periodo =
    anos.length === 0
      ? ''
      : anos[0] === anos[anos.length - 1]
        ? ` ano ${anos[0]}`
        : ` entre ${anos[0]} e ${anos[anos.length - 1]}`

  const quantidade = veiculos.length === 1 ? '1 unidade' : `${veiculos.length} unidades`

  const descricao =
    `A Attra Veículos tem ${quantidade} de ${nomeCompleto}${periodo} em estoque em Uberlândia (MG)${faixa}. ` +
    `Todos passam pela mesma verificação de documentação, mecânica e originalidade aplicada ao restante do acervo, ` +
    `com entrega em todo o Brasil e possibilidade de receber seu veículo na troca.`

  const destaques = [
    `${quantidade} disponível${veiculos.length === 1 ? '' : 'is'} agora em Uberlândia (MG)`,
    versoes.length > 0 ? `Versões em estoque: ${versoes.slice(0, 4).join(', ')}` : null,
    combustiveis.length > 0 ? `Motorização: ${combustiveis.join(', ')}` : null,
    cambios.length > 0 ? `Câmbio: ${cambios.join(', ')}` : null,
  ].filter((d): d is string => d !== null)

  return {
    brandSlug,
    brandName: marca,
    modelSlug: slugificar(modelo),
    unidades: veiculos.length,
    model: {
      slug: slugificar(modelo),
      name: modelo,
      fullName: nomeCompleto,
      tagline: `${quantidade} em estoque em Uberlândia`,
      description: descricao,
      metaTitle: `${nomeCompleto} à Venda em Uberlândia | Attra Veículos`,
      metaDescription:
        `${nomeCompleto}${periodo} na Attra Veículos, em Uberlândia (MG)${faixa}. ` +
        `Procedência verificada, aceitamos troca e entregamos em todo o Brasil.`,
      keywords: [
        `${nomeCompleto} à venda`,
        `comprar ${nomeCompleto}`,
        `${nomeCompleto} usado`,
        `${nomeCompleto} Uberlândia`,
        `${modelo} seminovo`,
      ].map(k => k.toLowerCase()),
      category: categoriaDoModelo(veiculos),
      priceRange: precos.length ? `${reais(precos[0])} — ${reais(precos[precos.length - 1])}` : undefined,
      highlights: destaques,
    },
  }
}

/**
 * Todos os modelos com página derivada do estoque.
 *
 * Modelo que JÁ tem página curada é ignorado: conteúdo escrito à mão descreve
 * o carro, o gerado descreve o estoque, e o escrito à mão ganha. Também exige
 * que a marca tenha página — sem página de marca, a de modelo ficaria órfã na
 * navegação e no breadcrumb.
 */
export function modelosDoEstoque(veiculos: Vehicle[]): ModeloDoEstoque[] {
  const porMarcaModelo = new Map<string, { marca: string; modelo: string; brandSlug: string; itens: Vehicle[] }>()

  for (const veiculo of veiculos) {
    const marca = (veiculo.brand ?? '').trim()
    const modelo = (veiculo.model ?? '').trim()
    if (!marca || !modelo) continue

    // A marca precisa existir como página de SEO. `chaveDeComparacao` resolve
    // "Mercedes" x "mercedes-benz", que é a divergência real entre o nome no
    // estoque e o slug da página.
    const marcaSeo = SEO_BRANDS.find(b => {
      const nome = chaveDeComparacao(b.name)
      const alvo = chaveDeComparacao(marca)
      return nome === alvo || nome.startsWith(alvo) || alvo.startsWith(nome)
    })
    if (!marcaSeo) continue

    const slugModelo = slugificar(modelo)
    if (!slugModelo) continue
    // Já existe página curada que cobre este modelo. Comparar por slug só não
    // basta: a curada "amg-gt" cobre o estoque "GT", e a "g63-amg" cobre "G-63".
    // Sem o matcher, geraríamos /gt e /g-63 duplicando páginas que já existem.
    if (marcaSeo.models.some(m => m.slug === slugModelo || modeloCasa(m.name, modelo))) continue

    const chave = `${marcaSeo.slug}/${slugModelo}`
    const atual = porMarcaModelo.get(chave)
    if (atual) atual.itens.push(veiculo)
    else porMarcaModelo.set(chave, { marca, modelo, brandSlug: marcaSeo.slug, itens: [veiculo] })
  }

  return [...porMarcaModelo.values()]
    .filter(g => g.itens.length >= MINIMO_UNIDADES)
    .map(g => derivarModelo(g.brandSlug, g.marca, g.modelo, g.itens))
    .sort((a, b) => b.unidades - a.unidades)
}

/** Procura um modelo derivado por slug de marca e de modelo. */
export function acharModeloDoEstoque(
  veiculos: Vehicle[],
  brandSlug: string,
  modelSlug: string,
): ModeloDoEstoque | undefined {
  return modelosDoEstoque(veiculos).find(
    m => m.brandSlug === brandSlug && m.modelSlug === modelSlug,
  )
}
