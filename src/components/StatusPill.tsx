import { STATUS_LABEL } from '@/lib/status';
import type { FrontStatus } from '@/lib/types';

export function StatusPill({ status }: { status: FrontStatus }) {
  return (
    <span className={`pill-status ${status}`}>
      <span className="d"></span>
      {STATUS_LABEL[status]}
    </span>
  );
}
