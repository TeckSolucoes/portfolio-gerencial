'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { alternarRoteiro, salvarRoteiro, type RoteiroFormState } from './actions';

export type RoteiroTela = {
  id: string;
  nome: string;
  descricao: string | null;
  observacoes: string | null;
  ativo: boolean;
  atualizadoEm: string;
  regras: { campo: string; valor: string }[];
};

function Editor({ roteiro, aoFechar }: { roteiro: RoteiroTela | null; aoFechar: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [estado, acao, pendente] = useActionState<RoteiroFormState, FormData>(salvarRoteiro, undefined);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { if (estado?.ok) { const timer = window.setTimeout(aoFechar, 500); return () => window.clearTimeout(timer); } }, [estado, aoFechar]);
  return <dialog ref={dialog} className="rot-dialog" onClose={aoFechar} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <form action={acao} className="rot-form">
      <input type="hidden" name="id" value={roteiro?.id ?? ''} />
      <header><div><span>{roteiro ? 'Editar convênio' : 'Novo convênio'}</span><h2>{roteiro?.nome ?? 'Cadastrar roteiro'}</h2></div><button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar">×</button></header>
      <label>Convênio<input name="nome" defaultValue={roteiro?.nome ?? ''} placeholder="Ex.: SIAPE" required maxLength={80} /></label>
      <label>Descrição<input name="descricao" defaultValue={roteiro?.descricao ?? ''} placeholder="Ex.: Servidores públicos federais" maxLength={180} /></label>
      <label>Regras de atuação<textarea name="regras" defaultValue={roteiro?.regras.map((r) => `${r.campo}: ${r.valor}`).join('\n') ?? ''} placeholder={'Regime jurídico: Estatutário\nValor mínimo da parcela: R$ 50,00\nIdade: Até 75 anos'} rows={10} required /><small>Uma regra por linha, no formato Campo: valor.</small></label>
      <label>Observações<textarea name="observacoes" defaultValue={roteiro?.observacoes ?? ''} rows={3} placeholder="Orientações complementares para a operação" /></label>
      {estado && <p className={estado.ok ? 'rot-msg ok' : 'rot-msg erro'} role="status">{estado.ok ?? estado.error}</p>}
      <footer><button type="button" className="rot-sec" onClick={() => dialog.current?.close()}>Cancelar</button><button type="submit" className="rot-pri" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar roteiro'}</button></footer>
    </form>
  </dialog>;
}

export function RoteirosManager({ roteiros, podeEditar }: { roteiros: RoteiroTela[]; podeEditar: boolean }) {
  const [editor, setEditor] = useState<RoteiroTela | null | undefined>(undefined);
  return <>
    {podeEditar && <div className="rot-toolbar"><button type="button" onClick={() => setEditor(null)}>+ Novo convênio</button></div>}
    <section className="rot-grid" aria-label="Roteiros dos convênios">
      {roteiros.map((roteiro) => <article className={`rot-card${roteiro.ativo ? '' : ' arquivado'}`} key={roteiro.id}>
        <header><div><span>{roteiro.ativo ? 'Em uso' : 'Arquivado'}</span><h2>{roteiro.nome}</h2><p>{roteiro.descricao || 'Sem descrição'}</p></div>{podeEditar && <button type="button" className="rot-editar" onClick={() => setEditor(roteiro)}>Editar</button>}</header>
        <dl>{roteiro.regras.map((regra) => <div key={`${regra.campo}-${regra.valor}`}><dt>{regra.campo}</dt><dd className={regra.valor === 'A definir' ? 'pendente' : ''}>{regra.valor}</dd></div>)}</dl>
        {roteiro.observacoes && <p className="rot-nota">{roteiro.observacoes}</p>}
        <footer><span>Atualizado em {roteiro.atualizadoEm}</span>{podeEditar && <form action={alternarRoteiro.bind(null, roteiro.id, !roteiro.ativo)}><button>{roteiro.ativo ? 'Arquivar' : 'Reativar'}</button></form>}</footer>
      </article>)}
      {roteiros.length === 0 && <div className="rot-vazio"><strong>Nenhum roteiro cadastrado.</strong><p>Cadastre o primeiro convênio e suas regras de atuação.</p></div>}
    </section>
    {editor !== undefined && <Editor roteiro={editor} aoFechar={() => setEditor(undefined)} />}
  </>;
}
