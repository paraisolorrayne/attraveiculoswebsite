# Gerador de Criativos em React — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converter o Gerador de Criativos de um HTML auto-contido de 1,2 MB servido por iframe para uma página React do admin, sem que nenhuma peça saia um pixel diferente.

**Architecture:** Espelha o Story Vendido, que já resolve esse problema no projeto: motor de desenho em módulo ES puro (`content/admin/creative/gerador/`), assets por URL em `/public/gerador/`, UI React consumindo o motor. A troca do iframe é o último passo e só acontece depois de a regressão pixel a pixel dar zero diferença.

**Tech Stack:** TypeScript, Next.js 16 (App Router), React 19, Canvas 2D, vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-29-gerador-criativos-react-design.md`

## Global Constraints

- **Zero mudança de comportamento.** Os 6 formatos, os 47 controles, os valores padrão e as 4 integrações continuam idênticos. Qualquer melhoria de UI fica para depois da troca.
- **Porte 1:1 inclui os comentários.** Cada comentário do HTML é o registro de por que uma coordenada é aquela (o véu que lavava a borracha do pneu, a banda que não pode invadir o texto, o corte da RAM). Copiar o código sem eles é perder o funcional de outro jeito.
- **Nomes em português**, como o resto do módulo de visitantes e o Story Vendido.
- **Sem deploy.** Commit e push (que só rodam CI) são permitidos; `deploy-vps.sh` só com autorização da Lorrayne.
- **Enquadramento padrão de `f1` é `{zoom: .88, x: .5, y: .18}`** — calibrado pela Lorrayne em 04/08/2026 e precisa bater com os `value=` dos sliders.
- **Canvas Stories 1080×1920; Feed 1080×1350.** A altura é variável (`H`), e cada formato tem um ramo `FEED` só no rodapé.
- Fotos de teste: `~/Downloads/attra-fotos-teste/` (G 63, McLaren GTS, RAM 2500). O `file_upload` do Chrome recusa `~/Downloads`; copiar para o scratchpad antes.

---

## Inventário: o que será portado

**7 imagens embutidas** (1,04 MB de base64) → `/public/gerador/`:

| Variável no HTML | Formato | Peso | Arquivo destino |
|---|---|---|---|
| `hdr-logo` (tag `<img>`, vira `officialLogo`) | PNG | 61 KB | `logo-branca.png` |
| `blackLogoImg` | JPEG | 40 KB | `logo-preta.jpg` |
| `edFundoImg` | JPEG | 213 KB | `fundo-editorial.jpg` |
| `facadeClassicoImg` | JPEG | 241 KB | `fachada-classico.jpg` |
| `facadeImg` | JPEG | 311 KB | `fachada-loja.jpg` |
| `pisoImgs.concreto` | JPEG | ~100 KB | `piso-concreto.jpg` |
| `pisoImgs.asfalto` | JPEG | ~80 KB | `piso-asfalto.jpg` |

**39 funções.** Helpers de desenho: `grainCanvas`, `spacedText`, `spacedWidth`, `wrapLines`, `rr`, `cantoArredondado`, `linhaTracejada`, `drawPhoto`, `drawPhotoFeather`, `drawPhotoBanda`, `fotoEmMoldura`, `fotoComPisoApagado`, `bboxDoRecorte`, `baseDoRecorte`, `placeholder`, `drawDefaultLogo`, `drawLogoWhite`, `drawLogoBlack`, `autoFrameFoto1`, `edTextoEsq`, `edTextoCentro`. Formatos: `renderClassicoOriginal`, `renderClassicoLoja`, `renderDestaque`, `renderEstoque`, `renderEditorial`, `renderFicha`, `render`, `renderFeed`. UI/integração: `loadImg`, `reduzirParaEnvio`, `updateVisibility`, `buscarEstoque`, `aplicarVeiculo`, `sugerirLinkDoStatus`, `preSelecionarFotosDaFicha`, `montarFotosEstoque`, `pintarSlotAtivo`, `avancarSlot`, `marcarThumbUsada`.

---

### Task 1: Imagens saem do base64 para `/public/gerador/`

Primeiro passo verificável na hora: o HTML continua funcionando idêntico e perde 1 MB. Feito ainda no HTML atual, de propósito — se algo quebrar, é uma linha para reverter.

**Files:**
- Create: `public/gerador/{logo-branca.png,logo-preta.jpg,fundo-editorial.jpg,fachada-classico.jpg,fachada-loja.jpg,piso-concreto.jpg,piso-asfalto.jpg}`
- Create: `scripts/extrair-imagens-gerador.mjs` (uso único, removido na Task 7)
- Modify: `content/admin/gerador-criativos.html` (7 pontos)
- Modify: `src/app/api/admin/marketing/gerador-criativos/gerador-html.ts` (regenerado)

**Interfaces:**
- Produces: os 7 arquivos em `/public/gerador/`, com estes nomes exatos. As Tasks 2 e 6 os consomem por URL.

- [ ] **Step 1: Escrever o extrator**

```js
// scripts/extrair-imagens-gerador.mjs
// Uso único: tira as imagens embutidas do HTML do gerador e grava em
// public/gerador/. Depois de rodar, o HTML passa a referenciá-las por URL.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(resolve(root, 'content/admin/gerador-criativos.html'), 'utf8')
mkdirSync(resolve(root, 'public/gerador'), { recursive: true })

