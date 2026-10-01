import Link from 'next/link';
import type { Role } from '@/generated/prisma/enums';

export function AdminNav({ role }: { role: Role }) {
  return (
    <nav className="admin-nav">
      {role === 'superadmin' && (
        <>
          <Link href="/admin/settings/users" className="btn-ghost">
            Usuários
          </Link>
          <Link href="/admin/metas" className="btn-ghost">
            Metas
          </Link>
          <Link href="/admin/workers" className="btn-ghost">
            Workers
          </Link>
          <Link href="/admin/whatsapp" className="btn-ghost">
            WhatsApp
          </Link>
        </>
      )}
      <Link href="/" className="btn-ghost admin-nav-link-muted">
        ← Início
      </Link>
    </nav>
  );
}
