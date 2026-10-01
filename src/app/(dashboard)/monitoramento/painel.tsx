'use client';

import { useMemo, useState } from 'react';
import type { PessoaMonitorada, PrioridadeMonitoramento } from '@/lib/monitoramento/operacional';

type Filtro = 'TODOS' | PrioridadeMonitoramento | 'OBJECOES' | 'PARADAS';
const dataBr = (ymd: string) => ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '—';
const nomeEquipe = (nome: string) => nome.replace(/^(AKRK|DIG)\s*-\s*/i, '');
const rotuloPrioridade: Record<PrioridadeMonitoramento, string> = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média' };
const rotuloFiltro: Record<Filtro, string> = { TODOS: 'Todos', CRITICA: 'Críticos', ALTA: 'Alta', MEDIA: 'Média', OBJECOES: 'Com objeção', PARADAS: 'Sem atualização' };

export function Painel({ pessoas }: { pessoas: PessoaMonitorada[] }) {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [busca, setBusca] = useState('');
  const corresponde = (pessoa: PessoaMonitorada, valor: Filtro) => valor === 'TODOS' || pessoa.prioridade === valor || (valor === 'OBJECOES' && pessoa.objecoes > 0) || (valor === 'PARADAS' && pessoa.semAtualizacao > 0);
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return pessoas.filter((pessoa) => corresponde(pessoa, filtro) && (!termo || `${pessoa.operador} ${pessoa.equipe} ${pessoa.gerente} ${pessoa.principaisMotivos.map((m) => m.motivo).join(' ')}`.toLocaleLowerCase('pt-BR').includes(termo)));
  }, [busca, filtro, pessoas]);

  return (
    <section className="fila" aria-labelledby="h-fila">
      <div className="fila-cab"><div><h2 id="h-fila">Fila por responsável</h2><p className="sec-s">Comece pelos casos críticos e use o próximo passo indicado.</p></div><label className="busca"><span className="sr-only">Buscar responsável, equipe ou motivo</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar responsável, equipe ou motivo" /></label></div>
      <div className="filtro" role="group" aria-label="Filtrar monitoramento">
        {(['TODOS', 'CRITICA', 'ALTA', 'MEDIA', 'OBJECOES', 'PARADAS'] as Filtro[]).map((valor) => <button key={valor} type="button" className={`pill f-${valor.toLowerCase()}`} aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{rotuloFiltro[valor]} <b>{pessoas.filter((p) => corresponde(p, valor)).length}</b></button>)}
      </div>
      <p className="resultado">{visiveis.length.toLocaleString('pt-BR')} {visiveis.length === 1 ? 'responsável encontrado' : 'responsáveis encontrados'}</p>
      {visiveis.length === 0 ? <p className="vazio">Nenhum responsável corresponde aos filtros.</p> : <ol className="responsaveis">
        {visiveis.map((pessoa) => <li key={pessoa.chave} className={`responsavel prioridade-${pessoa.prioridade.toLowerCase()}`}>
          <div className="resp-identidade"><span className="prioridade">{rotuloPrioridade[pessoa.prioridade]}</span><h3>{pessoa.operador}</h3><p>{nomeEquipe(pessoa.equipe)} <span>·</span> Gerente: {pessoa.gerente}</p></div>
          <div className="resp-numeros"><span><b>{pessoa.casos}</b> casos</span>{pessoa.objecoes > 0 && <span className="num-critico"><b>{pessoa.objecoes}</b> objeções</span>}{pessoa.reprovadas > 0 && <span className="num-critico"><b>{pessoa.reprovadas}</b> reprovadas</span>}{pessoa.aguardandoFuncao > 0 && <span><b>{pessoa.aguardandoFuncao}</b> aguardando Função</span>}{pessoa.semAtualizacao > 0 && <span><b>{pessoa.semAtualizacao}</b> sem atualização</span>}</div>
          <div className="resp-motivos"><b>Objeções e motivos</b>{pessoa.principaisMotivos.length ? <ul>{pessoa.principaisMotivos.map((item) => <li key={item.motivo}>{item.motivo} <span>{item.quantidade}×</span></li>)}</ul> : <span className="sem-motivo">Nenhuma objeção informada.</span>}</div>
          <div className="resp-acao"><b>Próximo passo</b><p>{pessoa.proximaAcao}</p><small>Na fila desde {dataBr(pessoa.desde)} · última atualização {dataBr(pessoa.ultimaAtualizacao)}</small></div>
        </li>)}
      </ol>}
    </section>
  );
}
