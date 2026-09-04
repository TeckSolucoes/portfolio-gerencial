'use client';

import { useActionState } from 'react';
import { updateFront } from './actions';
import type { FrontModel } from '@/generated/prisma/models';

export function EditFrontForm({
  companySlug,
  frontSlug,
  front,
}: {
  companySlug: string;
  frontSlug: string;
  front: FrontModel;
}) {
  const [state, formAction, pending] = useActionState(updateFront.bind(null, companySlug, frontSlug), undefined);

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-field">
        <label htmlFor="title">Título</label>
        <input id="title" name="title" type="text" defaultValue={front.title} required />
      </div>

      <div className="admin-field">
        <label htmlFor="summary">Resumo</label>
        <textarea id="summary" name="summary" rows={5} defaultValue={front.summaryHtml} />
        <span className="admin-hint">
          Suporta <code>&lt;strong&gt;texto&lt;/strong&gt;</code> para destaque; qualquer outra tag é removida ao
          salvar.
        </span>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="ownerName">Responsável</label>
          <input id="ownerName" name="ownerName" type="text" defaultValue={front.ownerName} required />
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="ownerInitials">Iniciais</label>
          <input
            id="ownerInitials"
            name="ownerInitials"
            type="text"
            maxLength={3}
            defaultValue={front.ownerInitials}
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="requesterName">Solicitante</label>
          <input id="requesterName" name="requesterName" type="text" defaultValue={front.requesterName} />
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="nextMilestone">Próximo marco</label>
          <input id="nextMilestone" name="nextMilestone" type="text" defaultValue={front.nextMilestone ?? ''} />
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="nextDate">Data prevista</label>
          <input
            id="nextDate"
            name="nextDate"
            type="date"
            defaultValue={front.nextDate ? front.nextDate.toISOString().slice(0, 10) : ''}
          />
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="statusMode">Modo de status</label>
          <select id="statusMode" name="statusMode" defaultValue={front.statusMode}>
            <option value="manual">Manual</option>
            <option value="auto">Automático (requer sync com Jira, ainda não disponível)</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="statusManual">Status manual</label>
          <select id="statusManual" name="statusManual" defaultValue={front.statusManual ?? ''}>
            <option value="">Sem status definido</option>
            <option value="ok">Em dia</option>
            <option value="attention">Atenção</option>
            <option value="blocked">Bloqueada</option>
          </select>
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="progressMode">Modo de progresso</label>
          <select id="progressMode" name="progressMode" defaultValue={front.progressMode}>
            <option value="manual">Manual</option>
            <option value="auto">Automático (requer sync com Jira, ainda não disponível)</option>
          </select>
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="progressManual">Progresso manual (%)</label>
          <input
            id="progressManual"
            name="progressManual"
            type="number"
            min={0}
            max={100}
            defaultValue={front.progressManual ?? ''}
          />
        </div>
      </div>

      <label className="admin-toggle">
        <input type="checkbox" name="prioritized" defaultChecked={front.prioritized} />
        Prioridade da diretoria
      </label>

      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p className="admin-success">{state.success}</p>}

      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
