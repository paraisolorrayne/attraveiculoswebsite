"""
Gera os dados do mapa do Story Vendido (public/creative/vendido/) a partir das
APIs públicas do IBGE. Só precisa rodar de novo se o IBGE mudar a malha ou
criar município.

Baixar os três arquivos numa pasta vazia:

  curl -o ufs.json 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=UF'
  curl -o mun.json 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado'
  curl -o meta-mun.json 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR/metadados?intrarregiao=municipio'

e rodar:

  python3 -I scripts/preparar-mapa-vendido.py <pasta> public/creative/vendido

Saída:
  ufs.json        {"ufs": [{"uf": "MG", "aneis": [[lon×100, lat×100, …], …]}, …]}
                  contornos simplificados (Douglas-Peucker, 0,03°): ~37 KB
  municipios.json [[nome, uf, lon×100, lat×100], …] com o centroide de cada
                  município: ~190 KB, carregado só quando a aba abre
"""
import json
import sys

UF = {11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN',
      25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC',
      43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'}


def douglas_peucker(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = (dx * dx + dy * dy) ** .5 or 1e-9
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        p = pts[k]
        d = abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / n
        if d > dmax:
            i, dmax = k, d
    if dmax <= tol:
        return [a, b]
    return douglas_peucker(pts[:i + 1], tol)[:-1] + douglas_peucker(pts[i:], tol)


def main(src, out):
    ufs = []
    for f in json.load(open(f'{src}/ufs.json'))['features']:
        geo = f['geometry']
        polys = geo['coordinates'] if geo['type'] == 'MultiPolygon' else [geo['coordinates']]
        aneis = []
        for poly in polys:
            anel = poly[0]
            # Anel fechado (primeiro ponto = último): simplificado inteiro, o
            # Douglas-Peucker colapsa em dois pontos. Em duas metades, não.
            meio = len(anel) // 2
            s = douglas_peucker(anel[:meio + 1], 0.03)[:-1] + douglas_peucker(anel[meio:], 0.03)
            if len(s) < 4:
                continue
            aneis.append([v for p in s for v in (round(p[0] * 100), round(p[1] * 100))])
        ufs.append({'uf': UF[int(f['properties']['codarea'])], 'aneis': aneis})

    centroides = {m['id']: m['centroide'] for m in json.load(open(f'{src}/meta-mun.json'))}
    cidades = []
    for m in json.load(open(f'{src}/mun.json')):
        c = centroides.get(str(m['municipio-id']))
        if c:
            cidades.append([m['municipio-nome'], m['UF-sigla'], round(c['longitude'] * 100), round(c['latitude'] * 100)])
    print(f'{len(ufs)} UFs, {len(cidades)} municípios', file=sys.stderr)

    json.dump({'ufs': ufs}, open(f'{out}/ufs.json', 'w'), separators=(',', ':'))
    json.dump(cidades, open(f'{out}/municipios.json', 'w'), separators=(',', ':'), ensure_ascii=False)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
