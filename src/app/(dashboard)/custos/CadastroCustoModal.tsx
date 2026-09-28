'use client';

import { useEffect, useRef, useState } from 'react';
import { cadastrarCusto } from './actions';

export function CadastroCustoModal({ competencia }: { competencia: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (aberto && !modal.open) modal.showModal();
    if (!aberto && modal.open) modal.close();
  }, [aberto]);

  async function salvar(formData: FormData) {
    setSalvando(true);
    setErro('');
    try {
      await cadastrarCusto(formData);
      form.current?.reset();
      setAberto(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível cadastrar o custo.');
    } finally {
      setSalvando(false);
    }
  }

  return <>
    <div className="custo-cadastro-acao"><button className="btn btn-primary" type="button" onClick={() => setAberto(true)}>+ Cadastrar custo</button></div>
    <dialog ref={dialog} className="custo-modal" aria-labelledby="custo-modal-titulo" onClose={() => setAberto(false)} onClick={(event) => { if (event.target === event.currentTarget) setAberto(false); }}>
      <div className="custo-modal-painel">
        <header><div><span>Novo registro</span><h2 id="custo-modal-titulo">Cadastrar custo</h2><p>Informe o valor, a recorrência e a primeira competência.</p></div><button className="custo-modal-fechar" type="button" aria-label="Fechar" onClick={() => setAberto(false)}>×</button></header>
        <form ref={form} action={salvar} className="custo-form">
          <label>Nome<input name="nome" required maxLength={80} autoFocus /></label>
          <label>Valor (R$)<input name="valor" required inputMode="decimal" placeholder="130,00" /></label>
          <label>Periodicidade<select name="periodicidade" defaultValue="mensal"><option value="unico">Único</option><option value="mensal">Mensal</option><option value="anual">Anual</option></select></label>
          <label>Competência<input name="competencia" type="month" defaultValue={competencia} required /></label>
          <label className="custo-descricao">Descrição<input name="descricao" maxLength={240} /></label>
          <label className="custo-check"><input name="pago" type="checkbox" /> Já foi pago</label>
          {erro && <p className="custo-modal-erro" role="alert">{erro}</p>}
          <footer><button className="btn btn-ghost" type="button" onClick={() => setAberto(false)}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar custo'}</button></footer>
        </form>
      </div>
    </dialog>
  </>;
}
