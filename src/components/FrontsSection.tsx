'use client';

import { useState } from 'react';
import { FilterChips } from './FilterChips';
import { FrontCard } from './FrontCard';
import type { Front } from '@/lib/types';

// Owns the filter-chip interaction (client boundary) so the company page itself
// stays a server component. Output DOM/classes match the mockup's fronts-grid exactly.
export function FrontsSection({ companySlug, fronts }: { companySlug: string; fronts: Front[] }) {
  const [active, setActive] = useState('all');
  const list = active === 'all' ? fronts : fronts.filter((f) => f.status === active);

  return (
    <>
      <FilterChips active={active} onChange={setActive} />
      {/* key={active} força remount do grid ao trocar o filtro, replayando o
          stagger-in das cards — sem isso o React reconciliaria os elementos
          existentes e a troca de filtro pareceria instantânea/sem feedback. */}
      <div className="fronts-grid" key={active}>
        {list.length === 0 ? (
          <p
            className="stagger-in"
            style={{ color: 'var(--text-faint)', fontFamily: 'var(--mono)', fontSize: '12.5px' }}
          >
            Nenhuma frente nesse status no momento.
          </p>
        ) : (
          list.map((f, i) => <FrontCard key={f.id} companySlug={companySlug} front={f} index={i} />)
        )}
      </div>
    </>
  );
}
