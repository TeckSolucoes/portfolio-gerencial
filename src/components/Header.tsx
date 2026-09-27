import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { carregarAcesso } from '@/lib/acesso';
import { BrandMark } from './BrandMark';
import { NOME_PRODUTO } from '@/lib/marca';
import { PortalNavigation, type NavigationItem } from './PortalNavigation';
import { registrarAuditoria } from '@/lib/auditoria';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export async function Header({ sidebar = false }: { sidebar?: boolean }) {
  const session = await auth();
  const user = session?.user;
  const canEdit = user && user.role !== 'visualizador';
  const temEmpresa = user ? ((await carregarAcesso())?.empresas.length ?? 0) > 0 : false;

  if (sidebar && user) {
    const items: NavigationItem[] = [{ href: '/', label: 'Início', icon: 'home', exact: true }];
    if (temEmpresa) items.push(
      { href: '/relatorio', label: 'Relatório Gerencial', icon: 'report' },
      { href: '/monitoramento', label: 'Monitoramento', icon: 'radar' },
    );
    items.push({ href: '/diario-oficial', label: 'Diário Oficial', icon: 'news' });
    if (user.role === 'superadmin') items.push({ href: '/transparencia', label: 'Transparência', icon: 'people' });
    items.push(
      { href: '/saiba-mais', label: 'Saiba Mais', icon: 'info' },
      { href: '/custos', label: 'Custos', icon: 'costs' },
    );
    if (canEdit) items.push({ href: '/admin', label: 'Administração', icon: 'settings', exact: true });
    if (user.role === 'superadmin') items.push(
      { href: '/admin/settings/users', label: 'Usuários', icon: 'users', secondary: true },
      { href: '/admin/metas', label: 'Metas', icon: 'target', secondary: true },
      { href: '/admin/workers', label: 'Workers', icon: 'workers', secondary: true },
    );
    return <PortalNavigation items={items}
      brand={<Link href="/" className="brand"><BrandMark /><div className="brand-text"><span className="wd">Teck Soluções</span><span className="sub">{NOME_PRODUTO}</span></div></Link>}
      account={<div className="user"><div className="avatar">{initialsFrom(user.displayName)}</div><div className="user-name"><b>{user.displayName}</b><span>{user.displayTitle ?? user.role}</span></div></div>}
      logout={async () => {
        'use server';
        await registrarAuditoria(user, { acao: 'Saída do portal', rota: '/login' }).catch((error) => {
          console.error('Falha ao registrar saída no log de auditoria.', error);
        });
        await signOut({ redirectTo: '/login' });
      }}
    />;
  }

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
        {user?.role === 'superadmin' && (
          <Link href="/transparencia" className="admin-link">
            Transparência
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
