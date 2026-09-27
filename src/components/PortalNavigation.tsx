'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './PortalNavigation.css';

export type NavigationItem = {
  href: string;
  label: string;
  icon: 'home' | 'report' | 'radar' | 'news' | 'people' | 'info' | 'costs' | 'settings' | 'users' | 'target' | 'workers' | 'noc';
  exact?: boolean;
  secondary?: boolean;
};

function Icon({ name }: { name: NavigationItem['icon'] | 'menu' | 'close' | 'logout' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    report: <><path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><path d="M16 8a6 6 0 1 0 2 5M12 12l7-7" /><circle cx="12" cy="12" r="1" /></>,
    news: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h3m3 0h2M8 18h3m3 0h2" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-2-4" /></>,
    info: <><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3Z" /><path d="M21 18a1 1 0 0 0 1-1V5a2 2 0 0 0-2-2h-5a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3Z" /></>,
    costs: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18m-5 5h2" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0m2-14a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    workers: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h6v6H9zm3-8v3m0 16v3M1 12h3m16 0h3" /></>,
    noc: <><path d="M3 12h4l2-6 4 12 2-6h6" /><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    logout: <><path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h13" /></>,
  };
  return <svg className="portal-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function PortalNavigation({ brand, account, items, logout }: {
  brand: ReactNode;
  account: ReactNode;
  items: NavigationItem[];
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const menu = dialog.current;
    if (!menu) return;
    // Native dialog makes the background inert and contains keyboard focus.
    const close = () => menu.close();
    const desktop = window.matchMedia('(min-width: 768px)');
    const resized = () => { if (desktop.matches) close(); };
    desktop.addEventListener('change', resized);
    window.addEventListener('popstate', close);
    return () => {
      desktop.removeEventListener('change', resized);
      window.removeEventListener('popstate', close);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const closeMenu = () => dialog.current?.close();
  const navigation = (
    <nav aria-label="Menu principal" className="portal-nav-list">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={`portal-nav-link${item.secondary ? ' portal-nav-sub' : ''}`} onClick={closeMenu}
          aria-label={item.label} title={item.label} aria-current={(item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) ? 'page' : undefined}>
          <Icon name={item.icon} /><span className="portal-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
  const profile = (
    <div className="portal-account">
      {account}
      <form action={logout}><button type="submit" className="portal-signout" aria-label="Sair"><Icon name="logout" /><span className="portal-nav-label">Sair</span></button></form>
    </div>
  );

  return <>
    <a className="portal-skip" href="#portal-content">Ir para o conteúdo</a>
    <header className="portal-topbar">
      <button type="button" className="portal-mobile-toggle" ref={trigger} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="portal-mobile-menu" onClick={() => { dialog.current?.showModal(); setMobileOpen(true); }}><Icon name="menu" /></button>
      {brand}
      <Link href="/saiba-mais" className="portal-info-link" aria-label="Saiba Mais" title="Saiba Mais" aria-current={pathname === '/saiba-mais' ? 'page' : undefined}><Icon name="info" /></Link>
    </header>
    <aside id="portal-sidebar" className="portal-sidebar" data-expanded={expanded} aria-label="Navegação lateral">
      <button type="button" className="portal-toggle portal-sidebar-toggle" aria-label={expanded ? 'Recolher menu' : 'Expandir menu'} aria-expanded={expanded} aria-controls="portal-sidebar" onClick={() => setExpanded(!expanded)}><Icon name="menu" /><span className="portal-nav-label">{expanded ? 'Recolher menu' : 'Expandir menu'}</span></button>
      {navigation}{profile}
    </aside>
    <dialog id="portal-mobile-menu" ref={dialog} className="portal-mobile-menu" aria-label="Menu principal" onClose={() => { setMobileOpen(false); trigger.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div className="portal-mobile-inner">
        <div className="portal-mobile-heading"><span>Menu principal</span><button type="button" className="portal-close" aria-label="Fechar menu" onClick={closeMenu}><Icon name="close" /></button></div>
        {navigation}{profile}
      </div>
    </dialog>
  </>;
}
