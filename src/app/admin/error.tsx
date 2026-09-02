'use client';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="admin-notice admin-notice-error">
      <p>Não foi possível carregar os dados administrativos.</p>
      <p className="admin-error-detail">
        {error.message || 'Verifique se DATABASE_URL está configurado e o banco está acessível.'}
      </p>
      <button type="button" className="btn btn-secondary" onClick={() => reset()}>
        Tentar novamente
      </button>
    </div>
  );
}
