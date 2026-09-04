'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { PasswordField } from './PasswordField';

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const result = await signIn('credentials', { email, password, redirect: false });

    if (result?.error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  function handleForgotClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    console.log('[teck-login] solicitação de recuperação de senha');
  }

  return (
    <form className="access-form" noValidate onSubmit={handleSubmit}>
      <div className="access-card-label">Acesso ao portfólio</div>
      <div className="field">
        <label htmlFor="email">E-mail corporativo</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="voce@tecksolucoes.com.br"
          autoComplete="username"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <PasswordField
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="form-row">
        <label className="check">
          <input type="checkbox" name="remember" />
          Manter conectado
        </label>
        <a href="#" className="link-muted" onClick={handleForgotClick}>
          Esqueci minha senha
        </a>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="submit-btn" disabled={loading}>
        <span className="btn-label">{loading ? 'Entrando…' : 'Entrar no portfólio'}</span>
        <span className="btn-arrow">→</span>
      </button>
      <p className="form-note">Acesso restrito a colaboradores autorizados da Teck Soluções.</p>
    </form>
  );
}
