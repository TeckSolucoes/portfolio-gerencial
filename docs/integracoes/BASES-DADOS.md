# Bases externas do Portal Teck

Mapeamento validado em 28/09/2026 pelo console do serviço no EasyPanel. Nenhuma senha, chave, CPF, nome de cliente ou amostra de linha deve ser registrada neste documento, nos logs ou no Git.

## Papel de cada base

| Base | Uso no portal | Fonte principal |
| --- | --- | --- |
| Função | Situação final da proposta, liberações e valor efetivamente liberado | `proposals`, `function_mat_information`, `releases` |
| Front V2 | Coorte comercial, responsáveis, equipe, produto, convênio e jornada no Front | `db-atendimento.atendimento_propostas` e views `v_andamento_propostas`, `v_contratos_gerados`, `v_propostas_integradas` |
| Front V1 | Base de clientes para a Gestão de Carteira identificar quem ainda não é cliente | `crm.tbcliente` |

O Relatório Gerencial deve partir da proposta do Front V2 e reconciliar a situação final na Função por `codigoPropostaExterna = NumeroProposta`. Contar linhas de `releases` como propostas duplica resultados; valores de liberação devem ser agregados por `NumeroProposta`.

## Validação encontrada

- Função: 2.362.475 propostas ativas no histórico; 17.379 cadastradas em setembro de 2026. Estados reais: `INT`, `AND`, `REP`, `CAN`, `PEN`, `LIB` e `APR`.
- Front V2: acesso por túnel SSH confirmado; cerca de 567 mil propostas em `db-atendimento.atendimento_propostas`. Em setembro de 2026 há estados `Integrado`, `Reprovado`, `Andamento`, `Pendente`, `Cancelado` e `Liberado`, além de registros ainda sem estado da Função.
- Front V1: `crm.tbcliente` possui 1.144.824 cadastros; todos têm documento e somente 23 não têm nome. A atualização mais recente observada foi em 28/09/2026.

Os totais de Função e Front V2 não devem coincidir diretamente: a Função contém o universo de propostas, enquanto o Front V2 define o recorte comercial que entra no relatório.

## Privacidade na Gestão de Carteira

O worker do Front V1 pode ler documento e nome durante o processamento, mas deve descartá-los imediatamente. No banco do Portal Teck deve permanecer somente a chave SHA-256 já usada por `src/lib/transparencia/clientesNovos.ts`: seis dígitos centrais do CPF mais o nome normalizado. A tela nunca deve exibir clientes da base V1; ela exibe somente pessoas acionáveis vindas da fonte pública e autorizada.

## Variáveis do EasyPanel

O código reconhece as variáveis já cadastradas:

- Função: `FUNCAO_DB_HOST`, `FUNCAO_DB_PORT`, `FUNCAO_DB_USER`, `FUNCAO_DB_PASSWORD`, `FUNCAO_DB_NAME`.
- Front V1: `FRONT_V1_DB_HOST`, `FRONT_V1_DB_PORT`, `FRONT_V1_DB_USER`, `FRONT_V1_DB_PASS`.
- Front V2: `FRONT_V2_DB_HOST`, `FRONT_V2_DB_PORT`, `FRONT_V2_DB_USER`, `FRONT_V2_DB_PASS`, `FRONT_V2_SSH_HOST`, `FRONT_V2_SSH_PORT`, `FRONT_V2_SSH_USER`, `FRONT_V2_SSH_PRIVATE_KEY_BASE64`.

Front V1 e Front V2 não precisam de `DB_NAME`: as consultas usam o schema qualificado. As credenciais continuam apenas no ambiente do EasyPanel.

## Regras de operação

- Somente consultas `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN` e `WITH` são aceitas pelo conector.
- Conexões têm timeout e são encerradas após cada consulta.
- O túnel SSH do V2 existe somente durante a consulta.
- Consultas do relatório devem sempre ter recorte de data e campos explícitos.
- A sincronização da carteira deve trabalhar em lotes e nunca registrar CPF ou nome nos logs.
- Uma divergência entre fontes deve aparecer como alerta de conciliação, sem corrigir números silenciosamente.

