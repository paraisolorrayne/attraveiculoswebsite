# Camada semântica do estoque — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o texto indexado de cada veículo falar a língua da pergunta do comprador ("SUV familiar com espaço"), em vez de só a ficha técnica, e provar antes que o transporte MCP roda no Next 16.

**Architecture:** Rótulos derivados por regra determinística sobre campos que o AutoConf já entrega, prosa curta gerada por modelo com trava contra comparativo, tudo gravado numa tabela própria que sobrevive a ressincronização e alimenta o `buildVehiclePassage` que já existe. A busca vetorial (`vehicle_embeddings`, pgvector 1024) já está em produção e não muda — muda o que se indexa nela.

**Tech Stack:** Next 16 (App Router), TypeScript, Kysely + Postgres, pgvector, Jina embeddings, Gemini, Vitest.

## Global Constraints

- **Vocabulário fechado.** Nenhum rótulo fora das listas deste plano. Teste falha se aparecer.
- **A prosa só reescreve rótulo e valor de ficha.** Sem comparativo, superlativo ou juízo de conforto — sem "espaçoso", "confortável", "mais rápido que", "ideal para", "espaço real para N adultos", "acima da média".
- **Não existe campo `seats`** no veículo. Regras usam `body_type` e `doors`.
- **`conforto` e `liquidez` não são deriváveis** dos campos disponíveis. São override-only: a regra nunca os atribui.
- **Não há runner de migration neste repositório.** SQL em `supabase/migrations/` não roda sozinho. Toda tabela nova exige aplicação manual via psql na VPS **e** verificação pelo teste de drift. Em 11/08/2026 quatro tabelas ficaram seis meses declaradas e inexistentes por causa disso.
- **Falha de modelo nunca bloqueia a sincronização.** Sem prosa, grava-se a passagem factual.
- Testes com Vitest, em `src/lib/__tests__/`. Rodar: `npx vitest run <arquivo>`.
- Commits em português, no estilo do repositório: o que mudou e por quê.

---

### Task 1: Prova de conceito do transporte MCP

Esta task existe para **derrubar a arquitetura cedo se ela não se sustentar**. Nada do resto do plano depende dela, e ela não depende de nada — pode rodar em paralelo. Se falhar, o servidor MCP vira processo separado e este plano segue igual.

**Files:**
- Create: `src/app/api/mcp/route.ts`

**Interfaces:**
- Consumes: nada
- Produces: nada que o resto do plano use. É um teste de viabilidade.

> **Decisão de 16/08:** esta task NÃO instala o SDK. A pergunta que importa não
> é "a biblioteca X roda aqui", é **"um cliente MCP real consegue conectar num
> route handler do Next?"**. Respondida essa, a escolha de SDK vira detalhe da
> fase seguinte — e não fica amarrada antes de se saber se é a melhor.

- [ ] **Step 1: Rota mínima que só responde ao handshake**

Criar `src/app/api/mcp/route.ts`. O objetivo é responder `initialize` e `tools/list` com uma ferramenta boba, nada mais.

```ts
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PROVA DE CONCEITO — não é o servidor final.
 *
 * Existe para responder uma pergunta só: o transporte MCP funciona dentro de um
 * route handler do Next 16? Se não funcionar, o servidor vira processo separado
 * no pm2 e a arquitetura do spec muda.
 */
export async function POST(request: NextRequest) {
	const corpo = await request.json()

	if (corpo.method === 'initialize') {
		return Response.json({
			jsonrpc: '2.0',
			id: corpo.id,
			result: {
				protocolVersion: corpo.params?.protocolVersion ?? '2025-06-18',
				capabilities: { tools: {} },
				serverInfo: { name: 'attra-estoque', version: '0.0.1' },
			},
		})
	}

	if (corpo.method === 'tools/list') {
		return Response.json({
			jsonrpc: '2.0',
			id: corpo.id,
			result: {
				tools: [{
					name: 'ping',
					description: 'Responde pong. Só existe para provar o transporte.',
					inputSchema: { type: 'object', properties: {} },
				}],
			},
		})
	}

	return Response.json({
		jsonrpc: '2.0',
		id: corpo.id ?? null,
		error: { code: -32601, message: `Método não suportado: ${corpo.method}` },
	})
}
```

- [ ] **Step 2: Verificar o handshake por HTTP**

Subir o dev server em `localhost:3111` (**nunca `127.0.0.1`** — o Next 16 bloqueia recursos de dev de outra origem e a página não hidrata) e rodar:

```bash
curl -s -X POST http://localhost:3111/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"teste","version":"0"}}}'
```

Esperado: JSON com `result.serverInfo.name === "attra-estoque"`.

```bash
curl -s -X POST http://localhost:3111/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

Esperado: JSON com uma ferramenta chamada `ping`.

- [ ] **Step 3: Conectar um cliente MCP de verdade**

Esse é o passo que importa, e o que o curl não prova. Conectar o endpoint como servidor MCP remoto num cliente real e confirmar que a ferramenta `ping` aparece na lista.

Registrar o resultado no próprio arquivo, em comentário, com data:
- Se **funcionou**: anotar cliente e versão testados. A arquitetura do spec está confirmada.
- Se **não funcionou**: anotar o erro exato. **Parar aqui e reportar** — o servidor MCP vira processo separado, e o plano do subsistema 2 muda antes de existir.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/mcp/route.ts
git commit -m "Prova de conceito: transporte MCP em route handler do Next

Responde initialize e tools/list com uma ferramenta boba. Não é o
servidor — existe para responder se o SDK roda dentro do App Router
antes de qualquer ferramenta de verdade ser escrita.

Resultado do teste com cliente real anotado no arquivo."
```

---

### Task 2: Vocabulário e regras de rótulo

O coração determinístico. Puro: sem banco, sem rede, sem modelo.

