import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="crumbs">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">›</span>}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span className="current">{item.label}</span>}
        </Fragment>
      ))}
    </div>
  );
}
