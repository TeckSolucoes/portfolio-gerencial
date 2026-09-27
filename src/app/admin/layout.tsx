import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { AuditTracker } from '@/components/AuditTracker';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Defesa em profundidade: o proxy.ts já bloqueia /admin pra quem não tem
  // sessão ou é visualizador, mas o guia de auth do Next recomenda não
  // depender só do proxy (não roda em toda navegação client-side em certos
  // casos de cache) — layout e cada Server Action seguram a mesma regra.
  if (!session?.user) redirect('/login');

  return (
    <div className="app portal-app">
      <Header sidebar />
      <main id="portal-content" tabIndex={-1}>
        <AuditTracker />
        {children}
      </main>
    </div>
  );
}
