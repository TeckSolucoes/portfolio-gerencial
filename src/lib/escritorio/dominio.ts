export const TTL_PRESENCA = 90_000;
export function autorizarEscritorio(perfil: string, permitido: boolean) {
  if (perfil !== 'superadmin' || !permitido) throw new Error('Acesso restrito ao escritório.');
}
export function validarMensagem(texto: unknown): string {
  if (typeof texto !== 'string' || !texto.trim() || texto.trim().length > 1000) throw new Error('Escreva uma mensagem de até 1.000 caracteres.');
  return texto.trim();
}
export function estaOnline(vistoEm: Date, agora = new Date()) {
  return vistoEm.getTime() > agora.getTime() - TTL_PRESENCA;
}
export function validarSessao(id: unknown): string {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{20,64}$/.test(id)) throw new Error('Sessão inválida. Recarregue a página.');
  return id;
}
export type Sala = { id: string; nome: string; empresa: string; pessoas: string[] };
export type EstadoEscritorio = { presencas: { userId: string; nome: string; sala: string }[]; mensagens: { id: string; nome: string; texto: string; criadoEm: string }[] };
