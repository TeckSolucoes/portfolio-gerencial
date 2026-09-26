// Roda uma vez quando o servidor Next sobe. Liga o agendador dos workers (src/lib/workers).
// Não espera nada: o register precisa terminar antes de o servidor atender requisições.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { iniciarAgendador } = await import('./lib/workers/motor');
  iniciarAgendador();
}
