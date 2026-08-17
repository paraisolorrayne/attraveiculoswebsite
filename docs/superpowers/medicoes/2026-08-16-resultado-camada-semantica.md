# Camada semântica — antes e depois, medido em produção

**16/08/2026.** Linha de base capturada antes do deploy (JSONs crus em
`2026-08-16-busca-antes-da-camada-semantica/`), medição depois da
ressincronização completa.

## Sincronização

```
{"synced":77,"total":77,"prosa":{"geradas":77,"cacheadas":0,"reprovadas":0,"falhas":0}}
```

77 de 77 veículos, 77 prosas geradas, **nenhuma reprovada pela trava, nenhuma
falha de modelo**. Os contadores nasceram na onda final de consertos justamente
para tornar isso legível — sem eles a resposta seria um `synced: 77` mudo, e
"a camada está morta" seria indistinguível de "a camada está funcionando".

## As três consultas

### 1. "SUV familiar com bastante espaço" — sem mudança conclusiva

| | antes | depois |
|---|---|---|
| 1º | Mercedes G-63 | Land Rover Discovery Sport |
| 2º | Cadillac Escalade | Mercedes G-63 |
| 3º | Tesla Cybertruck | Land Rover Range Rover |

Os dois lados devolvem cinco SUVs. **Esta consulta já estava saturada antes** —
foi ela que invalidou o critério de aceite original do plano, que pedia
exatamente "um SUV de quatro portas na primeira posição". Não serve para medir
nada.

### 2. "carro para o fim de semana" — melhora inequívoca

| | antes | depois |
|---|---|---|
| 1º | **Nissan Frontier** (picape de trabalho) | Pontiac Solstice (conversível) |
| 2º | Mercedes G-63 (SUV) | Chevrolet Camaro SS (cupê) |
| 3º | Mercedes G-63 (SUV) | Mercedes SL-63 (conversível) |

A picape sumiu; os três resultados passaram a ser carros de fim de semana de
verdade. É o rótulo `fim-de-semana` fazendo exatamente o que foi desenhado para
fazer.

### 3. "primeiro carro premium até 300 mil" — melhora real, com ressalva

| | antes | preço | depois | preço |
|---|---|---|---|---|
| 1º | GMC Sierra 3500 Denali | R$ 1.390.000 | **Chevrolet Camaro SS** | **R$ 209.000** |
| 2º | Land Rover Discovery | — | GMC Sierra 3500 Denali | R$ 1.390.000 |
| 3º | Chevrolet Corvette Z06 | — | **Pontiac Solstice** | **R$ 290.000** |
| 5º | Mercedes GLE-400 | — | **Mercedes GLC** | **R$ 249.000** |

Antes, o primeiro resultado custava **4,6× o teto pedido**. Depois, o primeiro
está dentro do orçamento, e três dos cinco também.

**Ressalva honesta:** a camada semântica **não interpreta restrição de preço**.
O rótulo `primeiro-premium` usa um limiar fixo de R$ 300 mil, e foi coincidência
feliz o número da pergunta bater com ele. Uma busca por "até 500 mil" não teria
o mesmo efeito. Filtro de preço de verdade é outro trabalho.

## O que não funciona hoje, e não é defeito da camada

**`horsepower` chega vazio em todo o feed de listagem.** Os rótulos `pista` e
`desempenho` nunca são derivados. Um BMW X6 M Competition de 625 cv recebe
`família, viagem, urbano` — o "625CV" está no nome do modelo, não no campo. É
sub-rotulagem, não afirmação falsa: falha segura.

## A trava, verificada em texto real

Seis passagens lidas em produção. Nenhuma contém comparativo, superlativo ou
juízo de conforto. Exemplo, com a origem de cada parte:

```
[ficha]    Porsche 911 Carrera T 2023. cor Cinza. tipo Cupê. 2.500 km. R$ 849.000.
[AutoConf] Porsche 911 2023 com apenas 2.500 km rodados. Motor Gasolina...
[PROSA]    Veículo seminovo com 2.500 km, destinado ao uso de entusiastas em
           fins de semana.
[rótulos]  Uso: fim de semana. Perfil: entusiasta. Destaques: baixa quilometragem.
```

Só a terceira linha é a camada nova.

## Estado da tabela

```
linhas | com_prosa | sobrescritas
    77 |        77 |            0
```

Nenhuma sobrescrita humana ainda — a tela de admin ficou fora de escopo, então
correção hoje é `UPDATE` na mão.
