# Permissões por usuário no admin

**Data:** 2026-08-01

## Problema

O acesso ao admin é decidido só pelo papel, por uma matriz fixa em
`src/lib/auth/roles.ts`. Eduardo é `marketing` e precisa ver
`/admin/visitors`, que não está no papel dele. Hoje as saídas seriam
promovê-lo (dando acesso a coisas demais) ou liberar Visitantes para todo
Marketing — nenhuma das duas é o que se quer.

Há também um bug latente: a tela de Usuários só oferece `admin` e
`gerente` no seletor de papel, embora existam cinco papéis e as pessoas
reais estejam em `owner`, `operador` e `marketing`. Editar o Eduardo por
essa tela hoje o rebaixaria para `gerente` silenciosamente.

## Decisões (fechadas com o usuário)

1. **Papel + exceções por usuário.** O papel continua sendo o padrão;
   o admin pode conceder ou revogar seções específicas para uma pessoa.
   Quem não tem exceção se comporta exatamente como hoje.
2. **Só o papel `admin` edita permissões.** Ninguém edita as próprias, e
   nenhuma exceção pode liberar a área de gestão de usuários — senão a
   concessão vira um caminho para se autopromover.
3. **A regra vale no servidor.** Middleware e rotas de API decidem pelo
   mesmo cálculo; esconder item de menu não é controle de acesso.
4. **A tela de Usuários passa a listar os cinco papéis reais.**

## Modelo de dados

Coluna nova em `admin_users`:

```sql
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS secoes_extras JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Formato `{ "<prefixo>": true | false }` — `true` concede, `false` revoga:

```json
{ "/admin/visitors": true, "/admin/blog": false }
```

Por que JSONB e não tabela de junção: são poucas seções, poucos usuários
e a leitura é sempre "todas as exceções deste usuário". Uma tabela extra
custaria um join em toda checagem de rota sem benefício.

`role` é um enum do Postgres (`USER-DEFINED`); nada aqui o altera.

## Cálculo do acesso

`canAccessRoute(role, pathname, secoesExtras?)` em `src/lib/auth/roles.ts`,
mantendo a assinatura atual funcionando (terceiro parâmetro opcional).
Ordem de precedência, do mais forte para o mais fraco:

1. `/admin/login` e `/admin/reset-password` — sempre liberados.
2. **Gestão de usuários** (`/admin/usuarios`, `/api/admin/users`) — só
   `admin`. Exceção nunca concede; a proteção é do lado do servidor.
3. **Papel `admin`** — acesso total, sempre. Exceções não se aplicam a ele
   (nem para conceder, nem para revogar): é o papel que administra os
   outros e não pode se trancar para fora.
4. **Revogação por exceção** (`false`) — para os demais papéis, vence a
   matriz.
5. **Concessão por exceção** (`true`) — libera o prefixo mesmo que a
   matriz do papel não permita.
6. Matriz do papel, como hoje.

## Interface (`/admin/usuarios`)

Cada usuário ganha uma ação "Permissões" que abre um painel com a lista
de seções do admin (fonte: `ADMIN_SECTIONS` de `src/lib/admin-sections.tsx`,
que já é a lista real de seções). Cada seção mostra três estados:

- **Padrão do papel** — sem exceção (mostra se o papel libera ou não)
- **Liberado** — exceção `true`
- **Bloqueado** — exceção `false`

O painel é desabilitado para o próprio usuário logado e para linhas de
papel `admin` (que já têm tudo). A seção de Usuários aparece na lista
como somente-leitura, marcada como exclusiva do Admin.

O seletor de papel passa a usar `ROLE_LABELS` (cinco papéis).

## Onde a regra é aplicada

A auditoria da base mostrou que a proteção por página é **inconsistente** e
não serve como ponto único de decisão:

- `/admin/visitors/page.tsx` exige `role === 'admin'` fixo no código —
  nem o `operador`, que a matriz libera, consegue entrar. É também o que
  bloquearia o Eduardo mesmo depois da exceção concedida.
- `/admin/blog/page.tsx` só verifica se está autenticado, sem papel.

O ponto autoritativo passa a ser o **layout do admin**
(`src/app/admin/layout.tsx`), que já roda para toda página de `/admin/*` e
já consulta o banco via `getCurrentAdmin()`. Vantagens sobre as
alternativas: é **um único lugar**, cobre inclusive as páginas que hoje
não checam nada, e lê o estado **fresco** — permissão concedida vale na
navegação seguinte, sem esperar novo login.

Foi por isso que descartei colocar as exceções no JWT: o middleware roda
no edge, sem banco, então o token ficaria desatualizado e o modo de falha
seria o pior possível — bloquear um acesso que o admin acabou de conceder.

Divisão de responsabilidade:

1. **Middleware** (edge, JWT) — porta grossa: exige sessão válida com
   papel de admin e barra `/admin/usuarios` para quem não é `admin`.
   Decisão por seção sai dele, porque no edge ela não teria como estar
   correta.
2. **Layout do admin** (servidor, banco) — decisão por seção com
   `canAccessRoute(role, path, secoes)`; sem acesso, redireciona para
   `/admin`.
3. **`/admin/visitors/page.tsx` perde a regra própria** (`role === 'admin'`
   fixo), que hoje contradiz a matriz e bloquearia o Eduardo mesmo com a
   exceção concedida.
4. `sectionsForRole(role, secoes)` passa a considerar exceções, para o
   menu refletir o acesso real.
5. `src/app/api/admin/users/*` valida que só `admin` altera e que ninguém
   altera a si mesmo. As APIs de cada seção mantêm suas checagens.

## Fora de escopo

- Editar o que cada PAPEL acessa (a matriz segue em código).
- Permissões mais finas que seção (ex.: ler vs. escrever dentro do CRM).
- Log de auditoria das mudanças de permissão.

## Critérios de aceite

1. Admin consegue liberar Visitantes para o Eduardo sem mudar o papel
   dele, e ele passa a ver a seção no menu e a abrir a página.
2. Um usuário sem a seção continua recebendo redirect ao tentar a URL
   direta — a checagem não depende do menu.
3. Nenhuma exceção concede `/admin/usuarios`, mesmo se gravada no banco.
4. O admin não consegue editar as próprias permissões pela tela.
5. O seletor de papel mostra os cinco papéis e não rebaixa ninguém.
6. `tsc`, `eslint` e a suíte de testes seguem limpos; teste unitário
   cobrindo a precedência do cálculo de acesso.
