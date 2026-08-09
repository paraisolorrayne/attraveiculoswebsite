#!/usr/bin/env bash
# Envia o feed de produtos para o OpenAI Commerce por SFTP.
# Disparado por /etc/cron.d/attra-feed-openai. Log: /var/log/attra-feed-openai.log
#
# Por que existe: o feed é servido em /api/feed/produtos, mas a plataforma não
# busca a URL — o arquivo precisa ser DEPOSITADO no SFTP deles. Sem este envio o
# catálogo lá dentro congela no dia do upload manual, e anúncio continua rodando
# para carro já vendido.
#
# Credenciais em .env.production (OPENAI_FEED_SFTP_*), nunca no repositório.
set -euo pipefail

cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a
. /var/www/attra/.env.production
set +a

TRABALHO=/var/lib/attra-feed
mkdir -p "$TRABALHO"
chmod 700 "$TRABALHO"

echo "===== $(date -Iseconds) — feed-openai start ====="

if [ -z "${OPENAI_FEED_SFTP_USER:-}" ] || [ -z "${OPENAI_FEED_SFTP_PASS:-}" ]; then
  echo "ERRO: credenciais do SFTP ausentes no .env.production — nada enviado"
  exit 1
fi

# Um envio por feed cadastrado na plataforma. O completo é o do estoque; os
# recortes existem para campanhas separadas. Nome do arquivo estável: o destino
# substitui a versão anterior, não acumula histórico.
FEEDS=(
  "produtos:attra-estoque.tsv"
  "produtos/porsche-911:attra-porsche-911.tsv"
  "produtos/ferrari:attra-ferrari.tsv"
  "produtos/suv-500-800:attra-suv-500-800.tsv"
)

FALHAS=0

for entrada in "${FEEDS[@]}"; do
  rota="${entrada%%:*}"
  arquivo="${entrada##*:}"
  local_path="$TRABALHO/$arquivo"

  # Baixa do próprio site: o feed é gerado pela aplicação, com a mesma fonte de
  # estoque do resto. Reimplementar a geração aqui criaria uma segunda verdade.
  if ! curl -sS --fail --max-time 120 -o "$local_path" "http://127.0.0.1:3000/api/feed/$rota"; then
    echo "ERRO: falha ao gerar $rota — envio deste feed pulado"
    FALHAS=$((FALHAS + 1))
    continue
  fi

  # Cabeçalho + pelo menos uma linha. Enviar arquivo vazio é pior que não
  # enviar: a plataforma aceita, zera o catálogo e a campanha para de entregar
  # sem acusar erro.
  linhas=$(( $(wc -l < "$local_path") - 1 ))
  if [ "$linhas" -lt 1 ]; then
    echo "ERRO: $rota veio com $linhas produto(s) — envio abortado para não zerar o catálogo"
    FALHAS=$((FALHAS + 1))
    continue
  fi

  if curl -sS --fail --max-time 300 \
      -u "$OPENAI_FEED_SFTP_USER:$OPENAI_FEED_SFTP_PASS" \
      -T "$local_path" \
      "sftp://$OPENAI_FEED_SFTP_HOST:$OPENAI_FEED_SFTP_PORT/$arquivo"; then
    echo "OK: $arquivo enviado — $linhas produto(s), $(wc -c < "$local_path") bytes"
  else
    echo "ERRO: SFTP recusou $arquivo"
    FALHAS=$((FALHAS + 1))
  fi
done

# A plataforma escreve um status.json no mesmo diretório com o resultado do
# processamento. Ele é ASSÍNCRONO: sai alguns minutos depois do envio, então o
# que se lê aqui é o veredito do ciclo ANTERIOR, não o deste. Serve como alarme
# atrasado — "enviado com sucesso" só diz que o arquivo chegou, não que foi
# aceito, e sem isto um feed recusado passaria despercebido indefinidamente.
STATUS=$(curl -sS --max-time 60 \
  -u "$OPENAI_FEED_SFTP_USER:$OPENAI_FEED_SFTP_PASS" \
  "sftp://$OPENAI_FEED_SFTP_HOST:$OPENAI_FEED_SFTP_PORT/status.json" 2>/dev/null || echo '')

if [ -n "$STATUS" ]; then
  echo "status do ciclo anterior: $STATUS"
  case "$STATUS" in
    *'"status": "success"'*|*'"status":"success"'*) ;;
    *) echo "ATENCAO: a plataforma NAO reportou sucesso no processamento anterior" ;;
  esac
else
  echo "status.json indisponivel — sem veredito da plataforma nesta rodada"
fi

echo "===== $(date -Iseconds) — feed-openai done (falhas: $FALHAS) ====="
[ "$FALHAS" -eq 0 ]
