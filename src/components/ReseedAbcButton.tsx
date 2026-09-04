'use client';

import { reseedAbcCardFromEntregas } from '@/app/admin/companies/[companySlug]/reseedAbcActions';

export function ReseedAbcButton({ companySlug }: { companySlug: string }) {
  return (
    <form
      action={reseedAbcCardFromEntregas.bind(null, companySlug)}
      onSubmit={(e) => {
        if (!confirm('Isso arquiva todas as frentes atuais da ABC Card e cria as 8 novas frentes do Entregas.md. Confirma?')) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger">
        Substituir frentes pelo Entregas.md
      </button>
    </form>
  );
}
