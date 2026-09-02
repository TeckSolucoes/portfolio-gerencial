import { HeroBackdrop } from '@/components/HeroBackdrop';
import { HeroHeadline } from '@/components/HeroHeadline';
import { LoginForm } from '@/components/LoginForm';
import { LoginHeader } from '@/components/LoginHeader';
import { Starfield } from '@/components/Starfield';

const EYEBROW = 'Portfólio executivo · Teck Soluções';
const HEADLINE_LINES = [
  ['Não', 'esperamos', 'o', 'futuro.'],
  ['Nós', 'o', 'pilotamos.'],
];

export default function LoginPage() {
  return (
    <>
      <div className="stage" aria-hidden="true">
        <Starfield />
        <HeroBackdrop />
      </div>

      {/* Não usa <main>: o layout raiz já renderiza um <main> em volta desta página. */}
      <div className="login-shell">
        <LoginHeader />

        <div className="hero">
          <div className="hero-copy">
            <HeroHeadline eyebrow={EYEBROW} lines={HEADLINE_LINES} />
            <div className="brand-signature">Teck Soluções</div>
            <div className="hero-orbit-deco" aria-hidden="true"></div>
          </div>

          <div className="hero-form">
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
