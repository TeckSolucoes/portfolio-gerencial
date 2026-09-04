import { Header } from '@/components/Header';

// Mesmo casco visual do (dashboard) — Header já se adapta sozinho a "sem
// sessão" (não mostra avatar nem link de Administração), então não precisa
// de uma versão "pública" separada dele.
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main>{children}</main>
    </div>
  );
}
