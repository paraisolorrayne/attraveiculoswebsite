/**
 * Helpers to gracefully handle missing fields from upstream (AutoConf API).
 *
 * Strategy: when a field is null/empty, try to infer it from sibling fields
 * before falling back to omitting it from the UI. We never want to render
 * "Desconhecido", "Não informado" or similar placeholder labels — they make
 * the page look broken and hurt SEO.
 *
 * The inference map covers the most common Attra inventory: premium SUVs,
 * supercars and luxury sedans. It's intentionally conservative — only includes
 * model names that uniquely identify a single brand.
 */

const BRAND_BY_MODEL_KEY: Record<string, string> = {
  // Chevrolet / GM
  'corvette': 'Chevrolet',
  'camaro': 'Chevrolet',
  'silverado': 'Chevrolet',

  // Ford
  'mustang': 'Ford',
  'raptor': 'Ford',
  'bronco': 'Ford',
  'f-150': 'Ford',
  'f150': 'Ford',
  'maverick': 'Ford',
  'ranger': 'Ford',

  // Dodge / RAM
  'challenger': 'Dodge',
  'charger': 'Dodge',
  'durango': 'Dodge',

  // Jaguar
  'f-pace': 'Jaguar',
  'f-type': 'Jaguar',
  'e-pace': 'Jaguar',
  'i-pace': 'Jaguar',
  'xe': 'Jaguar',
  'xf': 'Jaguar',
  'xj': 'Jaguar',

  // Land Rover / Range Rover
  'defender': 'Land Rover',
  'discovery': 'Land Rover',
  'range rover': 'Land Rover',
  'velar': 'Land Rover',
  'evoque': 'Land Rover',

  // Porsche
  'cayenne': 'Porsche',
  'macan': 'Porsche',
  'panamera': 'Porsche',
  'taycan': 'Porsche',
  '911': 'Porsche',
  '718': 'Porsche',
  'cayman': 'Porsche',
  'boxster': 'Porsche',

  // Ferrari
  'sf90': 'Ferrari',
  '296': 'Ferrari',
  '812': 'Ferrari',
  'roma': 'Ferrari',
  'purosangue': 'Ferrari',
  'f8': 'Ferrari',
  'portofino': 'Ferrari',

  // Lamborghini
  'huracan': 'Lamborghini',
  'huracán': 'Lamborghini',
  'urus': 'Lamborghini',
  'aventador': 'Lamborghini',
  'revuelto': 'Lamborghini',

  // McLaren
  '720s': 'McLaren',
  '750s': 'McLaren',
  '765lt': 'McLaren',
  'gt': 'McLaren',
  'artura': 'McLaren',

  // Aston Martin
  'db11': 'Aston Martin',
  'db12': 'Aston Martin',
  'dbs': 'Aston Martin',
  'dbx': 'Aston Martin',
  'vantage': 'Aston Martin',

  // Bentley
  'continental': 'Bentley',
  'bentayga': 'Bentley',
  'flying spur': 'Bentley',

  // Rolls-Royce
  'cullinan': 'Rolls-Royce',
  'ghost': 'Rolls-Royce',
  'phantom': 'Rolls-Royce',
  'wraith': 'Rolls-Royce',
  'dawn': 'Rolls-Royce',
  'spectre': 'Rolls-Royce',

  // Maserati
  'ghibli': 'Maserati',
  'levante': 'Maserati',
  'quattroporte': 'Maserati',
  'mc20': 'Maserati',
  'grecale': 'Maserati',

  // Mercedes / Maybach / AMG
  'maybach': 'Mercedes-Benz',
  'amg gt': 'Mercedes-Benz',

  // BMW
  'm3': 'BMW',
  'm4': 'BMW',
  'm5': 'BMW',
  'm8': 'BMW',
  'x5 m': 'BMW',
  'x6 m': 'BMW',
}

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Grafia correta das marcas cujo slug não vira nome por regra genérica.
 *
 * O slug do AutoConf é minúsculo e hifenizado. Title-case resolve "tesla" e
 * "porsche", mas erraria em sigla ("bmw" → "Bmw"), em marca composta com hífen
 * de verdade ("mercedes-benz" → "Mercedes Benz") e no prefixo de grupo que o
 * AutoConf usa em algumas marcas ("gm-chevrolet", que é Chevrolet).
 */
