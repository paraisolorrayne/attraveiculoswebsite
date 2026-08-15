# Superesportivos — mapeamento da infraestrutura existente

Item 28 dos specs: antes de desenvolver, registrar o que existe. Levantado em
14/08/2026 sobre o `master` (`4b2d7a6`).

Conclusão curta: **grande parte da camada de marca já existe** e está orientada
a dados. O trabalho real é menor e diferente do que os specs presumem.

## Inventário

| Item | Situação | Onde está |
|---|---|---|
| Estoque / API de veículos | REUTILIZAR | `src/lib/autoconf-api.ts` (`getVehicles`) |
| Card de veículo | REUTILIZAR | `src/components/vehicles/vehicle-card.tsx` |
| Página de veículo | REUTILIZAR | `/veiculo/[slug]` |
| Breadcrumb | REUTILIZAR | `src/components/ui/breadcrumb.tsx` |
| FAQ (componente + schema) | REUTILIZAR | `src/components/home/faq-section.tsx`, `src/components/seo/faq-schema.tsx` |
| Formulário Solicitar Veículo | ESTENDER | `src/components/forms/vehicle-request-form.tsx` — já aceita `origem` e tem campos `brand`/`model`, mas **não pré-preenche** a marca da página nem carrega `source_category` |
| **Template de página de marca** | **JÁ EXISTE** | `/comprar/[brand]` — 364 linhas, `generateStaticParams`, metadata, breadcrumb, editorial, modelos, form |
| **Template de página de modelo** | **JÁ EXISTE** | `/comprar/[brand]/[model]` — o que os specs chamam de "futuro" |
| **CMS de marcas/modelos** | **JÁ EXISTE** | `src/lib/seo-brands.ts` — 10 marcas, 31 modelos, campos quase 1:1 com o item 19 do spec 1 |
| Filtro por marca | **CORRIGIR** | ver auditoria abaixo — bloqueador |
| `/superesportivos` | CRIAR | não existe |
| Classificação editorial (hypercar × performance) | CRIAR | não existe em `SEO_BRANDS` |
| Analytics de marca/modelo | CRIAR | há GTM, mas nenhum evento `brand_page_view`/`vehicle_request` |

### Marcas já cadastradas

`porsche`, `ferrari`, `bmw`, `mercedes-benz`, `audi`, `land-rover`,
`chevrolet`, `mclaren`, `lamborghini`, `bentley`.

Da primeira onda dos specs (Ferrari, Lamborghini, Porsche, McLaren, Aston
Martin), **só falta Aston Martin**.

## Auditoria do filtro de marca (item 8 — bloqueador)

Medido contra o estoque real: 77 veículos, 16 marcas distintas.

### O problema relatado não se reproduz

`/veiculos?marca=ferrari` devolve **exatamente 5 Ferrari** — três 296 GTB, uma
296 GTS e uma SF90. Nenhum veículo de outra marca.

O filtro (`vehicle-grid.tsx:47`) usa `includes()` em vez de igualdade, o que é
frágil por princípio, mas com o conjunto atual de marcas não produz falso
positivo: nenhum nome de marca do estoque é substring de outro.

Se houver um caso concreto, é preciso o print ou o veículo específico — pode
ser divergência de dado no AutoConf (modelo de uma marca cadastrado sob outra),
que nenhuma correção de filtro resolve.

### O problema real é o inverso: marca que some

| Filtro | Resultado | Causa |
|---|---|---|
| `mercedes-benz` | **0 veículos** | o estoque grava `"Mercedes"`; o filtro procura `"mercedes benz"` |
| `bentley` | 0 | legítimo — não há Bentley em estoque |

São **10 Mercedes invisíveis** hoje, e a falha atinge os dois caminhos:

- listagem: `includes()` com `.replace('-', ' ')` — `"mercedes"` não contém `"mercedes benz"`;
- página de marca: igualdade exata contra `name: 'Mercedes-Benz'` — não bate com `"Mercedes"`.

Além disso, `.replace('-', ' ')` troca só a **primeira** ocorrência: um slug com
dois hífens (`mercedes-amg`, `aston-martin-db11`) fica pela metade.

### O que isso significa para o projeto

Construir as landing pages sobre esse filtro faz cada marca cujo nome no
AutoConf divergir do cadastro **nascer vazia** — e o spec 2 (item 21) quer
justamente que a página funcione sem estoque, não que ela finja não haver
estoque quando há.

**Correção proposta:** uma camada de normalização de marca (alias → canônico),
usada pelos dois caminhos. Resolve o Mercedes, blinda as páginas novas e não
depende de nenhuma decisão de URL.

## Conflito de URL — decisão pendente

Os specs pedem `/ferrari` e `/ferrari/296-gtb`. O site já serve
`/comprar/ferrari` e `/comprar/ferrari/296-gtb`, com o mesmo conteúdo e a
mesma intenção comercial.

Publicar as duas é exatamente a canibalização que o spec 2 condena no item 6.
Só há três saídas coerentes:

1. **Mover** — `/ferrari` passa a ser a URL, `/comprar/ferrari` vira redirect 301.
   Melhor URL, mas descarta o histórico de indexação das páginas atuais.
2. **Manter** — `/comprar/ferrari` continua, cria-se só `/superesportivos` por
   cima. Zero risco, mas contraria a arquitetura pedida.
3. **Canonical** — as duas existem, `/comprar/*` aponta canonical para `/*`.
   Meio-termo, mas mantém duas páginas para a mesma intenção.

Não é decisão técnica: depende de quanto tráfego orgânico `/comprar/*` já
traz. Vale medir no Search Console antes de escolher.
