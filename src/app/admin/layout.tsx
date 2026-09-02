import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { AdminNav } from '@/components/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Defesa em profundidade: o proxy.ts já bloqueia /admin pra quem não tem
  // sessão ou é visualizador, mas o guia de auth do Next recomenda não
  // depender só do proxy (não roda em toda navegação client-side em certos
  // casos de cache) — layout e cada Server Action seguram a mesma regra.
  if (!session?.user) redirect('/login');
  if (session.user.role === 'visualizador') redirect('/');

  return (
    <div className="app">
      <Header />
      <main>
        <AdminNav role={session.user.role} />
        {children}
      </main>
    </div>
  );
}
