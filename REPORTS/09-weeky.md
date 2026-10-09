# Weeky executivo — 09/10/2026

Projeto: Portal Teck. Etapa: implementação e revisão local. Status: PARTIAL.

Resultado: nova aba Weeky com janela móvel de sete dias incluindo hoje em São Paulo, comparação anterior, evolução de vendas, mix de produtos, principais equipes e pontos de atenção. Valor apresentado é contratado; integrações respeitam sua data e cobertura do snapshot.

Arquitetura: leitura exclusiva do snapshot v3 local; sem novo endpoint, dependência, migration ou consulta externa. Fonte comercial mantém nomes do Front. Autorização por relatório, empresa e visão Geral antes da leitura.

Qualidade: 28 testes de Weeky, snapshot e permissões aprovados; build Next aprovado; revisão independente sem bloqueadores de dados ou autorização. Ajustes de responsividade e aviso de referência anterior ao dia atual aplicados. Lint corrigido pela transferência do cálculo de idade para o loader.

Pendências: homologação visual desktop/celular e conciliação numérica em ambiente autorizado. Não houve publicação. Sem snapshot, a tela informa ausência; referência defasada é sinalizada. Integrações antigas fora da extração podem não estar presentes.

Decisão: DEC-013; plano WEEKY-01. Handoff: branch feat/weeky-executivo. Próxima etapa: homologar e abrir PR quando solicitado. Rollback por reversão do código, sem alteração de banco.
