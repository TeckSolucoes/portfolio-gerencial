'use client';

import { useActionState } from 'react';
import { createItem, updateItem, deleteItem } from './actions';
import type { FrontItemModel } from '@/generated/prisma/models';

export function NewItemForm({ companySlug, frontSlug }: { companySlug: string; frontSlug: string }) {
  const [state, formAction, pending] = useActionState(createItem.bind(null, companySlug, frontSlug), undefined);

  return (
    <form action={formAction} className="admin-form admin-form-inline">
      <div className="admin-field">
        <label htmlFor="titleOverride">Título do item</label>
        <input id="titleOverride" name="titleOverride" type="text" required placeholder="Ex.: Homologação com fornecedor" />
      </div>
      <div className="admin-field admin-field-narrow">
        <label htmlFor="statusOverride">Status</label>
        <select id="statusOverride" name="statusOverride" defaultValue="todo">
          <option value="todo">A fazer</option>
          <option value="doing">Em andamento</option>
          <option value="done">Concluído</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </div>
      <div className="admin-field">
        <label htmlFor="note">Observação (opcional)</label>
        <input id="note" name="note" type="text" placeholder="Contexto, se necessário" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Adicionando…' : 'Adicionar item'}
      </button>
      {state?.error && <p className="form-error admin-form-error-inline">{state.error}</p>}
    </form>
  );
}

export function ItemRow({
  companySlug,
  frontSlug,
  item,
}: {
  companySlug: string;
  frontSlug: string;
  item: FrontItemModel;
}) {
  const [state, formAction, pending] = useActionState(
    updateItem.bind(null, companySlug, frontSlug, item.id),
    undefined,
  );

  return (
    <div className="admin-item-row">
      <form action={formAction} className="admin-item-row-fields">
        <div className="admin-field">
          <input name="titleOverride" type="text" defaultValue={item.titleOverride ?? ''} required />
        </div>
        <div className="admin-field admin-field-narrow">
          <select name="statusOverride" defaultValue={item.statusOverride ?? 'todo'}>
            <option value="todo">A fazer</option>
            <option value="doing">Em andamento</option>
            <option value="done">Concluído</option>
            <option value="blocked">Bloqueado</option>
          </select>
        </div>
        <div className="admin-field">
          <input name="note" type="text" defaultValue={item.note ?? ''} placeholder="Observação" />
        </div>
        <label className="admin-toggle admin-toggle-compact">
          <input type="checkbox" name="hidden" defaultChecked={item.hidden} />
          Oculto
        </label>
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      <form
        action={deleteItem.bind(null, companySlug, frontSlug, item.id)}
        onSubmit={(e) => {
          if (!confirm('Remover este item permanentemente?')) e.preventDefault();
        }}
      >
        <button type="submit" className="btn btn-danger">
          Remover
        </button>
      </form>
      {state?.error && <p className="form-error admin-form-error-inline">{state.error}</p>}
    </div>
  );
}
