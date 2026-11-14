#!/usr/bin/env bash
# Grava META_ADS_TOKEN e META_AD_ACCOUNT_ID no .env.production do SITE.
#
# Para que serve: a tela inicial do admin mostra o saldo da conta de anúncios e
# o quadro de campanhas do Marketing se preenche com os anúncios no ar. É o
# mesmo token de leitura que o attra-py usa (usuário do sistema do Business
# Manager com ads_read na conta), só que este servidor não o tinha.
#
# Uso (um comando, roda NA VPS do site e pergunta no seu terminal):
#   ssh -t attra-vps 'cd /var/www/attra && bash deploy/set-meta-ads-token.sh <id-da-conta>'
#
# O token NUNCA aparece: não é impresso, não entra no histórico e não vai em
# argumento. Sai só o tamanho e o começo do SHA-256. Antes de gravar, o script
# confirma que o token lê a conta. Depois, rode o deploy para o site reler o
# ambiente.
set -euo pipefail

ENV="${ENV_DO_SITE:-.env.production}"
CONTA="${1:-${META_AD_ACCOUNT_ID:-}}"
GRAPH=https://graph.facebook.com/v21.0

[ -f "$ENV" ] || { echo "ERRO: $ENV não existe (rode na pasta do site)." >&2; exit 1; }
[ -n "$CONTA" ] || { echo "ERRO: informe o id da conta de anúncios (com ou sem act_)." >&2; exit 1; }
case "$CONTA" in act_*) ;; *) CONTA="act_${CONTA}" ;; esac
[[ "$CONTA" =~ ^act_[0-9]+$ ]] || { echo "ERRO: id de conta inválido: $CONTA" >&2; exit 1; }

if [ -t 0 ]; then
	read -rsp "Cole o token de anúncios da Meta (não aparece na tela) e tecle Enter: " TOKEN
	echo
else
	TOKEN="$(cat)"
fi
TOKEN="${TOKEN//[$'\t\r\n ']/}"
if [ "${#TOKEN}" -lt 50 ]; then
	echo "ERRO: token curto demais (${#TOKEN} chars). Nada foi alterado." >&2
	exit 1
fi
echo ">> token: ${#TOKEN} chars, sha256 $(printf '%s' "$TOKEN" | sha256sum | cut -c1-12)"

echo ">> o token lê a conta ${CONTA}?"
# O header entra pela entrada padrão (-H @-): em argumento, o token apareceria
# no `ps` para qualquer usuário da máquina.
CONTA_JSON="$(printf 'Authorization: Bearer %s' "$TOKEN" | curl -s -G -H @- \
	--data-urlencode "fields=name,account_status,currency,is_prepay_account" "${GRAPH}/${CONTA}" || true)"
if printf '%s' "$CONTA_JSON" | grep -q '"name"'; then
	echo "   OK: $(printf '%s' "$CONTA_JSON" | head -c 300)"
else
	echo "   FALHOU: $(printf '%s' "$CONTA_JSON" | head -c 300)" >&2
	echo "   O token não lê esta conta. Nada foi alterado." >&2
	exit 1
fi

cp "$ENV" "$ENV.bak-$(date -u +%Y%m%dT%H%M%SZ)-meta-ads"
# O token vai por variável de ambiente, não por argumento (mesmo motivo).
META_TOKEN_NOVO="$TOKEN" python3 - "$ENV" "$CONTA" <<'PY'
import os, re, sys
caminho, tok, conta = sys.argv[1], os.environ["META_TOKEN_NOVO"], sys.argv[2]
t = open(caminho).read()
for chave, valor in (("META_ADS_TOKEN", tok), ("META_AD_ACCOUNT_ID", conta)):
    linha = f"{chave}={valor}"
    t, n = re.subn(rf"^{chave}=.*$", lambda _m: linha, t, flags=re.M)
    if n == 0:
        t = t.rstrip("\n") + "\n" + linha + "\n"
    elif n > 1:
        raise SystemExit(f"{chave} aparece {n} vezes; nada gravado")
open(caminho, "w").write(t)
PY
chmod 600 "$ENV"
echo ">> gravado em $ENV: META_ADS_TOKEN (não impresso) e META_AD_ACCOUNT_ID=${CONTA}"
echo ">> agora rode o deploy para o site reler o ambiente: bash deploy/deploy-vps.sh"
