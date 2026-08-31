# Regressão pixel a pixel do Gerador de Criativos

Prova que `content/admin/creative/gerador/` desenha exatamente o mesmo que o
`<script>` de `content/admin/gerador-criativos.html`. 35 casos cobrindo os seis
formatos, Stories e Feed, com os extremos de cada controle.

**O HTML antigo não está mais na árvore** — ele saiu em 30/08/2026, junto com a
troca. Para rodar a regressão de novo, recupere-o do histórico:

```sh
git show b6d4059:content/admin/gerador-criativos.html > /tmp/reg/antigo.html
```

(`b6d4059` é o último commit em que ele existia; `git log --diff-filter=D --
content/admin/gerador-criativos.html` acha o commit que o removeu.)

Isto é guardado porque a prova vale para o futuro: se alguém mexer no desenho e
quiser saber se saiu do que estava aprovado, este é o aparato que responde.

## Como rodar

```sh
mkdir -p /tmp/reg && cd /tmp/reg
cp -R public/gerador .
git show b6d4059:content/admin/gerador-criativos.html > antigo.html
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

## O que a regressão já NÃO cobre

Ela prova que o porte saiu idêntico ao HTML antigo, e isso está feito. A partir
de 31/08/2026 o **Clássico e o Clássico Loja divergem de propósito**: a cor do preço, do KM e
dos destaques deixou de ser constante e passa a sair de uma medição do fundo
(ver `content/admin/creative/gerador/contraste.ts`). Rodar a regressão hoje
acusa diferença nos casos desse formato — e deve acusar mesmo.

No Clássico, a divisa entre a foto e a faixa de piso deixou de ser seca: a base
da foto é espelhada para dentro da faixa e dissolvida, então a região logo
abaixo de PISO_TOP também difere.

Os outros quatro formatos continuam idênticos, e para eles o aparato segue
valendo.

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
