'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tempoRelativo } from '@/lib/tempo';
import { INTERVALO_MAX, INTERVALO_MIN, intervaloValido, type EstadoWorker, type GrupoWorker } from '@/lib/workers/tipos';
import { alternarAtivo, executarAgora, mudarIntervalo, type ResultadoAcao } from './actions';
import './workers.css';

const POLL_MS = 4000;
const GRUPOS: GrupoWorker[] = ['Notícias', 'Mercado', 'Diário Oficial', 'Transparência'];
const PRESETS: { min: number; rotulo: string }[] = [
  { min: 5, rotulo: '5 min' },
  { min: 15, rotulo: '15 min' },
  { min: 30, rotulo: '30 min' },
  { min: 60, rotulo: '1 h' },
  { min: 180, rotulo: '3 h' },
  { min: 720, rotulo: '12 h' },
  { min: 1440, rotulo: '24 h' },
];

type Situacao = 'rodando' | 'pendente' | 'pausado' | 'erro' | 'ok' | 'nunca';
const ROTULO_SITUACAO: Record<Situacao, string> = {
  rodando: 'Rodando',
  pendente: 'Aguardando configuração',
  pausado: 'Pausado',
  erro: 'Erro',
  ok: 'OK',
  nunca: 'Nunca rodou',
};

function situacaoDe(w: EstadoWorker): Situacao {
  if (w.rodando) return 'rodando';
  if (w.pendencia) return 'pendente';
  if (!w.ativo) return 'pausado';
  if (!w.ultima) return 'nunca';
  return w.ultima.status === 'erro' ? 'erro' : 'ok';
}

const fmtMin = (min: number) => {
  if (min % 1440 === 0) return `${min / 1440} d`;
  if (min % 60 === 0) return `${min / 60} h`;
  if (min > 60) return `${Math.floor(min / 60)} h ${min % 60} min`;
  return `${min} min`;
};

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo',
});

function fmtDuracao(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s % 60)} s`;
}

function contagem(ateMs: number) {
  const s = Math.ceil(ateMs / 1000);
  if (s <= 0) return 'agora';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h > 0) return `em ${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `em ${m} min ${String(seg).padStart(2, '0')} s`;
  return `em ${seg} s`;
}

interface Aviso {
  id: number;
  tipo: 'ok' | 'erro';
  texto: string;
}

type RodarAcao = (chave: string, fn: () => Promise<ResultadoAcao>, sucesso: string) => Promise<void>;

