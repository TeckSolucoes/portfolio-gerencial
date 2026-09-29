// Cache em memória com dedupe de chamadas simultâneas: duas chamadas para a mesma chave, feitas
// antes da primeira terminar, dividem a MESMA promessa em vez de disparar o cálculo duas vezes.
// Usado para consultas caras (bases externas ao vivo, fontes de terceiros): o container é de vida
// longa, então guardar aqui evita repetir uma consulta lenta a cada requisição.
export interface CacheMemoria<T> {
  obter(chave: string, ttlMs: number, calcular: () => Promise<T>): Promise<T>;
  invalidar(chave: string): void;
}

export function criarCache<T>(agora: () => number = Date.now): CacheMemoria<T> {
  const prontos = new Map<string, { em: number; valor: T }>();
  const emAndamento = new Map<string, Promise<T>>();

  return {
    async obter(chave, ttlMs, calcular) {
      const guardado = prontos.get(chave);
      if (guardado && agora() - guardado.em < ttlMs) return guardado.valor;

      const pendente = emAndamento.get(chave);
      if (pendente) return pendente;

      const promessa = calcular();
      emAndamento.set(chave, promessa);
      try {
        const valor = await promessa;
        prontos.set(chave, { em: agora(), valor });
        return valor;
      } finally {
        emAndamento.delete(chave);
      }
    },
    invalidar(chave) {
      prontos.delete(chave);
    },
  };
}
