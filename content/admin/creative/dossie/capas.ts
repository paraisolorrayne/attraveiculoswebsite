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
	{ id: 'ficha', rotulo: 'Ficha', resumo: 'Fundo claro, specs e selo' },
	{ id: 'arco', rotulo: 'Arco', resumo: 'Arcos e marca vazada' },
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
.capa{--margem:14mm; --claro:#f1f1f4}

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

/* ---------- 3. ficha ---------- */
/* A única capa de fundo claro do documento. A inversão é proposital: a folha
   que o cliente pega primeiro não parece a continuação das outras 21, e o
   vermelho da marca, que no escuro é só um risco, aqui pode ser massa.

   A FAIXA DA FOTO É DEITADA, e não uma coluna em pé. A referência desta capa
   põe a foto numa coluna alta à direita, o que só fecha com foto em pé; as do
   estoque são 4:3 deitadas e naquela coluna sobraria mais borrão que carro.
   Vira a faixa e a mesma composição volta a funcionar — diagonal, discos,
   lista e selo continuam onde estavam. */
.capa-ficha{background:var(--claro); color:var(--tinta)}
.capa-ficha .palco{bottom:auto; height:50%; clip-path:polygon(0 0, 100% 0, 100% 84%, 0 100%)}
.capa-ficha .disco{position:absolute; background:var(--sangue); border-radius:50%}
.capa-ficha .disco-1{left:-32mm; bottom:-32mm; width:58mm; height:58mm}
.capa-ficha .disco-2{right:-14mm; top:52%; width:26mm; height:26mm}
.capa-ficha .rotulo{position:absolute; left:var(--margem); top:13mm; font-size:7pt; letter-spacing:.3em; color:var(--papel); line-height:1.7; text-shadow:0 1px 6px rgba(0,0,0,.5)}
/* A logo tem o vermelho da marca: inverter para caber no claro deixaria o
   losango ciano. Ela fica sobre a foto, onde o branco original serve. */
.capa-ficha .logo{position:absolute; right:var(--margem); top:12mm}
.capa-ficha .corpo{position:absolute; left:var(--margem); right:var(--margem); top:55%}
.capa-ficha .simbolo{width:14mm; height:14mm; margin-bottom:5mm}
.capa-ficha .marca{color:#55555d; font-size:9.5pt; letter-spacing:.26em; font-weight:600}
.capa-ficha .modelo{color:var(--tinta); font-size:27pt; line-height:1.02; margin:2mm 0 2.5mm}
.capa-ficha .assinatura{font-size:7.5pt; letter-spacing:.24em; color:#55555d; font-weight:600}
.capa-ficha .duas{display:flex; gap:12mm; margin-top:7mm; border-top:1px solid #d4d4da; padding-top:5mm}
.capa-ficha .specs{flex:1}
.capa-ficha .specs div{font-size:9.5pt; line-height:2.05; color:#2c2c33}
.capa-ficha .specs b{font-weight:700; color:var(--tinta)}
.capa-ficha .selo{
  flex:1; display:flex; gap:4mm; align-items:flex-start; align-self:flex-start;
  border:1px solid rgba(217,46,46,.42); border-radius:2mm; padding:4mm 5mm; background:rgba(217,46,46,.06);
}
.capa-ficha .selo .bolha{flex:none; width:7mm; height:7mm; border-radius:50%; background:var(--sangue); color:#fff; font-size:8pt; font-weight:800; display:flex; align-items:center; justify-content:center}
.capa-ficha .selo b{display:block; font-size:8pt; font-weight:700; margin-bottom:1.5mm}
.capa-ficha .selo span{font-size:7.5pt; line-height:1.5; color:#43434b}
/* Alinhados à direita para saírem de cima do disco, que sangra pelo canto
   inferior esquerdo. */
.capa-ficha .campos{margin-top:7mm; padding-top:5mm; border-top:1px solid #d4d4da; justify-content:flex-end}
.capa-ficha .campos span{color:#6a6a73}
.capa-ficha .campos b{color:var(--tinta)}

/* ---------- 4. arco ---------- */
/* Os arcos vivem na metade de cima, atrás do texto. Embaixo da foto eles
   sumiriam sob o retângulo dela, e passar por trás do carro é justamente o que
   só o recorte de fundo faria. */
.capa-arco{background:var(--tinta)}
.capa-arco .arcos{position:absolute; left:0; right:0; top:0; height:62%; overflow:hidden}
.capa-arco .arcos svg{position:absolute; left:50%; top:-42%; width:250mm; height:250mm; transform:translateX(-50%); opacity:.5}
.capa-arco .rotulo{position:absolute; left:var(--margem); top:14mm; font-size:7pt; letter-spacing:.32em; line-height:1.7}
.capa-arco .logo{position:absolute; right:var(--margem); top:13mm}
.capa-arco .titulo{position:absolute; left:var(--margem); right:var(--margem); top:74mm; text-align:center}
/* A marca é vazada: fica o contorno e o miolo deixa o fundo passar. É o que
   dá ar a um nome de sete letras ocupando a largura da folha. */
.capa-arco .marca{
  font-size:46pt; font-weight:800; letter-spacing:.06em; line-height:1;
  color:transparent; -webkit-text-stroke:.42mm rgba(255,255,255,.9);
  ${METAL} -webkit-text-fill-color:transparent;
}
.capa-arco .modelo{font-size:15pt; font-weight:800; letter-spacing:.09em; margin-top:4mm; color:var(--papel)}
.capa-arco .assinatura{font-size:7.5pt; letter-spacing:.3em; color:var(--papel-fraco); margin-top:3.5mm}
.capa-arco .palco{top:auto; bottom:0; height:56%}
.capa-arco .foto{
  object-position:center 58%;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 9%,#000 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 9%,#000 100%);
}
/* Sem este pé escuro os três campos caem em cima do carro. */
.capa-arco .rodape{position:absolute; left:0; right:0; bottom:0; height:16%;
  background:linear-gradient(180deg,rgba(11,11,13,0),rgba(11,11,13,.86) 52%,var(--tinta))}
.capa-arco .campos{position:absolute; left:var(--margem); right:var(--margem); bottom:14mm; justify-content:space-between; gap:0}
.capa-arco .campos > div{text-align:center}
.capa-arco .campos > div:first-child{text-align:left}
.capa-arco .campos > div:last-child{text-align:right}
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

/**
 * As quatro linhas que a capa `ficha` adianta. Vêm da ficha técnica quando ela
 * já estiver preenchida; senão, da visão geral. O que não tiver valor não
 * aparece — capa com rótulo vazio é pior que capa sem a linha.
 */
function quatroLinhas(d: Dossie): string {
	const daFicha = (prefixo: string) => d.performance.find(l => l.rotulo.startsWith(prefixo))?.valor ?? ''
	const linhas: [string, string][] = [
		['Motor', daFicha('MOTOR') || d.motorizacao],
		['Potência', daFicha('POTÊNCIA')],
		['Torque', daFicha('TORQUE MÁXIMO')],
		['Tração', daFicha('TRAÇÃO') || d.tracao],
	]
	return linhas
		.filter(([, v]) => v)
		.map(([r, v]) => `<div><b>${escapar(r)}:</b> ${escapar(v)}</div>`)
		.join('')
}

/** As engrenagens do canto — desenho, não caractere de fonte. */
const SIMBOLO = `<svg class="simbolo" viewBox="0 0 48 48" fill="none" stroke="#0b0b0d" stroke-width="2.3" stroke-linecap="round">
  <circle cx="18" cy="18" r="10"/><circle cx="18" cy="18" r="4"/>
  <path d="M18 4.5v3.5M18 28v3.5M4.5 18h3.5M28 18h3.5M8.4 8.4l2.5 2.5M25.1 25.1l2.5 2.5M27.6 8.4l-2.5 2.5M10.9 25.1l-2.5 2.5"/>
  <circle cx="35" cy="35" r="6.5"/><circle cx="35" cy="35" r="2.5"/>
  <path d="M35 26.5v2M35 41.5v2M26.5 35h2M41.5 35h2M29.4 29.4l1.5 1.5M39.1 39.1l1.5 1.5M40.6 29.4l-1.5 1.5M30.9 39.1l-1.5 1.5"/>
</svg>`

/** Os arcos da capa `arco`: circunferências finas, quase todas fora da folha. */
const ARCOS = `<svg viewBox="0 0 900 900" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="1.1">
  <circle cx="450" cy="450" r="180"/><circle cx="450" cy="450" r="268"/>
  <circle cx="450" cy="450" r="356"/><circle cx="450" cy="450" r="444"/>
  <circle cx="196" cy="616" r="300" stroke="rgba(255,255,255,.13)"/>
  <circle cx="712" cy="270" r="360" stroke="rgba(255,255,255,.13)"/>
</svg>`

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

	if (d.estiloCapa === 'ficha') {
		return `<section class="pagina capa capa-ficha">
  ${palco(d)}
  <div class="disco disco-1"></div>
  <div class="disco disco-2"></div>
  <div class="rotulo">DOSSIÊ TÉCNICO</div>
  <img class="logo" src="${LOGO}" alt="Attra Veículos">
  <div class="corpo">
    ${SIMBOLO}
    <div class="marca">${n.marca}</div>
    <div class="modelo">${n.modelo}</div>
    ${n.assinatura ? `<div class="assinatura">${n.assinatura}</div>` : ''}
    <div class="duas">
      <div class="specs">${quatroLinhas(d)}</div>
      ${
				d.documentacaoTitulo || d.documentacaoDetalhe
					? `<div class="selo"><div class="bolha">!</div><div>
        ${d.documentacaoTitulo ? `<b>${escapar(d.documentacaoTitulo)}</b>` : ''}
        ${d.documentacaoDetalhe ? `<span>${escapar(d.documentacaoDetalhe)}</span>` : ''}
      </div></div>`
					: ''
			}
    </div>
    <div class="campos">${campos(d)}</div>
  </div>
</section>`
	}

	if (d.estiloCapa === 'arco') {
		return `<section class="pagina capa capa-arco">
  <div class="arcos">${ARCOS}</div>
  ${palco(d)}
  <div class="rodape"></div>
  <div class="rotulo">DOSSIÊ<br>TÉCNICO</div>
  <img class="logo" src="${LOGO}" alt="Attra Veículos">
  <div class="titulo">
    <div class="marca">${n.marca}</div>
    <div class="modelo">${n.modelo}</div>
    ${n.assinatura ? `<div class="assinatura">${n.assinatura}</div>` : ''}
  </div>
  <div class="campos">${campos(d)}</div>
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
