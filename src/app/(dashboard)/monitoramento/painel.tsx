'use client';

import { useMemo, useState } from 'react';
import { chaveGerente, type GerenteMonitorado, type PessoaMonitorada, type PrioridadeMonitoramento } from '@/lib/monitoramento/operacional';

type Filtro = 'TODOS' | PrioridadeMonitoramento | 'OBJECOES' | 'PARADAS';
const dataBr = (ymd: string) => ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '—';
const nomeEquipe = (nome: string) => nome.replace(/^(AKRK|DIG)\s*-\s*/i, '');
const rotuloPrioridade: Record<PrioridadeMonitoramento, string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média' };
const rotuloFiltro: Record<Filtro, string> = { TODOS: 'Todos', CRITICA: 'Críticos', ALTA: 'Alta', MEDIA: 'Média', OBJECOES: 'Com objeção', PARADAS: 'Sem atualização' };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const larg = (parte: number, total: number) => `${total > 0 ? (100 * parte) / total : 0}%`;

function GerentesAlerta({ gerentes, ativo, escolher }: { gerentes: GerenteMonitorado[]; ativo: string | null; escolher: (chave: string | null) => void }) {
  return (
    <section className="gerentes" aria-labelledby="h-gerentes">
      <div className="fila-cab"><div><h2 id="h-gerentes">Gerentes em alerta</h2><p className="sec-s">% das propostas dos últimos 30 dias com algum alerta. Clique para ver a turma na fila.</p></div>
        <ul className="ger-legenda" aria-label="Legenda"><li className="lg-critica">Crítica</li><li className="lg-alta">Alta</li><li className="lg-media">Média</li></ul></div>
      <ol className="ger-lista">
        {gerentes.map((g) => (
          <li key={g.chave}>
            <button type="button" className="ger-linha" aria-pressed={ativo === g.chave} onClick={() => escolher(ativo === g.chave ? null : g.chave)}>
              <span className="ger-nome">{g.gerente}</span>
              <span className="ger-barra" role="img" aria-label={`${g.gerente}: ${pct(g.pct)} em alerta, ${g.critica} críticas, ${g.alta} altas e ${g.media} médias de ${g.total} propostas`}>
                <i className="seg-critica" style={{ width: larg(g.critica, g.total) }} />
                <i className="seg-alta" style={{ width: larg(g.alta, g.total) }} />
                <i className="seg-media" style={{ width: larg(g.media, g.total) }} />
              </span>
              <span className="ger-pct"><b>{pct(g.pct)}</b> <small>{g.emAlerta.toLocaleString('pt-BR')} de {g.total.toLocaleString('pt-BR')}</small></span>
              <span className="ger-sinais">
                <span className={g.objecoes ? 'sinal sinal-critico' : 'sinal'}><b>{g.objecoes}</b> objeções</span>
                <span className={g.paradas ? 'sinal sinal-alerta' : 'sinal'}><b>{g.paradas}</b> paradas</span>
                <span className="sinal"><b>{g.semResponsavel}</b> sem resp.</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Painel({ pessoas, gerentes }: { pessoas: PessoaMonitorada[]; gerentes: GerenteMonitorado[] }) {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [gerente, setGerente] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(16);
  const corresponde = (pessoa: PessoaMonitorada, valor: Filtro) => valor === 'TODOS' || pessoa.prioridade === valor || (valor === 'OBJECOES' && pessoa.objecoes > 0) || (valor === 'PARADAS' && pessoa.semAtualizacao > 0);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return pessoas.filter((pessoa) => (!gerente || chaveGerente(pessoa.gerente) === gerente) && corresponde(pessoa, filtro) && (!termo || `${pessoa.operador} ${pessoa.equipe} ${pessoa.gerente} ${pessoa.principaisMotivos.map((m) => m.motivo).join(' ')}`.toLocaleLowerCase('pt-BR').includes(termo)));
  }, [busca, filtro, gerente, pessoas]);
  const exibidas = visiveis.slice(0, limite);
  const nomeGerente = gerentes.find((g) => g.chave === gerente)?.gerente;
  const escolherGerente = (chave: string | null) => {
    setGerente(chave);
    setLimite(16);
    if (chave) document.getElementById('h-fila')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
    {gerentes.length > 1 && <GerentesAlerta gerentes={gerentes} ativo={gerente} escolher={escolherGerente} />}
    <section className="fila" aria-labelledby="h-fila">
      <div className="fila-cab"><div><h2 id="h-fila">Fila por responsável</h2><p className="sec-s">Comece pelos casos críticos e use o próximo passo indicado.</p></div><label className="busca"><span className="sr-only">Buscar responsável, equipe ou motivo</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar responsável, equipe ou motivo" /></label></div>
      <div className="filtro" role="group" aria-label="Filtrar monitoramento">
        {(['TODOS', 'CRITICA', 'ALTA', 'MEDIA', 'OBJECOES', 'PARADAS'] as Filtro[]).map((valor) => <button key={valor} type="button" className={`pill f-${valor.toLowerCase()}`} aria-pressed={filtro === valor} onClick={() => { setFiltro(valor); setLimite(16); }}>{rotuloFiltro[valor]} <b>{pessoas.filter((p) => (!gerente || chaveGerente(p.gerente) === gerente) && corresponde(p, valor)).length}</b></button>)}
      </div>
      {nomeGerente && <p className="ger-ativo">Turma de <b>{nomeGerente}</b> <button type="button" onClick={() => escolherGerente(null)}>Ver todos os gerentes</button></p>}
      <p className="resultado">{visiveis.length.toLocaleString('pt-BR')} {visiveis.length === 1 ? 'responsável encontrado' : 'responsáveis encontrados'}</p>
      {visiveis.length === 0 ? <p className="vazio">Nenhum responsável corresponde aos filtros.</p> : <ol className="responsaveis">
        {exibidas.map((pessoa) => <li key={pessoa.chave} className={`responsavel prioridade-${pessoa.prioridade.toLowerCase()}`}>
          <div className="resp-identidade"><span className="prioridade">{rotuloPrioridade[pessoa.prioridade]}</span><h3>{pessoa.operador}</h3><p>{nomeEquipe(pessoa.equipe)} <span>·</span> Gerente: {pessoa.gerente}</p></div>
          <div className="resp-numeros" aria-label={`${pessoa.casos} casos para acompanhar`}><span className="sinal sinal-total"><b>{pessoa.casos}</b> casos</span>{pessoa.objecoes > 0 && <span className="sinal sinal-critico"><b>{pessoa.objecoes}</b> objeções</span>}{pessoa.reprovadas > 0 && <span className="sinal sinal-critico"><b>{pessoa.reprovadas}</b> reprovadas</span>}{pessoa.aguardandoFuncao > 0 && <span className="sinal"><b>{pessoa.aguardandoFuncao}</b> na Função</span>}{pessoa.semAtualizacao > 0 && <span className="sinal sinal-alerta"><b>{pessoa.semAtualizacao}</b> paradas</span>}</div>
          <div className="resp-motivos"><b>Principal objeção</b>{pessoa.principaisMotivos.length ? <p>{pessoa.principaisMotivos[0].motivo} <span>{pessoa.principaisMotivos[0].quantidade}×</span>{pessoa.principaisMotivos.length > 1 && <small> +{pessoa.principaisMotivos.length - 1}</small>}</p> : <span className="sem-motivo">Nenhuma objeção informada.</span>}</div>
          <div className="resp-acao"><b>Próximo passo</b><p>{pessoa.proximaAcao}</p></div>
          <div className="resp-datas"><span>Desde <b>{dataBr(pessoa.desde)}</b></span><span>Atualizado <b>{dataBr(pessoa.ultimaAtualizacao)}</b></span></div>
        </li>)}
      </ol>}
      {limite < visiveis.length && <button type="button" className="mostrar-mais" onClick={() => setLimite((atual) => atual + 16)}>Mostrar mais <b>{Math.min(16, visiveis.length - limite)}</b></button>}
    </section>
    </>
  );
}