export function Painel({ inicial, agoraInicial }: { inicial: EstadoWorker[]; agoraInicial: string }) {
  const [workers, setWorkers] = useState(inicial);
  const [agoraMs, setAgoraMs] = useState(() => Date.parse(agoraInicial));
  const [atualizadoEm, setAtualizadoEm] = useState<number>(() => Date.parse(agoraInicial));
  const [falha, setFalha] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(true);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  // Diferença entre o relógio do servidor e o do navegador, pra contagem regressiva não depender do fuso/relógio local.
  const deslocamento = useRef(Date.parse(agoraInicial) - Date.now());
  const emVoo = useRef(false);
  const seq = useRef(0);

  const atualizar = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      const r = await fetch('/api/workers/status', { cache: 'no-store' });
      if (r.status === 401) {
        setFalha('Sessão expirada. Entre novamente para continuar acompanhando.');
        return;
      }
      if (r.status === 403) {
        setFalha('Sem permissão: esta tela é restrita a superadmin.');
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const dados: { agora: string; workers: EstadoWorker[] } = await r.json();
      deslocamento.current = Date.parse(dados.agora) - Date.now();
      setWorkers(dados.workers);
      setAtualizadoEm(Date.parse(dados.agora));
      setFalha(null);
    } catch {
      setFalha('Sem conexão com o servidor. Mostrando o último estado recebido; tentando de novo.');
    } finally {
      emVoo.current = false;
    }
  }, []);

  useEffect(() => {
    const onVis = () => setVisivel(document.visibilityState === 'visible');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!visivel) return;
    atualizar();
    const t = setInterval(atualizar, POLL_MS);
    return () => clearInterval(t);
  }, [visivel, atualizar]);

  useEffect(() => {
    if (!visivel) return;
    const t = setInterval(() => setAgoraMs(Date.now() + deslocamento.current), 1000);
    return () => clearInterval(t);
  }, [visivel]);

  const avisar = useCallback((tipo: Aviso['tipo'], texto: string) => {
    const id = ++seq.current;
    setAvisos((a) => [...a.slice(-2), { id, tipo, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'erro' ? 9000 : 5000);
  }, []);

  const rodarAcao = useCallback<RodarAcao>(
    async (chave, fn, sucesso) => {
      setOcupados((s) => new Set(s).add(chave));
      try {
        const r = await fn();
        if (r.ok) avisar('ok', r.aviso ?? sucesso);
        else avisar('erro', r.erro);
      } catch {
        avisar('erro', 'Não foi possível concluir a ação. Verifique a conexão e tente de novo.');
      } finally {
        setOcupados((s) => {
          const n = new Set(s);
          n.delete(chave);
          return n;
        });
        await atualizar();
      }
    },
    [avisar, atualizar],
  );

  const kpis = useMemo(() => {
    let rodando = 0, ok = 0, erro = 0, parados = 0;
    for (const w of workers) {
      const s = situacaoDe(w);
      if (s === 'rodando') rodando++;
      else if (s === 'pendente' || s === 'pausado') parados++;
      else if (s === 'erro') erro++;
      else if (s === 'ok') ok++;
    }
    return { total: workers.length, rodando, ok, erro, parados };
  }, [workers]);

  const porGrupo = GRUPOS.map((g) => ({ grupo: g, itens: workers.filter((w) => w.grupo === g) })).filter((g) => g.itens.length > 0);
  const agora = new Date(agoraMs);

  return (
    <div className="workers">
      <header className="w-cab">
        <div>
          <div className="w-kicker">Operação · Superadmin</div>
          <h1>Workers de coleta</h1>
          <p className="w-sub">
            Coletas agendadas de notícias, mercado, diários oficiais e transparência. Código determinístico, sem IA e sem custo por execução.
          </p>
        </div>
        <div className={`w-live${falha ? ' w-live-off' : ''}${visivel ? '' : ' w-live-pausa'}`} role="status">
          <span className="w-live-dot" aria-hidden="true" />
          <span>
            {falha ? 'sem atualização' : visivel ? 'ao vivo' : 'em pausa (aba oculta)'} · atualizado às {fmtHora.format(atualizadoEm)}
          </span>
        </div>
      </header>

      {falha && (
        <p className="w-falha" role="alert">
          {falha}
        </p>
      )}

      <dl className="w-kpis">
        <Kpi rotulo="Workers" valor={kpis.total} tom="total" />
        <Kpi rotulo="Rodando agora" valor={kpis.rodando} tom="rodando" />
        <Kpi rotulo="Última execução OK" valor={kpis.ok} tom="ok" />
        <Kpi rotulo="Com erro" valor={kpis.erro} tom="erro" />
        <Kpi rotulo="Pausados ou aguardando" valor={kpis.parados} tom="pausado" />
      </dl>

      {porGrupo.map(({ grupo, itens }) => (
        <section key={grupo} className="w-grupo" aria-labelledby={`g-${grupo}`}>
          <h2 id={`g-${grupo}`}>
            {grupo} <span>{itens.length}</span>
          </h2>
          <ul className="w-lista">
            {itens.map((w) => (
              <Linha key={w.id} w={w} agora={agora} ocupados={ocupados} rodarAcao={rodarAcao} />
            ))}
          </ul>
        </section>
      ))}

      {workers.length === 0 && <p className="w-vazio">Nenhum worker cadastrado.</p>}

      <div className="w-avisos" aria-live="polite" aria-atomic="false">
        {avisos.map((a) => (
          <p key={a.id} className={`w-aviso w-aviso-${a.tipo}`}>
            {a.texto}
          </p>
        ))}
      </div>
    </div>
  );
}

function Kpi({ rotulo, valor, tom }: { rotulo: string; valor: number; tom: string }) {
  return (
    <div className={`w-kpi t-${tom}`}>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Linha({ w, agora, ocupados, rodarAcao }: { w: EstadoWorker; agora: Date; ocupados: Set<string>; rodarAcao: RodarAcao }) {
  const sit = situacaoDe(w);
  const u = w.ultima;
  const inicio = u ? new Date(u.iniciadoEm) : null;
  const ocRun = ocupados.has(`${w.id}:run`);
  const ocAtivo = ocupados.has(`${w.id}:ativo`);
  const ocInt = ocupados.has(`${w.id}:int`);

  let proxima = '—';
  if (w.rodando) proxima = 'em execução';
  else if (w.pendencia) proxima = 'aguardando configuração';
  else if (!w.ativo) proxima = 'pausado';
  else if (w.proximaEm) proxima = contagem(Date.parse(w.proximaEm) - agora.getTime());

  const noPreset = PRESETS.some((p) => p.min === w.intervaloMin);
  const padrao = w.intervaloMin === w.intervaloPadraoMin;
  const valorSelect = padrao ? 'padrao' : String(w.intervaloMin);

  const onIntervalo = (v: string) => {
    if (v === 'padrao') return rodarAcao(`${w.id}:int`, () => mudarIntervalo(w.id, null), 'Intervalo voltou ao padrão.');
    const min = Number(v);
    if (!intervaloValido(min)) {
      return rodarAcao(`${w.id}:int`, async () => ({ ok: false, erro: `Intervalo deve ficar entre ${INTERVALO_MIN} min e ${INTERVALO_MAX / 1440} dias.` }), '');
    }
    return rodarAcao(`${w.id}:int`, () => mudarIntervalo(w.id, min), `Intervalo de "${w.nome}" agora é ${fmtMin(min)}.`);
  };

  return (
    <li className={`w-item s-${sit}`}>
      <div className="w-topo">
        <div className="w-id">
          <h3>{w.nome}</h3>
          <p>{w.descricao}</p>
        </div>
        <span className={`w-badge s-${sit}`}>
          <span className="w-badge-dot" aria-hidden="true" />
          {ROTULO_SITUACAO[sit]}
        </span>
      </div>

      {w.pendencia && <p className="w-pend">{w.pendencia}</p>}

      <dl className="w-fatos">
        <div>
          <dt>Última execução</dt>
          <dd>
            {inicio ? (
              <>
                {tempoRelativo(inicio, agora)}
                <small>{fmtDataHora.format(inicio)}</small>
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Duração</dt>
          <dd>{u?.status === 'rodando' ? 'em andamento' : fmtDuracao(u?.duracaoMs ?? null)}</dd>
        </div>
        <div>
          <dt>Itens coletados</dt>
          <dd>{u?.itens ?? '—'}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>{u ? (u.origem === 'manual' ? 'Manual' : 'Agendado') : '—'}</dd>
        </div>
        <div>
          <dt>Próxima execução</dt>
          <dd className="w-prox">{proxima}</dd>
        </div>
      </dl>

      {u?.mensagem && <p className={`w-msg${u.status === 'erro' ? ' w-msg-erro' : ''}`}>{u.mensagem}</p>}
      {u?.status === 'erro' && (
        <p className="w-sucesso">
          Último sucesso: {w.ultimoSucessoEm ? `${tempoRelativo(new Date(w.ultimoSucessoEm), agora)} (${fmtDataHora.format(new Date(w.ultimoSucessoEm))})` : 'nunca'}
        </p>
      )}

      <div className="w-ctrl">
        <button
          type="button"
          className="w-btn w-btn-prim"
          disabled={w.rodando || !!w.pendencia || ocRun}
          onClick={() => rodarAcao(`${w.id}:run`, () => executarAgora(w.id), `Coleta de "${w.nome}" iniciada.`)}
        >
          {ocRun ? 'Iniciando…' : 'Executar agora'}
        </button>
        <button
          type="button"
          className="w-btn"
          disabled={ocAtivo}
          onClick={() =>
            rodarAcao(`${w.id}:ativo`, () => alternarAtivo(w.id, !w.ativo), w.ativo ? `"${w.nome}" pausado.` : `"${w.nome}" ativado.`)
          }
        >
          {ocAtivo ? 'Aplicando…' : w.ativo ? 'Pausar' : 'Ativar'}
        </button>
        <label className="w-int">
          <span>Intervalo</span>
          <select value={valorSelect} disabled={ocInt} onChange={(e) => onIntervalo(e.target.value)} aria-label={`Intervalo de ${w.nome}`}>
            <option value="padrao">Padrão do worker ({fmtMin(w.intervaloPadraoMin)})</option>
            {!padrao && !noPreset && <option value={String(w.intervaloMin)}>{fmtMin(w.intervaloMin)} (personalizado)</option>}
            {PRESETS.map((p) => (
              <option key={p.min} value={String(p.min)} disabled={p.min === w.intervaloPadraoMin}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  );
}
