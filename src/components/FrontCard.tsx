import Link from 'next/link';
import type { CSSProperties } from 'react';
import { StatusPill } from './StatusPill';
import { PriorityTag } from './PriorityTag';
import { ProgressBar } from './ProgressBar';
import { OwnerBadge } from './OwnerBadge';
import type { Front } from '@/lib/types';

export function FrontCard({
  companySlug,
  front,
  index = 0,
}: {
  companySlug: string;
  front: Front;
  index?: number;
}) {
  return (
    <Link
      href={`/${companySlug}/${front.id}`}
      className={`front-card status-${front.status} stagger-in`}
      style={{ '--i': index } as CSSProperties}
    >
      <div className="fc-main">
        <div className="fc-head">
          <h3>{front.title}</h3>
          <StatusPill status={front.status} />
          <PriorityTag prioritized={front.prioritized} />
        </div>
        <div className="fc-foot">
          <OwnerBadge name={front.owner} initials={front.ownerInit} />
          <span className="fc-next">
            Próximo: {front.nextMilestone} · {front.nextDate}
          </span>
          <span className="fc-items">{front.items.length} itens</span>
        </div>
      </div>
      <div className="fc-progress">
        <ProgressBar percent={front.progress} />
        <span className="fc-progress-value">{front.progress}%</span>
      </div>
      <span className="fc-arrow">→</span>
    </Link>
  );
}
