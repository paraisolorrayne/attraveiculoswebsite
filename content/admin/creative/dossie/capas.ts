/**
 * Três capas para o dossiê — o operador escolhe qual usar.
 *
 * A capa é a única página que não é informação: é a primeira impressão. As três
 * dividem os mesmos tokens (mesma paleta, mesma família, mesma margem de 14mm) e
 * os mesmos dados; o que muda é como a foto e o nome do carro se encontram.
 *
 *   corte    A diagonal do dossiê feito à mão. A foto entra recortada entre duas
 *            diagonais paralelas e o nome do modelo é preenchido com um gradiente
 *            metálico — é o brilho de pintura automotiva virando letra.
 *   vitrine  Foto sangrada, sem recorte, escurecida por baixo. Todo o texto num
 *            eixo só, à esquerda. A geometria some e sobra a foto.
 *   lote     Catálogo de leilão. Fundo cheio, foto emoldurada no miolo e os
 *            dados numa grade de filetes. A mais sóbria das três.
 */
import { escapar, LOGO } from './comum'
import type { Dossie } from './tipos'

export const ESTILOS_DE_CAPA = [
	{ id: 'corte', rotulo: 'Corte', resumo: 'Diagonais e nome metálico' },
	{ id: 'vitrine', rotulo: 'Vitrine', resumo: 'Foto sangrada, texto num eixo' },
	{ id: 'lote', rotulo: 'Lote', resumo: 'Foto emoldurada, grade de catálogo' },
] as const

export type EstiloCapa = (typeof ESTILOS_DE_CAPA)[number]['id']

/**
 * O gradiente metálico é pintado no texto por `background-clip`. Em impressão
 * ele só sobrevive com `print-color-adjust:exact`, que o documento já declara no
 * body — sem isso o Chrome descarta o fundo e o nome sai transparente.
 */
const METAL = `
  background:linear-gradient(180deg,#ffffff 0%,#e2e2e8 34%,#b9b9c2 62%,#6c6c76 100%);
  -webkit-background-clip:text; background-clip:text;
  color:transparent; -webkit-text-fill-color:transparent;`

