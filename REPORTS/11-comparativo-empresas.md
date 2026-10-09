# COMP-01 — Comparativo AKRK × DIG
Data: 09/10/2026.
Status: PARTIAL — código e gates locais concluídos; homologação real e implantação pendentes.

Comparação de vendas contratadas na Home, relatório Geral e Weeky, com liderança por valor, quantidade, participação e atualização. Usa somente snapshots persistidos, preservando regras e indicadores existentes. O diário usa referência selecionada; Home hoje; Weeky sete dias. Propostas inválidas são descartadas pela mesma regra do diário.

Execução paralela: dados/testes, UI/CSS e integração separados. Gates independentes corrigiram três HIGH: valor negativo, CPF inválido inflando liderança e data impossível quebrando renderização.

Qualidade: 60 testes e lint aprovados; TypeScript e build aprovados. Prévia real com fixtures conferida em desktop, mudança de líder e DOM móvel sem overflow. Captura móvel falhou; homologação visual no portal publicado permanece pendente.

Segurança: componente exige Relatório/Geral e acesso AKRK e DIG. Sem novas consultas externas, timers, dependências ou migrações. Cache faltante ou incoerente não simula valores zero nem liderança.

Limites: KPIs anteriores do Weeky preservados; podem diferir se incluírem CPF inválido. Comparativo sinaliza propostas válidas. Produção não foi alterada nesta entrega.

Handoff: revisar PR, homologar snapshots reais, aprovar implantação. Rollback: reverter commit da feature; sem mudança de dados persistidos.
