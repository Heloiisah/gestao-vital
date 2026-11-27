# Contrato de integração da API Gestão Vital

Este contrato descreve as chamadas esperadas pelo adaptador HTTP Angular. A API ainda não existe neste repositório; linguagem e framework do backend ficam em aberto. Os exemplos usam dados fictícios.

## Convenções

- Base URL: `/api/v1`; transporte HTTPS e JSON UTF-8.
- Datas de registro em ISO 8601 com fuso; validade em `YYYY-MM-DD`.
- Filtros `de`/`ate` representam as datas civis do hospital/unidade autenticada, sem conversão para UTC antes de aplicar os limites.
- Listas podem ser retornadas diretamente como array ou envelopadas em `{ "itens": [...] }`.
- Rotas de domínio requerem `Authorization: Bearer <token>`. As rotas de sessão usam credenciais conforme sua definição abaixo.
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

Os nomes do objeto `usuario` são os nomes consumidos pelo cliente atual. Valores válidos para `role`: `farmacia` e `gestao`. O access token fica somente em memória no Angular; a sessão pode ser restaurada com o cookie de renovação descrito abaixo.

Além do corpo JSON, a resposta deve definir um cookie de renovação `HttpOnly`, `Secure`, `SameSite=Lax` e restrito ao caminho `/api/v1/auth`. O access token permanece apenas em memória no Angular. Se frontend e API estiverem em sites diferentes, use `SameSite=None; Secure`, CORS com origem explícita e credenciais habilitadas, além de proteção CSRF apropriada.

### Renovar sessão

`POST /auth/renovar` recebe o cookie de renovação e retorna o mesmo formato de `POST /auth/login` com um novo access token. Rotacione o cookie de renovação e invalide o anterior. O Angular chama esta rota ao iniciar a aplicação e repete uma chamada protegida uma vez após receber `401`.

### Encerrar sessão

`POST /auth/sair` revoga a sessão/cookie de renovação e limpa o cookie no cliente. A interface encerra a sessão local mesmo se a API estiver indisponível.

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

## Dashboard e alertas

### Resumo do dashboard

`GET /dashboard/resumo?dias=30` aceita os mesmos horizontes de 30, 90, 180 ou 365 dias. Retorna agregados calculados para o escopo do usuário autenticado:

```json
{
  "medicamentosCadastrados": 42,
  "unidadesEmEstoque": 18240,
  "estoqueAbaixoDoMinimo": 5,
  "lotesProximosDaValidade": 3,
  "consumoMensal": [
    { "mes": "Set", "unidades": 1230 },
    { "mes": "Out", "unidades": 1380 },
    { "mes": "Nov", "unidades": 1110 }
  ]
}
```

As contagens respeitam a unidade/hospital da sessão. `consumoMensal` deve ser ordenado cronologicamente e conter somente períodos completos dentro do horizonte selecionado. Sem histórico, retorne uma lista vazia.

### Alertas do estoque

`GET /alertas?limite=10` retorna alertas ativos, priorizados por severidade e data:

```json
{
  "itens": [{
    "id": "alt_123", "titulo": "Estoque crítico", "descricao": "Amoxicilina · 12 unidades",
    "severidade": "CRITICO", "medicamentoId": "med_123", "loteCodigo": null
  }]
}
```

`severidade` aceita `CRITICO`, `ATENCAO` ou `INFO`. Campos `medicamentoId` e `loteCodigo` podem ser nulos quando não se aplicarem. O cliente mostra apenas alertas retornados; geração, deduplicação e encerramento são responsabilidades do serviço.

## Administração de usuários

Estas rotas exigem perfil `gestao`; o servidor deve confirmar a permissão em cada chamada e restringir todos os resultados à unidade/hospital da sessão.

- `GET /usuarios?pagina=1&tamanho=100` lista `{ "itens": [...] }`, com `id`, `nome`, `email`, `papel` (`farmacia` ou `gestao`), `unidade` e `status` (`ATIVO`, `CONVITE_PENDENTE` ou `INATIVO`).
- `POST /usuarios` com `{ "email": "...", "papel": "farmacia", "unidade": "..." }` cria um convite e retorna `201`.
- `PATCH /usuarios/{id}` com `{ "papel": "gestao" }` altera o perfil.
- `PATCH /usuarios/{id}/status` com `{ "status": "INATIVO" }` desativa o acesso; `ATIVO` ativa um acesso ou aceita o convite conforme a política definida pelo backend.

O servidor deve impedir alterações que removam o último gestor da unidade e aplicar uma política para evitar que o usuário administrador se desative ou remova o próprio privilégio.

## Códigos de erro sugeridos

- `400` dados inválidos, `401` sessão ausente/expirada, `403` perfil sem permissão, `404` recurso inexistente, `409` conflito de saldo/lote/idempotência e `5xx` falha de serviço.
- Exemplo: `{ "erro": { "codigo": "SALDO_INSUFICIENTE", "mensagem": "O lote não possui quantidade suficiente.", "correlacaoId": "req_123" } }`.

## O que falta antes de produção

O contrato cobre os fluxos atualmente consumidos pelo Angular. Recuperação de senha, MFA, auditoria administrativa detalhada e regras finas por unidade ainda precisam ser decididos antes de produção. Em desenvolvimento, `environment.ts` usa adaptadores de demonstração; o build de produção seleciona adaptadores HTTP e `/api/v1`. Configure a hospedagem para encaminhar essa URL à API.
