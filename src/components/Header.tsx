import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { carregarAcesso } from '@/lib/acesso';
import { BrandMark } from './BrandMark';
import { NOME_PRODUTO } from '@/lib/marca';

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
  const temEmpresa = user ? ((await carregarAcesso())?.empresas.length ?? 0) > 0 : false;

  return (
    <header>
      <Link href="/" className="brand">
        <BrandMark />
        <div className="brand-text">
          <span className="wd">Teck Soluções</span>
          <span className="sub">{NOME_PRODUTO}</span>
        </div>
      </Link>
      <div className="header-right">
        {temEmpresa && (
          <Link href="/relatorio" className="admin-link">
            Relatório Gerencial
          </Link>
        )}
        {temEmpresa && (
          <Link href="/monitoramento" className="admin-link">
            Monitoramento
          </Link>
        )}
        {user && (
          <Link href="/diario-oficial" className="admin-link">
            Diário Oficial
          </Link>
        )}
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
