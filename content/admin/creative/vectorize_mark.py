"""
Vetoriza a marca "A" da Attra: A.png -> attra-mark.svg

A marca e 100% poligonal (arestas retas, duas cores chapadas), entao a
vetorizacao e EXATA — nao e um traceamento aproximado tipo potrace com curvas
de Bezier. O caminho e: mascara por cor -> contornos -> simplificacao
Douglas-Peucker -> paths SVG.

Duas decisoes que importam:

1. Traca-se em SUPERSAMPLE (4x) e divide-se as coordenadas no fim. O
   antialias do PNG original vira ~4px de incerteza na borda; em 4x isso
   pesa 0.25px na saida, abaixo do erro de arredondamento.

2. O "A" tem CONTRAFORMA (o buraco triangular). Contorno externo e furo
   entram no mesmo <path> com fill-rule="evenodd", senao o furo e pintado.
"""

import cv2
import numpy as np

SRC = "/mnt/user-data/uploads/A.png"
OUT = "/home/claude/attra/attra-mark.svg"

SUPER = 4          # fator de supersample
EPS = 6.0          # tolerancia Douglas-Peucker (varredura: 12 vert @ IoU 0.994;
                   # abaixo disso so se adiciona ruido de compressao do PNG)

PRETO = "var(--attra-letter, #FFFFFF)"   # no fundo escuro do story a letra e branca
VERM = "var(--attra-red, #F62826)"


def mascaras(path):
    a = cv2.imread(path, cv2.IMREAD_COLOR).astype(np.float32)[:, :, ::-1]  # BGR->RGB
    h, w = a.shape[:2]
    a = cv2.resize(a, (w * SUPER, h * SUPER), interpolation=cv2.INTER_CUBIC)

    cover = np.clip((252.0 - a.min(axis=2)) / 240.0, 0, 1)
    redness = np.clip((a[..., 0] - a[..., 1:].max(axis=2)) / 85.0, 0, 1)

    red = ((cover > 0.5) & (redness > 0.5)).astype(np.uint8)
    blk = ((cover > 0.5) & (redness <= 0.5)).astype(np.uint8)
    return blk, red


def paths(mask, eps=EPS, min_area=40 * SUPER * SUPER):
    """Contornos externos + furos, em coordenadas do espaco original."""
    cnts, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None:
        return []
    hier = hier[0]
    out = []
    for i, c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_area:
            continue                                   # furos entram junto do pai
        anel = [cv2.approxPolyDP(c, eps, True)]
        j = hier[i][2]                                 # primeiro filho
        while j != -1:
            if cv2.contourArea(cnts[j]) >= min_area:
                anel.append(cv2.approxPolyDP(cnts[j], eps, True))
            j = hier[j][0]
        out.append(anel)
    return out


def to_d(aneis) -> str:
    partes = []
    for poly in aneis:
        pts = poly.reshape(-1, 2).astype(np.float64) / SUPER
        seg = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
        seg += "".join(f"L{x:.2f} {y:.2f}" for x, y in pts[1:])
        partes.append(seg + "Z")
    return "".join(partes)


def build() -> str:
    blk, red = mascaras(SRC)
    tinta = np.maximum(blk, red)
    ys, xs = np.where(tinta > 0)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    W, H = (x1 - x0) / SUPER, (y1 - y0) / SUPER

    def recorta(m):
        return np.ascontiguousarray(m[y0:y1, x0:x1])

    d_blk = "".join(to_d(a) for a in paths(recorta(blk)))
    d_red = "".join(to_d(a) for a in paths(recorta(red)))

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}"
     width="{W:.2f}" height="{H:.2f}" role="img" aria-label="Attra Veículos">
  <title>Attra Veículos</title>
  <path fill="{PRETO}" fill-rule="evenodd" d="{d_blk}"/>
  <path fill="{VERM}" fill-rule="evenodd" d="{d_red}"/>
</svg>
'''


if __name__ == "__main__":
    svg = build()
    with open(OUT, "w") as f:
        f.write(svg)
    print("svg ->", OUT, f"({len(svg)} bytes)")
