function BreakdownItem({ label, value, cls }: { label: string; value: number; cls: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="gb-item">
      <span className={`d ${cls}`} />
      <div className="gtext">
        <div className="gv">{value}</div>
        <div className="gl">{label}</div>
      </div>
    </div>
  );
}

export function GroupStatRow({
  total,
  ok,
  attention,
  blocked,
}: {
  total: number;
  ok: number;
  attention: number;
  blocked: number;
}) {
  return (
    <div className="grouprow">
      <div className="grouprow-total">
        <div className="gl">Frentes ativas</div>
        <div className="gv">{total}</div>
      </div>
      <div className="grouprow-breakdown">
        <BreakdownItem label="Em dia" value={ok} cls="good" />
        <BreakdownItem label="Em atenção" value={attention} cls="warn" />
        <BreakdownItem label="Bloqueadas" value={blocked} cls="bad" />
      </div>
    </div>
  );
}
