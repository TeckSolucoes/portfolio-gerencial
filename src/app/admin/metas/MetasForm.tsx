'use client';

import { useActionState } from 'react';
import { salvarMetas } from './actions';
import { EMPRESAS } from '@/lib/empresas';

export function MetasForm({ mes, atuais }: { mes: string; atuais: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(salvarMetas, undefined);

  return (
    <form action={formAction} className="admin-form" key={mes}>
      <input type="hidden" name="mes" value={mes} />
      <div className="admin-field-row">
        {EMPRESAS.map((e) => (
          <div className="admin-field" key={e}>
            <label htmlFor={`valor_${e}`}>Meta {e} (R$)</label>
            <input
              id={`valor_${e}`}
              name={`valor_${e}`}
              type="text"
              inputMode="decimal"
              defaultValue={atuais[e] ?? ''}
              placeholder="Ex.: 8.000.000,00"
            />
            {atuais[e] && (
              <button type="submit" name="limpar" value={e} formNoValidate className="btn btn-danger" disabled={pending}>
                Limpar meta de {e}
              </button>
            )}
          </div>
        ))}
      </div>
      <span className="admin-hint">
        Aceita 8.000.000,00 ou 8000000. Campo em branco mantém a meta atual daquela empresa.
      </span>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.ok && <p className="admin-success">{state.ok}</p>}
      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar metas'}
        </button>
      </div>
    </form>
  );
}
