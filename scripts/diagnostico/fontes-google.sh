# O que o Google Fonts devolve para esta máquina — só leitura.
#
# Uso (do Mac, na pasta do repositório):
#   ssh attra-vps 'bash -s' < scripts/diagnostico/fontes-google.sh
#
# Existe por causa do build de 21/10/2026, que quebrou no next/font com
# "Cannot read properties of null (reading '1')": o Next baixa as fontes do
# src/app/layout.tsx no build e exige que cada `src: url(...)` do CSS termine
# em .woff2/.woff/.ttf/.otf/.eot. Este script pede o mesmo CSS, com o mesmo
# User-Agent do Next 16, por IPv4 e por IPv6, e mostra as URLs fora do padrão.

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'

ruim=0
for familia in \
  'Cormorant+Garamond:wght@300;400;500;600' \
  'Outfit:wght@400;500;600;700' \
  'Montserrat:wght@300;400;500;600;700' \
  'Geist:wght@100..900' \
  'Geist+Mono:wght@100..900'; do
  for rede in -4 -6; do
    if ! css=$(curl -sS "$rede" -m 20 -A "$UA" "https://fonts.googleapis.com/css2?family=${familia}&display=swap" 2>&1); then
      # Sem rota por IPv6 o Node cai para o IPv4 sozinho; só o IPv4 fora derruba o build.
      echo "${familia%%:*} IPv${rede#-}: sem conexão (${css:0:80})"
      [ "$rede" = -4 ] && ruim=1
      continue
    fi
    urls=$(grep -o 'src: url([^)]*)' <<< "$css" | sed 's/^src: url(//; s/)$//')
    total=$(grep -c . <<< "$urls")
    fora=$(grep -v -E '\.(woff2|woff|ttf|otf|eot)$' <<< "$urls" | grep .)
    echo "${familia%%:*} IPv${rede#-}: ${total} arquivo(s), $(grep -c . <<< "$fora") fora do padrão"
    if [ -n "$fora" ]; then ruim=1; head -2 <<< "$fora" | cut -c1-160 | sed 's/^/    /'; fi
    if [ "$total" = 0 ]; then ruim=1; head -c 300 <<< "$css" | sed 's/^/    /'; echo; fi
  done
done

# Sai com 1 quando o build do Next quebraria, para não seguir para o deploy.
[ "$ruim" = 0 ] && echo 'OK: o build do Next consegue baixar as fontes.' || echo 'ATENÇÃO: com essa resposta, o build do Next quebra no next/font.'
exit "$ruim"
