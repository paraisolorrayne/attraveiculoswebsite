# Regressão pixel a pixel do Gerador de Criativos

Prova que `content/admin/creative/gerador/` desenha exatamente o mesmo que o
`<script>` de `content/admin/gerador-criativos.html`. 35 casos cobrindo os seis
formatos, Stories e Feed, com os extremos de cada controle.

**Vida útil:** só roda enquanto o HTML antigo existir. Some junto com ele
quando a tela em React entrar no ar (Task 7 do plano).

## Como rodar

```sh
mkdir -p /tmp/reg && cd /tmp/reg
cp -R public/gerador .
cp content/admin/gerador-criativos.html antigo.html
cp scripts/regressao-gerador/regressao.html .
cp ~/Downloads/attra-fotos-teste/*.webp .
./node_modules/.bin/esbuild content/admin/creative/gerador/index.ts \
  --bundle --format=esm --target=es2022 --outfile=motor.js
python3 -m http.server 8767
```

Em `antigo.html`, injete duas coisas (o arquivo do repositório não as tem, de
propósito — são andaimes de teste):

1. **antes** do `<script>` principal, a semente do `Math.random` que está no
   topo de `regressao.html`;
2. **no fim do arquivo**, a ponte para os bindings léxicos:
   ```html
   <script>window.__ponte = { cv, cvFeed, state, render, renderFeed };</script>
   ```

Abra `http://localhost:8767/regressao.html`. O esperado é
`TODOS OS 35 CASOS IDÊNTICOS AO PIXEL`.

## Três confundidores que custaram diagnóstico falso

Nenhum era defeito do porte; todos faziam o comparador acusar diferença onde
o código era idêntico. Estão anotados no próprio harness:

1. **`willReadFrequently: true`** força rasterização por CPU enquanto o canvas
   da tela usa GPU. A mesma `drawImage` saía com Δ até 83.
2. **Canvases diferentes ditheram gradiente diferente.** O mesmo
   `createLinearGradient` dava Δ=1 em 590 mil pixels só porque um canvas é
   on-screen reduzido por CSS. Por isso os dois motores desenham na MESMA
   superfície — a do iframe.
3. **O Chrome promove a superfície de software para GPU** depois dos primeiros
   desenhos. O primeiro caso de cada canvas acusava Δ=48 sozinho. Por isso cada
   motor desenha duas vezes e vale a segunda.

O grão da textura usa `Math.random()` e é sorteado de verdade: sem semente
fixa nos dois realms, identidade ao pixel seria impossível por construção.
