// Parse e agregação PUROS (sem rede nem disco) da resposta de /servidores/por-orgao do Portal da
// Transparência federal. Só contagens: nenhum campo de pessoa existe neste endpoint.
export interface LinhaOrgao {
  pessoas: number;
  vinculos: number;
  situacao: string;
  tipoVinculo: string;
  tipoServidor: string;
  licenca: boolean;
  orgaoCod: string;
  orgao: string;
  orgaoSuperior: string;
}

export interface Contagem {
  chave: string;
  pessoas: number;
  vinculos: number;
}

export interface AgregadoFederal {
  geradoEm: string;
  linhas: number;
  // "pessoas" é a soma dos grupos da API: quem tem mais de um vínculo pode aparecer em mais de um.
  totalPessoas: number;
  totalVinculos: number;
  porOrgaoSuperior: Contagem[];
  porOrgao: (Contagem & { cod: string; superior: string })[];
  porTipoServidor: Contagem[];
  porSituacao: Contagem[];
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parseLinhasFederal(json: unknown): LinhaOrgao[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      pessoas: num(x.qntPessoas),
      vinculos: num(x.qntVinculos),
      situacao: txt(x.descSituacao),
      tipoVinculo: txt(x.descTipoVinculo),
      tipoServidor: txt(x.descTipoServidor),
      licenca: num(x.licenca) === 1,
      orgaoCod: txt(x.codOrgaoExercicioSiape),
      orgao: txt(x.nomOrgaoExercicioSiape),
      orgaoSuperior: txt(x.nomOrgaoSuperiorExercicioSiape),
    }));
}

const VAZIO = '(não informado)';

function somar(linhas: readonly LinhaOrgao[], chave: (l: LinhaOrgao) => string): Contagem[] {
  const m = new Map<string, Contagem>();
  for (const l of linhas) {
    const k = chave(l) || VAZIO;
    const atual = m.get(k) ?? { chave: k, pessoas: 0, vinculos: 0 };
    atual.pessoas += l.pessoas;
    atual.vinculos += l.vinculos;
    m.set(k, atual);
  }
  return [...m.values()].sort((a, b) => b.pessoas - a.pessoas || a.chave.localeCompare(b.chave));
}

export function agregarFederal(linhas: readonly LinhaOrgao[], agora = new Date()): AgregadoFederal {
  const orgaos = new Map<string, { cod: string; superior: string; nome: string; pessoas: number; vinculos: number }>();
  for (const l of linhas) {
    const k = `${l.orgaoCod}|${l.orgao}`;
    const atual = orgaos.get(k) ?? { cod: l.orgaoCod, superior: l.orgaoSuperior, nome: l.orgao || VAZIO, pessoas: 0, vinculos: 0 };
    atual.pessoas += l.pessoas;
    atual.vinculos += l.vinculos;
    orgaos.set(k, atual);
  }
  return {
    geradoEm: agora.toISOString(),
    linhas: linhas.length,
    totalPessoas: linhas.reduce((t, l) => t + l.pessoas, 0),
    totalVinculos: linhas.reduce((t, l) => t + l.vinculos, 0),
    porOrgaoSuperior: somar(linhas, (l) => l.orgaoSuperior),
    porOrgao: [...orgaos.values()]
      .map(({ nome, ...o }) => ({ chave: nome, ...o }))
      .sort((a, b) => b.pessoas - a.pessoas || a.chave.localeCompare(b.chave)),
    porTipoServidor: somar(linhas, (l) => l.tipoServidor),
    porSituacao: somar(linhas, (l) => l.situacao),
  };
}