export const CSS_DAS_CAPAS = `
/* ---------- comum às três capas ---------- */
.capa{--margem:14mm}

/* O PALCO RESOLVE O RECORTE. As fotos do estoque são 4:3 deitadas e a página é
   A4 em pé: um \`cover\` centraliza e o que sobra na tela é a roda do carro, não
   o carro. Então a foto entra por dentro (\`contain\`, largura inteira) e o que
   falta em cima e embaixo é preenchido por uma cópia dela mesma, borrada e
   escurecida — o fundo continua sendo daquele carro, naquela luz, sem virar
   uma tarja preta. */
.capa .palco{position:absolute; inset:0; overflow:hidden; background:var(--tinta)}
.capa .brumo{
  position:absolute; left:-8%; top:-8%; width:116%; height:116%;
  object-fit:cover; filter:blur(26px) saturate(.65) brightness(.42);
}
.capa .foto{position:absolute; inset:0; width:100%; height:100%; object-fit:contain; object-position:center 42%}
.capa .rotulo{font-size:13.5pt; letter-spacing:.32em; font-weight:300; line-height:1.5}
.capa .marca{font-size:14pt; letter-spacing:.14em; font-weight:300; color:var(--papel)}
.capa .modelo{font-size:40pt; font-weight:800; letter-spacing:.005em; line-height:.96}
.capa .campos{display:flex; gap:13mm}
.capa .campos span{display:block; font-size:6pt; letter-spacing:.24em; color:var(--papel-fraco); margin-bottom:1.5mm}
.capa .campos b{font-size:9.5pt; letter-spacing:.16em; font-weight:700; font-variant-numeric:tabular-nums}
.capa .logo{width:30mm}

/* ---------- 1. corte ---------- */
/* Duas diagonais paralelas: a foto entra por uma e o painel de texto sobe pela
   outra. O ângulo é o mesmo nas duas para o corte ler como um gesto só. */
.capa-corte .palco{clip-path:polygon(44% 0, 100% 0, 100% 64%, 57% 100%, 0 100%, 0 41%)}
.capa-corte .painel{
  position:absolute; left:0; right:0; bottom:0; height:46%;
  clip-path:polygon(0 26%, 100% 0, 100% 100%, 0 100%);
  background:linear-gradient(180deg,rgba(11,11,13,0) 0,rgba(11,11,13,.72) 16%,var(--tinta) 40%);
}
.capa-corte .risco{position:absolute; top:12mm; left:var(--margem); width:2.6mm; height:9mm; background:var(--sangue)}
.capa-corte .rotulo{position:absolute; top:15.5mm; left:calc(var(--margem) + 6mm)}
.capa-corte .pe{position:absolute; left:var(--margem); right:var(--margem); bottom:13mm}
/* O gradiente se repete a cada linha: sem isso, num nome de duas linhas a
   primeira sai branca e a segunda cinza, e o metal vira defeito. */
.capa-corte .modelo{${METAL} background-size:100% .96em; background-repeat:repeat-y}
.capa-corte .assinatura{
  display:flex; align-items:center; gap:5mm; justify-content:flex-end;
  font-size:8.5pt; letter-spacing:.26em; color:var(--papel-fraco); margin-top:2.5mm;
}
.capa-corte .assinatura::before{content:''; flex:1; height:1px; background:#4d4d57}
.capa-corte .campos{margin-top:8mm; align-items:flex-end}
.capa-corte .logo{margin-left:auto; display:block}

/* ---------- 2. vitrine ---------- */
/* Sem recorte nenhum: um escurecimento que sobe do pé e um eixo vertical
   vermelho que ancora todo o texto na mesma coluna. */
/* Sem isto a foto contida termina em duas linhas retas contra o fundo e a capa
   lê como uma tarja. A máscara dissolve as pontas na cópia borrada. */
.capa-vitrine .foto{
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 7%,#000 89%,transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 7%,#000 89%,transparent 100%);
}
.capa-vitrine .brumo{filter:blur(22px) saturate(.7) brightness(.5)}
.capa-vitrine .veu{
  position:absolute; inset:0;
  background:linear-gradient(180deg,rgba(11,11,13,.72) 0,rgba(11,11,13,.10) 26%,rgba(11,11,13,.16) 46%,rgba(11,11,13,.93) 84%);
}
.capa-vitrine .rotulo{position:absolute; top:15mm; right:var(--margem); font-size:7.5pt; letter-spacing:.3em; text-align:right; line-height:1.7}
.capa-vitrine .logo{position:absolute; top:13mm; left:var(--margem)}
.capa-vitrine .eixo{position:absolute; left:var(--margem); bottom:15mm; width:1.2mm; height:58mm; background:linear-gradient(180deg,rgba(217,46,46,0),var(--sangue) 34%,var(--sangue))}
.capa-vitrine .pe{position:absolute; left:calc(var(--margem) + 6mm); right:var(--margem); bottom:15mm}
.capa-vitrine .modelo{margin:2mm 0 4mm}
.capa-vitrine .assinatura{font-size:8pt; letter-spacing:.3em; color:var(--sangue); font-weight:600}
.capa-vitrine .campos{margin-top:9mm; gap:0}
.capa-vitrine .campos > div{padding-right:11mm; margin-right:11mm; border-right:1px solid var(--linha)}
.capa-vitrine .campos > div:last-child{border-right:0}

/* ---------- 3. lote ---------- */
/* Fundo cheio e a foto tratada como prancha: emoldurada, com ar em volta. A
   informação vira grade, do jeito que um catálogo de leilão apresenta o lote. */
.capa-lote{background:var(--tinta)}
.capa-lote .prancha{position:absolute; left:var(--margem); right:var(--margem); top:50mm; height:142mm; overflow:hidden; background:var(--tinta-2)}
.capa-lote .prancha .foto{object-fit:cover; object-position:center 52%}
.capa-lote .topo{position:absolute; left:var(--margem); right:var(--margem); top:16mm; display:flex; align-items:flex-end; justify-content:space-between}
.capa-lote .topo .rotulo{font-size:8pt; letter-spacing:.34em}
.capa-lote .regua{position:absolute; left:var(--margem); right:var(--margem); top:44mm; height:1px; background:var(--sangue)}
.capa-lote .pe{position:absolute; left:var(--margem); right:var(--margem); top:202mm}
.capa-lote .modelo{margin:2mm 0 5mm; font-size:36pt}
.capa-lote .assinatura{font-size:8pt; letter-spacing:.3em; color:var(--papel-fraco); padding-bottom:6mm; border-bottom:1px solid var(--linha)}
.capa-lote .campos{margin-top:7mm; gap:0}
.capa-lote .campos > div{flex:1; padding:0 0 0 6mm; border-left:1px solid var(--linha)}
.capa-lote .campos > div:first-child{padding-left:0; border-left:0}
.capa-lote .selo{position:absolute; left:var(--margem); right:var(--margem); bottom:15mm; display:flex; align-items:center; justify-content:space-between; font-size:6.5pt; letter-spacing:.26em; color:var(--papel-fraco)}
`

