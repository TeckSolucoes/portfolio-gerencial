import Link from 'next/link';
import type { CSSProperties } from 'react';
import { countBy } from '@/lib/countBy';
import type { Company } from '@/lib/types';

export function CompanyCard({
  slug,
  company,
  index = 0,
}: {
  slug: string;
  company: Company;
  index?: number;
}) {
  const b = countBy(company.fronts);
  const total = company.fronts.length;
  return (
    <Link
      href={`/${slug}`}
      className={`company-card tone-${company.tone} stagger-in`}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="ctag">{company.tag}</span>
      <h2>{company.name}</h2>
      <p className="ctagline">{company.tagline}</p>
      <div className="company-bar">
        <span className="seg ok" style={{ width: `${(b.ok / total) * 100}%` }} />
        <span className="seg attention" style={{ width: `${(b.attention / total) * 100}%` }} />
        <span className="seg blocked" style={{ width: `${(b.blocked / total) * 100}%` }} />
      </div>
      <div className="company-breakdown">
        <span className="cb-item">
          <span className="d ok"></span>
          {b.ok} em dia
        </span>
        <span className="cb-item">
          <span className="d attention"></span>
          {b.attention} em atenção
        </span>
        <span className="cb-item">
          <span className="d blocked"></span>
          {b.blocked} bloqueada{b.blocked === 1 ? '' : 's'}
        </span>
      </div>
      <span className="cta">Ver detalhes →</span>
    </Link>
  );
}
