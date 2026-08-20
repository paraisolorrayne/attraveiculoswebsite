/**
 * Attra Veículos — gerador de story "VENDIDO" (1080×1920) para o admin.
 * Porte 1:1 do gerador Python (story_vendido.py). Mesmos tokens, mesma grade.
 *
 * ── O que é vetor e o que NÃO é ────────────────────────────────────────────
 * Vetorizável (e vetorizado): a marca "A", a faixa VENDIDO, a tipografia,
 *   os gradientes e toda a geometria da grade.
 * NÃO vetorizável: a placa do caminhão e a foto do veículo. São fotografias —
 *   um "traceamento" delas geraria ou lixo poligonal ou um SVG de vários MB
 *   maior que o PNG. Entram como raster, e está certo assim.
 *
 * ── Por que canvas e não SVG puro ──────────────────────────────────────────
 * O fundo precisa de blur com desvio 72px sobre 1080×1920. Em SVG isso vira
 * <feGaussianBlur> — caro e com resultado divergente entre engines. Em canvas,
 * ctx.filter = 'blur(72px)' usa o mesmo desvio-padrão do PIL.GaussianBlur(72),
 * então o resultado bate com o Python. A marca continua vetor: entra via
 * Path2D com o mesmo path data do attra-mark.svg.
 *
 * ── Armadilha de CORS (importante) ─────────────────────────────────────────
 * As fotos vêm do autoconf-production.s3.amazonaws.com. Carregar direto do S3
 * TINGE o canvas e canvas.toBlob() lança SecurityError. Use o proxy que o site
 * já tem: /_next/image?url=...&w=1200&q=90 é mesma origem e resolve o problema
 * sem precisar mexer no bucket. Ver fotoDoVeiculo() abaixo.
 */

// ───────────────────────────── tokens ──────────────────────────────────────

export const CANVAS = { w: 1080, h: 1920 } as const;

export const COR = {
  ink: '#060708',        // base do site
  accent: '#9A1C1C',     // vermelho Attra
  white: '#FFFFFF',
  muted: '#A8ABB2',
} as const;

/** Zonas de UI do Instagram Stories — nada crítico dentro delas. */
export const SAFE = { top: 250, bottom: 250 } as const;

export const GRADE = {
  logoY: 254, logoH: 84,
  fraseCy: 386,
  slot: { x: 60, y: 436, w: 960, h: 720 },   // 4:3 exato — igual à origem Autoconf
  slotRadius: 24,
  bandY: 1192, bandH: 130,
  tituloCy: 1386,
} as const;

// ───────────────────── marca "A" vetorizada ────────────────────────────────
// Traçada de A.png por máscara de cor → contornos → Douglas-Peucker.
// 17 vértices no total, IoU 0.994 contra o original. fill-rule evenodd é
// obrigatório: o "A" tem contraforma (o triângulo vazado).

export const MARCA = {
  viewBox: { w: 882.75, h: 771.25 },
  letra:
    'M295.50 606.00L148.25 556.75L12.75 770.75L194.75 770.75L295.00 610.00Z' +
    'M224.75 436.00L402.00 436.50L558.25 181.75L611.75 436.75L794.00 437.25L674.50 0.00L498.50 0.00Z',
  vermelho:
    'M0.00 470.50L830.75 751.50L882.50 767.25L804.75 478.00L800.50 469.75Z',
} as const;

// ───────────────────────────── tipos ───────────────────────────────────────

export interface Veiculo {
  titulo: string;                 // "McLaren GTS"
  spec?: string | null;           // opcional: "2024 · 3.100 km"
  frase?: string;                 // frase fixa do masthead
  site?: string | null;           // opcional: "ATTRAVEICULOS.COM.BR"
  selo?: string;                  // "VENDIDO"
}

export interface Assets {
  foto: CanvasImageSource;        // 1ª foto do veículo (4:3) — NUNCA recortada
  caminhao: CanvasImageSource;    // truck-base.png (asset fixo)
  bandeira?: CanvasImageSource;   // flag-br.png
}

const FRASE_PADRAO = 'Attra Veículos | De Uberlândia para o Brasil';

// ─────────────────────── helpers de tipografia ─────────────────────────────

/**
 * Canvas não expõe eixos de fonte variável (wdth). Declare instâncias fixas
 * no CSS e referencie pelo family — ver fonts.css no cabeçalho do README.
 */
