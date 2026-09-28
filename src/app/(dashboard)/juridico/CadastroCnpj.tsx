'use client';

import { useActionState } from 'react';
import { cadastrarCnpj } from './actions';

export function CadastroCnpj() {
  const [estado, acao, pendente] = useActionState(cadastrarCnpj, undefined);
  return <form action={acao} className="jur-cadastro">
    <div><label htmlFor="jur-cnpj">Novo CNPJ do grupo</label><p>Os dados cadastrais serão consultados antes de salvar.</p></div>
    <input id="jur-cnpj" name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" maxLength={18} required />
    <button type="submit" disabled={pendente}>{pendente ? 'Consultando…' : 'Consultar e monitorar'}</button>
    {estado?.error && <p className="jur-msg erro" role="alert">{estado.error}</p>}
    {estado?.ok && <p className="jur-msg ok" role="status">{estado.ok}</p>}
  </form>;
}
