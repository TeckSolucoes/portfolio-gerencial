export function tempoRelativo(data: Date | null, agora: Date = new Date()): string {
  if (!data) return '';
  const min = Math.floor((agora.getTime() - data.getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}

export function dataExtenso(d: Date): string {
  const txt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
