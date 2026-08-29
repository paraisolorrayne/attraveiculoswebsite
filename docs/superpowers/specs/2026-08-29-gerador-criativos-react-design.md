# Gerador de Criativos: do HTML auto-contido para página React

**Data:** 29/08/2026 · **Pedido:** Lorrayne — "a página é um html, vamos converter ela para ser uma página codada igual o site, sendo muito cauteloso pra não perder o funcional dela"

---

## 1. O que existe hoje

`content/admin/gerador-criativos.html` é um arquivo único, auto-contido, servido
dentro de um `<iframe>` pela rota `GET /api/admin/marketing/gerador-criativos`.

| | |
|---|---|
| Arquivo | 2.595 linhas · **1,2 MB** |
| **1,04 MB (87%)** | 7 imagens em `data:` base64 — fachada do Clássico, fachada da loja, fundo do Editorial, texturas de piso (concreto/asfalto), logo branca, logo preta |
| Código | 97 KB · 2.265 linhas de JS sem módulos · 39 funções |
| CSS | 4 KB |
| Controles | 47 campos (6 upload, 17 sliders, 24 texto) + 18 botões |
| Formatos | Clássico, Clássico Loja, Destaque, Estoque, Editorial, Ficha |
| Integrações | `/api/vehicles?search=`, rembg, publicar-status (WhatsApp), creatives (board do Marketing) |

O HTML é a fonte da verdade; `scripts/gen-gerador-criativos.mjs` o embute como
string em `gerador-html.ts`, e `scripts/check-gerador-criativos.mjs` roda no CI
para impedir que os dois divirjam — guarda criada depois de 02/08/2026, quando
estiveram 72 linhas fora de sincronia e um deploy reverteu produção sem avisar.

### O que já é React

`src/app/admin/gerador-criativos/` é uma casca com duas abas: **Criativos** (o
iframe) e **Story Vendido**, que já é React e já desenha canvas 1080×1920. O
Story é o precedente a seguir:

```
content/admin/creative/story-vendido.ts   motor de desenho, módulo ES puro (328 linhas)
content/admin/creative/fonts.css          @font-face por instância de eixo
public/creative/*.webp|png                assets por URL
src/app/admin/.../story-vendido-admin.tsx UI React (389 linhas): formulário, prévia, export
```

O cabeçalho do `story-vendido-admin.tsx` inclusive explica por que o gerador
ficou de fora na época: *"enfiá-lo ali significaria converter o HTML inteiro
para módulos"*. É exatamente o que este documento planeja.

---

## 2. Por que converter

1. **Peso**: o iframe baixa 1,2 MB a cada abertura. Com as imagens em
   `/public/gerador/`, o navegador as cacheia e o código cai para ~100 KB.
2. **Fluxo de trabalho**: hoje editar o gerador exige lembrar de rodar
   `gen-gerador-criativos.mjs`; esquecer significa produção diferente do fonte.
   A guarda de CI existe só por causa disso — e some junto.
3. **Testabilidade**: o motor vira módulo importável, e o que hoje só se verifica
   abrindo a tela passa a ter teste.
4. **Coerência**: tema, tipografia e navegação do admin, sem iframe.

## 3. O que NÃO muda (a régua do "não perder o funcional")

Nenhum comportamento visível ao operador. Especificamente:

- os 6 formatos saem **pixel a pixel iguais**;
- os 47 controles, com os mesmos valores padrão (inclusive o enquadramento
  calibrado de `f1`: zoom .88, y .18);
- busca no estoque preenchendo campos e fotos, com pré-seleção da Ficha;
- remover fundo (rembg) e o gate de qualidade;
- publicar no status do WhatsApp;
- baixar Stories + Feed e enviar os dois ao board do Marketing;
- logo lembrada em `localStorage`;
- a aba Story Vendido, intocada.

---

## 4. Arquitetura

Espelha o Story Vendido — motor separado da UI.

```
content/admin/creative/gerador/
  tipos.ts             EstadoCriativo, FormatoId, OpcoesFoto, Assets
  assets.ts            caminhos em /public/gerador/ + carregamento e cache
  desenho.ts           helpers de canvas (drawPhoto, spacedText, wrapLines, rr,
                       placeholder, drawPhotoFeather, drawPhotoBanda,
                       fotoComPisoApagado, baseDoRecorte, bboxDoRecorte,
                       grainCanvas, drawLogoWhite/Black, cantoArredondado…)
  formatos/
    classico.ts  classico-loja.ts  destaque.ts  estoque.ts  editorial.ts  ficha.ts
  index.ts             FORMATOS (id, nome, descrição) + render(ctx, estado, altura)

public/gerador/        as 7 imagens extraídas do base64

src/app/admin/gerador-criativos/
  criativos-admin.tsx  UI da aba (substitui o iframe)
  campos.tsx           os 47 controles, agrupados por formato
  usa-gerador.ts       hook: estado, imagens carregadas, redesenho
  baixar.ts            Stories + Feed + envio ao Marketing
```

