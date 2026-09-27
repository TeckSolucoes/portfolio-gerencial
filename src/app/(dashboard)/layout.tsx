import { Header } from '@/components/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app portal-app">
      <Header sidebar />
      <main id="portal-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
