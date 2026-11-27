# Guia para desenvolver o backend do Gestão Vital

Este guia orienta a implementação de uma API segura para o fluxo de medicamentos e estoque e o fornecimento de dados verificáveis para a interface e o serviço de previsão. A linguagem e o framework continuam em aberto.

## Estado atual da integração Angular

O frontend já possui `HttpInventoryRepository`, autenticação Bearer, cadastro de medicamentos, movimentação por lote, recebimento atômico de novo lote, relatórios com paginação/filtros no servidor e consulta de previsões. Configure `useDemoData: false` em `frontend/src/environments/environment.ts` para selecionar esse adaptador durante desenvolvimento. O backend deve seguir `contrato-api.md`; ainda faltam endpoints para dashboard real, alertas e administração de usuários. Enquanto esses recursos não forem definidos e implementados, essas áreas não devem ser consideradas conectadas à API.

O código Angular separa infraestrutura compartilhada em `core`, a funcionalidade de estoque em `features/inventory`, páginas lazy-loaded com rotas, modelos de domínio, porta de aplicação e adaptadores HTTP/demonstração. Componentes de interface acessam a porta, não o `HttpClient` diretamente.

## 1. Decisões antes de iniciar

1. Confirmar se a primeira implantação atende um hospital ou vários hospitais, e como farmácias, almoxarifados e unidades se relacionam.
2. Escolher linguagem, framework, banco relacional, hospedagem e ferramenta de migração considerando experiência da equipe, suporte, segurança e implantação disponíveis.
3. Revisar o modelo da imagem `bancomodelo.png` com profissionais da farmácia. Ela não deve ser tratada como esquema validado.
4. Formalizar os perfis mínimos: farmácia/estoque e gestão. Definir quais operações cada perfil pode executar e auditar.
5. Publicar e versionar a especificação HTTP/JSON antes de conectar os componentes Angular. O ponto de partida é [contrato-api.md](./contrato-api.md).

## 2. Revisar o modelo de dados

O diagrama atual sugere pessoa, funcionário, medicamento, estoque/lote, movimentação, solicitação e análise de IA. Antes de criar tabelas definitivas:

- Definir entidades de hospital, unidade/depósito, usuário, perfil e vínculo de acesso. O desenho atual não mostra tenant/hospital nem credenciais.
- Definir medicamentos e apresentações/unidades com identificadores estáveis, e lotes com validade, local, quantidade e vínculo obrigatório ao medicamento e à unidade.
- Modelar movimentações como histórico imutável de entrada, saída, ajuste ou perda, com lote, quantidade, motivo, usuário, horário e referência. Atualização do saldo e gravação do histórico devem ocorrer na mesma transação.
- Explicitar as relações entre solicitação, itens solicitados, medicamento e usuário. No diagrama, as chaves de `solicitacao` e `item_solicitacao` parecem ambíguas; validar cardinalidade e direção antes de migrar.
- Não armazenar quantidade como texto. `analise_ia.quantidade_consumida` aparece como `VARCHAR`; definir valor numérico, unidade, período e origem dos dados.
- Separar previsões de movimentos reais. Guardar versão do método, período, data de geração, confiança/qualidade e indicadores de histórico suficiente.
- Revisar os dados pessoais de `pessoa` (incluindo CPF): armazenar somente o que os fluxos realmente exigirem e controlar acesso, retenção e auditoria.

Entregável desta etapa: diagrama revisado, dicionário de dados, regras de saldo e migrations iniciais versionadas.

## 3. Implementar a API por domínio

Uma organização adequada é por módulos de aplicação, sem amarrar a estrutura a uma linguagem específica:

1. **Identidade e acesso:** autenticação, sessão/token, perfis e escopo hospitalar/unidade. A autorização precisa acontecer no servidor em cada operação.
2. **Catálogo:** cadastrar, consultar e pesquisar medicamentos, apresentações, unidades e parâmetros de estoque mínimo.
3. **Estoque e lotes:** consultar saldo por local e lote, validade e alertas de estoque mínimo.
4. **Movimentações:** validar entrada/saída, saldo, lote e permissão; persistir movimento e saldo atomicamente; evitar duplicidade em reenvios.
5. **Solicitações e reposição:** registrar a necessidade identificada e o acompanhamento interno. A compra continua sendo feita pelo hospital; não criar integração de compra automática sem uma decisão de produto.
6. **Dashboard e relatórios:** agregar dados do domínio com filtros e paginação, respeitando o escopo de acesso.
7. **Previsões:** integrar o serviço analítico por contrato. Retornar horizonte, geração, método, confiança e suficiência do histórico; manter indisponibilidade analítica separada da operação de estoque.

Usar a versão inicial `/api/v1`, HTTPS, validação de entrada, respostas de erro consistentes e paginação nos resultados extensos. Regras e contratos detalhados devem evoluir em OpenAPI ou formato equivalente.

## 4. Regras e falhas que precisam ser tratadas

- Rejeitar saída maior que o saldo do lote dentro da transação; não permitir saldo negativo por concorrência.
- Definir política para lotes vencidos, ajustes, cancelamentos e correções. Não apagar movimentações auditáveis; criar estorno/correção rastreável.
- Usar idempotência para operações de escrita sujeitas a reenvio por timeout.
- Retornar códigos HTTP distintos para validação, autenticação, autorização, conflito de saldo e indisponibilidade.
- Se o serviço de previsão estiver indisponível ou sem dados, manter consulta e registro de estoque funcionando e informar a situação analítica sem inventar valores.
- Registrar ator, data, unidade e correlação nas operações relevantes; não incluir credenciais ou dados pessoais desnecessários nos logs.

## 5. Segurança, operação e validação

- Armazenar segredos fora do repositório; exigir HTTPS; configurar CORS apenas para origens autorizadas; limitar tentativas de autenticação e proteger endpoints contra abuso.
- Validar autorização por usuário e unidade em toda leitura e escrita. A tela Angular não é uma fronteira de segurança.
- Criar testes de regras de domínio, integração com o banco e contrato da API. Casos centrais: entrada válida, saída válida, saldo insuficiente, lote vencido conforme política, perfil sem permissão, repetição idempotente, concorrência de saídas e indisponibilidade do serviço analítico.
- Preparar migrations reversíveis quando possível, cópias de segurança, política de retenção, monitoramento de erros e procedimento de restauração.
- Documentar ambiente local, configuração, execução das migrations, carga de dados fictícios, execução e implantação.

## 6. Sequência recomendada

1. Refinar modelo e regras com usuários da farmácia e gestão.
2. Escolher stack e banco; criar projeto, configuração segura, migrations e dados de demonstração sem dados reais.
3. Implementar identidade e operações de leitura do catálogo/estoque.
4. Implementar movimentações transacionais e auditoria; validar os conflitos e a concorrência.
5. Publicar contratos OpenAPI e conectar o `HttpInventoryRepository` do Angular, substituindo o provider de demonstração.
6. Integrar dashboard, alertas e previsão quando as consultas e o histórico forem consistentes.
7. Fazer validação com usuários, segurança, backup e implantação controlada.

## Critério de conclusão do backend inicial

Um usuário autenticado consegue consultar medicamentos, lotes e alertas permitidos ao seu escopo; uma movimentação válida atualiza o saldo e fica auditável; entradas inválidas não alteram o estoque; respostas correspondem ao contrato publicado; e a falha de previsão não bloqueia o fluxo de estoque.
