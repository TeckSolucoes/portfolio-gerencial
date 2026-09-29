---
name: Portal Teck
description: Radar executivo para decisões rápidas, confiáveis e acionáveis.
colors:
  space-deep: "#0b0a12"
  space-raised: "#0e0c17"
  panel: "#15121f"
  panel-active: "#1a1728"
  border-subtle: "#2a2438"
  border-strong: "#3a324e"
  text-primary: "#ece8f5"
  text-secondary: "#a79fbd"
  text-muted: "#655d7a"
  signal-violet: "#9b7bf0"
  signal-violet-bright: "#b79cf5"
  alert-ember: "#e8815f"
  success: "#5fbf8f"
  attention: "#e0a659"
  critical: "#e0524f"
  system-teal: "#4fb6c4"
  system-rose: "#e8749b"
  system-sky: "#5b9fe8"
typography:
  display:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "clamp(22px, 2.4vw, 28px)"
    fontWeight: 600
    lineHeight: 1.18
  title:
    fontFamily: "Unbounded, Arial Black, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Fragment Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "1px"
rounded:
  control: "10px"
  field: "11px"
  surface: "12px"
  card: "14px"
  feature: "20px"
  pill: "100px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-violet}"
    textColor: "{colors.space-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.panel-active}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  field:
    backgroundColor: "{colors.panel-active}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "45px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "14px 18px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "8px 11px"
    height: "40px"
---

# Design System: Portal Teck

## Overview

**Creative North Star: "Radar de Decisões"**

O Portal Teck funciona como um radar executivo: a base escura reduz distrações, enquanto sinais coloridos tornam estados, exceções e próximos passos reconhecíveis à primeira vista. A interface deve parecer tecnológica e operacional, com informação densa o suficiente para gestão sem transformar cada tela em uma lista cansativa.

Os componentes são táteis e marcantes. Bordas, faixas de estado, mudanças de superfície e respostas curtas ao toque deixam claro o que pode ser acionado. Essa presença deve continuar compacta: destaque vem da hierarquia e do contraste, não de cartões altos, cabeçalhos grandes ou espaços vazios.

**Key Characteristics:**

- Fundo profundo com superfícies discretamente elevadas.
- Violeta reservado para navegação, foco e ações prioritárias.
- Estados operacionais comunicados por cor, texto e forma.
- Componentes compactos, responsivos e claramente acionáveis.
- Logo orbital da Teck preservado, com movimento reduzido quando solicitado pelo sistema.

## Colors

A paleta combina uma base espacial escura com sinais luminosos, como pontos de leitura em um painel de monitoramento.

### Primary

- **Violeta de Sinal:** ação principal, foco, navegação ativa e indicação de prioridade.
- **Violeta de Órbita:** texto e ícones de destaque sobre superfícies escuras.

### Secondary

- **Brasa de Alerta:** ponto orbital da marca e detalhes que pedem atenção sem representar erro.
- **Verde Operacional:** sucesso, disponibilidade e atualização normal.
- **Âmbar de Atenção:** pendências e estados que exigem acompanhamento.
- **Vermelho Crítico:** erro, bloqueio e ações destrutivas.

### Tertiary

- **Turquesa de Sistema, Rosa de Contexto e Azul de Informação:** distinguem grupos, fontes e categorias sem competir com a ação principal.

### Neutral

- **Espaço Profundo e Espaço Elevado:** fundo geral e navegação fixa.
- **Painel e Painel Ativo:** cartões, campos e estados interativos.
- **Texto Primário, Secundário e Silencioso:** três níveis consistentes de leitura.
- **Borda Sutil e Borda Forte:** separação estrutural e resposta interativa.

**The Signal Discipline Rule.** O violeta indica ação, seleção ou foco; ele não deve preencher grandes áreas sem função.

## Typography

**Display Font:** Unbounded (com Arial Black e sans-serif como fallback)  
**Body Font:** Manrope (com system-ui e sans-serif como fallback)  
**Label/Mono Font:** Fragment Mono (com ui-monospace e monospace como fallback)

**Character:** Unbounded dá identidade tecnológica aos títulos, Manrope mantém leitura rápida e Fragment Mono organiza metadados e estados como instrumentos de um painel operacional.

### Hierarchy

- **Display:** títulos principais responsivos, com peso 600 e altura de linha curta.
- **Headline:** títulos de detalhe e números executivos; usados apenas quando precisam comandar a leitura.
- **Title:** nomes de cartões e itens, compactos e fortes.
- **Body:** explicações, resumos e conteúdo de apoio, com largura de leitura limitada a aproximadamente 90 caracteres quando possível.
- **Label:** filtros, estados, datas e metadados; espaçamento aberto e caixa alta apenas em rótulos curtos.

**The Compact Authority Rule.** Hierarquia vem de peso, família e contraste antes de tamanho; títulos não devem empurrar os dados relevantes para baixo.

