// Rotas que são FERRAMENTA, não site.
//
// O painel do admin é navegado pela própria equipe: em 30 dias foram 472
// visualizações, e `/admin` apareceu como a 4ª página mais vista do site
// inteiro — na frente de todas as fichas de veículo menos uma. Isso não é um
// detalhe estatístico: a tabela "páginas que mais prendem" é lida para decidir
// conteúdo, e ela estava medindo o tempo que a equipe passa no próprio CRM.
//
// Este arquivo é a ÚNICA definição do que é rota interna. Coleta e relatório
// leem daqui para não divergirem — uma lista que existisse em dois lugares
// acabaria filtrando no painel o que continua sendo gravado, ou o contrário.

/** Prefixos de caminho que não são conteúdo público. */
export const PREFIXOS_ROTAS_INTERNAS = ['/admin'] as const

/** O caminho pertence a uma ferramenta interna? */
export function ehRotaInterna(caminho: string | null | undefined): boolean {
	if (!caminho) return false
	// Compara o SEGMENTO inteiro: '/administrativo' não pode ser confundido com
	// '/admin' por prefixo de string.
	return PREFIXOS_ROTAS_INTERNAS.some(p => caminho === p || caminho.startsWith(`${p}/`))
}

/**
 * Os mesmos prefixos como padrões LIKE, para as consultas de relatório.
 * Espelha `ehRotaInterna`: `/admin` e tudo abaixo dele.
 */
export const PADROES_LIKE_ROTAS_INTERNAS: string[] = PREFIXOS_ROTAS_INTERNAS.flatMap(p => [p, `${p}/%`])
