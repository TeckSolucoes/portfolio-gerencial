'use client';

import { restoreAbcCardFronts } from '@/app/admin/companies/[companySlug]/restoreAbcActions';

export function RestoreAbcButton({ companySlug }: { companySlug: string }) {
  return (
    <form
      action={restoreAbcCardFronts.bind(null, companySlug)}
      onSubmit={(e) => {
        if (
          !confirm(
            'Isso arquiva as frentes atuais da ABC Card e recria as 21 frentes reconstruídas a partir do link externo. Confirma?',
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger">
        Restaurar 21 frentes da ABC Card
      </button>
    </form>
  );
}
