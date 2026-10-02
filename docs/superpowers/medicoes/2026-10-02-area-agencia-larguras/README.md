# Área da agência — verificação de largura (02/10/2026)

Medido no Chrome, com o servidor local (`npm run dev`) e o banco local
(`docs/AMBIENTE_LOCAL.md`), logado como a agência Media House. Cada tela foi
carregada num quadro da largura indicada e conferida com
`document.documentElement.scrollWidth <= largura`.

| Largura | Telas sem rolagem lateral |
|---|---|
| 360 px | 10/10 |
| 768 px | 10/10 |
| 1280 px | 10/10 |
| 1920 px | 10/10 |

Telas: Resumo; Visitantes (Visão geral, Origens, Entradas, Sessões,
Comportamento, Veículos); detalhe de campanha; detalhe de sessão; Campanhas.

A medição foi refeita depois dos ajustes desta verificação (seletor de
período duplicado na Visão geral, coluna do nome da campanha) com o mesmo
resultado.

Prints: `celular-390-*` (390 px) e `desktop-1280-resumo.jpg`. O print
`…-ANTES.jpg` é anterior à correção do score (mostrava 0,1% em vez de 5,3%)
e do seletor duplicado.
