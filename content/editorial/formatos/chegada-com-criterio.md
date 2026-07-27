# Formato: Chegada com critério (`/news`)

Datado, curto, gerado a partir do feed. Só existe para unidade que passou no filtro de
noticiabilidade — nem todo carro que entra vira matéria. Publicar menos é o que faz
publicar significar algo.

**Regra dura do formato:** toda especificação vem do feed. Campo sem dado é campo
omitido, nunca inferido. (Regra 4 do `regras.md`.)

## Estrutura fixa

1. **A unidade.** O que chegou: marca, modelo, versão, ano, cor, quilometragem —
   somente campos presentes no feed.
2. **O que a torna incomum no mercado brasileiro.** Raridade de configuração, produção
   limitada, combinação de especificações pouco vista no país. Especificidade, nunca
   superlativo.
3. **O que a inspeção verificou.** `[PENDENTE-SÓCIOS: depende do processo de inspeção
   validado no fatos.md. Até lá, esta seção é omitida das peças.]`
4. **Para quem faz sentido.** O perfil de uso em que esta unidade se encaixa — e, se
   for o caso, o perfil em que não se encaixa.
5. **Custo de posse.** Link para o guia de custo do segmento no `/blog`
   (ex.: chegada de um 911 → guia de custo de posse de esportivo alemão).

## Checagem específica do formato

- Cada especificação citada existe no feed? (checagem 3 da revisão humana)
- A peça linka o guia de custo do segmento correspondente?
- A unidade passou no limiar de noticiabilidade? `[PENDENTE-SÓCIOS: limiar a definir —
  substitui o critério atual de preço mínimo do vehicle-picker.ts]`
