'use client';

import { useActionState, useState } from 'react';
import { createUser, updateUser, deleteUser } from './actions';
import { PasswordField } from '@/components/PasswordField';
import { EMPRESAS, lerEmpresas } from '@/lib/empresas';
import type { UserModel } from '@/generated/prisma/models';

const ROLE_OPTIONS = [
  { value: 'visualizador', label: 'Visualizador (somente leitura)' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'superadmin', label: 'Superadmin' },
] as const;

function AcessoFields({
  role,
  empresasAtuais,
  escopoAtual,
}: {
  role: string;
  empresasAtuais: readonly string[];
  escopoAtual: string;
}) {
  const ehSuper = role === 'superadmin';
  return (
    <div className="admin-field-row admin-access-row">
      <div className="admin-field">
        <label>Empresas que pode ver</label>
        <div className="admin-access-checks">
          {EMPRESAS.map((e) => (
            <label key={e} className="admin-toggle">
              <input
                type="checkbox"
                name="empresas"
                value={e}
                defaultChecked={ehSuper || empresasAtuais.includes(e)}
                disabled={ehSuper}
              />
              {e}
            </label>
          ))}
        </div>
        <span className="admin-hint">
          {ehSuper
            ? 'Superadmin vê todas as empresas sempre.'
            : 'O usuário só vê dados das empresas marcadas; sem empresa marcada ele não vê relatórios.'}
        </span>
      </div>
      <div className="admin-field">
        <label>Restringir à turma do gerente (opcional)</label>
        <input
          name="escopoGerente"
          type="text"
          defaultValue={escopoAtual}
          placeholder="Primeiro nome, ex.: Luana"
          disabled={ehSuper}
        />
        <span className="admin-hint">
          {ehSuper
            ? 'Não se aplica a superadmin.'
            : 'Para gerente/visualizador: só enxerga a turma desse gerente. Em branco, vê a empresa inteira.'}
        </span>
      </div>
    </div>
  );
}

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);
  const [role, setRole] = useState('visualizador');

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-field-row">
        <div className="admin-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required placeholder="pessoa@tecksolucoes.com.br" />
        </div>
        <div className="admin-field">
          <label htmlFor="password">Senha inicial</label>
          <PasswordField id="password" name="password" required minLength={8} />
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
          <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AcessoFields key={role} role={role} empresasAtuais={[]} escopoAtual="" />

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
  const [role, setRole] = useState<string>(user.role);
  const empresas = lerEmpresas(user.empresas);

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
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field admin-field-narrow">
          <PasswordField name="newPassword" placeholder="Nova senha (opcional)" minLength={8} />
        </div>
        <div className="admin-access-full">
          <AcessoFields key={role} role={role} empresasAtuais={empresas} escopoAtual={user.escopoGerente ?? ''} />
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
      <p className="admin-hint admin-form-error-inline">
        Perfil: {ROLE_OPTIONS.find((o) => o.value === user.role)?.label ?? user.role} · Empresas:{' '}
        {user.role === 'superadmin' ? 'todas' : empresas.length ? empresas.join(', ') : 'nenhuma (não vê relatórios)'} ·
        Escopo:{' '}
        {user.role === 'superadmin' ? '-' : user.escopoGerente ? `turma de ${user.escopoGerente}` : 'empresa inteira'}
      </p>
      {state?.error && <p className="form-error admin-form-error-inline">{state.error}</p>}
    </div>
  );
}
