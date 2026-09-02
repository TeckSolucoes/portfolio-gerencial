import { StatusPill } from './StatusPill';
import { PriorityTag } from './PriorityTag';
import { ProgressBar } from './ProgressBar';
import type { Company, Front } from '@/lib/types';

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="fd-meta-item">
      <div className="ml">{label}</div>
      <div className="mv">{value}</div>
    </div>
  );
}

export function FrontDetailHead({ front, company }: { front: Front; company: Company }) {
  return (
    <div className="fd-head">
      <div className="fd-top">
        <h2 className="fd-title">{front.title}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill status={front.status} />
          <PriorityTag prioritized={front.prioritized} />
        </div>
      </div>
      <div className="fd-progress-wrap">
        <div className="plabel">
          <span>Progresso</span>
          <span>{front.progress}%</span>
        </div>
        <ProgressBar percent={front.progress} />
      </div>
      <div className="fd-meta">
        <MetaItem label="Responsável" value={front.owner} />
        <MetaItem label="Próximo marco" value={front.nextMilestone} />
        <MetaItem label="Data prevista" value={front.nextDate} />
        <MetaItem label="Empresa" value={company.name} />
      </div>
    </div>
  );
}
