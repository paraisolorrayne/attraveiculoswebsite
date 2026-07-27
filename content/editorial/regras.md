# Guard-rails editoriais

Regras em forma de proibição. Valem para toda peça, de todo formato, em ambos os
canais. Não há exceção editorial — se a peça precisa violar uma regra para existir,
a peça não existe.

1. **Nenhum número sem fonte e data.** Todo valor em reais, percentual ou
   quilometragem vem do `custos.md` (verdade estática) ou do feed de estoque
   (verdade dinâmica). Sem número verificável, o trecho não entra.

2. **Nenhuma crítica a marca ou modelo.** Crítica é sempre de encaixe com perfil de
   uso: "para este uso, esta categoria não se encaixa" — nunca "este carro é ruim".

3. **Nenhuma menção a concorrente.** Nem nominal, nem insinuada ("outras lojas",
   "certas concessionárias"). Descrever o padrão correto já basta.

4. **Especificação de veículo vem exclusivamente do feed.** Campo sem dado é campo
   omitido, nunca preenchido por inferência. A IA não completa ficha técnica.

5. **Nenhum dado identificável de cliente.** Caso real é sempre anonimizado: sem
   nome, sem carro raro o bastante para identificar, sem data que permita cruzamento.

6. **Cobertura de kart e do menor de idade:** `[PENDENTE-SÓCIOS: acertar com Thiago o
   que pode aparecer — nome, rosto, resultado — e registrar aqui como regra]`. Até
   lá, nenhuma peça sobre o kart é publicada.

7. **Nenhum superlativo não sustentado.** "O melhor", "incomparável", "sem igual" —
   é o vocabulário padrão dos concorrentes e o que mais rápido denuncia texto vazio.

8. **Nenhuma afirmação sobre a operação da Attra fora do `fatos.md`.** Cobertura de
   inspeção, garantia, prazo de entrega: o modelo reproduz o que os sócios validaram,
   jamais deriva. Promessa operacional não validada é dívida que a loja paga depois.

## As cinco checagens da revisão humana

Por peça, antes de publicar — dois minutos, não releitura integral:

1. Todo número tem fonte no `custos.md`?
2. Alguma marca ou modelo foi criticado nominalmente?
3. As especificações batem com o feed?
4. Passa no filtro do irmão?
5. Há promessa operacional que a Attra não cumpre hoje?

Qualquer "sim" nas checagens 2 e 5, ou "não" nas demais, devolve a peça.
