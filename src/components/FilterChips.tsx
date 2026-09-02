'use client';

const FILTERS: { val: string; label: string }[] = [
  { val: 'all', label: 'Todas' },
  { val: 'ok', label: 'Em dia' },
  { val: 'attention', label: 'Atenção' },
  { val: 'blocked', label: 'Bloqueadas' },
];

export function FilterChips({ active, onChange }: { active: string; onChange: (val: string) => void }) {
  return (
    <div className="filters" style={{ marginBottom: 24 }}>
      {FILTERS.map((f) => (
        <button
          key={f.val}
          type="button"
          className={`fchip${active === f.val ? ' active' : ''}`}
          onClick={() => onChange(f.val)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
