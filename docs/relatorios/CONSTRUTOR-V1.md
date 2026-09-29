# Construtor de relatórios — primeira versão

## Objetivo

Permitir que um usuário autorizado monte uma visão selecionando campos já aprovados, sem escrever SQL. A V1 gera gráficos e tabelas em tela; exportação para Excel entra depois que os números ao vivo forem conciliados com o relatório atual.

## Fonte dos números

O Front V2 define quais propostas pertencem ao recorte comercial e traz data, responsáveis, produto, convênio e andamento. A Função confirma o desfecho e o valor liberado por `NumeroProposta`. O Front V1 não entra neste construtor: ele alimenta a Gestão de Carteira e a exclusão de quem já é cliente.

## Fluxo da tela

1. Escolher o período, com atalhos Hoje, Ontem, 7 dias e Mês atual.
2. Escolher uma dimensão, como hora, equipe, produto ou status.
3. Escolher uma métrica, como propostas, valor contratado ou valor liberado.
4. Escolher um gráfico compatível.
5. Ver a prévia e salvar a visão com um nome.

A interface lista somente itens de `src/lib/relatorio/construtor/catalogo.ts`. O servidor traduz os IDs para consultas fixas e parametrizadas.

## Gráficos da V1

- Indicador: um número e sua comparação com o período anterior.
- Linha: evolução por hora ou dia.
- Barras: ranking e distribuição por categoria.
- Rosca: composição com poucas categorias; agrupa o restante em “Outros”.
- Tabela: detalhamento agregado, sem CPF e sem nome de cliente.

As primeiras visões prontas são Propostas por hora, Valor contratado por hora, Funil por status da Função, Ranking de equipes e Valor liberado por dia.

## Campos iniciais

Tempo: hora e dia de cadastro. Dimensões: gerente, equipe, operador, convênio, produto, modalidade, status no Front, status na Função e esteira da Função. Métricas: quantidade distinta de propostas, valor contratado, valor liberado, ticket médio e taxa de integração.

## Regras

- O período máximo inicial é 92 dias.
- Consultas sempre usam data inicial e final.
- CPF, nome, telefone, endereço e documento ficam fora do catálogo.
- Um gráfico retorna no máximo 50 categorias; tabela pode paginar até 500 agregados.
- Valor liberado soma uma proposta uma vez, mesmo quando `releases` possui várias linhas.
- Acesso usa a permissão existente de Relatório Gerencial. Salvar e excluir visões fica restrito a superadmin e gerente; visualizador apenas abre visões compartilhadas.
- Divergências entre V2 e Função aparecem em um aviso de conciliação com quantidade e horário da atualização.

## Entregas

1. Catálogo fechado e modelos padrão.
2. Consulta agregada por hora/dia no Front V2.
3. Conciliação de status e valor com a Função.
4. Tela de seleção e prévia.
5. Persistência das visões e compartilhamento por perfil.
6. Exportação Excel das agregações aprovadas.