**Files:**
- Create: `src/lib/mcp/rotulos.ts`
- Test: `src/lib/__tests__/rotulos.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type RotuloUso = 'urbano' | 'viagem' | 'fim-de-semana' | 'familia' | 'pista' | 'colecao'`
  - `type RotuloComprador = 'primeiro-premium' | 'executivo' | 'familia' | 'entusiasta' | 'colecionador'`
  - `type RotuloForca = 'desempenho' | 'espaco' | 'exclusividade' | 'baixa-quilometragem' | 'conforto' | 'liquidez'`
  - `interface Rotulos { uso: RotuloUso[]; comprador: RotuloComprador[]; forca: RotuloForca[] }`
  - `function derivarRotulos(v: VeiculoParaRotulo, anoAtual: number): Rotulos`
  - `interface VeiculoParaRotulo { body_type?: string | null; doors?: number | null; mileage?: number | null; price?: number | null; horsepower?: number | null; year_model?: number | null; brand?: string | null }`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/__tests__/rotulos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { derivarRotulos, VOCABULARIO } from '@/lib/mcp/rotulos'

const ANO = 2026

describe('derivarRotulos — uso', () => {
	// A regra que não pode falhar nunca: o case que abre o artigo da Auto
	// Trader é "SUV familiar", e um cupê jamais pode entrar nessa resposta.
	it('cupê de duas portas nunca é família', () => {
		const r = derivarRotulos({ body_type: 'Cupê', doors: 2, price: 500_000 }, ANO)
		expect(r.uso).not.toContain('familia')
		expect(r.comprador).not.toContain('familia')
	})

	it('SUV de quatro portas é família e viagem', () => {
		const r = derivarRotulos({ body_type: 'SUV', doors: 4, price: 400_000 }, ANO)
		expect(r.uso).toContain('familia')
		expect(r.uso).toContain('viagem')
	})

	it('carroceria esportiva vira fim de semana', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2 }, ANO).uso).toContain('fim-de-semana')
		expect(derivarRotulos({ body_type: 'Conversível', doors: 2 }, ANO).uso).toContain('fim-de-semana')
	})

	// Sem body_type não dá para afirmar nada sobre uso.
	it('sem carroceria não inventa rótulo de uso', () => {
		expect(derivarRotulos({ doors: 4, price: 300_000 }, ANO).uso).toEqual([])
	})

	it('veículo com 20 anos ou mais entra em coleção', () => {
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2006 }, ANO).uso).toContain('colecao')
		expect(derivarRotulos({ body_type: 'Cupê', doors: 2, year_model: 2020 }, ANO).uso).not.toContain('colecao')
	})
})

describe('derivarRotulos — força', () => {
	it('menos de 30 mil km é baixa quilometragem', () => {
		expect(derivarRotulos({ mileage: 19_930 }, ANO).forca).toContain('baixa-quilometragem')
		expect(derivarRotulos({ mileage: 80_000 }, ANO).forca).not.toContain('baixa-quilometragem')
	})

	it('400 cv ou mais é desempenho', () => {
		expect(derivarRotulos({ horsepower: 450 }, ANO).forca).toContain('desempenho')
		expect(derivarRotulos({ horsepower: 250 }, ANO).forca).not.toContain('desempenho')
	})

	// Nada no banco sustenta "confortável" ou "boa liquidez". A regra não pode
	// inventar isso — só a Attra atribui, à mão.
	it('nunca deriva conforto nem liquidez', () => {
		const r = derivarRotulos(
			{ body_type: 'SUV', doors: 4, price: 900_000, horsepower: 500, mileage: 5_000 },
			ANO,
		)
		expect(r.forca).not.toContain('conforto')
		expect(r.forca).not.toContain('liquidez')
	})
})

