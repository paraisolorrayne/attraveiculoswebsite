# Handoff "robots.txt, OAI-SearchBot e sitemaps" — entrega

Handoff recebido em 21/10/2026 (`handoff_attra_robots_openai_search.md`). Status de cada
teste: **confirmado**, **falhou** ou **não observável**. A coluna "depois" vale para o
código deste PR; em produção, só depois do deploy.

## 1. Onde o robots.txt nasce

| Pergunta | Resposta | Status |
|---|---|---|
| Fonte | `src/app/robots.ts` (rota de metadados do Next), com as regras em `src/lib/seo/regras-robots.ts` | confirmado |
| Fonte concorrente | nenhuma: não há `public/robots.txt`, nem regra no middleware ou no `next.config.ts`. A resposta de produção traz `x-nextjs-cache: HIT` e `vary: rsc…`, ou seja, saiu do Next | confirmado |
| Repositório × produção | o texto publicado em 21/10 é byte a byte o que o código de `363fa68` gera | confirmado |
| Publicação | `deploy/deploy-vps.sh` (build na VPS + pm2). O nginx só repassa | confirmado |
| Formato | `200`, `Content-Type: text/plain`, na raiz; `www` responde 308 para o domínio sem www | confirmado |

**Snapshot para rollback:**
- antes: SHA-256 `15efa8be247c42d9097a6f464a4db9434c2a9a603a12c0333a2d5fb07e0fa160`, o que `363fa68` gera;
- depois: SHA-256 `69d25d6ad1d3159a0568c41368dfe18cadcd4ffcd2c3a0b2353bbe4288785921`.

Rollback = reverter o commit deste PR e rodar o deploy.

## 2. O que mudou nas regras

| Antes | Depois | Por quê |
|---|---|---|
| Googlebot e Bingbot sem `/private/` e `/*.json$`; robôs de IA sem `/*.json$`; Googlebot-Image sem os dois | todo grupo repete `/admin/`, `/private/`, `/api/`, `/*.json$` | um grupo por nome substitui o `*` inteiro (RFC 9309) |
| GPTBot, OAI-SearchBot e ChatGPT-User num grupo só com Claude, Perplexity etc. | um grupo para cada robô da OpenAI; os outros continuam juntos | busca, acesso a pedido e treinamento são controles independentes |
| `Allow: /api/llm/` | `Allow: /api/llm/vehicles` | `/api/llm/gaps` e `/api/llm/monitor` são internas (só POST com `CRON_SECRET`; GET dá 405) |
| `Allow: /api/vehicles/search?q=` | removida | `Allow: /api/vehicles/search` já cobre a query (regra casa pelo começo) |
| `Disallow: /admin/*` e `/api/*` | removidas | iguais a `/admin/` e `/api/` |
| `Host: https://attraveiculos.com.br` | removida | não é diretiva do protocolo; o domínio já sai pelo redirect e pelo canonical |
| `/api/vehicles/search` sem cabeçalho de indexação | `X-Robots-Tag: noindex` (`next.config.ts`) | cada `q` é uma URL nova; o robô lê, mas não vira página indexada |

Os demais robôs e permissões ficaram como estavam (Claude, Perplexity, Google-Extended,
Applebot-Extended, Amazonbot, CCBot, meta-externalagent). O OAI-AdsBot não ganhou grupo e
segue o `*`.

## 3. Decisão do GPTBot

**Preservado como estava: liberado.** O handoff propõe bloquear e pede para manter a
política antiga até a Attra decidir. Bloquear o GPTBot não muda nada no ChatGPT Search,
que usa o OAI-SearchBot.

Para bloquear, troque `POLITICA_GPTBOT` para `'bloqueado'` em
`src/lib/seo/regras-robots.ts`. O teste cobre as duas políticas: com `'bloqueado'`, o GPTBot
não lê nada e o OAI-SearchBot e o ChatGPT-User continuam iguais. **Pendente: decisão da Attra.**

## 4. Matriz de regras

O texto foi conferido por dois leitores, com **0 divergências** entre eles nos dois arquivos:
- `scripts/lib/robots-txt.mjs`, do repositório, que é o mesmo do teste e da auditoria;
- `robots-parser` 3.0.1, independente (npm), usado só nesta conferência.

**Depois (este PR):**

| Robô | `/` | `/veiculos` | ficha do Temerário | `/api/llm/vehicles` | `/api/vehicles/search?q=911` | `/api/qualquer-outra` | `/api/llm/gaps` | `/admin/` | `/private/` | `/x.json` | `/images/a.jpg` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OAI-SearchBot | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| ChatGPT-User | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| Googlebot | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| Bingbot | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| GPTBot (liberado) | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |
| Googlebot-Image | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Deny | Deny | Allow |
| OAI-AdsBot (`*`) | Allow | Allow | Allow | Allow | Allow | Deny | Deny | Deny | Deny | Deny | Allow |

**Antes (produção em 21/10), diferenças:**
- Googlebot e Bingbot podiam `/private/`;
- todos os grupos próprios podiam `/x.json`;
- todos podiam `/api/llm/gaps`.

**Casos extras do teste** (`src/lib/seo/__tests__/regras-robots.test.ts`, 21 testes):
- `/*.json$` não pega HTML, `/_next/static/*.js|css`, `/_next/image?…`, `?_rsc=` nem `/site.webmanifest`;
- o Googlebot-Image lê `/images/*`, `*.jpg|png|webp` e `/_next/image`;
- os JSON de `/creative/vendido/` ficam bloqueados (são do gerador do admin).

