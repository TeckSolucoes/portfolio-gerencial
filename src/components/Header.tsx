import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { carregarAcesso } from '@/lib/acesso';
import { BrandMark } from './BrandMark';
import { NOME_PRODUTO } from '@/lib/marca';
import { PortalNavigation, type NavigationItem } from './PortalNavigation';
import { registrarAuditoria } from '@/lib/auditoria';
import { podeAcessar, podeVerAba } from '@/lib/permissoes';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export async function Header({ sidebar = false }: { sidebar?: boolean }) {
  const session = await auth();
  const user = session?.user;
  const acesso = user ? await carregarAcesso() : null;
  const temEmpresa = (acesso?.empresas.length ?? 0) > 0;

  if (sidebar && user) {
    const items: NavigationItem[] = [{ href: '/', label: 'Início', icon: 'home', exact: true }];
    if (acesso && temEmpresa && podeAcessar(acesso, 'relatorio')) items.push({ href: '/relatorio', label: 'Relatório Gerencial', icon: 'report' });
    if (acesso && temEmpresa && podeAcessar(acesso, 'relatorio') && podeVerAba(acesso, 'Geral')) items.push({ href: '/weeky', label: 'Weeky', icon: 'report' });
    if (acesso && temEmpresa && podeAcessar(acesso, 'monitoramento')) items.push({ href: '/monitoramento', label: 'Em Atenção', icon: 'radar' });
    if (acesso && podeAcessar(acesso, 'roteiros')) items.push({ href: '/roteiros', label: 'Roteiros', icon: 'guide' });
    if (acesso && podeAcessar(acesso, 'diario_oficial')) items.push({ href: '/diario-oficial', label: 'Diário Oficial', icon: 'news' });
    if (acesso && podeAcessar(acesso, 'transparencia')) items.push({ href: '/transparencia', label: 'Portal Transparência', icon: 'people' });
    if (acesso && podeAcessar(acesso, 'custos')) items.push({ href: '/custos', label: 'Custos', icon: 'costs' });
    if (acesso && podeAcessar(acesso, 'juridico')) items.push({ href: '/juridico', label: 'Jurídico', icon: 'legal' });
    if (acesso && podeAcessar(acesso, 'sistemas')) items.push({ href: '/sistemas', label: 'Sistemas', icon: 'apps' });
    if (user.role === 'superadmin') items.push({ href: '/admin/settings/users', label: 'Usuários', icon: 'users' });
    if (acesso && podeAcessar(acesso, 'hierarquia')) items.push({ href: '/admin/hierarquia', label: 'Estrutura Comercial', icon: 'hierarchy', exact: true });
    if (acesso?.perfil === 'superadmin' && podeAcessar(acesso, 'hierarquia')) {
      items.push({ href: '/admin/hierarquia/promotoras', label: 'Organograma Promotoras', icon: 'hierarchy' });
      items.push({ href: '/admin/escritorio', label: 'Escritório Virtual', icon: 'apps' });
    }
    if (acesso && podeAcessar(acesso, 'metas')) items.push({ href: '/admin/metas', label: 'Metas', icon: 'target' });
    if (acesso && podeAcessar(acesso, 'workers')) items.push({ href: '/admin/workers', label: 'Workers', icon: 'workers' });
    if (acesso && podeAcessar(acesso, 'whatsapp')) items.push({ href: '/admin/whatsapp', label: 'WhatsApp', icon: 'whatsapp' });
    if (acesso && podeAcessar(acesso, 'noc')) items.push({ href: '/noc', label: 'NOC', icon: 'noc' });
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
        {acesso && temEmpresa && podeAcessar(acesso, 'relatorio') && (
          <Link href="/relatorio" className="admin-link">
            Relatório Gerencial
          </Link>
        )}
        {acesso && temEmpresa && podeAcessar(acesso, 'monitoramento') && (
          <Link href="/monitoramento" className="admin-link">
            Em Atenção
          </Link>
        )}
        {acesso && podeAcessar(acesso, 'diario_oficial') && (
          <Link href="/diario-oficial" className="admin-link">
            Diário Oficial
          </Link>
        )}
        {acesso && podeAcessar(acesso, 'transparencia') && (
          <Link href="/transparencia" className="admin-link">
            Portal Transparência
          </Link>
        )}
        {user && (user.role === 'superadmin' || (acesso && (podeAcessar(acesso, 'metas') || podeAcessar(acesso, 'workers') || podeAcessar(acesso, 'whatsapp')))) && (
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

