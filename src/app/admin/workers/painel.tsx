'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { tempoRelativo } from '@/lib/tempo';
import { HORARIOS_PADRAO, horarioValido, MAX_HORARIOS, type EstadoWorker, type GrupoWorker } from '@/lib/workers/tipos';
import { alternarAtivo, executarAgora, limparWorker, mudarAgendaPadrao, mudarHorarios, type ResultadoAcao } from './actions';
import './workers.css';

const POLL_MS = 4000;
const ORDEM_GRUPOS: GrupoWorker[] = ['Notícias', 'Mercado', 'Diário Oficial', 'Transparência', 'Jurídico'];
type Situacao = 'rodando' | 'pendente' | 'pausado' | 'erro' | 'ok' | 'nunca';
type FiltroGrupo = GrupoWorker | 'Todos';
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

const listaHoras = (hs: readonly string[]) => hs.join(' · ');

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

const assinarVisibilidade = (avisar: () => void) => {
  document.addEventListener('visibilitychange', avisar);
  return () => document.removeEventListener('visibilitychange', avisar);
};
const abaVisivel = () => document.visibilityState === 'visible';

type RodarAcao = (chave: string, fn: () => Promise<ResultadoAcao>, sucesso: string) => Promise<void>;

export function Painel({ inicial, padraoInicial, agoraInicial }: { inicial: EstadoWorker[]; padraoInicial: string[]; agoraInicial: string }) {
  const [workers, setWorkers] = useState(inicial);
  const [padrao, setPadrao] = useState(padraoInicial);
  const [agoraMs, setAgoraMs] = useState(() => Date.parse(agoraInicial));
  const [atualizadoEm, setAtualizadoEm] = useState<number>(() => Date.parse(agoraInicial));
  const [falha, setFalha] = useState<string | null>(null);
  const visivel = useSyncExternalStore(assinarVisibilidade, abaVisivel, () => true);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [grupoAtivo, setGrupoAtivo] = useState<FiltroGrupo>('Todos');
  // Diferença entre o relógio do servidor e o do navegador, pra contagem regressiva não depender do fuso/relógio local.
  // Começa em 0 e é acertada a cada resposta do servidor.
  const deslocamento = useRef(0);
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
      const dados: { agora: string; workers: EstadoWorker[]; padrao: string[] } = await r.json();
      deslocamento.current = Date.parse(dados.agora) - Date.now();
      setWorkers(dados.workers);
      setPadrao(dados.padrao);
      setAtualizadoEm(Date.parse(dados.agora));
      setFalha(null);
    } catch {
      setFalha('Sem conexão com o servidor. Mostrando o último estado recebido; tentando de novo.');
    } finally {
      emVoo.current = false;
    }
  }, []);

  useEffect(() => {
    if (!visivel) return;
    const primeira = setTimeout(atualizar, 0);
    const t = setInterval(atualizar, POLL_MS);
    return () => {
      clearTimeout(primeira);
      clearInterval(t);
    };
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

  // Deriva os grupos dos workers recebidos para que uma rotina nova nunca fique invisível
  // apenas porque seu grupo ainda não foi incluído na ordem preferencial da interface.
  const gruposDisponiveis = [...new Set(workers.map((w) => w.grupo))]
    .sort((a, b) => {
      const ia = ORDEM_GRUPOS.indexOf(a);
      const ib = ORDEM_GRUPOS.indexOf(b);
      return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
    });
  const porGrupo = gruposDisponiveis
    .filter((grupo) => grupoAtivo === 'Todos' || grupo === grupoAtivo)
    .map((grupo) => ({ grupo, itens: workers.filter((w) => w.grupo === grupo) }));
  const agora = new Date(agoraMs);

  return (
    <div className="workers">
      <header className="w-cab">
        <div>
          <div className="w-kicker">Operação · Superadmin</div>
          <h1>Workers de coleta</h1>
          <p className="w-sub">
            Coletas agendadas de notícias, mercado, diários oficiais, transparência e monitoramento jurídico. Código determinístico, sem IA e sem custo por execução.
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

      <nav className="w-filtros" aria-label="Filtrar workers por grupo">
        {(['Todos', ...gruposDisponiveis] as FiltroGrupo[]).map((grupo) => {
          const quantidade = grupo === 'Todos' ? workers.length : workers.filter((w) => w.grupo === grupo).length;
          return <button key={grupo} type="button" className={grupoAtivo === grupo ? 'ativo' : ''} aria-pressed={grupoAtivo === grupo} onClick={() => setGrupoAtivo(grupo)}>
            {grupo}<span>{quantidade}</span>
          </button>;
        })}
      </nav>

      <AgendaPadrao padrao={padrao} seguem={workers.filter((w) => !w.horariosProprios).length} ocupados={ocupados} rodarAcao={rodarAcao} />

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
  const ocHor = ocupados.has(`${w.id}:hor`);
  const ocLimpar = ocupados.has(`${w.id}:limpar`);
  const [editando, setEditando] = useState(false);

  let proxima = '—';
  if (w.rodando) proxima = 'em execução';
  else if (w.pendencia) proxima = 'aguardando configuração';
  else if (!w.ativo) proxima = 'pausado';
  else if (w.proximaEm) proxima = contagem(Date.parse(w.proximaEm) - agora.getTime());

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
        <button
          type="button"
          className="w-btn w-btn-perigo"
          disabled={w.rodando || ocLimpar}
          onClick={() => {
            if (!window.confirm(`Limpar o histórico e o resultado de "${w.nome}"? O worker continuará disponível para uma nova consulta.`)) return;
            void rodarAcao(`${w.id}:limpar`, () => limparWorker(w.id), `Histórico de "${w.nome}" removido.`);
          }}
        >
          {ocLimpar ? 'Limpando…' : 'Limpar histórico'}
        </button>
        <div className="w-agenda">
          <span className="w-agenda-rot">Horários</span>
          <Horas lista={w.horarios} />
          <span className="w-agenda-origem">{w.horariosProprios ? 'próprios' : 'agenda padrão'}</span>
          {!editando && (
            <button type="button" className="w-btn w-btn-link" disabled={ocHor} onClick={() => setEditando(true)} aria-label={`Editar horários de ${w.nome}`}>
              {ocHor ? 'Aplicando…' : 'Editar'}
            </button>
          )}
        </div>
      </div>

      {editando && (
        <EditorHorarios
          titulo={`Horários de ${w.nome}`}
          inicial={w.horarios}
          ocupado={ocHor}
          onCancelar={() => setEditando(false)}
          onSalvar={async (hs) => {
            await rodarAcao(`${w.id}:hor`, () => mudarHorarios(w.id, hs), `"${w.nome}" agora roda às ${listaHoras(hs)}.`);
            setEditando(false);
          }}
          extra={
            w.horariosProprios ? (
              <button
                type="button"
                className="w-btn"
                disabled={ocHor}
                onClick={async () => {
                  await rodarAcao(`${w.id}:hor`, () => mudarHorarios(w.id, null), `"${w.nome}" voltou à agenda padrão.`);
                  setEditando(false);
                }}
              >
                Voltar à agenda padrão
              </button>
            ) : null
          }
        />
      )}
    </li>
  );
}

function Horas({ lista }: { lista: readonly string[] }) {
  return (
    <span className="w-horas">
      {lista.map((h) => (
        <span key={h} className="w-hora">
          {h}
        </span>
      ))}
    </span>
  );
}

function AgendaPadrao({ padrao, seguem, ocupados, rodarAcao }: { padrao: string[]; seguem: number; ocupados: Set<string>; rodarAcao: RodarAcao }) {
  const [editando, setEditando] = useState(false);
  const ocupado = ocupados.has('padrao:hor');
  const ehOriginal = listaHoras(padrao) === listaHoras(HORARIOS_PADRAO);
  const salvar = async (hs: string[]) => {
    await rodarAcao('padrao:hor', () => mudarAgendaPadrao(hs), `Agenda padrão agora é ${listaHoras(hs)}.`);
    setEditando(false);
  };
  return (
    <section className="w-padrao" aria-labelledby="h-padrao">
      <div className="w-padrao-topo">
        <div>
          <h2 id="h-padrao">Agenda padrão</h2>
          <p>
            Todo dia, no horário de Brasília. Vale para {seguem} {seguem === 1 ? 'worker' : 'workers'} sem horários próprios. Se o servidor estiver fora do ar
            num horário, a coleta roda assim que ele voltar.
          </p>
        </div>
        <div className="w-agenda">
          <Horas lista={padrao} />
          {!editando && (
            <button type="button" className="w-btn w-btn-link" disabled={ocupado} onClick={() => setEditando(true)}>
              {ocupado ? 'Aplicando…' : 'Editar'}
            </button>
          )}
        </div>
      </div>
      {editando && (
        <EditorHorarios
          titulo="Agenda padrão"
          inicial={padrao}
          ocupado={ocupado}
          onCancelar={() => setEditando(false)}
          onSalvar={salvar}
          extra={
            ehOriginal ? null : (
              <button type="button" className="w-btn" disabled={ocupado} onClick={() => salvar([...HORARIOS_PADRAO])}>
                Restaurar manhã, tarde e noite ({listaHoras(HORARIOS_PADRAO)})
              </button>
            )
          }
        />
      )}
    </section>
  );
}

function EditorHorarios({
  titulo,
  inicial,
  ocupado,
  onSalvar,
  onCancelar,
  extra,
}: {
  titulo: string;
  inicial: readonly string[];
  ocupado: boolean;
  onSalvar: (horarios: string[]) => Promise<void>;
  onCancelar: () => void;
  extra?: React.ReactNode;
}) {
  const [lista, setLista] = useState<string[]>([...inicial]);
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const mudou = listaHoras(lista) !== listaHoras([...inicial].sort());

  const adicionar = () => {
    if (!horarioValido(novo)) return setErro('Escolha um horário válido (HH:MM).');
    if (lista.includes(novo)) return setErro(`${novo} já está na lista.`);
    if (lista.length >= MAX_HORARIOS) return setErro(`No máximo ${MAX_HORARIOS} horários por dia.`);
    setLista([...lista, novo].sort());
    setNovo('');
    setErro(null);
  };

  return (
    <div className="w-editor" role="group" aria-label={titulo}>
      <ul className="w-horas" aria-label="Horários escolhidos">
        {lista.map((h) => (
          <li key={h} className="w-hora w-hora-ed">
            {h}
            <button type="button" onClick={() => setLista(lista.filter((x) => x !== h))} aria-label={`Remover ${h}`} disabled={ocupado}>
              ×
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="w-editor-vazio">Nenhum horário: adicione pelo menos um.</li>}
      </ul>
      <div className="w-editor-add">
        <label>
          <span>Novo horário</span>
          <input
            type="time"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionar();
              }
            }}
            disabled={ocupado}
          />
        </label>
        <button type="button" className="w-btn" onClick={adicionar} disabled={ocupado || !novo}>
          Adicionar
        </button>
      </div>
      {erro && (
        <p className="w-editor-erro" role="alert">
          {erro}
        </p>
      )}
      <div className="w-editor-acoes">
        <button type="button" className="w-btn w-btn-prim" disabled={ocupado || lista.length === 0 || !mudou} onClick={() => onSalvar(lista)}>
          {ocupado ? 'Salvando…' : 'Salvar horários'}
        </button>
        <button type="button" className="w-btn" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </button>
        {extra}
      </div>
    </div>
  );
}
