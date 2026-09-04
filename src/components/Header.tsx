import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { BrandMark } from './BrandMark';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const canEdit = user && user.role !== 'visualizador';

  return (
    <header>
      <Link href="/" className="brand">
        <BrandMark />
        <div className="brand-text">
          <span className="wd">Teck Soluções</span>
          <span className="sub">Portfólio de Projetos</span>
        </div>
      </Link>
      <div className="header-right">
        <div className="synced">
          <span className="sdot"></span>Sincronizado com o Jira · hoje às 08:14
        </div>
        {canEdit && (
          <Link href="/admin" className="admin-link">
            Administração
          </Link>
        )}
        {user && (
          <div className="user">
            <div className="avatar">{initialsFrom(user.displayName)}</div>
            <div className="user-name">
              <b>{user.displayName}</b>
              <span>{user.displayTitle ?? user.role}</span>
            </div>
          </div>
        )}
        {user && (
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button type="submit" className="btn-ghost" title="Sair">
              Sair
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