**Estado**: hoje é um objeto global mutável (`state`) com `render()` chamado a
cada evento. Em React vira `useState<EstadoCriativo>` (dados serializáveis) +
`useRef` para os `HTMLImageElement` — imagem não entra em estado de React: não é
serializável e mudá-la não deve disparar reconciliação. O redesenho acontece num
`useEffect` que depende do estado, agendado em `requestAnimationFrame` para o
arraste de slider não redesenhar mais de uma vez por quadro.

**Fontes**: o canvas depende de Montserrat estar carregada — hoje o HTML puxa do
Google Fonts e o código chama `document.fonts.ready`. O site já carrega
Montserrat via `next/font` (`--font-montserrat` no layout raiz), então a UI usa a
mesma instância e mantém o `await document.fonts.ready` antes do primeiro
desenho, como o Story faz.

**Imagens**: `assets.ts` carrega por URL com cache em módulo. A logo preta
continua sendo processada no cliente (branco → transparente), como hoje.

---

## 5. A rede de segurança: regressão pixel a pixel

Esta é a parte que sustenta "não perder o funcional". **Antes** de o iframe sair
do ar, uma página de comparação (`/admin/gerador-criativos/regressao`, só em
desenvolvimento) carrega lado a lado o HTML antigo e o motor novo, renderiza os
**6 formatos × 2 veículos** (G 63 AMG e McLaren GTS, as fotos de teste de
sempre) com estado idêntico, e compara `ImageData` pixel a pixel.

Critério de aceite: **zero pixels diferentes**. Ambos rodam no mesmo navegador,
com a mesma fonte e o mesmo canvas — não há motivo para divergir. Qualquer
diferença é regressão e é investigada antes da troca, não depois.

A comparação também roda com os casos difíceis já registrados: RAM 2500 (a
picape que não cabe no rodapé sem mexer no corte), Clássico com recorte de fundo
ligado, Estoque com 4 carros, e o Feed 4:5 de cada formato.

---

## 6. Ordem de execução

Um só entregável, mas em passos verificáveis — a troca do iframe é o último.

1. **Extrair as imagens** para `/public/gerador/`, com o HTML atual passando a
   referenciá-las por URL. Verificável na hora: a página continua idêntica e
   perde 1 MB.
2. **Portar o motor** para `content/admin/creative/gerador/`, cópia 1:1 —
   **incluindo os comentários**, que são o registro de por que cada coordenada é
   aquela (o véu que lavava a borracha do pneu, a banda que não pode invadir o
   texto, o corte da RAM, o piso Pérola sobre a textura de concreto).
3. **Página de regressão** e execução do comparativo até dar zero diferença.
4. **UI em React** com os 47 controles e as 4 integrações.
5. **Trocar o iframe** pela aba React e remover o que morre (item 7).

## 7. O que sai do repositório

- `content/admin/gerador-criativos.html`
- `src/app/api/admin/marketing/gerador-criativos/gerador-html.ts` (gerado)
- `src/app/api/admin/marketing/gerador-criativos/route.ts` (servia o HTML)
- `scripts/gen-gerador-criativos.mjs` e `scripts/check-gerador-criativos.mjs`
- o passo "Gerador de criativos em dia com o fonte" do CI
- a menção ao fluxo de regenerar em `docs/ADMIN_PANEL.md` §7.1

As sub-rotas `/api/admin/marketing/gerador-criativos/{rembg,publicar-status}`
**ficam** — são chamadas pelo gerador, não servem o HTML.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Calibração visual se perder | Regressão pixel a pixel com aceite em zero diferença (§5) |
| Fonte carregar depois do desenho | `await document.fonts.ready` antes do primeiro render, como no Story |
| Perder uma integração no caminho | Lista explícita em §3, conferida uma a uma na tela nova antes da troca |
| Arraste de slider engasgar | Redesenho em `requestAnimationFrame`, um por quadro |
| Regressão só aparecer em produção | O comparativo roda local, e o deploy só acontece depois de a diferença ser zero |

## 9. Depois desta conversão

Formato novo **"mosaico em faixa"** (conceito trazido pela Lorrayne a partir de
um patrocinado da Avantgarde, com identidade Attra própria — nada copiado):
faixa de 3 fotos no topo, título com respiro, destaques, foto principal e preço
grande, com o terço inferior livre para o CTA do Instagram. Nasce já no motor
novo, como um arquivo em `formatos/`. Especificação própria, depois desta.
