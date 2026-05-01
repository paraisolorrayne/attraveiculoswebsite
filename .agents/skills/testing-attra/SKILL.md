# Testing the Attra Vehicle Platform

## Overview
Attra is a Next.js 16 premium automotive dealership platform with inventory from the AutoConf CRM API, Supabase caching, and bundled JSON fallback.

## Building & Running Locally

```bash
cd /home/ubuntu/repos/Attra
npm ci
npm run build

# Copy static assets to standalone
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Start standalone server
node .next/standalone/server.js &
```

**Important:** Without AutoConf API credentials or Supabase env vars, the app falls back to bundled data in `list_vehicle.json`. This is expected for local testing.

## Key Test Flow

### 1. Home Page (`/`)
- Hero section with featured vehicle (real S3 photo from `autoconf-production.s3.amazonaws.com`)
- Editorial section ("Seleção editorial") shows 3 curated vehicles with prices and years
- Verify zero occurrences of "NaN" on the page

### 2. Listing Page (`/veiculos`)
- Should show 15 vehicles (from bundled fallback)
- Each card: brand, model, year, mileage, fuel type, price
- Prices in `R$ X.XXX.XXX,XX` format (Brazilian currency)
- Year filter sidebar shows years 2016–2025
- Pagination: 2 pages

### 3. Detail Page (`/veiculo/[slug]`)
- Good test vehicle: Corvette Z06 (`/veiculo/chevrolet-corvette-z06-2023-989248`)
  - Has different fab/mod years (2022/2023) — proves both `anofabricacao` and `anomodelo` fields work
- Check: price, year, mileage, transmission, color, gallery (20 photos), breadcrumb
- "Ficha Técnica" section has all specs

### 4. Merchant Feed (`/api/feed/estoque`)
- Google Merchant Center XML feed
- Validate via shell:
  ```bash
  curl -s http://localhost:3000/api/feed/estoque | python3 -c "
  import sys, xml.etree.ElementTree as ET
  data = sys.stdin.read()
  root = ET.fromstring(data)
  ns = {'g': 'http://base.google.com/ns/1.0'}
  items = root.findall('.//item')
  print(f'Total items: {len(items)}')
  for item in items:
      price = item.find('g:price', ns)
      img = item.find('g:image_link', ns)
      add_imgs = item.findall('g:additional_image_link', ns)
      if 'NaN' in (price.text or ''):
          print(f'NaN PRICE: {item.find(\"title\").text}')
      if any(ai.text == img.text for ai in add_imgs):
          print(f'DEDUP VIOLATION: {item.find(\"title\").text}')
  print('Done')
  "
  ```
- Key checks: no NaN prices, no zero prices, no placeholder images, no primary image duplicated in additional_image_link, all vehicles "in stock"

## Common Pitfalls

### Stale Server Process
If you rebuild the code but don't restart the server, it serves old compiled output. Always verify:
```bash
# Check if server process is older than build
ps aux | grep server.js
ls -la .next/standalone/server.js
```
Kill old process and restart after each rebuild.

### NaN Values in Vehicle Data
The vehicle data pipeline maps AutoConf API fields (`valorvenda`, `anofabricacao`, `anomodelo`, `km`) to internal schema. If field names are wrong in `list_vehicle.json`, `parseFloat(undefined)` produces NaN.
- Key fields: `valorvenda` (not `preco`), `anofabricacao`/`anomodelo` (not `ano`), `km` (not `km_total`), `foto`/`fotos` (not `foto_principal_url`)

### WhatsApp Chat Widget
A chat widget may overlay content. Close it by clicking the X before taking screenshots.

## Data Schema (list_vehicle.json)
Each vehicle object must have:
- `id`, `marca_nome`, `modelopai_nome`
- `valorvenda` (string, e.g. "190000.00")
- `anofabricacao`, `anomodelo` (string, e.g. "2023")
- `km` (number, e.g. 7500)
- `combustivel_nome`, `cambio_nome`, `cor_nome`
- `foto` (string URL), `fotos` (array of `{url: string}` objects)
- `status_id` (9 = in stock)
- `placa` (masked, e.g. "C**-***0") — never include `placa_completa`

## Devin Secrets Needed
- None required for local testing with bundled fallback data
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — needed only to test Supabase snapshot layer
- `AUTOCONF_API_URL` + `AUTOCONF_API_TOKEN` — needed only to test live API integration