const FONTE = {
  selo: (px: number) => `800 ${px}px AttraSelo, Archivo, sans-serif`,
  titulo: (px: number) => `700 ${px}px AttraTitulo, Archivo, sans-serif`,
  texto: (px: number, w = 500) => `${w} ${px}px Inter, system-ui, sans-serif`,
} as const;

function larguraTracked(ctx: CanvasRenderingContext2D, txt: string, tracking: number) {
  if (!txt) return 0;
  let total = 0;
  for (const ch of txt) total += ctx.measureText(ch).width;
  return total + tracking * (txt.length - 1);
}

/**
 * Texto centrado com letter-spacing, encolhendo se estourar maxW.
 * Desenha caractere a caractere: ctx.letterSpacing ainda não é universal e
 * mede diferente entre engines, o que quebraria a paridade com o Python.
 */
function textoTracked(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, txt: string,
  fonte: (px: number) => string, px: number,
  cor: string, trackingEm = 0, maxW?: number,
) {
  ctx.font = fonte(px);
  let tracking = px * trackingEm;
  let total = larguraTracked(ctx, txt, tracking);

  if (maxW && total > maxW) {
    px = Math.max(10, Math.floor(px * (maxW / total)));
    ctx.font = fonte(px);
    tracking = px * trackingEm;
    total = larguraTracked(ctx, txt, tracking);
  }

  ctx.fillStyle = cor;
  ctx.textBaseline = 'middle';
  let x = cx - total / 2;
  for (const ch of txt) {
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + tracking;
  }
  return total;
}

// ─────────────────────────── camadas ───────────────────────────────────────

/** Equivalente do PIL ImageOps.fit: cover + corte central. */
function coverFit(
  ctx: CanvasRenderingContext2D, img: CanvasImageSource,
  dx: number, dy: number, dw: number, dh: number, centerY = 0.5,
) {
  const iw = (img as HTMLImageElement).naturalWidth ?? (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight ?? (img as HTMLCanvasElement).height;
  const escala = Math.max(dw / iw, dh / ih);
  const sw = dw / escala, sh = dh / escala;
  const sx = (iw - sw) / 2, sy = (ih - sh) * centerY;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Fundo = a própria foto do veículo, cover + blur + escurecida.
 * O story herda a paleta de cada carro sem trabalho manual: numa McLaren verde
 * as laterais puxam petróleo; numa Porsche preta, grafite neutro.
 */
function fundo(ctx: CanvasRenderingContext2D, foto: CanvasImageSource) {
  ctx.save();
  ctx.filter = 'blur(72px)';                    // mesmo desvio do PIL.GaussianBlur(72)
  coverFit(ctx, foto, -120, -120, CANVAS.w + 240, CANVAS.h + 240, 0.45);
  ctx.restore();

  ctx.fillStyle = COR.ink;
  ctx.globalAlpha = 0.52;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.globalAlpha = 1;

  // Véu vertical: legibilidade no topo, entrega a leitura ao caminhão na base.
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS.h);
  ([[0, 0.92], [0.172, 0.58], [0.396, 0.22], [0.589, 0.38],
    [0.729, 0.90], [1, 0.97]] as const).forEach(([p, a]) => {
    g.addColorStop(p, `rgba(6,7,8,${a})`);
  });
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
}

/** Placa fixa do caminhão, ancorada pela base — sangra até 1920. */
function caminhao(ctx: CanvasRenderingContext2D, img: CanvasImageSource) {
  const h = (img as HTMLImageElement).naturalHeight ?? (img as HTMLCanvasElement).height;
  ctx.drawImage(img, 0, CANVAS.h - h);
}

/** Card 4:3 da 1ª foto. Slot e origem têm a mesma razão → corte zero. */
function cardFoto(ctx: CanvasRenderingContext2D, foto: CanvasImageSource) {
  const { x, y, w, h } = GRADE.slot;
  const r = GRADE.slotRadius;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.66)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 22;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = COR.ink;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  coverFit(ctx, foto, x, y, w, h);
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.086)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Masthead: marca vetorial + frase fixa (com a bandeira alinhada à caixa alta). */
function masthead(
  ctx: CanvasRenderingContext2D, v: Veiculo, bandeira?: CanvasImageSource,
) {
  const escala = GRADE.logoH / MARCA.viewBox.h;
  const lw = MARCA.viewBox.w * escala;

  ctx.save();
  ctx.translate((CANVAS.w - lw) / 2, GRADE.logoY);
  ctx.scale(escala, escala);
  ctx.fillStyle = COR.white;
  ctx.fill(new Path2D(MARCA.letra), 'evenodd');
  ctx.fillStyle = '#F62826';
  ctx.fill(new Path2D(MARCA.vermelho), 'evenodd');
  ctx.restore();

  const txt = (v.frase ?? FRASE_PADRAO).toUpperCase();
  const px = 23, trackingEm = 0.10, cy = GRADE.fraseCy - (v.site ? 14 : 0);

  ctx.font = FONTE.texto(px);
  const tracking = px * trackingEm;
  const tw = larguraTracked(ctx, txt, tracking);
  const fh = bandeira ? Math.round(px * 0.98) : 0;
  const bw = bandeira
    ? Math.round(((bandeira as HTMLImageElement).naturalWidth * fh) /
                 (bandeira as HTMLImageElement).naturalHeight)
    : 0;
  const gap = bandeira ? Math.round(px * 0.55) : 0;

  // Centra o CONJUNTO (texto + folga + bandeira), não só o texto — senão a
  // linha fica visualmente deslocada para a esquerda.
  const x0 = (CANVAS.w - (tw + gap + bw)) / 2;
  ctx.fillStyle = COR.muted;
  ctx.textBaseline = 'middle';
  let x = x0;
  for (const ch of txt) {
    ctx.fillText(ch, x, cy);
    x += ctx.measureText(ch).width + tracking;
  }
  if (bandeira) ctx.drawImage(bandeira, x - tracking + gap, cy - fh / 2, bw, fh);

  if (v.site) {
    textoTracked(ctx, CANVAS.w / 2, 424, v.site.toUpperCase(),
      (p) => FONTE.texto(p), 19, '#70737A', 0.32, 720);
  }
}

