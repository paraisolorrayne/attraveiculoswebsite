# Ambiente local

Para ver o admin (e a área da agência) rodando no seu Mac **antes** de qualquer
deploy. O banco local tem a **mesma estrutura** do de produção, mas **só dados
sintéticos**: nada é copiado de produção (sessões guardam IP; cards do CRM,
nome e telefone).

## Montar (uma vez, ou quando quiser zerar)

No Terminal do Mac, na pasta do projeto (como você, não como root):

```bash
bash scripts/local/montar-banco-local.sh   # esquema de produção + migrations novas
cp .env.local.example .env.local           # e preencha (veja abaixo)
npx tsx scripts/local/seed-agencia.ts      # dados sintéticos e usuários de teste
npm run dev
```

No `.env.local`: troque `<seu-usuario>` no `DATABASE_URL` e gere o
`AUTH_SECRET` com `openssl rand -base64 32`.

O seed se recusa a rodar fora de um banco local com "local" no nome.

## Entrar

Abra http://localhost:3000/admin/login. Os logins de teste e a senha estão no
topo de `scripts/local/seed-agencia.ts`:

- **admin@attra.local** — admin: vê tudo e a área de qualquer agência.
- **mediahouse@webmotors.com.br** e **nayume.sousa@webmotors.com.br** — agência
  Media House: caem direto na área dela.

## O que o seed cria

- Agências Media House e EB. Não há cadastro de campanha: a Media House vê as
  visitas com o marcador dela (`va-`/`[VA]` no `utm_campaign` ou `utm_content`,
  `utm_medium=mediahouse` ou um `utm_id` da lista — migration 20261003); a EB,
  as com `[EB]`. Visitas no Google (PMax e Search), na Meta e no GAM da WebMotors.
- 2.500 sessões em 30 dias: 45% orgânico, o resto distribuído entre as
  campanhas; metade da PMax chega só com `utm_id`, sem nome (o caso real desde
  29/09).
- Cliques no WhatsApp em ~9% das sessões, com o tempo até o clique na
  distribuição medida em produção (inclusive os toques acidentais < 3 s).
- Uma campanha `va-webmotors-gam-set26` (GAM da WebMotors, com o marcador `va-`).

Os dados são os mesmos a cada execução (semente fixa).

## Problemas comuns

- **`Cannot find module '../lightningcss.darwin-x64.node'`**: o `npm run dev`
  rodou com um Node x64 (ex.: `/usr/local/bin/node`). Use o do Homebrew
  (`which node` deve mostrar `/opt/homebrew/bin/node`) e apague `.next/dev`.
- **"Muitas tentativas de login"**: o limite é em memória; reinicie o
  `npm run dev`.
