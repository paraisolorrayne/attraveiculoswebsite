# Fonte de verdade editorial da Attra

Esta pasta é a fonte de verdade do canal editorial (`/blog` e `/news`), conforme a spec
`docs/superpowers/specs/2026-07-24-attra-editorial-design.md`. É o que separa conteúdo
que soa como a Attra de conteúdo que soa genérico — a diferença não está no modelo nem
no prompt, está aqui.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `voz.md` | Posicionamento, os três pilares, o filtro do irmão, pares de exemplo |
| `regras.md` | Guard-rails em forma de proibição + as cinco checagens da revisão humana |
| `fatos.md` | Institucional confirmado pelos sócios (o modelo reproduz, jamais deriva) |
| `custos.md` | Base de custo brasileiro, recorte de MG. Cada linha datada e com origem |
| `glossario.md` | Vocabulário e como a Attra o usa |
| `formatos/` | Templates de estrutura fixa por formato de pauta |
| `publicados.json` | Índice do que já saiu: evita repetir pauta e canibalizar palavra-chave |

## Convenções

- **`[PENDENTE-SÓCIOS: pergunta]`** marca fato ainda não confirmado. Nenhuma peça que
  dependa de um fato pendente pode ser publicada até o marcador ser resolvido.
- **`[PENDENTE-LEVANTAMENTO]`** marca dado de custo ainda não coletado. A regra da spec
  vale: sem número com fonte e data, o trecho não entra na peça.
- Divisão das fontes: estes arquivos são a **verdade estática**; o feed de estoque
  (AutoConf) é a **verdade dinâmica**. A IA nunca inventa nenhuma das duas; combina.

## Estado

**Fase 0 (fundação).** Os arquivos ainda **não** são carregados pelo pipeline de geração
(`src/lib/blog-ai/`). A ligação com `gemini-blog.ts` acontece na Fase 2, depois da
calibração manual da Fase 1. Calibrar antes de automatizar — a ordem não é negociável.
