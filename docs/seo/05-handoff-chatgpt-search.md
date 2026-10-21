# Handoff "Attra × ChatGPT Search" — o que foi feito e o que falta

Handoff recebido em 20/10/2026 (`handoff_attra_GPT.md`, versão 1.0). Ele mesmo separa
o que foi observado do que é hipótese. Aqui fica o resultado de cada item depois de
conferido no HTML do servidor (sem JS) e no código.

Para repetir a medição: `node scripts/auditar-catalogo-publico.mjs` (produção) ou com
a URL de um build local. Roda toda segunda às 8h no GitHub Actions
(`.github/workflows/auditoria-catalogo.yml`).

## Medição de produção em 20/10/2026, antes do deploy

| Item do handoff | Situação encontrada | Status |
|---|---|---|
| P0.1 robots.txt | 200; OAI-SearchBot, ChatGPT-User e GPTBot liberados por nome | ok, sem mudança |
| P0.1 sitemap | `/sitemap.xml` (o índice que o robots anuncia) responde **500**; os 4 sub-sitemaps, 200 | causa só nos logs da VPS (o build local responde 200) |
| P0.1 www | `www.attraveiculos.com.br` respondia 200 (canonical certo) | redirect permanente para o domínio sem www |
| P0.2 / L3 listagem | paginação em `<button>`: sem JS, 12 de 68 fichas tinham link a partir de `/veiculos` | **confirmado** e corrigido |
| P0.2 canonical | `?pagina=N` com canonical na 1ª e `noindex`; `?marca=x` indexável com canonical em `/veiculos` | corrigido |
| P0.3 / L1 911 GTS | FAQ com "2.981 cc / 385 cv / 4,2 s" (Carrera base) e ficha com peso e dimensões do Carrera | **confirmado** em 20 das 68 fichas; corrigido |
| L4 título | 65 das 68 fichas tinham versão no h1 e não no título ("Ferrari 296 2025") | corrigido |
| L2 opcionais | o 911 GTS e a 296 GTS vêm da AutoConf **sem nenhum opcional** cadastrado | cadastro, não código |
| FAQ | "garantia de fábrica integral" e "excelente estado de conservação" sem documento, em 39 fichas | trocado por texto sem promessa |

## O que mudou no código

- **Nome do anúncio** (`src/lib/identidade-do-veiculo.ts`): marca + modelo + versão + ano
  (fabricação/modelo quando diferem). É o mesmo texto no `<title>`, na meta description,
  no `seo_title` do feed e no `name` do JSON-LD. A URL não muda.
- **Ficha sem tabela de referência**: a página do veículo não usa mais
  `vehicle-datasheet.ts`. A tabela tem uma versão por modelo e casa por palavra-chave,
  então completava o anúncio por semelhança de nome. A FAQ e a ficha técnica mostram só
  o que o anúncio traz. A tabela segue nas páginas de modelo (`/comprar/<marca>/<modelo>`),
  onde aparece como referência do modelo.
- **Paginação em `<a href>`** (`vehicle-pagination.tsx`), com canonical próprio e título
  "— Página N" em cada página.
- **Filtro de marca**: `/veiculos?marca=porsche` aponta o canonical para `/comprar/porsche`,
  que agora lista **todo** o estoque da marca (antes, só os 6 mais caros).
- **Breadcrumb da ficha**: Veículos › Porsche (`/comprar/porsche`) › 911
  (`/comprar/porsche/911`) › Carrera GTS Cabriolet 2026. Visível e BreadcrumbList usam a
  mesma lista (`trilhaDoVeiculo`).
- **JSON-LD**: `numberOfDoors`; potência com `unitText: 'cv'` (o feed informa cv, não BHP).
- **Sitemap de estoque**: sem `lastmod` inventado quando a fonte não informa a data.
- **Deploy**: o smoke test avisa quando `/sitemap.xml` não responde 200.
- **Robôs da OpenAI nos logs** (`scripts/robos-openai-nos-logs.mjs`): confere o IP de cada
  acesso contra as faixas oficiais de cada robô e separa o acesso real do nome falsificado.
  Na VPS: `node scripts/robos-openai-nos-logs.mjs /var/log/nginx/access.log*`.

## Fora do código — depende da Attra

1. **Opcionais e configuração de cada carro** (L2, P1.4): o feed só tem o que está
   cadastrado na AutoConf. Hoje são acessórios genéricos ("Alarme", "Travas elétricas"),
   e o 911 GTS e a 296 GTS não têm nenhum. Cadastrar PCCB, pacotes, cor e material
   interno, rodas e PPF faz a ficha responder buscas como "296 GTS com Assetto Fiorano"
   sem nenhuma mudança de código. A cor interna não existe no feed.
2. **Garantia por carro**: o feed tem o campo `garantiafabrica`, vazio no estoque
   amostrado. Preenchido, dá para a FAQ dizer "garantia de fábrica até mm/aaaa" em vez
   do texto genérico.
3. **Potência**: o feed se contradiz em alguns carros (campo de potência ≠ número no nome
   da versão). A auditoria aponta esses casos como AVISO.
4. **GPTBot**: liberado por decisão registrada em `src/app/robots.ts`. O handoff trata
   bloquear treinamento como escolha jurídica/comercial. Não mexi.
5. **OAI-AdsBot**: só faz sentido se a Attra anunciar no ChatGPT.
6. **ACP / feed de produtos da OpenAI** (P3): o onboarding é para parceiros aprovados e
   mira os EUA. Nada a fazer antes de confirmar elegibilidade BR/BRL/veículo usado.

## Ainda em aberto no site

- **h1 das páginas 2+ de `/veiculos` e das filtradas**: elas agora são indexáveis e não
  têm h1 (só a 1ª página, com o destaque). Mexe no visual; precisa de ok.
- **`/comprar/modelo/porsche-911`** não lista nenhuma ficha (0 links); `/comprar/porsche/911`
  lista as 8. Avaliar se a primeira deve redirecionar para a segunda.
- **Tabela de referência das páginas de modelo**: o "911 Carrera" dela é de 385 cv
  (992.1); o Carrera 992.2 tem 394 cv. Ela está rotulada como referência do modelo, mas
  envelhece.
- **Blog** (P2): auditoria editorial (comparativos entre categorias distantes, anos
  divergentes entre título e corpo) não foi feita.
