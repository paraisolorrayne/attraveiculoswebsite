// Constantes centralizadas do site Attra Veículos

// Número de WhatsApp oficial da Attra
export const WHATSAPP_NUMBER = '5534999444747'

// Número de telefone comercial
export const PHONE_NUMBER = '+553430143232'
export const PHONE_DISPLAY = '(34) 3014-3232'

// Telefone secundário (não WhatsApp)
export const PHONE_NUMBER_2 = '+553432260202'
export const PHONE_DISPLAY_2 = '(34) 3226-0202'

// Celular
export const CELLPHONE_NUMBER = '+5534999444747'
export const CELLPHONE_DISPLAY = '(34) 99944-4747'

// Endereço
export const ADDRESS = {
  street: 'Av. Rondon Pacheco',
  city: 'Uberlândia',
  state: 'MG',
  country: 'Brasil',
}

// Email
export const EMAIL = 'faleconosco@attraveiculos.com.br'

// URLs
export const SITE_URL = 'https://attraveiculos.com.br'

// Seção Editorial (Blog/Insights) - Configurável para testes A/B
export const EDITORIAL_SECTION = {
  menuLabel: 'Insights',           // Label exibido no menu de navegação
  alternatives: ['Garage', 'Lab', 'Editorial', 'Universe'], // Alternativas para testes futuros
  route: '/blog',                  // Rota mantida para SEO
  seoTitle: 'Blog Attra',          // Título otimizado para SEO
  brandName: 'Attra Insights',     // Nome da marca editorial
} as const

/**
 * Safra âncora nov–dez/2025 — eixo "Comprar bem" (procedência, curadoria,
 * decisão patrimonial). Promovida a conteúdo âncora pela spec do canal
 * editorial (docs/superpowers/specs/2026-07-24-attra-editorial-design.md,
 * §Triagem "Promover"). Recebe destaque na /blog e prioridade no linker.
 */
export const ANCHOR_POST_SLUGS: string[] = [
  'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva-para-seu-supercarro-do-que-o-uso-consciente',
  'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-garantia',
  'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro',
  'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio',
  'o-risco-oculto-em-supercarros-como-garantir-a-procedencia-e-proteger-seu-investimento',
  'superesportivos-o-que-nao-te-contam-sobre-a-compra-e-como-a-attra-garante-seu-patrimonio',
  'o-risco-oculto-no-supercarro-dos-seus-sonhos-por-que-a-procedencia-e-mais-importante-que-a-marca',
  'a-ilusao-do-supercarro-perfeito-como-a-curadoria-da-attra-protege-seu-patrimonio',
  'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca-na-compra-do-seu-supercarro',
  'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros-acima-de-r-500-mil',
  'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege-seu-investimento',
]

// Páginas SEO que devem usar WhatsApp direto (não chat widget)
const SEO_PAGE_PREFIXES = [
  '/comprar/modelo/',
  '/preco/',
  '/comprar/condicao/',
  '/comprar/faixa-preco/',
  '/comprar/perfil/',
  '/guia/',
  '/importacao/',
  '/importacao-de-veiculos-de-luxo',
  '/por-que-comprar-na-attra',
  '/garantia-e-procedencia',
  '/como-funciona-entrega-brasil',
]

export const isSeoPage = (path: string): boolean =>
  SEO_PAGE_PREFIXES.some(prefix => path.startsWith(prefix))

// Função helper para gerar link do WhatsApp
export function getWhatsAppUrl(message?: string): string {
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${WHATSAPP_NUMBER}${encodedMessage ? `?text=${encodedMessage}` : ''}`
}

