'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { signIn } from 'next-auth/react';
import { PasswordField } from './PasswordField';

// router.push() não avisa quando a navegação termina; sem isso, se a home demorar (rede ruim,
// base lenta), o botão ficava "Entrando…" travado pra sempre, sem erro e sem como tentar de novo.
const LIMITE_NAVEGACAO_MS = 15_000;

// Vazio até o usuário gerar uma chave em recaptcha admin (ver .env.example)
// — nesse meio tempo o widget nem renderiza, login segue funcionando sem captcha.
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha?: { getResponse: (id?: number) => string; reset: (id?: number) => void };
  }
}

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const captchaToken = RECAPTCHA_SITE_KEY ? window.grecaptcha?.getResponse() : undefined;
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setError('Confirme que você não é um robô.');
      return;
    }

    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const result = await signIn('credentials', { email, password, captchaToken, redirect: false });

    window.grecaptcha?.reset();

    if (result?.error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();

    // Se em 15s o login ainda estiver nesta tela (navegação travou), devolve o controle ao
    // usuário em vez de deixar "Entrando…" girando pra sempre sem explicação nem saída.
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Isso está demorando mais que o esperado. Tente novamente.');
    }, LIMITE_NAVEGACAO_MS);
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
      <div className="login-help">
        <a href="#" className="link-muted" onClick={handleForgotClick}>
          Esqueci minha senha
        </a>
      </div>
      {RECAPTCHA_SITE_KEY && (
        <>
          <Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive" />
          <div className="g-recaptcha" data-sitekey={RECAPTCHA_SITE_KEY} />
        </>
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="submit-btn" disabled={loading}>
        <span className="btn-label">{loading ? 'Entrando…' : 'Entrar no portfólio'}</span>
        <span className="btn-arrow">→</span>
      </button>
    </form>
  );
}
