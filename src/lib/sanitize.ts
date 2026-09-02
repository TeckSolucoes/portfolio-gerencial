// Allow-list mínimo pro campo summaryHtml (plan §9): escapa tudo e "desescapa"
// só <strong>/</strong>, que é a única tag que FrontSummary renderiza via
// dangerouslySetInnerHTML. Sem lib externa — a superfície é pequena demais
// pra justificar uma dependência de sanitização HTML completa.
export function sanitizeSummaryHtml(input: string): string {
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/&lt;(\/?)strong&gt;/gi, '<$1strong>');
}
