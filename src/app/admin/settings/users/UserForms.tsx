'use client';

import { useActionState } from 'react';
import { createUser, updateUser, deleteUser } from './actions';
import type { UserModel } from '@/generated/prisma/models';

const ROLE_OPTIONS = [
  { value: 'visualizador', label: 'Visualizador (somente leitura)' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'superadmin', label: 'Superadmin' },
] as const;

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required placeholder="pessoa@tecksolucoes.com.br" />
        </div>
        <div className="admin-field">
          <label htmlFor="password">Senha inicial</label>
          <input id="password" name="password" type="password" required minLength={8} />
        </div>
      </div>
      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="displayName">Nome de exibição</label>
          <input id="displayName" name="displayName" type="text" required placeholder="Nome completo" />
        </div>
        <div className="admin-field">
          <label htmlFor="displayTitle">Cargo/título (opcional)</label>
          <input id="displayTitle" name="displayTitle" type="text" placeholder="Ex.: Dono do Grupo" />
        </div>
        <div className="admin-field admin-field-narrow">
          <label htmlFor="role">Papel</label>
          <select id="role" name="role" defaultValue="visualizador">
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Criando…' : 'Criar usuário'}
        </button>
      </div>
    </form>
  );
}

export function UserRow({ user }: { user: UserModel }) {
  const [state, formAction, pending] = useActionState(updateUser.bind(null, user.id), undefined);

  return (
    <div className="admin-item-row">
      <form action={formAction} className="admin-item-row-fields">
        <div className="admin-field">
          <span className="admin-static-value">{user.email}</span>
        </div>
        <div className="admin-field">
          <input name="displayName" type="text" defaultValue={user.displayName} required />
        </div>
        <div className="admin-field">
          <input name="displayTitle" type="text" defaultValue={user.displayTitle ?? ''} placeholder="Cargo/título" />
        </div>
        <div className="admin-field admin-field-narrow">
          <select name="role" defaultValue={user.role}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field admin-field-narrow">
          <input name="newPassword" type="password" placeholder="Nova senha (opcional)" minLength={8} />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      <form
        action={deleteUser.bind(null, user.id)}
        onSubmit={(e) => {
          if (!confirm(`Remover o acesso de ${user.email}?`)) e.preventDefault();
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
