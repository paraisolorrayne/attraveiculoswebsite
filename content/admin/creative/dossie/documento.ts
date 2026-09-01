/**
 * O dossiê como documento HTML pronto para virar PDF.
 *
 * POR QUE HTML E NÃO CANVAS, como os criativos. Os criativos são IMAGEM: uma
 * peça, medida em pixels, publicada como PNG — canvas é a ferramenta certa. O
 * dossiê é DOCUMENTO: 22 páginas de texto em grade, tabelas e listas. No canvas
 * cada linha dessas tabelas seria posicionada à mão, o texto viraria imagem
 * (nada de selecionar ou buscar) e as 22 páginas em resolução de impressão
 * passariam de 40 MB. Em CSS a grade é nativa, o texto sai vetorial e o arquivo
 * fica em poucos megabytes.
 *
 * O PDF sai pelo próprio navegador (Cmd+P → Salvar como PDF). Não precisa de
 * Puppeteer nem de biblioteca de PDF — nenhuma dependência nova, e o que o
 * operador vê na prévia é exatamente o que sai impresso.
 */
import { cartaAoCliente, FOTOS_FIXAS, FOTOS_POR_PAGINA_GALERIA, type Dossie } from './tipos'

/** Negrito com **asteriscos**, que é como a carta marca os destaques. */
function comDestaques(texto: string): string {
	return escapar(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function escapar(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

/** Logo da Attra, servida de /public — a mesma dos criativos. */
const LOGO = '/gerador/logo-branca.png'

const CSS = `
:root{
  --tinta:#0b0b0d;        /* fundo das páginas */
  --tinta-2:#141417;      /* blocos sobre o fundo */
  --papel:#f4f4f6;        /* texto principal */
  --papel-fraco:#9b9ba4;  /* rótulos e apoio */
  --sangue:#d92e2e;       /* o acento da marca */
  --linha:#2a2a30;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#3a3a3f}
body{
  font-family:'Montserrat',-apple-system,'Helvetica Neue',Arial,sans-serif;
  color:var(--papel);
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.pagina{
  position:relative; width:210mm; height:297mm; overflow:hidden;
  background:var(--tinta); margin:0 auto 8mm; page-break-after:always;
}
.pagina:last-child{page-break-after:auto}

/* ---------- cabeçalho numerado das seções ---------- */
.cabecalho{
  display:flex; align-items:center; justify-content:space-between;
  padding:8mm 12mm; border-bottom:1px solid var(--sangue);
  font-size:8pt; letter-spacing:.22em; font-weight:600;
}
.cabecalho .num{color:var(--sangue); margin-right:.6em}
.cabecalho .dir{color:var(--papel-fraco); font-weight:500}

/* ---------- capa ---------- */
.capa .foto{position:absolute; inset:0; width:100%; height:100%; object-fit:cover}
.capa .veu{
  position:absolute; inset:0;
  background:linear-gradient(160deg,rgba(11,11,13,.94) 0 32%,rgba(11,11,13,.10) 55%,rgba(11,11,13,.92) 88%);
}
.capa .rotulo{position:absolute; top:16mm; left:14mm; font-size:15pt; letter-spacing:.32em; font-weight:300; line-height:1.5}
.capa .risco{position:absolute; top:12mm; left:14mm; width:3mm; height:9mm; background:var(--sangue)}
.capa .pe{position:absolute; left:14mm; right:14mm; bottom:14mm}
.capa .marca{font-size:15pt; letter-spacing:.10em; font-weight:300}
.capa .modelo{font-size:44pt; font-weight:800; letter-spacing:.01em; line-height:1; margin:1mm 0 2mm}
.capa .assinatura{font-size:9pt; letter-spacing:.28em; color:var(--papel-fraco); text-align:right; border-top:1px solid var(--linha); padding-top:2mm}
.capa .campos{display:flex; gap:14mm; margin-top:7mm}
.capa .campos div span{display:block; font-size:6.5pt; letter-spacing:.24em; color:var(--papel-fraco)}
.capa .campos div b{font-size:9.5pt; letter-spacing:.18em; font-weight:700}
.capa .logo{position:absolute; right:14mm; bottom:13mm; width:32mm}

/* ---------- moldura (carta e contracapa) ---------- */
.moldura{position:absolute; inset:8mm; border:1px solid var(--sangue)}

/* ---------- carta ---------- */
.carta{padding:22mm 24mm; display:flex; flex-direction:column; height:100%}
.carta .topo{text-align:center}
.carta .topo img{width:30mm}
.carta .topo .sub{font-size:7pt; letter-spacing:.26em; color:var(--papel-fraco); margin-top:3mm}
.carta .topo hr{width:18mm; margin:4mm auto; border:0; border-top:1px solid var(--sangue)}
.carta .losango{color:var(--sangue); font-size:8pt}
.carta h2{text-align:center; font-size:20pt; margin:5mm 0 8mm; font-weight:700}
.carta p{font-size:10pt; line-height:1.85; margin-bottom:5mm; color:#dcdce2}
.carta .assina{margin-top:auto; border-top:1px solid var(--linha); padding-top:5mm; text-align:right; font-size:9.5pt}
.carta .assina b{display:block; color:var(--sangue); font-size:11pt; margin-top:1mm}
.carta .rodape{text-align:center; margin-top:8mm}
.carta .rodape img{width:26mm}
.carta .rodape div{font-size:6.5pt; letter-spacing:.24em; color:var(--papel-fraco); margin-top:2mm}

/* ---------- visão geral ---------- */
.corpo{padding:9mm 12mm}
.hero{width:100%; height:88mm; object-fit:cover; display:block}
.eyebrow{display:flex; align-items:center; gap:2.5mm; font-size:8pt; letter-spacing:.22em; font-weight:600; margin-bottom:4mm}
.eyebrow::before{content:''; width:2.5mm; height:2.5mm; background:var(--sangue)}
.titulo{font-size:19pt; font-weight:700; margin-bottom:7mm}
.grade{display:grid; grid-template-columns:repeat(3,1fr); gap:7mm 6mm}
.grade span{display:block; font-size:6.5pt; letter-spacing:.2em; color:var(--papel-fraco); margin-bottom:1.5mm}
.grade b{font-size:11pt; font-weight:500}
.selo{border-left:2px solid var(--sangue); padding:3mm 0 3mm 5mm; margin:8mm 0}
.selo span{font-size:6.5pt; letter-spacing:.22em; color:var(--papel-fraco)}
.selo b{display:block; font-size:13pt; font-weight:600; margin:1.5mm 0}
.selo small{font-size:8pt; color:var(--papel-fraco)}
.resumo{font-size:9.5pt; line-height:1.75; color:#c9c9d2; border-top:1px solid var(--linha); padding-top:6mm}

/* ---------- ficha técnica ---------- */
.retrato{width:100%; height:62mm; object-fit:cover; display:block; margin-bottom:8mm; border:1px solid var(--linha)}
.grupo{margin-bottom:8mm}
.grupo .cabeca{display:flex; align-items:center; gap:4mm; margin-bottom:4mm}
.grupo .icone{width:9mm; height:9mm; border-radius:50%; border:1px solid var(--sangue); display:flex; align-items:center; justify-content:center; color:var(--sangue); font-size:9pt}
.grupo h3{font-size:12pt; font-weight:600}
.tabela{display:grid; grid-template-columns:1fr 1fr; gap:0 10mm}
.tabela .linha{display:flex; justify-content:space-between; align-items:baseline; gap:4mm; padding:2.2mm 0; border-bottom:1px solid var(--linha)}
.tabela .linha span{font-size:7pt; letter-spacing:.14em; color:var(--papel-fraco); white-space:nowrap}
.tabela .linha b{font-size:9.5pt; font-weight:600; text-align:right}
.nota{font-size:7.5pt; font-style:italic; color:var(--papel-fraco); margin-top:3mm}

/* ---------- diferenciais ---------- */
.duas{display:grid; grid-template-columns:38% 1fr; height:100%}
.duas .tira{display:flex; flex-direction:column}
.duas .tira img{width:100%; flex:1; object-fit:cover; min-height:0}
.duas .texto{padding:14mm 12mm 12mm}
.duas .eyebrow2{font-size:8pt; letter-spacing:.22em; color:var(--sangue); font-weight:600; margin-bottom:3mm}
.duas h2{font-size:19pt; font-weight:700; margin-bottom:4mm}
.duas .intro{font-size:9pt; line-height:1.7; color:#b9b9c2; margin-bottom:8mm}
.lista{list-style:none}
.lista li{font-size:9pt; line-height:1.65; margin-bottom:2.5mm; padding-left:5mm; position:relative; color:#dcdce2}
.lista li::before{content:''; position:absolute; left:0; top:1.6mm; width:2mm; height:2mm; background:var(--sangue)}
.grupo-dif{margin-bottom:7mm}
.grupo-dif .cabeca{display:flex; align-items:center; gap:3.5mm; margin-bottom:3mm; border-bottom:1px solid var(--linha); padding-bottom:2.5mm}
.grupo-dif h4{font-size:8.5pt; letter-spacing:.18em; font-weight:600; color:var(--sangue)}

/* ---------- galeria ---------- */
.galeria{display:grid; grid-template-rows:1fr 1fr; height:100%; gap:0}
.galeria img{width:100%; height:100%; object-fit:cover; display:block; min-height:0}
.galeria.com-cabecalho{grid-template-rows:auto 1fr 1fr}

/* ---------- contracapa ---------- */
.fim .foto{position:absolute; left:0; right:0; top:26mm; height:120mm; width:100%; object-fit:cover}
.fim .veu{position:absolute; inset:0; background:linear-gradient(180deg,rgba(11,11,13,.55) 0 18%,rgba(11,11,13,.1) 32%,rgba(11,11,13,.95) 62%)}
.fim .marca-topo{position:absolute; top:14mm; left:14mm; width:26mm}
.fim .rotulo-topo{position:absolute; top:16mm; right:14mm; font-size:7.5pt; letter-spacing:.26em; color:var(--papel-fraco)}
.fim .pe{position:absolute; left:14mm; right:14mm; bottom:16mm; text-align:center}
.fim .marca{font-size:10pt; letter-spacing:.3em; color:var(--papel-fraco)}
.fim .modelo{font-size:34pt; font-weight:800; margin:2mm 0 3mm}
.fim .assinatura{font-size:8pt; letter-spacing:.24em; color:var(--papel-fraco); border-top:1px solid var(--sangue); border-bottom:1px solid var(--sangue); display:inline-block; padding:2mm 6mm}
.fim .chamada{font-size:9pt; line-height:1.8; color:#c9c9d2; max-width:120mm; margin:7mm auto 5mm}
.fim .contatos{font-size:8pt; letter-spacing:.16em; color:var(--papel-fraco)}
.fim .contatos b{color:var(--sangue); margin:0 2mm}
.fim .rodape{margin-top:7mm; border-top:1px solid var(--linha); padding-top:5mm}
.fim .rodape img{width:26mm}
.fim .rodape div{font-size:6.5pt; letter-spacing:.22em; color:var(--papel-fraco); margin-top:2mm}

@page{size:A4; margin:0}
@media print{
  html,body{background:#fff}
  .pagina{margin:0; box-shadow:none}
}
`

function paginaCapa(d: Dossie): string {
	const campos = [
		['ANO', d.ano],
		['COR', d.cor],
		['KM', d.km],
	]
		.filter(([, v]) => v)
		.map(([r, v]) => `<div><span>${escapar(r)}</span><b>${escapar(v)}</b></div>`)
		.join('')
	return `<section class="pagina capa">
  ${d.fotos[0] ? `<img class="foto" src="${escapar(d.fotos[0])}" alt="">` : ''}
  <div class="veu"></div>
  <div class="risco"></div>
  <div class="rotulo">DOSSIÊ<br>TÉCNICO</div>
  <div class="pe">
    <div class="marca">${escapar(d.marca.toUpperCase())}</div>
    <div class="modelo">${escapar(d.modelo.toUpperCase())}</div>
    ${d.assinatura ? `<div class="assinatura">${escapar(d.assinatura.toUpperCase())}</div>` : ''}
    <div class="campos">${campos}</div>
  </div>
  <img class="logo" src="${LOGO}" alt="Attra Veículos">
</section>`
}

function paginaCarta(d: Dossie): string {
	const paragrafos = cartaAoCliente(d.marca, d.modelo).map(p => `<p>${comDestaques(p)}</p>`).join('')
	return `<section class="pagina">
  <div class="moldura"></div>
  <div class="carta">
    <div class="topo">
      <img src="${LOGO}" alt="Attra Veículos">
      <div class="sub">DOSSIÊ TÉCNICO · ${escapar(`${d.marca} ${d.modelo}`.trim().toUpperCase())}</div>
      <hr>
      <div class="losango">◆</div>
    </div>
    <h2>Prezado cliente,</h2>
    ${paragrafos}
    <div class="assina">Atenciosamente,<b>Equipe Attra Veículos</b></div>
    <div class="rodape"><img src="${LOGO}" alt=""><div>ATTRAVEICULOS.COM.BR</div></div>
  </div>
</section>`
}

function cabecalho(num: string, secao: string, d: Dossie): string {
	return `<div class="cabecalho">
    <div><span class="num">${num}</span>${escapar(secao)}</div>
    <div class="dir">${escapar(`${d.marca} ${d.modelo}`.trim().toUpperCase())}</div>
  </div>`
}

function paginaVisaoGeral(d: Dossie): string {
	const campos: [string, string][] = [
		['ANO / MODELO', d.anoModelo],
		['QUILOMETRAGEM', d.quilometragem],
		['COR EXTERNA', d.corExterna],
		['INTERIOR', d.interior],
		['MOTORIZAÇÃO', d.motorizacao],
		['TRAÇÃO', d.tracao],
	]
	return `<section class="pagina">
  ${cabecalho('03', 'VISÃO GERAL', d)}
  ${d.fotos[1] ? `<img class="hero" src="${escapar(d.fotos[1])}" alt="">` : ''}
  <div class="corpo">
    <div class="eyebrow">FICHA DO VEÍCULO</div>
    <div class="titulo">${escapar(`${d.marca} ${d.modelo}`.trim())}</div>
    <div class="grade">${campos
			.filter(([, v]) => v)
			.map(([r, v]) => `<div><span>${escapar(r)}</span><b>${escapar(v)}</b></div>`)
			.join('')}</div>
    ${
			d.documentacaoTitulo
				? `<div class="selo"><span>DOCUMENTAÇÃO &amp; PROCEDÊNCIA</span><b>${escapar(d.documentacaoTitulo)}</b><small>${escapar(d.documentacaoDetalhe)}</small></div>`
				: ''
		}
    ${d.resumo ? `<p class="resumo">${escapar(d.resumo)}</p>` : ''}
  </div>
</section>`
}

function tabela(linhas: { rotulo: string; valor: string }[]): string {
	return `<div class="tabela">${linhas
		.filter(l => l.valor.trim())
		.map(l => `<div class="linha"><span>${escapar(l.rotulo)}</span><b>${escapar(l.valor)}</b></div>`)
		.join('')}</div>`
}

function paginaFicha(d: Dossie): string {
	const grupo = (icone: string, titulo: string, linhas: { rotulo: string; valor: string }[], nota = '') =>
		linhas.some(l => l.valor.trim())
			? `<div class="grupo">
        <div class="cabeca"><div class="icone">${icone}</div><h3>${escapar(titulo)}</h3></div>
        ${tabela(linhas)}
        ${nota ? `<div class="nota">${escapar(nota)}</div>` : ''}
      </div>`
			: ''
	return `<section class="pagina">
  ${cabecalho('04', 'FICHA TÉCNICA', d)}
  <div class="corpo">
    ${d.fotos[2] ? `<img class="retrato" src="${escapar(d.fotos[2])}" alt="">` : ''}
    ${grupo('◔', 'Motorização e Performance', d.performance, d.notaPerformance)}
    ${grupo('▤', 'Dimensões e Peso', d.dimensoes)}
    ${grupo('⦀', 'Suspensão & Tecnologia', d.suspensao)}
  </div>
</section>`
}

function paginaDiferenciais(d: Dossie): string {
	const tira = d.fotos.slice(3, 6).map(f => `<img src="${escapar(f)}" alt="">`).join('')
	const grupos = d.diferenciais
		.filter(g => g.itens.some(i => i.trim()))
		.map(
			g => `<div class="grupo-dif">
        <div class="cabeca"><div class="icone">◆</div><h4>${escapar(g.titulo)}</h4></div>
        <ul class="lista">${g.itens.filter(i => i.trim()).map(i => `<li>${comDestaques(i)}</li>`).join('')}</ul>
      </div>`,
		)
		.join('')
	return `<section class="pagina">
  <div class="duas">
    <div class="tira">${tira}</div>
    <div class="texto">
      <div class="eyebrow2">CONFIGURAÇÃO EXCLUSIVA</div>
      <h2>Diferenciais desta Unidade</h2>
      <p class="intro">${escapar(d.introDiferenciais)}</p>
      ${grupos}
      ${
				d.documentacaoTitulo
					? `<div class="selo"><span>DOCUMENTAÇÃO &amp; PROCEDÊNCIA</span><b>${escapar(d.documentacaoTitulo)}</b><small>${escapar(d.documentacaoDetalhe)}</small></div>`
					: ''
			}
    </div>
  </div>
</section>`
}

function paginasGaleria(d: Dossie): string {
	const disponiveis = d.fotos.slice(FOTOS_FIXAS + 3)
	const paginas: string[] = []
	for (let p = 0; p < d.paginasDeGaleria; p++) {
		const par = disponiveis.slice(p * FOTOS_POR_PAGINA_GALERIA, (p + 1) * FOTOS_POR_PAGINA_GALERIA)
		if (!par.length) break
		const primeira = p === 0
		paginas.push(`<section class="pagina">
  <div class="galeria${primeira ? ' com-cabecalho' : ''}">
    ${primeira ? cabecalho('06', 'GALERIA', d) : ''}
    ${par.map(f => `<img src="${escapar(f)}" alt="">`).join('')}
  </div>
</section>`)
	}
	return paginas.join('')
}

function paginaFinal(d: Dossie): string {
	const ultima = d.fotos[d.fotos.length - 1]
	return `<section class="pagina fim">
  ${ultima ? `<img class="foto" src="${escapar(ultima)}" alt="">` : ''}
  <div class="veu"></div>
  <div class="moldura"></div>
  <img class="marca-topo" src="${LOGO}" alt="Attra Veículos">
  <div class="rotulo-topo">DOSSIÊ TÉCNICO</div>
  <div class="pe">
    <div class="marca">${escapar(d.marca.toUpperCase())}</div>
    <div class="modelo">${escapar(d.modelo.toUpperCase())}</div>
    ${d.assinatura ? `<div class="assinatura">${escapar(d.assinatura.toUpperCase())}</div>` : ''}
    <p class="chamada">${escapar(d.chamada)}</p>
    <div class="contatos">ATTRAVEICULOS.COM.BR <b>•</b> @ATTRAVEICULOS <b>•</b> UBERLÂNDIA · MG</div>
    <div class="rodape"><img src="${LOGO}" alt=""><div>CURADORIA DE SUPERCARROS E VEÍCULOS PREMIUM</div></div>
  </div>
</section>`
}

/** Quantas páginas o dossiê terá com os dados atuais. */
export function contarPaginas(d: Dossie): number {
	const disponiveis = Math.max(0, d.fotos.length - FOTOS_FIXAS - 3)
	const galeria = Math.min(d.paginasDeGaleria, Math.ceil(disponiveis / FOTOS_POR_PAGINA_GALERIA))
	return 5 + galeria // capa, carta, visão geral, ficha, diferenciais + galeria + ... a final entra abaixo
}

/** O documento inteiro, autocontido. */
export function montarDossie(d: Dossie): string {
	return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Dossiê Técnico — ${escapar(`${d.marca} ${d.modelo}`.trim())}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${paginaCapa(d)}
${paginaCarta(d)}
${paginaVisaoGeral(d)}
${paginaFicha(d)}
${paginaDiferenciais(d)}
${paginasGaleria(d)}
${paginaFinal(d)}
</body></html>`
}