## Layout

O conteúdo ocupa a largura disponível ao lado do menu. No desktop, a barra superior tem 64px, o menu recolhido tem 60px e o menu expandido tem 220px. O conteúdo usa margens fluidas pequenas e não recebe um limite central estreito.

Grades usam colunas automáticas com largura mínima suficiente para leitura. Listas operacionais priorizam linhas compactas; conjuntos de entidades que exigem comparação ou notificação usam cartões alinhados. Cabeçalhos de abertura têm pouca altura e conduzem rapidamente ao conteúdo.

Abaixo de 768px, o menu lateral vira diálogo pela esquerda, controles interativos ganham pelo menos 40px de altura e o conteúdo recebe margens de 14px. Abaixo de 640px, grades e grupos se reorganizam sem rolagem horizontal.

**The Full Working Canvas Rule.** Telas de gestão usam toda a área útil; não centralize o conteúdo em uma coluna estreita.

## Elevation & Depth

O sistema combina camadas tonais e sombras concentradas. Cartões permanecem próximos ao fundo e ganham presença por borda; menus, diálogos e ações prioritárias usam sombras para indicar sobreposição ou resposta ao toque. O fundo global permanece leve, com apenas um gradiente violeta sutil.

### Shadow Vocabulary

- **Barra Flutuante:** sombra curta e discreta sob o cabeçalho fixo.
- **Ação Iluminada:** brilho violeta controlado em botões principais.
- **Painel Sobreposto:** sombra ampla para diálogo móvel e cartões de autenticação.
- **Dica de Navegação:** sombra média para rótulos exibidos pelo menu recolhido.

**The Weight with Purpose Rule.** Sombras indicam interação ou sobreposição; não escurecem o fundo inteiro nem substituem hierarquia.

## Shapes

Controles usam cantos de 10px a 11px; cartões e superfícies usam 12px a 14px; painéis de destaque podem chegar a 20px. Filtros, estados e botões compactos são cápsulas. Faixas verticais de 3px a 4px funcionam como faróis de estado nos cartões.

Círculos ficam reservados a avatares, pontos de estado e à marca orbital. Bordas finas definem superfícies e ficam mais fortes no hover ou foco.

## Components

### Buttons

- **Shape:** cápsula para ações compactas e canto médio para ações largas de formulário.
- **Primary:** violeta sólido, texto escuro e peso forte.
- **Hover / Focus:** brilho curto, borda ou anel violeta e deslocamento máximo de 1px.
- **Secondary / Ghost / Danger:** superfície elevada, contorno visível e cor semântica correspondente.

### Chips

- **Style:** cápsulas compactas com fonte mono; fundo tonal e texto semântico.
- **State:** seleção combina borda, fundo e texto; status sempre inclui texto ou ponto, nunca depende somente da cor.

### Cards / Containers

- **Corner Style:** cantos médios, geralmente de 12px a 14px.
- **Background:** painel escuro sobre a base profunda.
- **Shadow Strategy:** borda em repouso; sombra apenas quando há sobreposição ou ação destacada.
- **Border:** sutil no repouso e forte no hover.
- **Internal Padding:** compacto, normalmente entre 14px e 18px.

### Inputs / Fields

- **Style:** painel ativo, borda sutil, canto de 11px e altura mínima de 45px.
- **Focus:** borda violeta e anel translúcido visível.
- **Error / Disabled:** vermelho crítico para erro; redução de contraste e cursor coerente para indisponibilidade.

### Navigation

O menu lateral inicia recolhido, mantém ícones de 18px e revela rótulos sem criar rolagem visível. A rota ativa usa fundo violeta translúcido, texto claro e faixa interna à esquerda. No celular, o menu abre como diálogo com fundo inerte, fechamento acessível e devolução de foco.

### Brand Mark

O logo orbital existente é o ativo oficial. O núcleo luminoso permanece fixo enquanto a órbita gira lentamente; com redução de movimento ativada, a animação é removida.

## Do's and Don'ts

### Do:

- **Do** usar a largura disponível para dashboards e listas gerenciais.
- **Do** manter cartões compactos, alinhados e comparáveis dentro de cada grupo.
- **Do** combinar cor com texto, ícone, ponto ou faixa para comunicar estado.
- **Do** preservar foco visível, navegação por teclado e alvos adequados no celular.
- **Do** manter o NOC como o último item da navegação principal.

### Don't:

- **Don't** centralizar as informações em uma coluna estreita ou deixar buracos grandes na grade.
- **Don't** usar cabeçalhos, ícones ou cartões maiores que o conteúdo que representam.
- **Don't** carregar o fundo com texturas, brilhos ou animações concorrentes.
- **Don't** esconder ações importantes em cantos sem contraste ou rótulo acessível.
- **Don't** alterar ou substituir o logo orbital da Teck.
