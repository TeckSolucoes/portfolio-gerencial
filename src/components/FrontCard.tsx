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
  linkable = true,
}: {
  companySlug: string;
  front: Front;
  index?: number;
  // false no link de compartilhamento externo — mostra só o resumo da
  // empresa, sem dar acesso ao detalhe/itens de cada frente.
  linkable?: boolean;
}) {
  const className = `front-card status-${front.status} stagger-in`;
  const style = { '--i': index } as CSSProperties;

  const content = (
    <>
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
      {linkable && <span className="fc-arrow">→</span>}
    </>
  );

  if (!linkable) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/${companySlug}/${front.id}`} className={className} style={style}>
      {content}
    </Link>
  );
}
