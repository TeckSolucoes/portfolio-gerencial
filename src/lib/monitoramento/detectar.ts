export interface PropostaMonit {
  data: string; // YYYY-MM-DD
  unidade: string; // promotora (Corban no Função) ou equipe (Front)
  convenio: string;
  valor: number;
  operador: string;
}

export type TipoAlerta = 'INÉDITO' | 'RARO' | 'PICO';

export interface Alerta {
  unidade: string;
  convenio: string;
  dia: string;
  tipos: TipoAlerta[];
  qtd: number;
  valor: number;
  historico: number;
  historicoConvenio: number;
  participacao: number; // % do convênio no histórico da unidade
  operadores: string[];
}

export interface Parametros {
  janelaDias: number;
  minHistorico: number;
  raroAbaixoDe: number;
  picoMultiplo: number;
  picoMinimoDia: number;
}

// picoMinimoDia evita que 1 ou 2 propostas num convênio de média quase zero virem "pico".
export const PADRAO: Parametros = { janelaDias: 90, minHistorico: 30, raroAbaixoDe: 0.02, picoMultiplo: 3, picoMinimoDia: 5 };

const DIA_MS = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS);

export function detectar(propostas: PropostaMonit[], p: Parametros = PADRAO): Alerta[] {
  const porUnidade = new Map<string, PropostaMonit[]>();
  for (const x of propostas) porUnidade.set(x.unidade, [...(porUnidade.get(x.unidade) ?? []), x]);

  const alertas: Alerta[] = [];
  for (const [unidade, ps] of porUnidade) {
    for (const dia of [...new Set(ps.map((x) => x.data))].sort()) {
      const historico = ps.filter((x) => x.data < dia && dias(x.data, dia) <= p.janelaDias);
      if (historico.length < p.minHistorico) continue;

      const porConvenio = new Map<string, number>();
      for (const x of historico) porConvenio.set(x.convenio, (porConvenio.get(x.convenio) ?? 0) + 1);
      const primeiro = historico.reduce((m, x) => (x.data < m ? x.data : m), historico[0].data);
      const diasDeHistorico = dias(primeiro, dia) || 1;

      const doDia = new Map<string, PropostaMonit[]>();
      for (const x of ps.filter((y) => y.data === dia)) doDia.set(x.convenio, [...(doDia.get(x.convenio) ?? []), x]);

      for (const [convenio, hoje] of doDia) {
        const visto = porConvenio.get(convenio) ?? 0;
        const tipos: TipoAlerta[] = [];
        if (visto === 0) tipos.push('INÉDITO');
        else if (visto / historico.length < p.raroAbaixoDe) tipos.push('RARO');
        if (visto > 0 && hoje.length >= p.picoMinimoDia && hoje.length > p.picoMultiplo * (visto / diasDeHistorico)) {
          tipos.push('PICO');
        }
        if (tipos.length === 0) continue;
        alertas.push({
          unidade,
          convenio,
          dia,
          tipos,
          qtd: hoje.length,
          valor: Math.round(hoje.reduce((s, x) => s + x.valor, 0) * 100) / 100,
          historico: historico.length,
          historicoConvenio: visto,
          participacao: Math.round((10000 * visto) / historico.length) / 100,
          operadores: [...new Set(hoje.map((x) => x.operador))].sort(),
        });
      }
    }
  }
  return alertas;
}

const peso = (a: Alerta) => (a.tipos.includes('INÉDITO') ? 2 : 0) + (a.tipos.includes('RARO') ? 1 : 0) + (a.tipos.includes('PICO') ? 1 : 0);

export const maisSuspeitos = (alertas: Alerta[], n = 10) =>
  [...alertas].sort((a, b) => peso(b) - peso(a) || b.valor - a.valor).slice(0, n);

export function porSemana(alertas: Alerta[]): { semana: string; INÉDITO: number; RARO: number; PICO: number }[] {
  const m = new Map<string, { semana: string; INÉDITO: number; RARO: number; PICO: number }>();
  for (const a of alertas) {
    const d = new Date(`${a.dia}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const semana = d.toISOString().slice(0, 10);
    const linha = m.get(semana) ?? { semana, INÉDITO: 0, RARO: 0, PICO: 0 };
    for (const t of a.tipos) linha[t] += 1;
    m.set(semana, linha);
  }
  return [...m.values()].sort((a, b) => a.semana.localeCompare(b.semana));
}
