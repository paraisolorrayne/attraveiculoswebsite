# Handoff SEO de 02/11/2026: o que foi feito e o que falta

Handoff "Handoff SEO attraveiculos.com.br" (Ahrefs Webmaster Tools, 02/11/2026).
Antes de mexer, o site em produção foi rastreado inteiro (497 páginas, HTML do
servidor), e alguns números do Ahrefs não se confirmaram:

| Ahrefs | Rastreio de 02/11 | Leitura |
| --- | --- | --- |
| 111 páginas órfãs | 18 | O `/blog/arquivo` já tinha paginação com links; o crawl do Ahrefs ainda estava em andamento |
| 101 páginas com link para redirect | 1 link interno (`/estoque` num post) | Os demais eram os links do rodapé para Instagram, Facebook e YouTube sem `www` (301 em todas as páginas) |
| 522 links bloqueados pelo robots.txt | 0 | Nenhum link do HTML aponta para `/api/`, `/admin/` ou `.json` |
| AutoDealer/WebSite duplicados nos posts | 1 de cada por página | Vêm do layout raiz, uma vez só |

## Feito no código

**Tarefa 1, URLs que vazam**
- Ficha de carro vendido: registro `veiculos_publicados` (migration `20261102`), gravado a cada leitura da listagem da AutoConf. Até 90 dias depois da venda, a ficha responde 200 com selo "Vendido", "Quero um igual" e similares; depois, 308 para `/comprar/{marca}` (ou `/veiculos`). Slug no formato da AutoConf que o registro nunca viu também vai para a marca. Slug inventado continua 404. Com o registro parado há mais de 1 hora (AutoConf fora do ar), nada vira redirect permanente. Ver `src/lib/veiculos-publicados.ts`.
- `deploy/host-unico-nginx.sh`: o redirect HTTP do nginx passa a ir direto para `https://attraveiculos.com.br` (era `https://$host`, dois saltos para o `www`).
- `/Blog/Reviews` e qualquer `/blog` com maiúscula: 308 para minúsculas (middleware).

**Tarefa 2, órfãs e links para redirect**
- Categorias com endereço próprio e paginação em link: `/blog/artigos`, `/blog/reviews`, `/blog/comparativos` (`?pagina=N`). `/blog/arquivo?tipo=` redireciona para elas. Arquivo e categorias saíram de `blog/(lista)/`: com o `loading.tsx` de lá, a página além da última respondia 200.
- "Leia também" em todo post: três da mesma marca ou categoria (`src/lib/blog-categorias.ts`).
- Hub `/guia` (dava 404) e `/comprar` com todas as faixas, condições, perfis, modelos e preços.
- Rodapé: hubs, páginas órfãs e marcas direto em `/comprar/{marca}`; redes sociais com `www`.
- Links de post para páginas com redirect (`/estoque`, páginas legadas) vão direto ao destino.

**Tarefa 3, /comprar e /preco**
- Faixa "até R$ 400 mil" nova. Toda faixa lista o estoque real da faixa (ou os de preço mais próximo) e tem FAQ com `FAQPage`.
- `/comprar/{marca}`: H1 "{Marca} à venda no Brasil", FAQ com o estoque do momento (`FAQPage`) e, sem carro da marca, os da mesma categoria.

**Tarefa 4, blog**
- Posts como `BlogPosting`; o carro do review vai em `about` como `Thing` (sem `Review` nem `Vehicle`).
- Bloco de estoque do post só com a mesma marca ou modelo (o do Hummer mostrava Ferrari e Lamborghini); vazio, fica o convite para encomendar.
- Fim dos artigos: "Quer um carro assim? Fale com a Attra" com link para `/solicitar-veiculo`.
- Posts novos com slug limpo, sem `-wud3`; repetido ganha `-2`. Os antigos não mudam.

**Tarefa 5, metadados**
- `pageTitle` faz todo título caber em 60 caracteres (tira trechos depois de " | ", usa " | Attra", corta em palavra inteira).
- `descricaoSeo` deixa a descrição entre 120 e 155 caracteres; `metadadosDaPagina` junta título, descrição, canonical e `og:url`.
- Ficha: "{Modelo} {Ano} à venda | Attra" e descrição com modelo, ano, km, cor e preço.
- `og:url` nas 22 páginas sem; H1 em `/veiculos?pagina=N`.

## Falta, fora do código

- [ ] Aplicar a migration na VPS antes do deploy (sem ela, a ficha de vendido continua 404 e nada quebra).
- [ ] Rodar `deploy/host-unico-nginx.sh` na VPS depois do deploy.
- [ ] `site.attraveiculos.com.br` aponta para outro servidor (108.181.92.77, cPanel antigo, página padrão em HTTP e HTTPS quebrado). Apagar o registro DNS ou apontá-lo para a VPS (217.216.82.138) e incluir o host no `server_name` do nginx.
- [ ] Search Console: comparar Desempenho › Páginas (3 meses × 3 anteriores), conferir Ações manuais e reenviar o sitemap depois do deploy.
- [ ] Pauta do blog (abaixo): a Attra decidiu em 28/10 manter 3 posts por semana a partir do Instagram; o handoff pede 2 por mês com pauta de compra. Decisão da Attra.

## Pauta de compra para novembro e dezembro de 2026

Só modelos que a Attra vende (estoque de 02/11: Cayenne, 911, Panamera, Macan, Range Rover, Defender, X6, M3, G 63, GLE, 296, Temerário, Vantage).

1. Cayenne ou GLE: qual SUV de luxo comprar em 2026
2. Quanto custa manter um Porsche 911 no Brasil (revisão, seguro, pneus, IPVA)
3. Blindagem em carro de luxo: preço, prazo e o que muda na revenda
4. Importar ou comprar no Brasil: o que sai mais caro num superesportivo
5. Range Rover Sport ou Defender: para quem é cada um
6. Panamera ou Taycan: o sedã Porsche certo para o seu uso
7. G 63 seminovo: o que conferir antes de comprar
8. Ferrari 296 GTB ou GTS: diferença de preço, uso e revenda

Cada texto com dado da casa: preço praticado no estoque, tempo médio de venda e o que os clientes perguntam.
