import type { Metadata } from 'next';
import { NOME_PRODUTO } from '@/lib/marca';
import './globals.css';

export const metadata: Metadata = {
  title: `${NOME_PRODUTO} Teck`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="mesh"></div>
        {children}
      </body>
    </html>
  );
}
