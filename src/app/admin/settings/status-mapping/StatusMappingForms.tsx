'use client';

import { useActionState } from 'react';
import { createMapping, updateMapping, deleteMapping } from './actions';
import type { JiraStatusMappingModel } from '@/generated/prisma/models';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'A fazer' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
  { value: 'blocked', label: 'Bloqueado' },
] as const;

export function NewMappingForm() {
  const [state, formAction, pending] = useActionState(createMapping, undefined);

  return (
    <form action={formAction} className="admin-form admin-form-inline">
      <div className="admin-field">
        <label htmlFor="jiraStatusName">Status no Jira</label>
        <input id="jiraStatusName" name="jiraStatusName" type="text" required placeholder='Ex.: "Em Revisão"' />
      </div>
      <div className="admin-field admin-field-narrow">
        <label htmlFor="mappedStatus">Mapeia para</label>
        <select id="mappedStatus" name="mappedStatus" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Adicionando…' : 'Adicionar mapeamento'}
      </button>
      {state?.error && <p className="form-error admin-form-error-inline">{state.error}</p>}
    </form>
  );
}

export function MappingRow({ mapping }: { mapping: JiraStatusMappingModel }) {
  const [state, formAction, pending] = useActionState(updateMapping.bind(null, mapping.id), undefined);

  return (
    <div className="admin-item-row">
      <form action={formAction} className="admin-item-row-fields">
        <div className="admin-field">
          <span className="admin-static-value">{mapping.jiraStatusName}</span>
        </div>
        <div className="admin-field admin-field-narrow">
          <select name="mappedStatus" defaultValue={mapping.mappedStatus}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      <form
        action={deleteMapping.bind(null, mapping.id)}
        onSubmit={(e) => {
          if (!confirm('Remover este mapeamento?')) e.preventDefault();
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
