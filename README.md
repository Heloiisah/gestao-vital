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

- Catálogo, consulta de lotes/validade e histórico de movimentações.
- Entrada e saída ligadas a lote; recebimento de lote novo cria o lote e movimenta o saldo atomicamente.
- Relatórios com filtros no servidor, paginação e exportação de todos os resultados filtrados.
- Rotas por página com carregamento lazy e navegação direta por URL.
- Login e perfis; no modo demonstração, alternância local para visualizar restrições da interface.
- Consulta do serviço de previsões por horizonte, exibindo ausência de estimativa quando não há histórico suficiente.
- Adaptadores locais e HTTP para dados de estoque, com token Bearer enviado pelo interceptor.

O build de desenvolvimento seleciona `DemoInventoryRepository`; os registros são fictícios e vivem em memória. O build de produção troca para `environment.production.ts`, seleciona o adaptador HTTP e aponta para `/api/v1`. Para conectar, implemente o [contrato da API](docs/contrato-api.md); o [guia de desenvolvimento do backend](docs/guia-backend.md) detalha a arquitetura e a sequência sugerida. A estrutura detalhada está em `src/app/core` e `src/app/features/inventory`.

O contrato ainda não cobre os dados reais do dashboard, serviço de alertas ou administração de usuários. A interface identifica essas áreas como pendentes no modo API.
