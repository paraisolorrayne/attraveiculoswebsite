/**
 * As abas de Visitantes da área da agência. Módulo comum (sem 'use client'):
 * a página de servidor valida a aba com esta lista, e uma constante importada
 * de um arquivo de cliente chegaria ao servidor como referência, não como array.
 */
export const ABAS_VISITANTES = [
	{ aba: 'visao-geral', rotulo: 'Visão geral' },
	{ aba: 'origens', rotulo: 'Origens' },
	{ aba: 'entradas', rotulo: 'Entradas' },
	{ aba: 'sessoes', rotulo: 'Sessões' },
	{ aba: 'comportamento', rotulo: 'Comportamento' },
	{ aba: 'veiculos', rotulo: 'Veículos' },
] as const
