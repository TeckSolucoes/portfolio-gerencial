'use client';

import './hierarquia.css';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="hierarquia">
    <section className="hier-state hier-state-error" role="alert">
      <span className="hier-state-icon" aria-hidden="true">!</span>
      <h1>Não foi possível carregar a Estrutura Comercial</h1>
      <p>Os cadastros não foram alterados. Tente carregar os dados novamente.</p>
      <button type="button" onClick={reset}>Tentar novamente</button>
    </section>
  </div>;
}
