import evidencia from '@/lib/monitoramento/evidencia.json';
import { maisSuspeitos, porSemana } from '@/lib/monitoramento/detectar';
import type { Alerta } from '@/lib/monitoramento/detectar';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (ymd: string) => ymd.split('-').reverse().join('/');

const TIPOS = {
  INÉDITO: {
    nome: 'Convênio novo para a equipe',
    curto: 'Convênio novo',
    explica: 'A equipe nunca tinha inserido proposta nesse convênio nos 90 dias anteriores.',
  },
  RARO: {
    nome: 'Convênio incomum',
    curto: 'Incomum',
    explica: 'A equipe já usou o convênio, mas ele representa menos de 2% de tudo o que ela insere.',
  },
  PICO: {
    nome: 'Volume acima do normal',
    curto: 'Volume alto',
    explica: 'No dia, a equipe inseriu mais de 3 vezes a média diária dela nesse convênio (mínimo de 5 propostas).',
  },
} as const;

export default function MonitoramentoPage() {
  const alertas = evidencia.alertas as Alerta[];
  const semanas = porSemana(alertas);
  const top = maisSuspeitos(alertas, 10);
  const total = (t: 'INÉDITO' | 'RARO' | 'PICO') => alertas.filter((a) => a.tipos.includes(t)).length;

  return (
    <div className="page">
      <div className="kicker">Monitoramento</div>
      <h1>Convênio fora do padrão</h1>
      <p className="lede">
        Alerta quando uma promotora insere proposta num convênio que ela não costuma vender. Prova de conceito sobre dados
        reais: {evidencia.fonte}, {evidencia.propostas.toLocaleString('pt-BR')} propostas, {evidencia.unidades} equipes. A
        unidade aqui é a equipe do Front; no Função será a promotora (Corban).
      </p>

      <div className="admin-stat-row">
        <div className="admin-stat">
          <span className="asv">{alertas.length}</span>
          <span className="asl">Alertas (1 por equipe, convênio e dia)</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{total('INÉDITO')}</span>
          <span className="asl">{TIPOS.INÉDITO.nome}</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{total('RARO')}</span>
          <span className="asl">{TIPOS.RARO.nome}</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{total('PICO')}</span>
          <span className="asl">{TIPOS.PICO.nome}</span>
        </div>
      </div>

      <h2 className="admin-section-title">O que cada alerta significa</h2>
      <table className="monit-tabela">
        <tbody>
          {(Object.keys(TIPOS) as (keyof typeof TIPOS)[]).map((t) => (
            <tr key={t}>
              <td>
                <b>{TIPOS[t].nome}</b>
              </td>
              <td>{TIPOS[t].explica}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="admin-section-title">Alertas por semana</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>Semana de</th>
            <th>{TIPOS.INÉDITO.curto}</th>
            <th>{TIPOS.RARO.curto}</th>
            <th>{TIPOS.PICO.curto}</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((s) => (
            <tr key={s.semana}>
              <td>{dataBr(s.semana)}</td>
              <td>{s.INÉDITO}</td>
              <td>{s.RARO}</td>
              <td>{s.PICO}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="admin-section-title">10 casos mais suspeitos</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>Dia</th>
            <th>Equipe</th>
            <th>Convênio</th>
            <th>Tipo</th>
            <th>Props</th>
            <th>Valor</th>
            <th>Já vendeu esse convênio antes</th>
          </tr>
        </thead>
        <tbody>
          {top.map((a) => (
            <tr key={`${a.unidade}|${a.convenio}|${a.dia}`}>
              <td>{dataBr(a.dia)}</td>
              <td>{a.unidade}</td>
              <td>{a.convenio}</td>
              <td>{a.tipos.map((t) => TIPOS[t].curto).join(' + ')}</td>
              <td>{a.qtd}</td>
              <td>{moeda(a.valor)}</td>
              <td>
                {a.historicoConvenio} de {a.historico} ({a.participacao.toLocaleString('pt-BR')}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="lede" style={{ marginTop: 24 }}>
        Regras: baseline móvel de até 90 dias antes de cada proposta; equipe com menos de 30 propostas de histórico não gera
        alerta; pico exige ao menos 5 propostas no dia. Sem CPF nem nome de cliente. O caso &quot;Quero Mais / Gov. PI&quot;
        não existe nesta base: ela não tem essa promotora, que só aparece no Função.
      </p>
    </div>
  );
}
