# Deploy na VPS — Passo a Passo para DevOps

> Runbook para atualizar a aplicação `attra-veiculos` na VPS a partir de
> `master`. Resolve o bug em que **a home carrega mas as demais rotas não**,
> causado por servir o bundle `output: 'standalone'` sem os diretórios
> `.next/static` e `public` ao lado do `server.js`.

## TL;DR

No diretório do projeto na VPS (normalmente `/var/www/attra`), rodar:

```bash
cd /var/www/attra
git fetch origin
git checkout master
git pull --ff-only origin master

# Carrega as variáveis de ambiente ANTES do build.
# O Next.js lê .env.production automaticamente, mas se as vars estiverem
# apenas no shell/PM2, o build não as enxerga e pode falhar.
set -a; source .env.production; set +a

npm ci
npm run build        # dispara o postbuild que copia .next/static + public

# Valida que o bundle standalone foi gerado corretamente.
test -f .next/standalone/server.js || { echo "ERRO: server.js não gerado — build falhou"; exit 1; }

# Troca o processo antigo (que rodava `npm start` = `next start`) pelo
# server.js do bundle standalone — sem isso as rotas que não são a home
# continuam quebradas porque o process anterior ainda serve o bundle antigo.
pm2 delete attra 2>/dev/null || true
pm2 start .next/standalone/server.js \
  --name attra \
  --update-env \
  --time \
  --cwd "$(pwd)"

pm2 save
```

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
