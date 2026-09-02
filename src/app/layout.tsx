import type { Metadata } from 'next';
import { Unbounded, Manrope, Fragment_Mono } from 'next/font/google';
import './globals.css';

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-unbounded',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
});

const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-fragment-mono',
});

export const metadata: Metadata = {
  title: 'Portfólio Teck',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${unbounded.variable} ${manrope.variable} ${fragmentMono.variable}`}>
      <body>
        <div className="mesh"></div>
        {children}
      </body>
    </html>
  );
}
