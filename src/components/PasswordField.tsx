'use client';

import { useState } from 'react';

// Componente único usado em 3 lugares (login, criação de usuário, troca de
// senha por linha) — evita repetir o toggle show/hide 3x com o mesmo bug
// potencial em cada um.
export function PasswordField({
  id,
  name,
  placeholder,
  autoComplete,
  required,
  minLength,
  defaultValue,
}: {
  id?: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        tabIndex={-1}
      >
        {visible ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 2l12 12M6.6 6.7a2.2 2.2 0 003.1 3.1M4.2 4.3C2.6 5.4 1.4 7 1 8c1.2 2.8 4 5 7 5 1.1 0 2.1-.3 3-.8M9.9 3.2c.4-.1.7-.2 1.1-.2 3 0 5.8 2.2 7 5-.4.9-1 1.8-1.6 2.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M1 8c1.2-2.8 4-5 7-5s5.8 2.2 7 5c-1.2 2.8-4 5-7 5s-5.8-2.2-7-5z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        )}
      </button>
    </div>
  );
}
