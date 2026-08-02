/**
 * O corpo dos posts vem do banco como HTML livre, e parte deles abre com um
 * `<h1>` repetindo o título — o template já emite o h1 do post, então a página
 * saía com dois. Dois h1 no mesmo documento não dizem ao buscador nem ao LLM
 * qual é o assunto da página.
 *
 * Rebaixamos o h1 do corpo para h2 na renderização (não no banco: o conteúdo é
 * editado pelo admin e a correção precisa valer para post novo também). O
 * atributo `data-demoted-h1` existe só para o CSS de `.blog-prose` manter a
 * aparência original de h1 — o rebaixamento é semântico, não visual.
 */

const OPENING_H1 = /<h1(\s[^>]*)?>/gi
const CLOSING_H1 = /<\/h1\s*>/gi

export function demoteContentH1(html: string): string {
  return html
    .replace(OPENING_H1, (_match, attrs: string | undefined) => `<h2${attrs ?? ''} data-demoted-h1>`)
    .replace(CLOSING_H1, '</h2>')
}