const MARCA_POR_SLUG: Record<string, string> = {
  'bmw': 'BMW',
  'gmc': 'GMC',
  'ram': 'RAM',
  'mercedes-benz': 'Mercedes-Benz',
  'rolls-royce': 'Rolls-Royce',
  'gm-chevrolet': 'Chevrolet',
  'land-rover': 'Land Rover',
  'aston-martin': 'Aston Martin',
  'alfa-romeo': 'Alfa Romeo',
}

/**
 * Converte o slug de marca do AutoConf em nome exibível.
 *
 * Fora das exceções acima, a regra genérica é title-case por segmento — o que
 * cobre marca nova sem precisar de deploy ("byd", "lotus", "rivian").
 */
function marcaDoSlug(slug: string | null | undefined): string {
  const limpo = (slug ?? '').trim().toLowerCase()
  if (!limpo) return ''
  if (MARCA_POR_SLUG[limpo]) return MARCA_POR_SLUG[limpo]
  return limpo
    .split('-')
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/** Os campos de marca que o AutoConf devolve, todos opcionais. */
export interface MarcaBruta {
  marca_apelido?: string | null
  marca_nome?: string | null
  marca_slug?: string | null
  modelopai_nome?: string | null
}

/**
 * Resolve a marca do veículo a partir do que o AutoConf devolve. Tenta:
 *
 *   1. `marca_apelido` — preenchido em 71/71 do estoque e melhor normalizado
 *      que `marca_nome`: é ele que traz 'Lamborghini' onde o nome traz
 *      'LAMBORGHINI'. É a grafia que a própria loja cadastrou.
 *   2. `marca_nome` — 68/71. Vem nulo em parte do estoque.
 *   3. `marca_slug` — 71/71, porém em caixa baixa e hifenizado; só serve
 *      convertido, e é o último dado de origem antes do palpite.
 *   4. Inferência pelo nome do modelo (mapa fixo, manutenção manual).
 *
 * A ordem importa. Antes desta correção só o passo 2 existia, e o Cybertruck
 * (`marca_apelido: 'Tesla'`) e o GLE 63s (`'Mercedes'`) saíam sem marca em todo
 * o site — ficha, JSON-LD, endpoint de LLM e feed de anúncios — enquanto o dado
 * estava ali, num campo irmão. O passo 4 só os salvaria se alguém lembrasse de
 * cadastrar cada modelo novo à mão; foi o que aconteceu com a SF90, resgatada
 * por acaso porque 'sf90' estava no mapa.
 *
 * Continua devolvendo string vazia quando não há inferência possível: quem
 * chama deve esconder o rótulo em vez de mostrar "Não informado".
 */
export function resolveBrand(veiculo: MarcaBruta): string {
  const apelido = (veiculo.marca_apelido ?? '').trim()
  if (apelido) return apelido

  const nome = (veiculo.marca_nome ?? '').trim()
  if (nome) return nome

  const doSlug = marcaDoSlug(veiculo.marca_slug)
  if (doSlug) return doSlug

  const modelo = veiculo.modelopai_nome
  if (!modelo) return ''
  const modelKey = normalizeKey(modelo)
  if (BRAND_BY_MODEL_KEY[modelKey]) return BRAND_BY_MODEL_KEY[modelKey]

  const firstWord = modelKey.split(/\s+/)[0]
  if (firstWord && BRAND_BY_MODEL_KEY[firstWord]) return BRAND_BY_MODEL_KEY[firstWord]

  return ''
}

/** Coalesces a value to '' (empty) when null/undefined/blank, so the UI knows
 *  to hide the label rather than render "Não informado". */
export function nonEmpty(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  return trimmed
}

/** Build a human display name from non-empty parts (strings or numbers).
 *  Numbers like 0 are treated as empty (not a meaningful display value). */
export function joinNonEmpty(parts: Array<string | number | null | undefined>, sep = ' '): string {
  return parts
    .map(p => {
      if (p == null) return ''
      if (typeof p === 'number') return p === 0 ? '' : String(p)
      return p.trim()
    })
    .filter(p => p.length > 0)
    .join(sep)
}
