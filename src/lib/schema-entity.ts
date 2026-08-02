import { SITE_URL } from './constants'

/**
 * A entidade da Attra é declarada UMA única vez por documento, no layout raiz
 * (`src/app/layout.tsx`, via `buildOrganizationSchema`/`buildWebsiteSchema`).
 *
 * Qualquer outro bloco JSON-LD — `provider` de um `Service`, `seller` de um
 * `Offer`, catálogo de serviços — deve apenas REFERENCIAR essa entidade pelo
 * `@id`, nunca redeclará-la: nós duplicados com dados divergentes (a base tinha
 * três números diferentes na Av. Rondon Pacheco) fazem o buscador e o LLM
 * escolherem arbitrariamente qual versão repetir.
 */
export const ORGANIZATION_SCHEMA_ID = '#organization'

/** Referência `{ '@id': ... }` para o nó AutoDealer canônico do layout raiz. */
export function organizationRef(): { '@id': string } {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, '')
  return { '@id': `${baseUrl}/${ORGANIZATION_SCHEMA_ID}` }
}
