'use client';

import { useActionState, useState } from 'react';
import { createFrontWithItems } from './actions';
import type { CompanyModel } from '@/generated/prisma/models';

type ItemStatusValue = 'todo' | 'doing' | 'done' | 'blocked';

type ItemRow = {
  key: string;
  title: string;
  status: ItemStatusValue;
  note: string;
};

const ITEM_STATUS_OPTIONS = [
  { value: 'todo', label: 'A fazer' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'done', label: 'Concluído' },
  { value: 'blocked', label: 'Bloqueado' },
] as const;

let rowCounter = 0;
function nextRowKey(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function NewFrontWithItemsForm({
  companies,
  selectedCompanySlug,
}: {
  companies: CompanyModel[];
  selectedCompanySlug: string;
}) {
  const [state, formAction, pending] = useActionState(createFrontWithItems, undefined);
  const [items, setItems] = useState<ItemRow[]>([]);

  function addItem() {
    setItems((prev) => [...prev, { key: nextRowKey(), title: '', status: 'todo', note: '' }]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  const itemsJson = JSON.stringify(items.map(({ title, status, note }) => ({ title, status, note })));

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-field">
        <label htmlFor="companySlug">Empresa</label>
        <select id="companySlug" name="companySlug" defaultValue={selectedCompanySlug} required>
          <option value="" disabled>
            Selecione uma empresa
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.slug}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-field">
        <label htmlFor="title">Título da frente</label>
        <input id="title" name="title" type="text" required placeholder="Ex.: Programa de portabilidade" />
      </div>

      <div className="admin-field">
        <label htmlFor="summary">Resumo</label>
        <textarea id="summary" name="summary" rows={5} />
        <span className="admin-hint">
          Suporta <code>&lt;strong&gt;texto&lt;/strong&gt;</code> para destaque; qualquer outra tag é removida ao
          salvar.
        </span>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="ownerName">Responsável</label>
          <input id="ownerName" name="ownerName" type="text" required placeholder="Nome completo" />
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="ownerInitials">Iniciais</label>
          <input id="ownerInitials" name="ownerInitials" type="text" required maxLength={3} placeholder="Ex.: RN" />
        </div>
        <div className="admin-field">
          <label htmlFor="requesterName">Solicitante</label>
          <input id="requesterName" name="requesterName" type="text" defaultValue="A definir" placeholder="Quem pediu" />
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="nextMilestone">Próximo marco</label>
          <input id="nextMilestone" name="nextMilestone" type="text" placeholder="Ex.: Homologação com o cliente" />
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="nextDate">Data prevista</label>
          <input id="nextDate" name="nextDate" type="date" />
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="statusManual">Status inicial</label>
          <select id="statusManual" name="statusManual" defaultValue="">
            <option value="">Sem status definido</option>
            <option value="ok">Em dia</option>
            <option value="attention">Atenção</option>
            <option value="blocked">Bloqueada</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="progressManual">Progresso inicial (%)</label>
          <input id="progressManual" name="progressManual" type="number" min={0} max={100} />
        </div>
      </div>

      <label className="admin-toggle">
        <input type="checkbox" name="prioritized" />
        Prioridade da diretoria
      </label>

      <h2 className="admin-section-title">Atividades</h2>

      {items.length === 0 ? (
        <p className="admin-empty">Nenhuma atividade adicionada ainda — pode deixar em branco e cadastrar depois.</p>
      ) : (
        <div className="admin-list admin-list-items">
          {items.map((item) => (
            <div key={item.key} className="admin-item-row">
              <div className="admin-item-row-fields">
                <div className="admin-field">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateItem(item.key, { title: e.target.value })}
                    required
                    placeholder="Título da atividade"
                  />
                </div>
                <div className="admin-field admin-field-narrow">
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(item.key, { status: e.target.value as ItemStatusValue })}
                  >
                    {ITEM_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) => updateItem(item.key, { note: e.target.value })}
                    required={item.status === 'blocked'}
                    placeholder={item.status === 'blocked' ? 'Observação (obrigatória p/ bloqueado)' : 'Observação (opcional)'}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-danger" onClick={() => removeItem(item.key)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="admin-actions">
        <button type="button" className="btn btn-secondary" onClick={addItem}>
          Adicionar atividade
        </button>
      </div>

      <input type="hidden" name="itemsJson" value={itemsJson} readOnly />

      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Criando…' : 'Criar frente'}
        </button>
      </div>
    </form>
  );
}
