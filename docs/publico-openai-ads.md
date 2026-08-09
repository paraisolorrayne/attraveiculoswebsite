# Subir público (Custom Audience) no OpenAI Ads

**Atualizado:** 09/08/2026

Como levar a base de clientes da Attra para o Ads Manager, o que a plataforma
exige e o que decide se vale a pena.

---

## O número que decide tudo, antes de qualquer trabalho

**O público só fica utilizável a partir de 25.000 usuários correspondidos.**

"Correspondido" não é quantas linhas o arquivo tem — é quantas dessas pessoas a
plataforma encontra como conta real. Uma base de 30.000 clientes com 60% de
correspondência dá 18.000 e **não ativa**.

Então a primeira pergunta não é como subir, é **quantos clientes com telefone ou
e-mail existem no histórico**. Abaixo de ~35.000 registros limpos, a chance de
ativar é baixa.

Para referência, o que o site tem hoje de dado próprio: **340 telefones no CRM** e
**20 e-mails**. Isso é três ordens de grandeza abaixo do mínimo — o volume tem que
vir do histórico de vendas dos 5 anos, não do site.

---

## O que pode ser usado

**Pode:** cliente que comprou, negociou ou pediu contato à Attra. Dado que a
própria empresa coletou, na relação com a pessoa.

**Não pode:** lista comprada, alugada, raspada ou recebida de terceiro. Os termos
de ferramentas de anúncio exigem que o anunciante tenha os direitos sobre o que
sobe, e a LGPD exige base legal para o tratamento. Uma base de bureau não tem
nem uma coisa nem outra, e o risco recai sobre a conta de anúncios e sobre a
Attra — não sobre quem vendeu a lista.

Sinal prático de que a lista é comprada: campos que a loja nunca coletaria, como
renda, data de nascimento, sexo, CNAE ou participação societária.

---

## Formato exigido

| | |
|---|---|
| Arquivo | CSV ou TXT, **UTF-8** |
| Tamanho | até 500 MB |
| Identificadores | até 5.000.000 |
| Tipos | `email`, `phone_number`, `email_sha256`, `phone_number_sha256` |
| Mistura | **proibida** — um único tipo por arquivo |
| CSV | cabeçalho opcional; se houver, a coluna precisa se chamar exatamente como o tipo |
| TXT | um identificador por linha |
| Processamento | 20 a 30 minutos |

Pode-se subir **mais de um arquivo** para o mesmo público — um de telefone e um
de e-mail, por exemplo. O que não pode é misturar dentro do mesmo arquivo.

### Com hash ou sem?

**Prefira `_sha256`.** O resultado é idêntico para a plataforma, e o arquivo que
sai do computador da Attra deixa de conter telefone e e-mail legíveis. Se ele
vazar, vazou hash.

O hash é do valor **já normalizado**. Fazer hash de `João@Attra.com.br` e de
`joao@attra.com.br` dá dois hashes diferentes para a mesma pessoa — por isso a
normalização vem primeiro, sempre.

---

## Onde a maioria dos uploads falha: normalização

Não é o envio, é o formato do dado. `(34) 99944-4747` e `5534999444747` são a
mesma pessoa e viram duas linhas que não correspondem a ninguém.

Como a plataforma só informa **quantos** bateram, e nunca **quais**, um erro de
formato aparece como "público pequeno" e não como erro. Ninguém descobre.

Numa base de 5 anos, o caso mais comum é o **celular de 8 dígitos**: cadastro
anterior a 2016 não tem o nono dígito. Sem acrescentá-lo, esses registros não
correspondem a ninguém — e podem ser a maior parte do histórico antigo.

O script abaixo trata isso.

---

## Passo a passo

### 1. Exportar o histórico

Do sistema onde está o histórico de clientes, exportar **CSV** com pelo menos uma
destas colunas:

- telefone celular (com DDD), e/ou
- e-mail

Nome, endereço e valor de compra **não são usados** e não precisam sair — quanto
menos dado pessoal circular em planilha, melhor.

> Exportar telefone como **texto**, não como número. Planilha transforma
> `5534999444747` em notação científica ou acrescenta `.0`, e aí o número chega
> corrompido.

### 2. Gerar o arquivo

```bash
node scripts/preparar-publico.mjs clientes.csv --coluna celular --tipo phone_number_sha256
```

Parâmetros:

- `--coluna` — nome da coluna na planilha (aceita maiúscula/minúscula)
- `--tipo` — `email`, `phone_number`, `email_sha256` ou `phone_number_sha256`
- `--saida` — opcional; por padrão grava ao lado do arquivo de entrada

O script informa quantos entraram, quantos eram duplicados e quantos foram
descartados. **Se descartar mais da metade, ele avisa** — quase sempre é coluna
trocada.

Ele descarta telefone fixo de propósito: conta de usuário não se cria com fixo,
e manter fixo só infla a lista e derruba a taxa de correspondência.

### 3. Subir no Ads Manager

Em *Audiences* → criar Custom Audience → enviar o arquivo → escolher o tipo de
identificador correspondente ao cabeçalho. Aguardar o processamento.

### 4. Conferir

Depois do processamento, olhar o número de **usuários correspondidos**. Se ficar
abaixo de 25.000, o público não vai poder ser usado — e a saída não é subir mais
listas de qualquer origem, é aceitar que este recurso ainda não cabe no tamanho
da base.

---

## Se não chegar a 25.000

O caminho que cabe no volume da Attra é o **pixel**, já instalado no site
(`NEXT_PUBLIC_OPENAI_PIXEL_ID`): a audiência é construída pela própria plataforma
a partir de quem visita as páginas, sem upload de dado pessoal nenhum. Somado ao
feed de produtos, que sobe sozinho de 6 em 6 horas, é o que sustenta campanha
para uma loja deste porte.

---

## Manutenção

Público não se atualiza sozinho. Cliente novo só entra num upload novo. Se a
Attra passar a usar isto de verdade, vale repetir o processo a cada trimestre —
e vale conferir antes se o volume cresceu o suficiente para valer o esforço.

---

## Onde está o código

- Lógica de normalização, com testes: `src/lib/publico-anuncios.ts`
- Script de linha de comando: `scripts/preparar-publico.mjs`

A normalização está duplicada nos dois arquivos: o script roda fora do bundler do
Next e importar TypeScript exigiria uma dependência a mais só para isso. **A
fonte da verdade é `src/lib/publico-anuncios.ts`** — é ela que tem testes. Mudou
lá, muda no script.
