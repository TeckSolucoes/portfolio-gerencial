import Link from 'next/link';
import type { Role } from '@/generated/prisma/enums';

export function AdminNav({ role }: { role: Role }) {
  return (
    <nav className="admin-nav">
      <Link href="/admin" className="btn-ghost">
        Visão geral
      </Link>
      {role === 'superadmin' && (
        <>
          <Link href="/admin/settings/status-mapping" className="btn-ghost">
            Mapeamento Jira
          </Link>
          <Link href="/admin/settings/users" className="btn-ghost">
            Usuários
          </Link>
        </>
      )}
      <Link href="/" className="btn-ghost admin-nav-link-muted">
        ← Ver portfólio
      </Link>
    </nav>
  );
}
