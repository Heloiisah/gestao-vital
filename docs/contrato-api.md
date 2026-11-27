# Contrato de integração da API Gestão Vital

Este contrato descreve as chamadas esperadas pelo adaptador HTTP Angular. A API ainda não existe neste repositório; linguagem e framework do backend ficam em aberto. Os exemplos usam dados fictícios.

## Convenções

- Base URL: `/api/v1`; transporte HTTPS e JSON UTF-8.
- Datas de registro em ISO 8601 com fuso; validade em `YYYY-MM-DD`.
- Filtros `de`/`ate` representam as datas civis do hospital/unidade autenticada, sem conversão para UTC antes de aplicar os limites.
- Listas podem ser retornadas diretamente como array ou envelopadas em `{ "itens": [...] }`.
- Toda rota, exceto login, requer `Authorization: Bearer <token>`.
- O escopo de hospital/unidade vem da sessão do usuário, nunca de um identificador livre confiado pelo cliente.
- Erros devem usar `{ "erro": { "codigo": "...", "mensagem": "...", "correlacaoId": "..." } }`.
- A autorização é obrigatória no backend em cada operação; ocultar botões no Angular não protege a API.

## Sessão

### Entrar

`POST /auth/login`

```json
{ "email": "maria@hospital.test", "senha": "..." }
```

Resposta `200`:

```json
{
  "accessToken": "token-opaco-ou-jwt",
  "usuario": {
    "id": "usr_123", "name": "Maria Silva", "email": "maria@hospital.test",
    "role": "farmacia", "hospital": "Hospital Vida Plena", "unit": "Unidade central"
  }
}
```

Os nomes do objeto `usuario` são os nomes consumidos pelo cliente atual. Valores válidos para `role`: `farmacia` e `gestao`. A estratégia de expiração e renovação do token deve ser definida pelo backend; atualmente o token fica somente em memória no Angular.

## Catálogo

### Listar medicamentos

`GET /medicamentos`

Resposta: lista, ou `{ "itens": [...] }` com este formato:

```json
{
  "id": "med_123", "nome": "Amoxicilina 500 mg", "principioAtivo": "Amoxicilina",
  "apresentacao": "Cápsula", "estoqueAtual": 82, "estoqueMinimo": 100, "unidade": "un."
}
```

### Cadastrar medicamento

`POST /medicamentos` com `{ "nome": "...", "principioAtivo": "...", "apresentacao": "...", "estoqueMinimo": 100 }`. Responder `201` com o medicamento criado, incluindo `id` e `unidade`.

## Lotes e estoque

### Listar lotes

`GET /estoque/lotes`

Cada item contém `id`, `medicamentoId`, `medicamento`, `codigo`, `validade`, `quantidade` e `localizacao`.

### Registrar recebimento de lote

`POST /estoque/lotes/recebimentos` cria o lote e registra a entrada inicial em uma única transação. Envie `Idempotency-Key` para evitar duplicidade em reenvios:

```json
{
  "medicamentoId": "med_123", "codigo": "AMX-26001", "validade": "2027-12-31",
  "localizacao": "Farmácia · A-03", "quantidade": 40, "motivo": "Reposição"
}
```

Responder `201` com o lote criado e a movimentação de entrada registrada. O backend deve validar validade, duplicidade do lote, permissão e quantidade antes de persistir qualquer alteração; falhas não podem deixar lote vazio ou saldo parcialmente atualizado.

Ao repetir o recebimento após falha de rede, o cliente reutiliza a chave de idempotência para o mesmo conteúdo; alterações na operação geram chave nova.

## Movimentações

### Registrar entrada ou saída

`POST /movimentacoes`

```http
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: 9c4a5db8-02e7-48f4-82e0-984b996d1af2
```

```json
{
  "medicamentoId": "med_123", "loteId": "lot_123", "tipo": "SAIDA",
  "quantidade": 12, "motivo": "Dispensação"
}
```

`tipo` aceita `ENTRADA` ou `SAIDA`; quantidade deve ser inteiro positivo. Responder `201` com o registro criado. O cliente reutiliza a chave de idempotência ao repetir o mesmo conteúdo após falha de rede; alterações na operação geram chave nova.

O servidor deve validar vínculo medicamento/lote, autorização, validade e saldo e gravar movimento e saldo na mesma transação. Uma saída inválida ou repetição idempotente não pode duplicar nem alterar o saldo indevidamente. Definir uma política explícita de lote vencido para entradas e saídas.

### Consultar histórico paginado

`GET /movimentacoes?pagina=1&tamanho=20&busca=...&tipo=SAIDA&de=2026-11-01&ate=2026-11-30`

`pagina` começa em 1; `tamanho` aceita de 1 a 100. `busca`, `tipo`, `de` e `ate` são filtros opcionais e devem ser aplicados no servidor antes da paginação. Responder com metadados e os itens da página:

```json
{
  "itens": [
    {
      "medicamento": "Dipirona 500 mg/mL", "tipo": "SAIDA", "quantidade": 24,
      "registradoEm": "2026-11-27T12:42:00Z", "registradoPor": { "nome": "Ana Costa" },
      "lote": "DIP-25031", "motivo": "Dispensação"
    }
  ],
  "pagina": 1, "tamanho": 20, "totalItens": 124, "totalPaginas": 7
}
```

O relatório Angular navega as páginas usando esses metadados. A exportação busca todas as páginas com os mesmos filtros antes de gerar o CSV. Ordene por registro decrescente e use uma ordenação estável para que a paginação não repita ou omita movimentações.

## Previsões

`GET /previsoes/consumo?dias=30` — `dias` pode ser 30, 90, 180 ou 365. Cada item:

```json
{
  "medicamentoId": "med_123", "medicamento": "Soro fisiológico 0,9%",
  "geradoEm": "2026-11-27T12:00:00Z", "horizonteDias": 30,
  "consumoPrevisto": null, "unidade": "unidades", "confianca": null,
  "dadosSuficientes": false, "metodo": null, "observacao": "Histórico insuficiente."
}
```

Sem dados suficientes, retorne `consumoPrevisto: null`, `dadosSuficientes: false` e explique a limitação. Indisponibilidade analítica não deve impedir consultas nem movimentações de estoque; o adaptador pode sinalizar erro de previsão separadamente.

## Códigos de erro sugeridos

- `400` dados inválidos, `401` sessão ausente/expirada, `403` perfil sem permissão, `404` recurso inexistente, `409` conflito de saldo/lote/idempotência e `5xx` falha de serviço.
- Exemplo: `{ "erro": { "codigo": "SALDO_INSUFICIENTE", "mensagem": "O lote não possui quantidade suficiente.", "correlacaoId": "req_123" } }`.

## O que falta antes de produção

O contrato inicial ainda não inclui resumo de dashboard, alertas consultáveis, reset/renovação de sessão ou administração de usuários. Definir esses recursos com a equipe antes de conectá-los a uma API de produção. Em desenvolvimento, `environment.ts` usa `DemoInventoryRepository`; o build de produção troca automaticamente para `environment.production.ts`, que seleciona o adaptador HTTP e `/api/v1`. Implemente o contrato acima no backend e configure a hospedagem para encaminhar essa URL à API.