`curl -A 'OAI-SearchBot'` mede só o servidor, não a leitura do robots: `/`, `/veiculos` e a
ficha do Temerário dão **200 text/html**.

## 5. Sitemaps e páginas listadas (produção, 21/10)

| Teste | Resultado | Status |
|---|---|---|
| `sitemap.xml` e os 4 filhos | 200, `application/xml`, XML válido (`xmllint`) | confirmado |
| O índice só aponta arquivos que existem | os 4 abrem | confirmado |
| URLs listadas | 447 (124 páginas, 156 blog, 68 estoque, 99 manual), todas em `attraveiculos.com.br` | confirmado |
| Cada URL | 447 de 447 com 200 sem redirecionamento, canonical igual à própria URL, sem `noindex` (meta ou cabeçalho) e com `<title>` | confirmado |
| URL do sitemap bloqueada no robots novo | 0 de 447 (OAI-SearchBot, ChatGPT-User, Googlebot, Bingbot) | confirmado |
| `lastmod` | estoque com 68 datas distintas, vindas do feed; blog com a data de cada post; manual com data fixa (conteúdo estático) | coerente |
| Carro vendido | sai do feed, a ficha dá 404 e sai do sitemap de estoque | confirmado (PR #46) |

## 6. IPs reais, WAF e logs

- **Não há CDN nem WAF na frente:** a resposta vem direto do nginx (`Server: nginx/1.24.0`), sem cabeçalho de CDN.
- **Relatório dos logs na VPS** (`scripts/robos-openai-nos-logs.mjs`, 15 arquivos de log, 12/10 a 21/10/2026, IP conferido contra as faixas oficiais de cada robô):

| Robô | Acessos de IP oficial | Com o nome, de IP de fora | Sucesso | 403/429 |
|---|---|---|---|---|
| OAI-SearchBot | 2.824 | 899 | 95,4% | **0** |
| ChatGPT-User | 164 | 921 | 94,5% | **0** |
| GPTBot | 5.336 | 943 | 95,1% | **0** |
| OAI-AdsBot | 0 | 598 | — | — |

**Status: confirmado.** O OAI-SearchBot real rastreia o site sem bloqueio. Leu `/robots.txt`
113 vezes, as fichas 397 e a listagem 334.

**Erros que sobram** (fora do robots.txt):
- 5xx em `/_next/*` (49 no OAI-SearchBot, 222 no GPTBot);
- 404 em fichas de carros já vendidos;
- 3 × 404 e 5 × 301 em `/robots.txt`. O relatório agrupa por caminho, sem o host; vale olhar se vêm do host `www` ou do acesso direto por IP.

**Depois do deploy**, na VPS: `node scripts/robos-openai-nos-logs.mjs /var/log/nginx/access.log*`.
A OpenAI diz que a mudança de permissão leva cerca de 24 h para valer.

## 7. Exceções de API

| Rota | Quem usa | Autenticação | Dado | Custo de rastreamento | Decisão |
|---|---|---|---|---|---|
| `/api/llm/vehicles` | assistentes, pelo `llms.txt` (nenhuma página do site depende dela) | pública | o estoque público (o mesmo das fichas) | baixo: cache de 1 h, uma URL por filtro | **mantida** |
| `/api/vehicles/search` | assistentes, pelo `llms.txt` | pública; 10 req/min por IP, em memória | o estoque público | cada `q` é dinâmica e pode chamar a busca semântica (Jina) | **mantida**, agora com `noindex` |
| `/api/llm/gaps`, `/api/llm/monitor` | cron interno | `CRON_SECRET`, só POST | relatório interno | — | **saíram** da exceção |

O robots.txt não é firewall. O frontend não depende de nenhuma das duas rotas públicas; as
outras `/api/` continuam bloqueadas para robôs, como antes.

## 8. Riscos, monitoramento e rollback

- **Limite de uso da busca contornável:** o limite de `/api/vehicles/search` usa o primeiro
  IP do `X-Forwarded-For`, que o cliente pode inventar se o nginx só acrescentar o dele. Cada
  busca pode gerar uma chamada paga à Jina. Fora deste ajuste; conferir a configuração do nginx.
- **O `llms.txt` continua anunciando `/api/vehicles/search`.** Se o rastreamento dessa rota não
  trouxer valor, a remoção da exceção fica para uma segunda mudança, com métrica.
- **Monitoramento:**
  - a auditoria semanal (`scripts/auditar-catalogo-publico.mjs`, GitHub Actions) agora lê o
    robots.txt como os robôs leem;
  - ela **falha** se OAI-SearchBot, ChatGPT-User, Googlebot ou Bingbot perderem `/` ou
    `/veiculos`, se uma URL do sitemap estiver bloqueada ou fora do domínio, ou se um sitemap
    vier sem `<urlset>` completo;
  - ela **avisa** se uma restrição sumir, se voltar a linha `Host:` ou se houver `lastmod` no futuro.
- **Rollback imediato** se página pública sair bloqueada, o robots ou o sitemap não abrir, ou
  houver regressão: reverter o commit e rodar o deploy.

## Depois do deploy

```sh
node scripts/auditar-catalogo-publico.mjs
curl -sS https://attraveiculos.com.br/robots.txt | shasum -a 256   # deve dar 69d25d6a…
curl -sSI 'https://attraveiculos.com.br/api/vehicles/search?q=911' | grep -i x-robots-tag
```
