/**
 * Interruptor das páginas de marca na RAIZ do site.
 *
 * Cobre as duas rotas da raiz — `/ferrari` (editorial da marca) e
 * `/ferrari/roma` (modelo) — e NÃO toca em `/comprar/ferrari` nem em
 * `/comprar/ferrari/roma`, que são a família comercial e seguem no ar.
 *
 * Desligado em 19/08/2026 por decisão de produto e RELIGADO em 06/09/2026, a
 * pedido da Lorrayne. O booleano existir sozinho — em vez de a mudança estar
 * espalhada por quatro arquivos — é o que fez a volta custar uma linha.
 *
 * COMO DESLIGAR DE NOVO: trocar `true` por `false` aqui e publicar. Sai tudo
 * junto — as rotas deixam de ser geradas, as URLs somem do sitemap e a seção
 * editorial some do llms.txt. Nenhum conteúdo é apagado; `MARCAS_EDITORIAL`
 * continua intacto nos dois estados.
 *
 * POR QUE 404 E NÃO 410: 410 diz "foi embora de vez" e é o que se usa para
 * remoção definitiva. Como isto é reversível por premissa, 404 é o correto —
 * o buscador remove do índice mas trata a URL como algo que pode voltar.
 *
 * POR QUE APAGAR DO SITEMAP E DO llms.txt JUNTO: anunciar URL que responde 404
 * é pior que não anunciar. Ensina crawler e LLM que este domínio publica link
 * morto, e o custo cai sobre o site inteiro, não só sobre estas páginas.
 *
 * O MECANISMO é `generateStaticParams` devolver lista vazia com
 * `dynamicParams = false` nas duas rotas: sem params gerados, todo caminho cai
 * no 404 normal do Next. Não há verificação em tempo de execução, nem
 * middleware — as rotas simplesmente deixam de existir na build.
 */
export const MARCAS_NA_RAIZ_NO_AR = true

/**
 * Filtro a aplicar em qualquer lista de rotas da raiz. Devolve a lista intacta
 * quando as páginas estão no ar e vazia quando não estão.
 *
 * Existe para que os quatro pontos de uso digam a mesma coisa do mesmo jeito —
 * um `if` solto em cada arquivo é o que faz metade deles ficar para trás na
 * hora de reverter.
 */
export function seNoAr<T>(itens: T[]): T[] {
	return MARCAS_NA_RAIZ_NO_AR ? itens : []
}
