# Cópia do estoque para a prévia local — só leitura.
#
# Uso (do Mac, na pasta do repositório):
#   ssh attra-vps 'bash -s' < scripts/diagnostico/exportar-estoque-previa.sh > ~/Downloads/estoque-previa.json
#
# Lê a última cópia da lista da AutoConf que o site já grava no banco
# (inventory_snapshots, source autoconf:veiculos:list — a mesma que ele usa
# quando a AutoConf cai) e imprime o JSON sem placa, chassi e renavam. Sem
# token da AutoConf no Mac, a prévia local mostra o estoque de reserva do
# repositório; com esta cópia carregada no banco local, mostra os carros de
# verdade. O arquivo fica fora do Git.

set -euo pipefail
cd /var/www/attra
set -a; . ./.env.production; set +a
NODE=/root/.nvm/versions/node/v20.20.0/bin/node

psql "$DATABASE_URL" -Atc "select payload from inventory_snapshots where source = 'autoconf:veiculos:list' order by created_at desc limit 1" \
  | "$NODE" -e '
let entrada = ""
process.stdin.on("data", (d) => { entrada += d })
process.stdin.on("end", () => {
  if (!entrada.trim()) { console.error("nenhuma cópia do estoque no banco"); process.exit(1) }
  const sensivel = /^(placa|placa_completa|chassi|renavam)$/i
  const limpar = (v) => {
    if (Array.isArray(v)) return v.map(limpar)
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).filter(([k]) => !sensivel.test(k)).map(([k, x]) => [k, limpar(x)]))
    }
    return v
  }
  const payload = limpar(JSON.parse(entrada))
  console.error("carros na cópia:", (payload.veiculos || []).length)
  process.stdout.write(JSON.stringify(payload))
})'
