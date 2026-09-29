import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { AuditTracker } from '@/components/AuditTracker';

// Header é Server Component assíncrono (sessão + permissões do banco). Sem o Suspense aqui,
// qualquer lentidão nele deixava a troca de rota (ex.: login -> home) parada em branco: o
// loading.tsx da página não ajuda, porque só envolve {children}, não o layout que o contém.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app portal-app">
      <Suspense fallback={null}>
        <Header sidebar />
      </Suspense>
      <main id="portal-content" tabIndex={-1}><AuditTracker />{children}</main>
    </div>
  );
}