function campos(d: Dossie): string {
	return [
		['ANO', d.ano],
		['COR', d.cor],
		['KM', d.km],
	]
		.filter(([, v]) => v)
		.map(([r, v]) => `<div><span>${escapar(r)}</span><b>${escapar(v)}</b></div>`)
		.join('')
}

/** O palco: a foto por dentro, sobre uma cópia borrada dela mesma. */
function palco(d: Dossie): string {
	if (!d.fotos[0]) return '<div class="palco"></div>'
	const src = escapar(d.fotos[0])
	return `<div class="palco"><img class="brumo" src="${src}" alt=""><img class="foto" src="${src}" alt=""></div>`
}

const nome = (d: Dossie) => ({
	marca: escapar(d.marca.toUpperCase()),
	modelo: escapar(d.modelo.toUpperCase()),
	assinatura: d.assinatura ? escapar(d.assinatura.toUpperCase()) : '',
})

export function paginaCapa(d: Dossie): string {
	const n = nome(d)
	if (d.estiloCapa === 'vitrine') {
		return `<section class="pagina capa capa-vitrine">
  ${palco(d)}
  <div class="veu"></div>
  <img class="logo" src="${LOGO}" alt="Attra Veículos">
  <div class="rotulo">DOSSIÊ<br>TÉCNICO</div>
  <div class="eixo"></div>
  <div class="pe">
    <div class="marca">${n.marca}</div>
    <div class="modelo">${n.modelo}</div>
    ${n.assinatura ? `<div class="assinatura">${n.assinatura}</div>` : ''}
    <div class="campos">${campos(d)}</div>
  </div>
</section>`
	}

	if (d.estiloCapa === 'lote') {
		return `<section class="pagina capa capa-lote">
  <div class="topo">
    <div class="rotulo">DOSSIÊ TÉCNICO</div>
    <img class="logo" src="${LOGO}" alt="Attra Veículos">
  </div>
  <div class="regua"></div>
  <div class="prancha">${d.fotos[0] ? `<img class="foto" src="${escapar(d.fotos[0])}" alt="">` : ''}</div>
  <div class="pe">
    <div class="marca">${n.marca}</div>
    <div class="modelo">${n.modelo}</div>
    ${n.assinatura ? `<div class="assinatura">${n.assinatura}</div>` : ''}
    <div class="campos">${campos(d)}</div>
  </div>
  <div class="selo"><div>ATTRAVEICULOS.COM.BR</div><div>SÃO PAULO · BRASIL</div></div>
</section>`
	}

	return `<section class="pagina capa capa-corte">
  ${palco(d)}
  <div class="painel"></div>
  <div class="risco"></div>
  <div class="rotulo">DOSSIÊ<br>TÉCNICO</div>
  <div class="pe">
    <div class="marca">${n.marca}</div>
    <div class="modelo">${n.modelo}</div>
    ${n.assinatura ? `<div class="assinatura">${n.assinatura}</div>` : ''}
    <div class="campos">${campos(d)}<img class="logo" src="${LOGO}" alt="Attra Veículos"></div>
  </div>
</section>`
}
