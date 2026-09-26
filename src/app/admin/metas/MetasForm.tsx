'use client';

import { useActionState } from 'react';
import { salvarMetas } from './actions';
import { EMPRESAS } from '@/lib/empresas';

export function MetasForm({ mes, atuais }: { mes: string; atuais: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(salvarMetas, undefined);

  return (
    <form action={formAction} className="adm-card" key={mes}>
      <input type="hidden" name="mes" value={mes} />
      <div className="adm-grid">
        {EMPRESAS.map((e) => (
          <div className="adm-field" key={e}>
            <label className="adm-label" htmlFor={`valor_${e}`}>Meta {e}</label>
            <div className="adm-inline">
              <div className="adm-money">
                <span className="adm-money-prefix" aria-hidden="true">R$</span>
                <input
                  id={`valor_${e}`}
                  name={`valor_${e}`}
                  type="text"
                  inputMode="decimal"
                  defaultValue={atuais[e] ?? ''}
                  placeholder="8.000.000,00"
                  aria-describedby="metas-hint"
                />
              </div>
              {atuais[e] && (
                <button
                  type="submit"
                  name="limpar"
                  value={e}
                  formNoValidate
                  className="btn btn-danger"
                  disabled={pending}
                  aria-label={`Limpar meta de ${e}`}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        ))}
        <span className="adm-hint adm-span-2" id="metas-hint">
          Aceita 8.000.000,00 ou 8000000. Campo em branco mantém a meta atual daquela empresa.
        </span>
      </div>

      <div className="adm-footer">
        <p className={state?.ok ? 'adm-msg adm-msg-ok' : 'adm-msg adm-msg-error'} role="alert">
          {state?.error ?? state?.ok}
        </p>
        <div className="adm-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar metas'}
          </button>
        </div>
      </div>
    </form>
  );
}
