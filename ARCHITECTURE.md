# Arquitetura

## Estado atual

- Next.js 16 com App Router;
- Prisma 7 e SQLite persistido em volume;
- Front V2 como origem comercial;
- Função como origem operacional;
- Front V1 disponível para carteira;
- consultas externas somente leitura;
- relatório ainda consulta bases externas e mantém snapshot incremental.

## Arquitetura alvo do PRD-17

```text
Front V1 ─┐
Front V2 ─┼─> workers incrementais ─> fatos e eventos locais ─> resumos diários
Função ───┘                    │
                              ├─> conciliação e pendências
Estrutura Comercial ──────────┘
                                      │
                         Relatório / Em Atenção / WhatsApp
```

### Regras estruturais

- identificadores internos e aliases substituem filtros por nome;
- vínculos possuem vigência e não se sobrepõem;
- proposta guarda a fotografia comercial da criação;
- responsabilidade operacional atual é uma dimensão separada;
- contratado, integrado e liberado permanecem independentes;
- ingestão é idempotente e orientada por watermark;
- página lê o modelo local e não abre túnel SSH;
- divergência gera pendência em vez de correção silenciosa.

### Implantação

As migrações são aditivas. O novo cálculo roda em paralelo ao legado, com ativação progressiva por empresa. O rollback retorna a leitura ao caminho anterior sem apagar os dados novos.
