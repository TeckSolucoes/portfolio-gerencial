import type { CSSProperties } from 'react';
import { ITEM_STATUS_LABEL, itemPillClass } from '@/lib/status';
import type { FrontItem } from '@/lib/types';

function ItemRow({ item, index }: { item: FrontItem; index: number }) {
  const cls = itemPillClass(item.status);
  // Cap do delay em listas longas: acima de ~10 itens o stagger vira espera
  // perceptível em vez de leveza (mesma preocupação do stagger das cards).
  return (
    <div className="item-row stagger-in" style={{ '--i': Math.min(index, 10) } as CSSProperties}>
      <div style={{ minWidth: 220, flex: 1 }}>
        <div className="it-title">{item.title}</div>
        {item.note && <div className="it-note">{item.note}</div>}
      </div>
      {cls ? (
        <span className={`pill-status ${cls}`}>
          <span className="d"></span>
          {ITEM_STATUS_LABEL[item.status]}
        </span>
      ) : (
        <span className="pill-status" style={{ background: 'var(--hair)', color: 'var(--text-dim)' }}>
          <span className="d" style={{ background: 'var(--text-faint)' }}></span>
          {ITEM_STATUS_LABEL[item.status]}
        </span>
      )}
      <span className="it-updated">Atualizado {item.updated}</span>
    </div>
  );
}

export function ItemsList({ items }: { items: FrontItem[] }) {
  return (
    <div className="items-list">
      {items.map((item, i) => (
        <ItemRow key={i} item={item} index={i} />
      ))}
    </div>
  );
}
