# Gestão Vital · Front end

Aplicação Angular para os fluxos de estoque e consumo do Gestão Vital. A organização segue módulos por funcionalidade e uma porta de aplicação para manter a interface independente do backend.

## Executar

Requer Node.js e npm compatíveis com as versões descritas em `package.json`.

```bash
npm install
npm start
```

Compilar a aplicação:

```bash
npm run build
```

## Funcionalidades

- Catálogo, consulta de lotes/validade, histórico de movimentações e exportação CSV filtrável.
- Entrada e saída ligadas a lote, incluindo cadastro de lote recebido.
- Login e perfis; no modo demonstração, alternância local para visualizar restrições da interface.
- Consulta do serviço de previsões por horizonte, exibindo ausência de estimativa quando não há histórico suficiente.
- Adaptadores locais e HTTP para dados de estoque, com token Bearer enviado pelo interceptor.

O build de desenvolvimento seleciona `DemoInventoryRepository`; os registros são fictícios e vivem em memória. O build de produção troca para `environment.production.ts`, seleciona o adaptador HTTP e aponta para `/api/v1`. Para conectar, implemente [`../docs/contrato-api.md`](../docs/contrato-api.md) e encaminhe essa URL à API. A estrutura detalhada está em `src/app/core` e `src/app/features/inventory`.

O contrato atual ainda não cobre os dados reais do dashboard, serviço de alertas, paginação integral/exportação de relatórios ou administração de usuários. A interface os identifica como pendentes no modo API.
