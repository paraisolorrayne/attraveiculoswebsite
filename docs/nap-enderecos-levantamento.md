# Levantamento de endereço nas fontes públicas (NAP)

**Data:** 07/08/2026
**Motivo:** a Attra mudou de endereço recentemente. Registros antigos sobrevivem em
cadastros de terceiros, e endereço conflitante entre fontes faz buscador e modelo de
linguagem hesitarem em recomendar a loja — foi um dos pontos da auditoria de visibilidade.

## O endereço correto

```
Av. Rondon Pacheco, 1670 — Vigilato Pereira
Uberlândia — MG, CEP 38408-343
Telefone (34) 3014-3232 · (34) 3226-0202 · WhatsApp (34) 99944-4747
Seg-Sex 8h30 às 18h · Sábado 9h às 12h30
```

Fonte de verdade: ficha do Google Meu Negócio, conferida em 04/08/2026 (coordenadas
validadas por Plus Code). O site lê tudo de `src/lib/constants.ts` — mudou lá, mudou
em rodapé, JSON-LD, `llms.txt` e páginas.

## Endereços ANTIGOS a procurar

Ao varrer um cadastro, procure por qualquer um destes:

| Endereço antigo | Onde já foi encontrado |
|---|---|
| **Av. João Pinheiro, 2564 — CEP 38400-714** | Mobiauto |
| Av. Rondon Pacheco, 4600 — Tibery | JSON-LD do próprio site (já corrigido) |
| Av. João Naves de Ávila | JSON-LD do próprio site (já corrigido) |

## O que foi verificado

| Fonte | Endereço publicado | Situação |
|---|---|---|
| Site attraveiculos.com.br | Rondon Pacheco, 1670 | ✅ correto |
| Google Meu Negócio | Rondon Pacheco, 1670 · 38408-343 | ✅ correto |
| **Mobiauto** | **João Pinheiro, 2564 · 38400-714** | ❌ **antigo — corrigir** |
| OLX | só "Uberlândia — MG", sem logradouro | ⚠️ incompleto |
| Webmotors | só "Uberlândia (MG)" nos anúncios | ⚠️ incompleto |
| Facebook | nenhum endereço cadastrado | ⚠️ ausente |
| Wanderboat (agregador) | Rondon Pacheco, 1670 | ✅ (copiou do Google) |

O Mobiauto tem ainda **zero veículo à venda**. Se a loja não usa mais a plataforma, o
melhor é encerrar o perfil: cadastro abandonado com endereço errado é pior que cadastro
nenhum.

## O que NÃO consegui verificar, e por quê

Buscadores e a maior parte dos diretórios bloqueiam acesso automatizado (Cloudflare,
403). Não contornei essas proteções. **A lista abaixo precisa ser conferida à mão** —
são as fontes mais prováveis de carregar o endereço antigo:

- [ ] **Registros de CNPJ** — cnpj.biz, Casa dos Dados, Econodata, Consulta Sócio.
      Prioridade alta: refletem o cadastro da Receita e são muito citados por LLM.
      Se a Receita ainda tem o antigo, todos os espelhos vão repetir.
- [ ] **Reclame Aqui** — a auditoria apontou que não há perfil oficial verificado.
      Criar já resolve dois problemas: endereço correto e canal de reclamação.
- [ ] **iCarros** — a Attra opera lá (o webhook do CRM distingue leads dessa origem).
- [ ] **Apontador, Telelistas, Solutudo, GuiaMais** — diretórios que copiam de fontes
      antigas e raramente são atualizados sozinhos.
- [ ] **Apple Maps, Waze, Bing Places** — mapas fora do Google, cada um com cadastro
      próprio.
- [ ] **Instagram** — conferir se a bio ou o endereço do perfil comercial traz algo.
- [ ] **Foursquare** — alimenta vários outros serviços.

## Como conferir cada um

Buscar por `attra veiculos uberlandia` na plataforma e comparar três campos:

1. **Logradouro e número** — Rondon Pacheco, 1670
2. **CEP** — 38408-343 (o antigo, 38400-714, é o sinal mais rápido de cadastro velho)
3. **Telefone** — (34) 3014-3232

Divergência em qualquer um deles vale correção.

## Uma inconsistência à parte: avaliações

Três fontes exibem "avaliação do Google" com números diferentes:

| Onde | Nota | Avaliações |
|---|---|---|
| Ficha do Google | 4,9 | 84 |
| OLX | 4,7 | 157 |
| Wanderboat | 4,9 | 51 |

Pode ser só defasagem de sincronização de cada plataforma. Mas vale confirmar que não
existe uma **segunda ficha do Google** no ar — foi exatamente esse tipo de duplicidade
que gerou o endereço errado que o site publicou até 02/08/2026.
