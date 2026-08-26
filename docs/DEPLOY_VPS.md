# Deploy na VPS — Passo a Passo para DevOps

> Runbook para atualizar a aplicação `attra-veiculos` na VPS a partir de
> `master`. Resolve o bug em que **a home carrega mas as demais rotas não**,
> causado por servir o bundle `output: 'standalone'` sem os diretórios
> `.next/static` e `public` ao lado do `server.js`.

## TL;DR

> **Atalho (2026-07):** todo o passo a passo abaixo está encapsulado em
> `deploy/deploy-vps.sh`. Na VPS: `cd /var/www/attra && git pull --ff-only origin master && bash deploy/deploy-vps.sh`
> (com a connection string do Supabase como argumento, faz também a
> manutenção de retenção do banco + VACUUM).

No diretório do projeto na VPS (normalmente `/var/www/attra`), rodar:

```bash
cd /var/www/attra
git fetch origin
git checkout master
git pull --ff-only origin master

# pm2 e node v20 estão no nvm, NÃO no PATH de um shell não-interativo
# (`ssh host 'comando'` não carrega ~/.bashrc). Sem isto: `pm2: command not
# found`. node/npm de sistema (/usr/bin) bastam pro build; o pm2 não.
export PATH="/root/.nvm/versions/node/v20.20.0/bin:$PATH"

# Carrega as variáveis de ambiente ANTES do build.
# O Next.js lê .env.production automaticamente, mas se as vars estiverem
# apenas no shell/PM2, o build não as enxerga e pode falhar.
set -a; source .env.production; set +a

npm ci
npm run build        # prebuild limpa o cache do standalone; postbuild copia .next/static + public

# Valida que o bundle standalone foi gerado corretamente.
test -f .next/standalone/server.js || { echo "ERRO: server.js não gerado — build falhou"; exit 1; }

# Reinicia o processo existente (já roda o server.js do bundle standalone).
# Na PRIMEIRA migração de `npm start` -> server.js, troque por:
#   pm2 delete attra 2>/dev/null || true
#   pm2 start .next/standalone/server.js --name attra --update-env --time --cwd "$(pwd)"
pm2 restart attra --update-env

pm2 save
```

> **ENOTEMPTY no build?** Era o servidor acumulando cache de imagens dentro de
> `.next/standalone/.next/cache`; o `next build` falhava ao limpar o standalone
> antigo. Resolvido pelo `prebuild` no `package.json` (limpa esse cache antes de
> cada build). Se ainda assim acontecer, plano B com downtime curto:
> `pm2 stop attra; rm -rf .next; npm run build; pm2 restart attra --update-env`.

Depois valide:

```bash
curl -I http://localhost:3000/
curl -I http://localhost:3000/veiculos
curl -I http://localhost:3000/sobre
# todas devem retornar HTTP/1.1 200 OK
```

## Contexto do Bug

- `next.config.ts` tem `output: 'standalone'`. Essa flag instrui o `next build`
  a gerar um bundle minimalista em `.next/standalone/` com seu próprio
  `server.js` e apenas o subset de `node_modules` estritamente necessário.
- No Next.js 16 a invocação correta desse bundle é **`node .next/standalone/server.js`**.
- O `next start` (que o PM2 executava via `pm2 start npm -- start`) imprime
  um aviso explícito nesse cenário:

  > `"next start" does not work with "output: standalone" configuration.`
  > `Use "node .next/standalone/server.js" instead.`

- Além disso, `.next/standalone/.next/static` **não é copiado automaticamente**
  pelo `next build`. Se o processo aponta direto para `server.js` sem que
  `.next/static` e `public` estejam ao lado, o servidor sobe, a home
  SSR-renderiza, mas **todos os chunks de cliente (`/_next/static/...`)
  retornam 404** — hidratação falha, navegação client-side quebra, e o
  sintoma visível é "a home abre mas clicar em qualquer rota não funciona".

## O Que Foi Corrigido no Código

1. `scripts/prepare-standalone.mjs` — roda como `postbuild` e copia
   `.next/static/` e `public/` para dentro de `.next/standalone/`.
2. `package.json` — `npm run build` agora dispara esse script
   automaticamente; `npm run start` passou a ser
   `node .next/standalone/server.js` (o modo antigo via `next start`
   segue disponível em `npm run start:next`, apenas para debug local).
3. README atualizado com instruções consistentes com `output: 'standalone'`.

Com isso, basta rodar `npm run build` na VPS — não há mais passo manual de
copiar `.next/static` ou `public`.

## Variáveis de Ambiente

Garantir que `/var/www/attra/.env.production` (ou equivalente em
`/etc/environment` / `pm2 ecosystem`) contém, no mínimo:

```env
AUTOCONF_BEARER_TOKEN=...
AUTOCONF_DEALER_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
NEXT_PUBLIC_SITE_URL=https://attraveiculos.com.br
RESEND_API_KEY=...
NOTIFICATION_EMAIL=faleconosco@attraveiculos.com.br
# IndexNow (Bing → Copilot e busca do ChatGPT): 32+ caracteres [a-zA-Z0-9-];
# gere com `openssl rand -hex 16`. Servida em /indexnow/{chave}.txt; o cron
# attra-indexnow-sync envia o que mudou. Sem ela, a rota responde `desligado`.
INDEXNOW_KEY=...
```

Como o PM2 agora inicia o `server.js` diretamente (e não mais via `npm start`),
o `.env.production` precisa ser exportado no shell antes do `pm2 start`, ou
carregado por um `ecosystem.config.js`. Exemplo inline:

```bash
set -a; source .env.production; set +a
pm2 start .next/standalone/server.js --name attra --update-env --time --cwd "$(pwd)"
```

Alternativa com ecosystem (preferível para auditoria):

```bash
cat > /var/www/attra/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'attra',
    script: '.next/standalone/server.js',
    cwd: '/var/www/attra',
    env_file: '/var/www/attra/.env.production',
    time: true,
  }],
};
EOF

pm2 start /var/www/attra/ecosystem.config.js --update-env
pm2 save
```

## Nginx (sem alteração)

O `nginx` existente em `/etc/nginx/sites-available/attra` pode seguir intacto —
continua sendo um reverse proxy para `http://localhost:3000`. Recarregar
apenas se houver mudança de config:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Smoke Test Pós-Deploy

```bash
# Localmente na VPS
for p in / /veiculos /sobre /contato /blog /jornada /universe /news; do
  printf '%s\t' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$p"
done

# Externo (passando pelo Nginx + SSL)
for p in / /veiculos /sobre /contato /blog; do
  printf '%s\t' "$p"
  curl -sk -o /dev/null -w '%{http_code}\n' "https://attraveiculos.com.br$p"
done
```

Todos os endpoints acima devem responder `200`. Se algum retornar `500` ou
ficar pendurado, inspecionar:

```bash
pm2 logs attra --lines 200
ls -la /var/www/attra/.next/standalone/.next/static  # precisa existir!
ls -la /var/www/attra/.next/standalone/public        # precisa existir!
```

## Rollback

```bash
cd /var/www/attra
git reflog | head -5                       # identificar commit anterior
git checkout <sha-anterior>
npm ci && npm run build
pm2 restart attra --update-env
```
