import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Clique não é lead (decisão da Attra, 27/11/2026).
 *
 * A Meta recebe o lead quando ele chega ao vendedor, e só o de campanha. Quem
 * manda é o attra-py, pela API de Conversões, com o evento
 * `LeadEncaminhadoVendedor` (sistemas-attra-ia, PR #966). Por isso o navegador
 * não manda `Lead` à Meta, nem no clique do WhatsApp nem no formulário: a Meta
 * contaria como lead quem só clicou e aprenderia a buscar clique.
 *
 * A OpenAI não recebe nada pelo servidor. Ela fica com `lead_created` no
 * formulário enviado, nunca no clique.
 */

const SRC = path.resolve(__dirname, '../..')
const API = path.join(SRC, 'app', 'api')

/** Código que vai ao navegador: fora as rotas de API, que rodam no servidor, e os testes. */
function arquivosDoSite(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' || caminho === API ? [] : arquivosDoSite(caminho)
    }
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

const ARQUIVOS = arquivosDoSite(SRC).map((arquivo) => ({
  arquivo: path.relative(SRC, arquivo),
  codigo: readFileSync(arquivo, 'utf8'),
}))

function quem(teste: (codigo: string) => boolean): string[] {
  return ARQUIVOS.filter(({ codigo }) => teste(codigo)).map(({ arquivo }) => arquivo)
}

describe('clique não é lead', () => {
  it('o navegador não manda Lead à Meta', () => {
    const lead = /trackVehicle\(\s*['"`]Lead['"`]|fbq\([^)]*['"`]Lead['"`]/
    expect(quem((codigo) => lead.test(codigo))).toEqual([])
  })

  it('nenhum ouvinte de clique mede lead, em pixel nenhum', () => {
    const ouveClique = /addEventListener\(\s*['"`]click['"`]/
    const medeLead = /medirLeadOpenAI\(|lead_created|['"`]Lead['"`]/
    expect(quem((codigo) => ouveClique.test(codigo) && medeLead.test(codigo))).toEqual([])
  })

  it('a varredura enxerga os componentes de medição', () => {
    // Sem isto, um caminho errado deixaria os dois testes acima passando à toa.
    expect(ARQUIVOS.map(({ arquivo }) => arquivo)).toEqual(
      expect.arrayContaining([
        path.join('components', 'analytics', 'openai-pixel.tsx'),
        path.join('components', 'forms', 'sticky-contact-form.tsx'),
      ]),
    )
  })
})
