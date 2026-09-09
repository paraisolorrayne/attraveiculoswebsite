# Edição do CRM pelo gestor e retorno ao sistema

Owner (incluindo a Cris) e admin podem mover cards e alterar o vendedor responsável. Arrastar um card abre os detalhes com a coluna de destino selecionada; a alteração é aplicada ao clicar em **Salvar alterações**. O seletor nos detalhes permite a mesma operação em celular/teclado. Encerrar como perdido exige motivo. Trocar somente o vendedor preserva a coluna.

## Ativação

O endpoint receptor **ainda precisa ser informado e seu contrato confirmado**. A implementação abaixo é o contrato proposto para o retorno. Não reutilizar o webhook de captação de novos leads: ele tem outra finalidade.

1. Aplicar `supabase/migrations/20260908_crm_eventos_saida.sql` no banco do site.
2. Implementar/confirmar o receptor no sistema de origem conforme o contrato abaixo, incluindo idempotência e ordenação.
3. Configurar no servidor `CRM_RETURN_WEBHOOK_URL` (HTTPS) e `CRM_RETURN_WEBHOOK_SECRET` (segredo próprio do retorno, nunca público). O segredo deve ser configurado também no receptor, fora do navegador.
4. Publicar a aplicação e executar `bash deploy/cron/install-crons.sh` na VPS. Instala `attra-crm-retorno` a cada minuto, autenticado por `CRON_SECRET`.
5. Validar uma alteração autorizada com o receptor e conferir a atualização das tabelas externas antes de liberar o uso operacional.

Sem URL HTTPS e segredo, a tela continua consultável e a API bloqueia edições com 503. A permissão vem do papel atual consultado no banco em cada requisição, sem promover a Cris a admin ou alterar outras permissões.

## Contrato proposto: site → sistema

`POST CRM_RETURN_WEBHOOK_URL`, JSON UTF-8. Headers:

- `Content-Type: application/json`
- `X-CRM-Event-Id` e `Idempotency-Key`: UUID estável por alteração.
- `X-CRM-Signature`: HMAC-SHA256 hexadecimal dos bytes exatos do corpo, com `CRM_RETURN_WEBHOOK_SECRET`.

Exemplo abreviado de troca de vendedor:

```json
{
  "versao": 1,
  "evento": "crm.card.atualizado",
  "origem": "site_attra",
  "evento_id": "855242f4-7f20-4bd5-bd06-7f2bd7d2f418",
  "card_id": "id-original-recebido-no-webhook",
  "ocorrido_em": "2026-09-08T18:00:00.000Z",
  "base_atualizado_em": "2026-09-08T17:00:00.000Z",
  "autor": { "id": "id-da-cris", "nome": "Cris", "email": "conta-da-cris", "papel": "owner" },
  "anterior": { "vendedor": "Ana", "atribuido_em": null, "atualizado_em": "2026-09-08T17:00:00.000Z" },
  "alteracoes": { "vendedor": "João", "atribuido_em": "2026-09-08T18:00:00.000Z", "atualizado_em": "2026-09-08T18:00:00.000Z" }
}
```

`card_id` é o mesmo identificador recebido do sistema. `alteracoes` contém somente os campos alterados; ausente mantém e `null` limpa. Não reenvia nome/telefone do cliente nem o JSONB completo. O vendedor atualmente é identificado pelo nome, como no webhook de entrada; a interface sugere nomes dos cards e aceita digitação. Se o receptor exigir ID de vendedor, será necessário fornecer o catálogo e o mapeamento antes de ativar.

Movimentação manual produz:

| Coluna | etapa | fonte_evento | situacao |
| --- | --- | --- | --- |
| Aguardando aceite | novo | correcao_manual | aguardando_contato |
| Assumido | em_atendimento | correcao_manual | assumido |
| Movimentando | em_negociacao | movimentacao_manual | negociando |
| Ganho | encerrado_ganho | correcao_manual | ganho |
| Perdido | encerrado_perdido | correcao_manual | perdido |

Também atualiza `encerrado_em` (horário do encerramento ou null ao reabrir) e `motivo_encerramento` (motivo da perda ou null). Voltar para aguardando limpa `primeiro_contato_em` e reinicia `atribuido_em` quando existe vendedor. Assumir manualmente não inventa uma data de primeiro contato. Limpezas de atribuição/encerramento também invalidam os fallbacks legados locais em `dados.atribuido_em`, `dados.encerrado_em` e `dados.resultado`; o receptor deve invalidar seus equivalentes quando aplicar essas mudanças.

O receptor precisa:

1. Validar a assinatura antes de interpretar/processar o corpo.
2. Deduplicar por `evento_id` de forma transacional com a atualização de suas tabelas. Repetição já aplicada deve retornar 2xx sem repetir efeitos colaterais.
3. Aplicar o patch ao card original, respeitando `alteracoes.atualizado_em` para não retroceder o estado diante de eventos mais novos. Resolver conflitos com atualizações próprias usando `base_atualizado_em`; não sobrescrever silenciosamente eventos mais novos. Um evento obsoleto descartado deve ser registrado como processado e retornar 2xx.
4. Retornar **2xx somente depois de persistir/aplicar (ou deduplicar) o evento**. Qualquer 2xx é tratado pelo site como confirmação; não responder 200 com um erro no JSON. Erros de aplicação precisam retornar status não-2xx.
5. Se reenviar a alteração pelo webhook de entrada, preservar `atualizado_em`. Um eco com a mesma versão é ignorado pelo receptor do site. Webhooks recebidos não geram eventos de saída, evitando loops.

## Entrega e operação

Card e evento são salvos na mesma transação PostgreSQL. Se a criação do evento falha, o card também não muda. A edição exige a versão `atualizado_em` que a tela carregou; conflito retorna 409 sem salvar.

O site tenta enviar imediatamente após o commit. Erro HTTP, timeout de 8 segundos ou falha de conexão mantém o evento pendente e informa isso à Cris. O cron tenta novamente, com espera progressiva de 30 segundos até uma hora, sem descartar eventos. A consulta da tela mostra quantos retornos ainda estão pendentes e atualiza a cada 60 segundos. A fila processa até cinco eventos por chamada e mantém a ordem por card. Um retorno com erro permanente bloqueia os posteriores daquele card até corrigir o receptor/configuração; outros cards continuam sendo processados.

A entrega é **pelo menos uma vez**: se o receptor salva e a resposta se perde, ou o processo cai antes de marcar a entrega, o mesmo corpo e UUID serão reenviados. Isso exige idempotência no receptor. HTTP 2xx confirma o recebimento conforme esse contrato; o site não consulta diretamente as tabelas externas.

Auditoria local: `crm_eventos_saida` guarda corpo imutável (autor, antes/depois), tentativas, erro resumido e entrega. Não tem FK para o card: a remoção de um card não apaga a auditoria. O receptor deve ignorar com 2xx alterações obsoletas de um card removido, sem recriá-lo.

Consulta operacional (sem expor corpos):

```sql
SELECT id, card_id, tentativas, ultimo_erro, proxima_tentativa_em
FROM crm_eventos_saida
WHERE entregue_em IS NULL
ORDER BY sequencia;
```

Testes: `npm test` cobre validação/permissões e assinatura. `CRM_TEST_DATABASE_URL=postgresql://... npm test -- src/lib/db/__tests__/crm-edicao.integration.test.ts` executa cenários reais de persistência, rollback, conflitos e retries em schema temporário próprio, removido ao terminar.