describe('derivarRotulos — vocabulário', () => {
	it('nunca produz rótulo fora da lista fechada', () => {
		const casos = [
			{ body_type: 'SUV', doors: 4, price: 400_000, horsepower: 500, mileage: 10_000, year_model: 2024 },
			{ body_type: 'Cupê', doors: 2, price: 3_790_000, horsepower: 830, mileage: 900, year_model: 2025 },
			{ body_type: 'Sedã', doors: 4, price: 180_000, mileage: 120_000, year_model: 2001 },
			{},
		]
		for (const caso of casos) {
			const r = derivarRotulos(caso, ANO)
			for (const u of r.uso) expect(VOCABULARIO.uso).toContain(u)
			for (const c of r.comprador) expect(VOCABULARIO.comprador).toContain(c)
			for (const f of r.forca) expect(VOCABULARIO.forca).toContain(f)
		}
	})

	it('não repete rótulo', () => {
		const r = derivarRotulos({ body_type: 'SUV', doors: 4, price: 400_000 }, ANO)
		expect(new Set(r.uso).size).toBe(r.uso.length)
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/rotulos.test.ts`
Expected: FAIL — `Cannot find module '@/lib/mcp/rotulos'`

- [ ] **Step 3: Implementar**

Criar `src/lib/mcp/rotulos.ts`:

```ts
/**
 * Rótulos de intenção derivados por REGRA, não por modelo.
 *
 * Um cupê de duas portas não é familiar. Isso é derivável de `body_type` e
 * `doors`, e o que é derivável deve ser determinístico e testável — não palpite
 * de um modelo que pode acertar 95% das vezes e errar justamente no carro que o
 * cliente foi ver.
 *
 * NÃO EXISTE campo `seats` no veículo do AutoConf. Toda regra de lotação passa
 * por `body_type` e `doors`.
 *
 * `conforto` e `liquidez` estão no vocabulário mas NUNCA são derivados: nada no
 * banco os sustenta. Existem só para a Attra atribuir à mão.
 */

export const VOCABULARIO = {
	uso: ['urbano', 'viagem', 'fim-de-semana', 'familia', 'pista', 'colecao'],
	comprador: ['primeiro-premium', 'executivo', 'familia', 'entusiasta', 'colecionador'],
	forca: ['desempenho', 'espaco', 'exclusividade', 'baixa-quilometragem', 'conforto', 'liquidez'],
} as const

export type RotuloUso = (typeof VOCABULARIO.uso)[number]
export type RotuloComprador = (typeof VOCABULARIO.comprador)[number]
export type RotuloForca = (typeof VOCABULARIO.forca)[number]

export interface Rotulos {
	uso: RotuloUso[]
	comprador: RotuloComprador[]
	forca: RotuloForca[]
}

export interface VeiculoParaRotulo {
	body_type?: string | null
	doors?: number | null
	mileage?: number | null
	price?: number | null
	horsepower?: number | null
	year_model?: number | null
	brand?: string | null
}

/** Carrocerias de duas portas voltadas a desempenho. */
const ESPORTIVAS = new Set(['cupe', 'coupe', 'conversivel', 'cabriolet', 'roadster', 'targa', 'spider', 'spyder'])
/** Carrocerias que comportam família. */
const FAMILIARES = new Set(['suv', 'seda', 'sedan', 'perua', 'minivan', 'hatch'])
/** Subconjunto com espaço de carga relevante. */
const ESPACOSAS = new Set(['suv', 'perua', 'minivan'])

const LIMIAR_BAIXA_KM = 30_000
const LIMIAR_DESEMPENHO_CV = 400
const LIMIAR_EXECUTIVO_BRL = 250_000
const LIMIAR_PRIMEIRO_PREMIUM_BRL = 300_000
const IDADE_DE_COLECAO = 20

function normalizar(v: string | null | undefined): string {
	if (typeof v !== 'string') return ''
	return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function derivarRotulos(v: VeiculoParaRotulo, anoAtual: number): Rotulos {
	const carroceria = normalizar(v.body_type)
	const esportiva = ESPORTIVAS.has(carroceria)
	const familiar = FAMILIARES.has(carroceria) && (v.doors ?? 0) >= 4
	const espacosa = ESPACOSAS.has(carroceria) && (v.doors ?? 0) >= 4
	const antigo = v.year_model != null && anoAtual - v.year_model >= IDADE_DE_COLECAO
	const potente = (v.horsepower ?? 0) >= LIMIAR_DESEMPENHO_CV

	const uso: RotuloUso[] = []
	if (familiar) { uso.push('familia', 'viagem', 'urbano') }
	if (esportiva) { uso.push('fim-de-semana') }
	if (esportiva && potente) uso.push('pista')
	if (antigo) uso.push('colecao')

	const comprador: RotuloComprador[] = []
	if (familiar) comprador.push('familia')
	if (familiar && (v.price ?? 0) >= LIMIAR_EXECUTIVO_BRL) comprador.push('executivo')
	if (esportiva || potente) comprador.push('entusiasta')
	if (antigo) comprador.push('colecionador')
	if ((v.price ?? 0) > 0 && (v.price ?? 0) < LIMIAR_PRIMEIRO_PREMIUM_BRL) comprador.push('primeiro-premium')

	const forca: RotuloForca[] = []
	if (potente) forca.push('desempenho')
	if (espacosa) forca.push('espaco')
	if (v.mileage != null && v.mileage < LIMIAR_BAIXA_KM) forca.push('baixa-quilometragem')
	// `conforto` e `liquidez`: nunca aqui. Só override.

	return {
		uso: [...new Set(uso)],
		comprador: [...new Set(comprador)],
		forca: [...new Set(forca)],
	}
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/rotulos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/rotulos.ts src/lib/__tests__/rotulos.test.ts
git commit -m "Rótulos de intenção derivados por regra

Vocabulário fechado em três eixos: uso, comprador e força. Regra
determinística sobre body_type, doors, mileage, price, horsepower e
year_model — não palpite de modelo, porque um cupê de duas portas jamais
pode aparecer numa resposta sobre carro familiar.

Não existe campo seats no AutoConf: toda regra de lotação passa por
body_type e doors.

conforto e liquidez estão no vocabulário e NUNCA são derivados — nada no
banco os sustenta. Só a Attra atribui, à mão."
```

---

### Task 3: Montagem da passagem semântica

Puro. Transforma veículo + rótulos + prosa no texto que vai para o embedding.

**Files:**
- Create: `src/lib/mcp/perfil-semantico.ts`
- Test: `src/lib/__tests__/perfil-semantico.test.ts`

**Interfaces:**
- Consumes: `Rotulos`, `VOCABULARIO` de `@/lib/mcp/rotulos`
- Produces:
  - `function montarPassagem(fatual: string, rotulos: Rotulos, prosa: string | null): string`
  - `function prosaEhAceitavel(prosa: string): { ok: true } | { ok: false; motivo: string }`
  - `const TERMOS_PROIBIDOS: string[]`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/__tests__/perfil-semantico.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { montarPassagem, prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

const FATUAL = 'Porsche Macan GTS Bi-Turbo 2024. tipo SUV. 19.930 km. R$ 499.000'
const ROTULOS: Rotulos = {
	uso: ['familia', 'viagem', 'urbano'],
	comprador: ['familia', 'executivo'],
	forca: ['baixa-quilometragem'],
}

describe('prosaEhAceitavel', () => {
	// A trava que a própria Attra impôs revisando o exemplo do spec: a prosa
	// não pode afirmar conforto nem comparar com categoria nenhuma.
	it('recusa juízo de conforto', () => {
		expect(prosaEhAceitavel('SUV com espaço real para quatro adultos.').ok).toBe(false)
		expect(prosaEhAceitavel('Interior confortável e espaçoso.').ok).toBe(false)
	})

	it('recusa comparativo e superlativo', () => {
		expect(prosaEhAceitavel('Desempenho acima da média da categoria.').ok).toBe(false)
		expect(prosaEhAceitavel('O mais rápido da linha.').ok).toBe(false)
		expect(prosaEhAceitavel('Ideal para quem viaja.').ok).toBe(false)
	})

	it('aceita reescrita de rótulo e valor de ficha', () => {
		expect(prosaEhAceitavel('SUV premium para uso diário e viagem em família. Baixa quilometragem.').ok).toBe(true)
	})

	it('explica o motivo da recusa', () => {
		const r = prosaEhAceitavel('Interior espaçoso.')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.motivo).toContain('espaçoso')
	})
})

describe('montarPassagem', () => {
	it('junta ficha, prosa e rótulos', () => {
		const p = montarPassagem(FATUAL, ROTULOS, 'SUV premium para uso diário e viagem em família.')
		expect(p).toContain(FATUAL)
		expect(p).toContain('SUV premium para uso diário')
		expect(p).toContain('família')
		expect(p).toContain('executivo')
	})

	// O caso que motivou o projeto: a pergunta da Auto Trader precisa casar.
	it('faz a passagem conter as palavras da pergunta do comprador', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null).toLowerCase()
		expect(p).toContain('família')
		expect(p).toContain('viagem')
	})

	// Índice sem prosa é ruim; índice desatualizado é pior.
	it('funciona sem prosa nenhuma', () => {
		const p = montarPassagem(FATUAL, ROTULOS, null)
		expect(p).toContain(FATUAL)
		expect(p.length).toBeGreaterThan(FATUAL.length)
	})

	it('devolve só o factual quando não há rótulo nem prosa', () => {
		const vazio: Rotulos = { uso: [], comprador: [], forca: [] }
		expect(montarPassagem(FATUAL, vazio, null)).toBe(FATUAL)
	})

	// Prosa reprovada não pode entrar no índice de jeito nenhum.
	it('descarta prosa que não passa na trava', () => {
		const p = montarPassagem(FATUAL, ROTULOS, 'Espaço real para quatro adultos.')
		expect(p).not.toContain('quatro adultos')
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/perfil-semantico.test.ts`
Expected: FAIL — módulo não encontrado

- [ ] **Step 3: Implementar**

Criar `src/lib/mcp/perfil-semantico.ts`:

```ts
/**
 * O texto que vai para o embedding.
 *
 * Hoje o índice guarda só ficha técnica — marca, ano, km, potência. Nada nele
 * diz "família", "porta-malas" ou "fim de semana", então a pergunta que abre o
 * case da Auto Trader ("SUV familiar com bastante espaço") casa mal. Este
 * módulo é o que faz o texto indexado falar a língua da pergunta.
 *
 * A TRAVA DA PROSA é a parte séria. A Attra revisou o exemplo do spec e cortou
 * "espaço real para quatro adultos" — juízo de conforto que a ficha não
 * sustenta. Aqui isso vira regra executável: prosa que afirme conforto, compare
 * com categoria ou use superlativo é DESCARTADA, não corrigida. O erro que se
 * evita não é um adjetivo infeliz numa página; é um assistente afirmando que
 * cabem quatro adultos e o cliente descobrindo no showroom.
 */

import type { Rotulos } from '@/lib/mcp/rotulos'

/**
 * Termos que reprovam a prosa.
 *
 * Comparativos, superlativos e juízos de conforto. A lista é generosa de
 * propósito: descartar prosa boa custa um pouco de qualidade de busca;
 * publicar prosa falsa custa a confiança que o canal inteiro existe para ter.
 */
export const TERMOS_PROIBIDOS = [
	'espaçoso', 'espacoso', 'confortável', 'confortavel', 'conforto',
	'espaço real', 'espaco real', 'adultos',
	'acima da média', 'acima da media', 'melhor', 'pior', 'mais rápido', 'mais rapido',
	'ideal para', 'perfeito para', 'incrível', 'incrivel', 'imperdível', 'imperdivel',
	'excelente', 'ótimo', 'otimo', 'surpreendente', 'referência', 'referencia',
]

export function prosaEhAceitavel(prosa: string): { ok: true } | { ok: false; motivo: string } {
	const alvo = prosa.toLowerCase()
	for (const termo of TERMOS_PROIBIDOS) {
		if (alvo.includes(termo)) {
			return { ok: false, motivo: `prosa contém termo proibido: "${termo}"` }
		}
	}
	return { ok: true }
}

const NOME_DO_ROTULO: Record<string, string> = {
	'urbano': 'uso urbano',
	'viagem': 'viagem',
	'fim-de-semana': 'fim de semana',
	'familia': 'família',
	'pista': 'pista',
	'colecao': 'coleção',
	'primeiro-premium': 'primeiro premium',
	'executivo': 'executivo',
	'entusiasta': 'entusiasta',
	'colecionador': 'colecionador',
	'desempenho': 'desempenho',
	'espaco': 'espaço de carga',
	'exclusividade': 'exclusividade',
	'baixa-quilometragem': 'baixa quilometragem',
	'conforto': 'conforto',
	'liquidez': 'liquidez de revenda',
}

function legivel(rotulos: readonly string[]): string {
	return rotulos.map(r => NOME_DO_ROTULO[r] ?? r).join(', ')
}

/**
 * Monta o texto final.
 *
 * `prosa` reprovada é silenciosamente descartada — a passagem sai sem ela, e a
 * sincronização segue. Índice sem prosa é pior que índice com prosa; índice
 * desatualizado é pior que os dois.
 */
export function montarPassagem(fatual: string, rotulos: Rotulos, prosa: string | null): string {
	const partes = [fatual]

	if (prosa && prosaEhAceitavel(prosa).ok) partes.push(prosa.trim())

	if (rotulos.uso.length > 0) partes.push(`Uso: ${legivel(rotulos.uso)}.`)
	if (rotulos.comprador.length > 0) partes.push(`Perfil: ${legivel(rotulos.comprador)}.`)
	if (rotulos.forca.length > 0) partes.push(`Destaques: ${legivel(rotulos.forca)}.`)

	return partes.join(' ')
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/perfil-semantico.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/perfil-semantico.ts src/lib/__tests__/perfil-semantico.test.ts
git commit -m "Passagem semântica: o texto indexado passa a falar de intenção

O índice guardava só ficha técnica, então 'SUV familiar com espaço' não
casava com nada — não por falta de busca vetorial, que já existe, mas
porque nenhuma palavra da pergunta estava no texto.

A trava da prosa virou regra executável: prosa que afirme conforto,
compare com categoria ou use superlativo é DESCARTADA, não corrigida. A
lista de termos é generosa de propósito — descartar prosa boa custa um
pouco de busca, publicar prosa falsa custa a confiança do canal."
```

---

### Task 4: Tabela `vehicle_semantic_labels`

**ATENÇÃO: este repositório não tem runner de migration.** Escrever o `.sql` não cria tabela nenhuma. Em 11/08/2026, quatro tabelas ficaram seis meses declaradas no código e inexistentes no banco exatamente assim — as rotas capturavam o erro e devolviam valores padrão, e nada acusou.

**Files:**
- Create: `supabase/migrations/20260816_vehicle_semantic_labels.sql`
- Modify: `src/lib/db/types.ts` (interface + registro em `Database`)

**Interfaces:**
- Consumes: nada
- Produces: `VehicleSemanticLabelsTable` em `src/lib/db/types.ts`, com colunas
  `vehicle_id`, `rotulos_uso`, `rotulos_comprador`, `rotulos_forca`, `prosa`,
  `sobrescrito_por`, `criado_em`, `atualizado_em`

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/20260816_vehicle_semantic_labels.sql`:

```sql
-- Rótulos de intenção por veículo.
--
-- Separada de vehicle_embeddings de propósito: aquela é derivada e pode ser
-- regerada do zero a qualquer momento; esta contém correção humana, que não
-- pode ser perdida numa ressincronização.
create table if not exists vehicle_semantic_labels (
  vehicle_id        bigint primary key,
  rotulos_uso       text[] not null default '{}',
  rotulos_comprador text[] not null default '{}',
  rotulos_forca     text[] not null default '{}',
  prosa             text,
  -- E-mail de quem sobrescreveu à mão. Nulo = só regra.
  -- É esta coluna que a ressincronização consulta para NÃO sobrescrever.
  sobrescrito_por   text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create index if not exists idx_vsl_sobrescrito
  on vehicle_semantic_labels (sobrescrito_por)
  where sobrescrito_por is not null;
```

- [ ] **Step 2: Declarar no tipo**

Em `src/lib/db/types.ts`, junto das outras interfaces:

```ts
export interface VehicleSemanticLabelsTable {
  vehicle_id: number
  rotulos_uso: string[]
  rotulos_comprador: string[]
  rotulos_forca: string[]
  prosa: string | null
  /** E-mail de quem sobrescreveu. Nulo = derivado só por regra. */
  sobrescrito_por: string | null
  criado_em: Generated<Timestamp>
  atualizado_em: Generated<Timestamp>
}
```

E registrar em `Database`:

```ts
  vehicle_semantic_labels: VehicleSemanticLabelsTable
```

- [ ] **Step 3: APLICAR NA VPS** — *executado pelo controlador, NÃO delegado*

O passo que não pode ser pulado. **Nenhum subagente recebe credencial de banco
de produção**: o subagente entrega a migration e o tipo; quem aplica é o
controlador da sessão.

```bash
ssh -i ~/.ssh/id_gitlab_bookie root@217.216.82.138 'bash -s' <<'REMOTO'
cd /var/www/attra
set -a; source .env.production; set +a
psql "$DATABASE_URL" -f supabase/migrations/20260816_vehicle_semantic_labels.sql
psql "$DATABASE_URL" -c "\d vehicle_semantic_labels"
REMOTO
```

Esperado: a saída do `\d` lista as oito colunas. Se der `did not find any relation`, a migration não foi aplicada — parar e investigar antes de seguir.

> O arquivo precisa existir na VPS. Fazer `git push` da branch e `git pull` lá antes, ou passar o SQL por stdin.

- [ ] **Step 4: Provar pelo teste de drift** — *executado pelo controlador*

```bash
ssh -i ~/.ssh/id_gitlab_bookie root@217.216.82.138 'bash -s' <<'REMOTO'
cd /var/www/attra
set -a; source .env.production; set +a
TEST_DATABASE_URL="$DATABASE_URL" npx vitest run src/lib/db/__tests__/schema-drift.integration.test.ts
REMOTO
```

Expected: PASS. Este teste existe porque quatro tabelas já ficaram meses declaradas e ausentes — ele é a prova de que o código e o banco concordam.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260816_vehicle_semantic_labels.sql src/lib/db/types.ts
git commit -m "Tabela vehicle_semantic_labels, aplicada e verificada

Separada de vehicle_embeddings porque aquela é derivada e regerável, e
esta guarda correção humana — que não pode sumir numa ressincronização.

Aplicada na VPS via psql e verificada pelo teste de drift, não só
commitada: este repositório não tem runner, e foi assim que quatro
tabelas ficaram seis meses declaradas e inexistentes."
```

---

### Task 5: Leitura e escrita dos rótulos

**Files:**
- Create: `src/lib/mcp/repositorio-rotulos.ts`
- Test: `src/lib/__tests__/repositorio-rotulos.test.ts`

**Interfaces:**
- Consumes: `Rotulos` de `@/lib/mcp/rotulos`, `db` de `@/lib/db`
- Produces:
  - `async function lerRotulos(vehicleIds: number[]): Promise<Map<number, RotulosGravados>>`
  - `async function gravarRotulosDerivados(linhas: { vehicle_id: number; rotulos: Rotulos; prosa: string | null }[]): Promise<number>`
  - `interface RotulosGravados extends Rotulos { prosa: string | null; sobrescritoPor: string | null }`
  - `function mesclar(derivado: Rotulos, gravado: RotulosGravados | undefined): RotulosGravados`

- [ ] **Step 1: Escrever o teste que falha**

A regra crítica — sobrescrita humana vence a regra — é pura e testa sem banco:

```ts
import { describe, it, expect } from 'vitest'
import { mesclar } from '@/lib/mcp/repositorio-rotulos'
import type { Rotulos } from '@/lib/mcp/rotulos'

const DERIVADO: Rotulos = { uso: ['familia'], comprador: ['executivo'], forca: [] }

describe('mesclar', () => {
	// O motivo de a tabela ser separada dos embeddings. Se a ressincronização
	// apagasse a correção da Attra, o trabalho manual sumiria toda madrugada.
	it('sobrescrita humana vence a regra', () => {
		const r = mesclar(DERIVADO, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: ['liquidez'],
			prosa: 'texto da Attra', sobrescritoPor: 'cris@attra.com.br',
		})
		expect(r.uso).toEqual(['fim-de-semana'])
		expect(r.forca).toContain('liquidez')
		expect(r.prosa).toBe('texto da Attra')
	})

	it('usa a regra quando não há sobrescrita', () => {
		const r = mesclar(DERIVADO, {
			uso: ['familia'], comprador: ['executivo'], forca: [],
			prosa: 'prosa gerada', sobrescritoPor: null,
		})
		expect(r.uso).toEqual(['familia'])
		expect(r.prosa).toBe('prosa gerada')
	})

	it('usa a regra quando não há nada gravado', () => {
		const r = mesclar(DERIVADO, undefined)
		expect(r.uso).toEqual(['familia'])
		expect(r.prosa).toBeNull()
		expect(r.sobrescritoPor).toBeNull()
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/repositorio-rotulos.test.ts`
Expected: FAIL — módulo não encontrado

- [ ] **Step 3: Implementar**

```ts
import { db } from '@/lib/db'
import type { Rotulos, RotuloUso, RotuloComprador, RotuloForca } from '@/lib/mcp/rotulos'

export interface RotulosGravados extends Rotulos {
	prosa: string | null
	sobrescritoPor: string | null
}

/**
 * Sobrescrita humana vence a regra, sempre.
 *
 * É o motivo de esta tabela existir separada de `vehicle_embeddings`: se a
 * ressincronização noturna apagasse a correção da Attra, o trabalho manual
 * sumiria toda madrugada e ninguém saberia por quê.
 */
export function mesclar(derivado: Rotulos, gravado: RotulosGravados | undefined): RotulosGravados {
	if (gravado?.sobrescritoPor) return gravado
	return {
		...derivado,
		prosa: gravado?.prosa ?? null,
		sobrescritoPor: null,
	}
}

export async function lerRotulos(vehicleIds: number[]): Promise<Map<number, RotulosGravados>> {
	const mapa = new Map<number, RotulosGravados>()
	if (vehicleIds.length === 0) return mapa

	const linhas = await db
		.selectFrom('vehicle_semantic_labels')
		.selectAll()
		.where('vehicle_id', 'in', vehicleIds)
		.execute()

	for (const l of linhas) {
		mapa.set(l.vehicle_id, {
			uso: l.rotulos_uso as RotuloUso[],
			comprador: l.rotulos_comprador as RotuloComprador[],
			forca: l.rotulos_forca as RotuloForca[],
			prosa: l.prosa,
			sobrescritoPor: l.sobrescrito_por,
		})
	}
	return mapa
}

/**
 * Grava o que a regra derivou — NUNCA pisando em linha sobrescrita à mão.
 * O `where` do upsert é a trava; sem ele, a primeira sincronização apagaria
 * toda correção da Attra.
 */
export async function gravarRotulosDerivados(
	linhas: { vehicle_id: number; rotulos: Rotulos; prosa: string | null }[],
): Promise<number> {
	if (linhas.length === 0) return 0

	const valores = linhas.map(l => ({
		vehicle_id: l.vehicle_id,
		rotulos_uso: l.rotulos.uso,
		rotulos_comprador: l.rotulos.comprador,
		rotulos_forca: l.rotulos.forca,
		prosa: l.prosa,
		sobrescrito_por: null,
		atualizado_em: new Date(),
	}))

	const r = await db
		.insertInto('vehicle_semantic_labels')
		.values(valores)
		.onConflict(oc => oc.column('vehicle_id').doUpdateSet({
			rotulos_uso: eb => eb.ref('excluded.rotulos_uso'),
			rotulos_comprador: eb => eb.ref('excluded.rotulos_comprador'),
			rotulos_forca: eb => eb.ref('excluded.rotulos_forca'),
			prosa: eb => eb.ref('excluded.prosa'),
			atualizado_em: eb => eb.ref('excluded.atualizado_em'),
		}).where('vehicle_semantic_labels.sobrescrito_por', 'is', null))
		.executeTakeFirst()

	return Number(r.numUpdatedOrInsertedRows ?? 0)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/repositorio-rotulos.test.ts`
Expected: PASS

Rodar também o smoke de SQL, que compila as consultas contra os tipos:

Run: `npx vitest run src/lib/db/__tests__/db-smoke.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/repositorio-rotulos.ts src/lib/__tests__/repositorio-rotulos.test.ts
git commit -m "Persistência dos rótulos, com sobrescrita humana protegida

O upsert tem um where que não pisa em linha sobrescrita à mão. Sem ele, a
primeira sincronização apagaria toda correção da Attra — e o modo de
falha seria silencioso: o trabalho manual sumindo toda madrugada sem
ninguém saber por quê."
```

---

### Task 6: Geração da prosa

**Files:**
- Create: `src/lib/mcp/prosa.ts`
- Test: `src/lib/__tests__/prosa.test.ts`

**Interfaces:**
- Consumes: `prosaEhAceitavel` de `@/lib/mcp/perfil-semantico`, `Rotulos` de `@/lib/mcp/rotulos`, `GEMINI_TEXT_MODEL` de `@/lib/gemini-config`
- Produces:
  - `function montarPrompt(v: VeiculoParaProsa, rotulos: Rotulos): string`
  - `async function gerarProsa(v: VeiculoParaProsa, rotulos: Rotulos): Promise<string | null>`
  - `interface VeiculoParaProsa { brand?: string|null; model?: string|null; year_model?: number|null; body_type?: string|null; mileage?: number|null }`

- [ ] **Step 1: Escrever o teste que falha**

O prompt é puro e testável; a chamada de rede não é testada aqui.

```ts
import { describe, it, expect } from 'vitest'
import { montarPrompt } from '@/lib/mcp/prosa'
import { prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

const V = { brand: 'Porsche', model: 'Macan', year_model: 2024, body_type: 'SUV', mileage: 19_930 }
const R: Rotulos = { uso: ['familia', 'viagem'], comprador: ['executivo'], forca: ['baixa-quilometragem'] }

describe('montarPrompt', () => {
	it('proíbe explicitamente comparativo e juízo de conforto', () => {
		const p = montarPrompt(V, R).toLowerCase()
		expect(p).toContain('não use')
		expect(p).toContain('confortável')
		expect(p).toContain('acima da média')
	})

	it('passa só os fatos da ficha e os rótulos', () => {
		const p = montarPrompt(V, R)
		expect(p).toContain('Porsche')
		expect(p).toContain('SUV')
		expect(p).toContain('família')
	})

	// O modelo não pode receber espaço para inventar o que não está na ficha.
	it('manda o modelo não acrescentar fato', () => {
		expect(montarPrompt(V, R).toLowerCase()).toContain('não acrescente')
	})
})

describe('trava aplicada à saída', () => {
	// A defesa real não é o prompt — é a validação depois.
	it('a prosa gerada ainda passa pela trava', () => {
		expect(prosaEhAceitavel('SUV para uso em família e viagem. Baixa quilometragem.').ok).toBe(true)
		expect(prosaEhAceitavel('SUV confortável para a família.').ok).toBe(false)
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/prosa.test.ts`
Expected: FAIL — módulo não encontrado

- [ ] **Step 3: Implementar**

```ts
import { GEMINI_TEXT_MODEL } from '@/lib/gemini-config'
import { prosaEhAceitavel } from '@/lib/mcp/perfil-semantico'
import type { Rotulos } from '@/lib/mcp/rotulos'

export interface VeiculoParaProsa {
	brand?: string | null
	model?: string | null
	year_model?: number | null
	body_type?: string | null
	mileage?: number | null
}

/**
 * O prompt pede prosa seca — mas a defesa de verdade é a validação da saída.
 * Prompt é pedido; `prosaEhAceitavel` é regra. Um modelo que ignora a
 * instrução tem a resposta descartada, não corrigida.
 */
export function montarPrompt(v: VeiculoParaProsa, rotulos: Rotulos): string {
	const ficha = [v.brand, v.model, v.year_model, v.body_type].filter(Boolean).join(' ')
	return [
		'Escreva UMA frase curta em português descrevendo o perfil de uso deste veículo.',
		'',
		`Ficha: ${ficha}${v.mileage != null ? `, ${v.mileage.toLocaleString('pt-BR')} km` : ''}`,
		`Uso: ${rotulos.uso.join(', ') || '(nenhum)'}`,
		`Perfil de comprador: ${rotulos.comprador.join(', ') || '(nenhum)'}`,
		'',
		'REGRAS:',
		'- Não acrescente nenhum fato que não esteja acima.',
		'- Não use comparativo nem superlativo: nada de "melhor", "mais rápido", "acima da média".',
		'- Não use juízo de conforto: nada de "confortável", "espaçoso", "espaço para N adultos".',
		'- Não use "ideal para" nem "perfeito para".',
		'- Máximo de 20 palavras.',
	].join('\n')
}

/**
 * Devolve `null` em qualquer falha — rede, cota, ou prosa reprovada na trava.
 *
 * `null` não é erro: a passagem sai só com ficha e rótulos, e a sincronização
 * segue. Índice desatualizado é pior que índice sem prosa.
 */
export async function gerarProsa(v: VeiculoParaProsa, rotulos: Rotulos): Promise<string | null> {
	const chave = process.env.GEMINI_API_KEY
	if (!chave) return null

	try {
		const resposta = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${chave}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: montarPrompt(v, rotulos) }] }],
					generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
				}),
				signal: AbortSignal.timeout(15_000),
			},
		)
		if (!resposta.ok) return null

		const dados = await resposta.json()
		const texto: string | undefined = dados?.candidates?.[0]?.content?.parts?.[0]?.text
		if (!texto) return null

		const limpo = texto.trim()
		if (!prosaEhAceitavel(limpo).ok) {
			console.warn('[Prosa] descartada pela trava:', limpo.slice(0, 120))
			return null
		}
		return limpo
	} catch {
		return null
	}
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/prosa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/prosa.ts src/lib/__tests__/prosa.test.ts
git commit -m "Prosa gerada por modelo, validada por regra

O prompt pede texto seco, mas a defesa de verdade é a validação da
saída: prosa que viole a trava é descartada, não corrigida. Prompt é
pedido; prosaEhAceitavel é regra.

Qualquer falha devolve null — rede, cota ou trava. null não é erro: a
passagem sai só com ficha e rótulos e a sincronização segue."
```

---

### Task 7: Ligar tudo na sincronização de embeddings

**Files:**
- Modify: `src/app/api/embeddings/sync/route.ts`
- Modify: `src/lib/jina.ts` (`buildVehiclePassage` permanece; a composição passa a ser feita fora)
- Test: `src/lib/__tests__/sync-semantico.test.ts`

**Interfaces:**
- Consumes: `derivarRotulos`, `montarPassagem`, `gerarProsa`, `lerRotulos`, `gravarRotulosDerivados`, `mesclar`, `buildVehiclePassage`
- Produces: `async function passagemDoVeiculo(v, gravado, anoAtual): Promise<string>` em `src/lib/mcp/passagem-do-veiculo.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest'
import { passagemDoVeiculo } from '@/lib/mcp/passagem-do-veiculo'

const MACAN = {
	id: 1, brand: 'Porsche', model: 'Macan', version: 'GTS Bi-Turbo',
	year_model: 2024, body_type: 'SUV', doors: 4, mileage: 19_930, price: 499_000,
}

describe('passagemDoVeiculo', () => {
	it('inclui ficha e intenção na mesma passagem', async () => {
		const p = await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)
		expect(p).toContain('Porsche')
		expect(p).toContain('19.930 km')
		expect(p.toLowerCase()).toContain('família')
	})

	// A regressão que interessa: hoje a passagem NÃO tem essas palavras.
	it('faz a pergunta do comprador encontrar palavra no texto', async () => {
		const p = (await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)).toLowerCase()
		for (const termo of ['família', 'viagem', 'baixa quilometragem']) {
			expect(p, `faltou "${termo}"`).toContain(termo)
		}
	})

	it('respeita sobrescrita humana', async () => {
		const p = await passagemDoVeiculo(MACAN, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: [],
			prosa: null, sobrescritoPor: 'cris@attra.com.br',
		}, 2026, async () => null)
		expect(p.toLowerCase()).toContain('fim de semana')
		expect(p.toLowerCase()).not.toContain('família')
	})

	it('sai sem prosa quando o gerador falha', async () => {
		const p = await passagemDoVeiculo(MACAN, undefined, 2026, async () => { throw new Error('cota') })
		expect(p).toContain('Porsche')
	})
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/sync-semantico.test.ts`
Expected: FAIL — módulo não encontrado

- [ ] **Step 3: Implementar a composição**

Criar `src/lib/mcp/passagem-do-veiculo.ts`:

```ts
import { buildVehiclePassage } from '@/lib/jina'
import { derivarRotulos, type VeiculoParaRotulo } from '@/lib/mcp/rotulos'
import { montarPassagem } from '@/lib/mcp/perfil-semantico'
import { mesclar, type RotulosGravados } from '@/lib/mcp/repositorio-rotulos'
import type { VeiculoParaProsa } from '@/lib/mcp/prosa'

type Veiculo = VeiculoParaRotulo & VeiculoParaProsa & Parameters<typeof buildVehiclePassage>[0]

/**
 * O gerador de prosa entra por parâmetro para o teste poder injetar falha sem
 * tocar em rede. Falha do gerador vira passagem sem prosa, nunca exceção.
 */
export async function passagemDoVeiculo(
	v: Veiculo,
	gravado: RotulosGravados | undefined,
	anoAtual: number,
	gerador: (v: VeiculoParaProsa, r: ReturnType<typeof derivarRotulos>) => Promise<string | null>,
): Promise<string> {
	const derivado = derivarRotulos(v, anoAtual)
	const final = mesclar(derivado, gravado)

	let prosa = final.prosa
	if (prosa == null) {
		try {
			prosa = await gerador(v, final)
		} catch {
			prosa = null
		}
	}

	return montarPassagem(buildVehiclePassage(v), final, prosa)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/sync-semantico.test.ts`
Expected: PASS

- [ ] **Step 5: Ligar na rota de sincronização**

Em `src/app/api/embeddings/sync/route.ts`, trocar a montagem da passagem:

```ts
// antes:
// const passages = batch.map(v => buildVehiclePassage(v))

// depois:
const gravados = await lerRotulos(batch.map(v => Number(v.id)))
const anoAtual = new Date().getFullYear()
const passages = await Promise.all(
  batch.map(v => passagemDoVeiculo(v, gravados.get(Number(v.id)), anoAtual, gerarProsa)),
)
await gravarRotulosDerivados(
  batch.map(v => ({
    vehicle_id: Number(v.id),
    rotulos: derivarRotulos(v, anoAtual),
    prosa: null,
  })),
)
```

Adicionar os imports correspondentes no topo do arquivo.

- [ ] **Step 6: Rodar a suíte inteira e o build**

Run: `npx vitest run`
Expected: PASS, sem regressão

Run: `npm run build`
Expected: `Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add src/lib/mcp/passagem-do-veiculo.ts src/lib/__tests__/sync-semantico.test.ts src/app/api/embeddings/sync/route.ts
git commit -m "Sincronização passa a indexar intenção, não só ficha

O gerador de prosa entra por parâmetro para o teste injetar falha sem
tocar em rede — falha vira passagem sem prosa, nunca exceção.

O teste que importa é o de regressão: hoje a passagem não contém
'família', 'viagem' nem 'baixa quilometragem' em lugar nenhum, e é por
isso que 'SUV familiar com espaço' não casa."
```

---

### Task 8: Verificar em produção que a busca melhorou

Sem esta task o plano entrega código, não resultado. A pergunta que ela responde: **a busca que já existe passou a achar o carro certo?**

**Files:** nenhum. É medição.

- [ ] **Step 1: Registrar a linha de base ANTES de ressincronizar**

```bash
curl -s "https://attraveiculos.com.br/api/vehicles/search?q=SUV+familiar+com+bastante+espaco" | head -c 600
curl -s "https://attraveiculos.com.br/api/vehicles/search?q=carro+para+o+fim+de+semana" | head -c 600
curl -s "https://attraveiculos.com.br/api/vehicles/search?q=primeiro+carro+premium+ate+300+mil" | head -c 600
```

Guardar as três respostas. **Sem a linha de base não há como afirmar melhora** — e afirmar melhora sem medir é exatamente o erro que este projeto existe para não cometer com os assistentes.

- [ ] **Step 2: Deployar e ressincronizar**

```bash
# merge na master, então:
ssh -i ~/.ssh/id_gitlab_bookie root@217.216.82.138 'cd /var/www/attra && bash deploy/deploy-vps.sh'
```

Conferir que o site voltou — o script para o pm2 antes de buildar, e build que falha deixa o site fora:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://attraveiculos.com.br/
```

Então forçar a ressincronização:

```bash
ssh -i ~/.ssh/id_gitlab_bookie root@217.216.82.138 'bash -s' <<'REMOTO'
cd /var/www/attra
set -a; source .env.production; set +a
curl -s -X POST http://localhost:3000/api/embeddings/sync \
  -H "Authorization: Bearer $CRON_SECRET" | head -c 400
REMOTO
```

- [ ] **Step 3: Repetir as três buscas e comparar**

Rodar os mesmos três `curl` do Step 1 e comparar com o guardado.

Critério de aceite, honesto: **"SUV familiar com bastante espaço" precisa devolver um SUV de quatro portas na primeira posição.** As outras duas são observação — três consultas não provam qualidade de busca, e o relatório deve dizer isso.

- [ ] **Step 4: Conferir uma passagem real**

```bash
ssh -i ~/.ssh/id_gitlab_bookie root@217.216.82.138 'bash -s' <<'REMOTO'
cd /var/www/attra
set -a; source .env.production; set +a
psql "$DATABASE_URL" -c "select vehicle_slug, left(passage_text, 400) from vehicle_embeddings limit 3;"
REMOTO
```

Ler as três passagens com olho crítico. **Qualquer comparativo, superlativo ou juízo de conforto que tenha escapado é um defeito da trava** — anotar o termo e adicioná-lo a `TERMOS_PROIBIDOS`.

- [ ] **Step 5: Commit do que a medição ensinou**

Se a trava deixou passar algum termo, corrigir e commitar:

```bash
git add src/lib/mcp/perfil-semantico.ts src/lib/__tests__/perfil-semantico.test.ts
git commit -m "Termos que escaparam da trava, vistos na passagem real

Encontrados lendo o texto indexado em produção depois da primeira
ressincronização. Cada um vira teste."
```

---

## Auto-revisão do plano

**Cobertura do spec.** Camada semântica: tasks 2, 3, 5, 6, 7. Tabela de descritores e sobrevivência da sobrescrita: 4, 5. Falha de modelo sem bloquear sync: 6, 7. Prova de conceito do transporte: 1. Verificação em produção: 8.

**Fora deste plano, por decisão:** as quatro ferramentas MCP, `registrar_interesse`, limite de taxa, links marcados, `mcp_requests` e a tela de sobrescrita no admin. Vão para o plano do subsistema 2, que só faz sentido escrever depois do resultado da Task 1.

**Consequência a assumir:** a sobrescrita da Attra fica sem interface nesta entrega. Até a tela existir, correção é `UPDATE` no banco — e a coluna `sobrescrito_por` já protege a linha de ser regerada. Está registrado para não passar por esquecimento.

**Nomes conferidos entre tasks:** `derivarRotulos`, `montarPassagem`, `prosaEhAceitavel`, `mesclar`, `lerRotulos`, `gravarRotulosDerivados`, `gerarProsa`, `passagemDoVeiculo` — usados com a mesma assinatura em todas as tasks que os consomem.