function faixaETitulo(ctx: CanvasRenderingContext2D, v: Veiculo) {
  ctx.fillStyle = COR.accent;
  ctx.fillRect(0, GRADE.bandY, CANVAS.w, GRADE.bandH);

  textoTracked(ctx, CANVAS.w / 2, GRADE.bandY + GRADE.bandH / 2,
    (v.selo ?? 'VENDIDO').toUpperCase(), FONTE.selo, 80, COR.white, 0.24, 900);

  const tituloY = GRADE.tituloCy - (v.spec ? 28 : 0);
  textoTracked(ctx, CANVAS.w / 2, tituloY, v.titulo.toUpperCase(),
    FONTE.titulo, 56, COR.white, 0.02, 940);

  if (v.spec) {
    textoTracked(ctx, CANVAS.w / 2, 1446, v.spec.toUpperCase(),
      (p) => FONTE.texto(p), 26, COR.muted, 0.12, 900);
  }
}

// ─────────────────────────────── API ───────────────────────────────────────

export function renderStory(
  canvas: HTMLCanvasElement | OffscreenCanvas, v: Veiculo, a: Assets,
) {
  canvas.width = CANVAS.w;
  canvas.height = CANVAS.h;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.fillStyle = COR.ink;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);

  fundo(ctx, a.foto);
  caminhao(ctx, a.caminhao);
  cardFoto(ctx, a.foto);
  masthead(ctx, v, a.bandeira);
  faixaETitulo(ctx, v);

  return canvas;
}

/**
 * Carrega a 1ª foto pelo otimizador do próprio site.
 * Passar a URL crua do S3 tinge o canvas e quebra o toBlob(); o /_next/image
 * é mesma origem e resolve sem tocar na policy do bucket. w=1200 superamostra
 * o slot de 960px, garantindo nitidez em retina.
 */
export function fotoDoVeiculo(urlS3: string, w = 1200): Promise<HTMLImageElement> {
  const src = `/_next/image?url=${encodeURIComponent(urlS3)}&w=${w}&q=90`;
  return carregar(src);
}

export function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou ao carregar ${src}`));
    img.src = src;
  });
}

/** As fontes precisam estar prontas ANTES do primeiro measureText. */
export async function fontesProntas() {
  await Promise.all([
    document.fonts.load('800 80px AttraSelo'),
    document.fonts.load('700 56px AttraTitulo'),
    document.fonts.load('500 23px Inter'),
  ]);
  await document.fonts.ready;
}

export function exportarPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error('toBlob falhou'))), 'image/png'),
  );
}
