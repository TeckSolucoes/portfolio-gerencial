# Estado atual

**Projeto:** Portal Teck
**Etapa atual:** implementação do PRD-17
**Status:** em andamento
**Atualizado em:** 06/10/2026

## Última ação concluída

Implementados cadastro comercial, vínculos, interface, associação do usuário por ID e distinção contratado/liberado. Gate UX aprovado após correções; autorização privilegiada consulta o papel atual no banco. Revisão de dados encontrou bloqueadores e as correções estão em execução.

## Em andamento

- conclusão da atribuição histórica e regressões do snapshot;
- eliminação de datas de integração inferidas;
- conciliação de nomes em rotina separada da leitura;
- testes independentes de transações e isolamento.

## Próximas ações

- consolidar correções e repetir testes/build;
- registrar limitações e plano de homologação;
- abrir PR revisável sem promover a produção enquanto faltarem gates.

## Bloqueios

- deploy depende de confirmação do usuário e backup prévio do volume;
- corte dos novos números depende de comparação com amostra real homologada.
- ranking por integração pode omitir propostas criadas antes dos 32 dias; cobertura completa exige fonte temporal validada.

## Decisões pendentes

- fonte responsável pela manutenção da hierarquia;
- regra definitiva de identificação da DIG;
- uso financeiro do valor liberado após validação das releases;
- limiar mínimo de cobertura para envio automático.

## Agentes ativos

- Orquestrador;
- Back-end/Dados;
- Front-end/UX;
- QA/Segurança.

**Próxima etapa:** concluir correções dos gates e abrir PR para revisão, com pendências de homologação explícitas.