/** Cada alvo: como achar o base64 no HTML e com que nome gravar. */
const ALVOS = [
  { nome: 'logo-branca.png',      re: /class="hdr-logo" src="data:image\/png;base64,([^"]+)"/ },
  { nome: 'logo-preta.jpg',       re: /blackLogoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fundo-editorial.jpg',  re: /edFundoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fachada-classico.jpg', re: /facadeClassicoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fachada-loja.jpg',     re: /facadeImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'piso-concreto.jpg',    re: /concreto: 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'piso-asfalto.jpg',     re: /asfalto: 'data:image\/jpeg;base64,([^']+)'/ },
]

for (const { nome, re } of ALVOS) {
  const m = html.match(re)
  if (!m) throw new Error(`não achei o base64 de ${nome}`)
  const destino = resolve(root, 'public/gerador', nome)
  writeFileSync(destino, Buffer.from(m[1], 'base64'))
  console.log(`${nome}: ${(m[1].length / 1024).toFixed(0)} KB base64 → ${(Buffer.from(m[1], 'base64').length / 1024).toFixed(0)} KB`)
}
```

- [ ] **Step 2: Rodar e conferir que os 7 arquivos abrem**

Run: `node scripts/extrair-imagens-gerador.mjs && file public/gerador/*`
Expected: sete linhas, cada uma dizendo `JPEG image data` ou `PNG image data`, com as dimensões. Se algum arquivo sair com 0 bytes ou `data`, o regex pegou o pedaço errado — corrigir antes de seguir.

- [ ] **Step 3: Apontar o HTML para as URLs**

Trocar os sete pontos. Exemplo do padrão (aplicar aos sete):

```html
<!-- antes -->
<img class="hdr-logo" src="data:image/png;base64,iVBORw0…">
<!-- depois -->
<img class="hdr-logo" src="/gerador/logo-branca.png">
```

```js
// antes
edFundoImg.src = 'data:image/jpeg;base64,/9j/2wBDAAYEBQ…';
// depois
edFundoImg.src = '/gerador/fundo-editorial.jpg';
```

```js
// antes
for(const [k, src] of Object.entries({
  concreto: 'data:image/jpeg;base64,…',
  asfalto: 'data:image/jpeg;base64,…',
})){
// depois
for(const [k, src] of Object.entries({
  concreto: '/gerador/piso-concreto.jpg',
  asfalto: '/gerador/piso-asfalto.jpg',
})){
```

- [ ] **Step 4: Regenerar o módulo e medir**

Run: `node scripts/gen-gerador-criativos.mjs && node scripts/check-gerador-criativos.mjs && wc -c content/admin/gerador-criativos.html`
Expected: `OK: … (≈100 KB)`, guarda passando, e o HTML abaixo de 110 KB (era 1,2 MB).

- [ ] **Step 5: Conferir na tela que nada mudou**

Servir o HTML no scratchpad (`python3 -m http.server`), copiar `public/gerador/` para o lado, abrir no Chrome, carregar o G 63 e renderizar os 6 formatos. As imagens de fundo (fachada, piso, editorial, logos) precisam aparecer. Guardar as 6 capturas: elas são a referência visual da Task 5.

- [ ] **Step 6: Commit**

```bash
git add public/gerador scripts/extrair-imagens-gerador.mjs content/admin/gerador-criativos.html src/app/api/admin/marketing/gerador-criativos/gerador-html.ts
git commit -m "Gerador: imagens saem do base64 para /public/gerador"
```

---

### Task 2: Motor — tipos, assets e a matemática de enquadramento

O que dá para testar sem navegador sai como função pura aqui; o resto do desenho vem na Task 3 e é coberto pela regressão visual.

**Files:**
- Create: `content/admin/creative/gerador/tipos.ts`
- Create: `content/admin/creative/gerador/assets.ts`
- Create: `content/admin/creative/gerador/enquadramento.ts`
- Test: `src/lib/__tests__/gerador-enquadramento.test.ts`

**Interfaces:**
- Consumes: os arquivos de `/public/gerador/` (Task 1).
- Produces:
  - `type FormatoId = 'classico' | 'classico-loja' | 'destaque' | 'estoque' | 'editorial' | 'ficha'`
  - `interface OpcoesFoto { zoom: number; x: number; y: number }`
  - `interface EstadoCriativo` (campos de texto, `foto1..4`, `estFotos`, `f1..f4`, `pisoTipo`, `edRot`, `slotFoto`, `tipo`)
  - `interface Assets { logoBranca, logoPreta, fundoEditorial, fachadaClassico, fachadaLoja, pisoConcreto, pisoAsfalto: HTMLImageElement }`
  - `carregarAssets(): Promise<Assets>` — com cache em módulo
  - `enquadrar(img, caixa, opt, modo): { dx, dy, dw, dh }`
  - `enquadramentoAutomatico(largura, altura): OpcoesFoto`

- [ ] **Step 1: Escrever o teste do enquadramento**

A matemática é a de `drawPhoto` no HTML: `cover` por padrão, `fit` opcional, e o deslocamento limitado por `range = max(dw - rw, rw * .6)`.

```ts
// src/lib/__tests__/gerador-enquadramento.test.ts
import { describe, it, expect } from 'vitest'
import { enquadrar, enquadramentoAutomatico } from '@content/admin/creative/gerador/enquadramento'

const CAIXA = { x: 0, y: 0, largura: 1080, altura: 1000 }
const CENTRO = { zoom: 1, x: 0.5, y: 0.5 }

describe('enquadrar — cover (padrão)', () => {
	it('foto 4:3 numa caixa mais quadrada preenche a caixa inteira, cortando as laterais', () => {
		const r = enquadrar({ width: 1920, height: 1440 }, CAIXA, CENTRO, 'cover')
		expect(r.dh).toBeCloseTo(1000, 0)
		expect(r.dw).toBeGreaterThan(1080)
		expect(r.dy).toBeCloseTo(0, 0)
	})

	it('zoom amplia a partir do centro', () => {
		const base = enquadrar({ width: 1920, height: 1440 }, CAIXA, CENTRO, 'cover')
		const zoom = enquadrar({ width: 1920, height: 1440 }, CAIXA, { ...CENTRO, zoom: 1.5 }, 'cover')
		expect(zoom.dw).toBeCloseTo(base.dw * 1.5, 0)
		expect(zoom.dx).toBeLessThan(base.dx)
	})

	it('y = 0 sobe a foto e y = 1 desce, dentro do alcance', () => {
		const cima = enquadrar({ width: 1080, height: 2000 }, CAIXA, { zoom: 1, x: 0.5, y: 0 }, 'cover')
		const baixo = enquadrar({ width: 1080, height: 2000 }, CAIXA, { zoom: 1, x: 0.5, y: 1 }, 'cover')
		expect(cima.dy).toBeGreaterThan(baixo.dy)
	})
})

describe('enquadrar — fit', () => {
	it('mostra a foto inteira, sobrando espaço na caixa', () => {
		const r = enquadrar({ width: 1920, height: 1440 }, CAIXA, CENTRO, 'fit')
		expect(r.dw).toBeLessThanOrEqual(1080)
		expect(r.dh).toBeLessThanOrEqual(1000)
	})
})

describe('enquadramentoAutomatico — o padrão calibrado pela Lorrayne', () => {
	it('foto horizontal do estoque nasce com o recuo e a subida de sempre', () => {
		expect(enquadramentoAutomatico(1920, 1440)).toEqual({ zoom: 0.88, x: 0.5, y: 0.18 })
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/gerador-enquadramento.test.ts`
Expected: FAIL — `Failed to resolve import "@content/admin/creative/gerador/enquadramento"`.

- [ ] **Step 3: Escrever `tipos.ts`, `assets.ts` e `enquadramento.ts`**

`enquadramento.ts` recebe a matemática que hoje vive dentro de `drawPhoto` (linhas 470-509 do HTML), com os comentários originais. `assets.ts`:

```ts
// content/admin/creative/gerador/assets.ts
import type { Assets } from './tipos'

const ARQUIVOS = {
	logoBranca: '/gerador/logo-branca.png',
	logoPreta: '/gerador/logo-preta.jpg',
	fundoEditorial: '/gerador/fundo-editorial.jpg',
	fachadaClassico: '/gerador/fachada-classico.jpg',
	fachadaLoja: '/gerador/fachada-loja.jpg',
	pisoConcreto: '/gerador/piso-concreto.jpg',
	pisoAsfalto: '/gerador/piso-asfalto.jpg',
} as const

export function carregar(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error(`falhou ao carregar ${src}`))
		img.src = src
	})
}

let cache: Promise<Assets> | null = null

/** Carrega uma vez por sessão do navegador; trocar de aba não rebaixa nada. */
export function carregarAssets(): Promise<Assets> {
	cache ??= (async () => {
		const [logoBranca, logoPretaCrua, fundoEditorial, fachadaClassico, fachadaLoja, pisoConcreto, pisoAsfalto] =
			await Promise.all(Object.values(ARQUIVOS).map(carregar))
		return {
			logoBranca,
			// A logo preta vem em JPEG (sem alpha): o branco do fundo vira
			// transparente aqui, como o HTML fazia, senão ela aparece num
			// retângulo branco sobre o piso.
			logoPreta: brancoParaTransparente(logoPretaCrua),
			fundoEditorial, fachadaClassico, fachadaLoja, pisoConcreto, pisoAsfalto,
		}
	})()
	return cache
}
```

`brancoParaTransparente` é o porte do bloco `blackLogoImg.onload` do HTML (limiar de luminância 232 e diferença de canais < 20), devolvendo um `HTMLCanvasElement` usável como imagem.

- [ ] **Step 4: Rodar o teste**

Run: `./node_modules/.bin/vitest run src/lib/__tests__/gerador-enquadramento.test.ts`
Expected: PASS (8 casos).

- [ ] **Step 5: Commit**

```bash
git add content/admin/creative/gerador src/lib/__tests__/gerador-enquadramento.test.ts
git commit -m "Gerador: tipos, assets por URL e a matemática de enquadramento com teste"
```

---

### Task 3: Portar os helpers de desenho e os 6 formatos

Transformação mecânica, e é por isso que ela é perigosa: o risco não é escrever errado, é "melhorar" algo no caminho. Copiar como está.

**Files:**
- Create: `content/admin/creative/gerador/desenho.ts`
- Create: `content/admin/creative/gerador/formatos/{classico,classico-loja,destaque,estoque,editorial,ficha}.ts`
- Create: `content/admin/creative/gerador/index.ts`

**Interfaces:**
- Consumes: `tipos.ts`, `assets.ts`, `enquadramento.ts` (Task 2).
- Produces:
  - `render(ctx: CanvasRenderingContext2D, estado: EstadoCriativo, assets: Assets, altura: number): void`
  - `FORMATOS: { id: FormatoId; nome: string; descricao: string }[]` — os seis, na ordem da tela: Clássico, Destaque, Estoque, Editorial, Ficha, Clássico Loja.
  - `ALTURA_STORIES = 1920`, `ALTURA_FEED = 1350`, `LARGURA = 1080`

- [ ] **Step 1: Portar `desenho.ts`**

As 21 funções de helper, na ordem em que aparecem no HTML. Regra da transformação, sem exceção:

| No HTML | No módulo |
|---|---|
| `ctx` global | primeiro parâmetro `ctx: CanvasRenderingContext2D` |
| `W`, `H` globais | `LARGURA` importado; `altura` como parâmetro |
| `state.x` | campo do parâmetro `estado` |
| `val('marca')` | `estado.marca` |
| `$('corte').value` | `estado.corte` (número no estado) |
| `pisoImgs[k]`, `facadeImg`… | `assets.pisoConcreto`, `assets.fachadaLoja`… |
| comentários | **copiados na íntegra** |

- [ ] **Step 2: Portar um formato e conferir a olho**

Começar pelo Destaque (o mais simples: sem recorte, sem piso, sem diagonal). Renderizar numa página de teste rápida e comparar com a captura da Task 1 Step 5.

- [ ] **Step 3: Portar os outros cinco**

Ordem: Ficha, Estoque, Editorial, Clássico, Clássico Loja (do mais simples ao que tem recorte de fundo e piso).

- [ ] **Step 4: Escrever `index.ts`**

```ts
export function render(
	ctx: CanvasRenderingContext2D,
	estado: EstadoCriativo,
	assets: Assets,
	altura: number,
): void {
	ctx.clearRect(0, 0, LARGURA, altura)
	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = 'high'
	ctx.textAlign = 'left'
	const ctxDoFormato = { ctx, estado, assets, altura }
	switch (estado.tipo) {
		case 'destaque': return renderDestaque(ctxDoFormato)
		case 'estoque': return renderEstoque(ctxDoFormato)
		case 'editorial': return renderEditorial(ctxDoFormato)
		case 'ficha': return renderFicha(ctxDoFormato)
		case 'classico-loja': return renderClassicoLoja(ctxDoFormato)
		default: return renderClassicoOriginal(ctxDoFormato)
	}
}
```

- [ ] **Step 5: `tsc` e lint limpos**

Run: `./node_modules/.bin/tsc --noEmit -p . 2>&1 | grep gerador; ./node_modules/.bin/eslint content/admin/creative/gerador`
Expected: nenhuma saída.

- [ ] **Step 6: Commit**

```bash
git add content/admin/creative/gerador
git commit -m "Gerador: motor de desenho portado para módulo ES, 1:1 com o HTML"
```

---

### Task 4: Página de regressão pixel a pixel

**Files:**
- Create: `src/app/admin/gerador-criativos/regressao/page.tsx`
- Create: `src/app/admin/gerador-criativos/regressao/comparador.tsx`

**Interfaces:**
- Consumes: `render`, `carregarAssets` (Tasks 2 e 3) e o HTML antigo, ainda servido por `/api/admin/marketing/gerador-criativos`.
- Produces: uma tela que mostra, por caso, `pixelsDiferentes` e `maiorDiferenca`, além das duas imagens lado a lado e o mapa de diferença.

- [ ] **Step 1: Escrever o comparador**

O iframe do HTML antigo expõe `window.state`, `window.render` e `window.cv` — o comparador usa isso para forçar o mesmo estado nos dois lados e comparar.

```ts
/** Compara dois canvases do mesmo tamanho. Zero é o único resultado aceito. */
export function comparar(a: HTMLCanvasElement, b: HTMLCanvasElement) {
	const da = a.getContext('2d')!.getImageData(0, 0, a.width, a.height).data
	const db = b.getContext('2d')!.getImageData(0, 0, b.width, b.height).data
	let diferentes = 0
	let maior = 0
	for (let i = 0; i < da.length; i += 4) {
		const d = Math.max(
			Math.abs(da[i] - db[i]),
			Math.abs(da[i + 1] - db[i + 1]),
			Math.abs(da[i + 2] - db[i + 2]),
			Math.abs(da[i + 3] - db[i + 3]),
		)
		if (d > 0) {
			diferentes++
			if (d > maior) maior = d
		}
	}
	return { diferentes, maior, total: da.length / 4 }
}
```

- [ ] **Step 2: Montar a matriz de casos**

12 obrigatórios (6 formatos × G 63 e McLaren), mais os difíceis: RAM 2500 no Clássico com corte -32, Clássico com recorte de fundo ligado, Estoque com 4 carros, e o Feed 1080×1350 de cada formato. Total: 22 casos.

- [ ] **Step 3: Rodar e registrar**

Run: abrir `/admin/gerador-criativos/regressao` no Chrome logado.
Expected nesta etapa: a tela funciona e mostra os números — as diferenças provavelmente não serão zero ainda.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/gerador-criativos/regressao
git commit -m "Gerador: página de regressão pixel a pixel entre o HTML e o motor novo"
```

---

### Task 5: Zerar as diferenças

**Files:** o que a regressão apontar, dentro de `content/admin/creative/gerador/`.

- [ ] **Step 1: Rodar os 22 casos e listar os que diferem**
- [ ] **Step 2: Para cada caso, achar a causa no porte** — comparar a função do módulo com a do HTML linha a linha. A causa quase sempre é uma destas: valor padrão trocado, ordem de desenho invertida, `save`/`restore` faltando, `ctx.shadowColor` não limpo, ou `H` fixo onde devia ser `altura`.
- [ ] **Step 3: Corrigir e rodar de novo, até 22/22 com `diferentes === 0`**
- [ ] **Step 4: Commit**

```bash
git commit -am "Gerador: motor novo bate pixel a pixel com o HTML nos 22 casos"
```

---

### Task 6: UI React da aba Criativos

**Files:**
- Create: `src/app/admin/gerador-criativos/criativos/criativos-admin.tsx`
- Create: `src/app/admin/gerador-criativos/criativos/campos.tsx`
- Create: `src/app/admin/gerador-criativos/criativos/usa-gerador.ts`
- Create: `src/app/admin/gerador-criativos/criativos/baixar.ts`

**Interfaces:**
- Consumes: `render`, `FORMATOS`, `carregarAssets`, `EstadoCriativo`.
- Produces: `<CriativosAdmin />`, consumido pela casca na Task 7.

- [ ] **Step 1: `usa-gerador.ts`** — estado, assets, e redesenho em `requestAnimationFrame`

```ts
export function usaGerador() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [estado, setEstado] = useState<EstadoCriativo>(ESTADO_INICIAL)
	// Imagens NÃO entram no estado: não são serializáveis e trocá-las não deve
	// disparar reconciliação — só redesenho.
	const imagens = useRef<ImagensDoOperador>({ foto1: null, foto2: null, foto3: null, foto4: null, estFotos: [null, null, null, null], foto1Cut: null })
	const [assets, setAssets] = useState<Assets | null>(null)
	const [pronto, setPronto] = useState(false)

	useEffect(() => {
		let vivo = true
		Promise.all([carregarAssets(), document.fonts.ready]).then(([a]) => {
			if (!vivo) return
			setAssets(a)
			setPronto(true)
		})
		return () => { vivo = false }
	}, [])

	// Um redesenho por quadro: arrastar slider dispara dezenas de eventos.
	useEffect(() => {
		if (!assets || !canvasRef.current) return
		const id = requestAnimationFrame(() => {
			render(canvasRef.current!.getContext('2d')!, { ...estado, ...imagens.current }, assets, ALTURA_STORIES)
		})
		return () => cancelAnimationFrame(id)
	}, [estado, assets])

	return { canvasRef, estado, setEstado, imagens, assets, pronto }
}
```

- [ ] **Step 2: `campos.tsx`** — os 47 controles, com `updateVisibility` virando renderização condicional por `estado.tipo`
- [ ] **Step 3: `baixar.ts`** — porte do download: `renderFeed` num canvas offscreen 1080×1350, dois PNGs baixados e dois `POST` em `/api/admin/marketing/creatives` com `format`
- [ ] **Step 4: `criativos-admin.tsx`** — seletor de formato, painel, prévia, e as três integrações restantes (busca no estoque, rembg, publicar no status)
- [ ] **Step 5: Conferir integração por integração, na tela**

Lista de §3 do spec, uma a uma: buscar "G 63" no estoque preenche campos e fotos; Ficha pré-seleciona; remover fundo funciona no Clássico e no Editorial; publicar no status responde; baixar gera os dois PNGs e cria dois cards no board; logo trocada continua depois do F5.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/gerador-criativos/criativos
git commit -m "Gerador: UI React da aba Criativos, com as quatro integrações"
```

---

### Task 7: Trocar o iframe e remover o que morre

Só depois de 22/22 na regressão e da lista de integrações conferida.

**Files:**
- Modify: `src/app/admin/gerador-criativos/gerador-criativos-admin.tsx`
- Delete: `content/admin/gerador-criativos.html`, `src/app/api/admin/marketing/gerador-criativos/{gerador-html.ts,route.ts}`, `scripts/{gen,check}-gerador-criativos.mjs`, `scripts/extrair-imagens-gerador.mjs`, `src/app/admin/gerador-criativos/regressao/`
- Modify: `.github/workflows/ci.yml` (sai o passo da guarda), `docs/ADMIN_PANEL.md` §7.1

- [ ] **Step 1: Trocar o `<iframe>` por `<CriativosAdmin />`** — o comentário do arquivo explica por que o iframe existia; substituir por um que explique por que deixou de existir
- [ ] **Step 2: Remover os arquivos mortos e o passo do CI**
- [ ] **Step 3: `npm test`, `tsc`, `eslint` e `npm run build`**

Expected: tudo verde, e nenhuma referência sobrando — `grep -rn "gerador-html\|gerador-criativos.html" src scripts .github` sem resultado.

- [ ] **Step 4: Atualizar `docs/ADMIN_PANEL.md` §7.1** — sai "edite o HTML e rode gen-gerador-criativos.mjs", entra a estrutura nova
- [ ] **Step 5: Commit e push**

```bash
git add -A
git commit -m "Gerador: aba Criativos passa a ser React; sai o HTML auto-contido"
git push origin master
```

- [ ] **Step 6: Avisar a Lorrayne** — o deploy é dela; relatar o resultado da regressão (22/22) e o que mudou de peso.

---

## Auto-revisão

**Cobertura do spec:** §2 (motivos) → Tasks 1 e 7; §3 (o que não muda) → Task 6 Step 5 e Task 5; §4 (arquitetura) → Tasks 2, 3 e 6; §5 (regressão) → Tasks 4 e 5; §6 (ordem) → ordem das tasks; §7 (o que sai) → Task 7; §8 (riscos) → mitigação em cada task correspondente. §9 (formato novo) é plano à parte, como o spec diz.

**Placeholders:** nenhum "TBD"/"TODO". Os passos de porte 1:1 descrevem a transformação com tabela e ordem em vez de repetir 2.265 linhas — repeti-las no plano não daria informação nova ao executor, que tem o arquivo fonte ao lado.

**Consistência de tipos:** `EstadoCriativo`, `Assets`, `OpcoesFoto`, `FormatoId`, `carregarAssets()`, `enquadrar()`, `render()`, `FORMATOS`, `ALTURA_STORIES`/`ALTURA_FEED`/`LARGURA` — mesmos nomes nas Tasks 2, 3, 4 e 6.
