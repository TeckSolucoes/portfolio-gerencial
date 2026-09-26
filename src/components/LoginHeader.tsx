import { BrandMark } from './BrandMark';
import { NOME_PRODUTO } from '@/lib/marca';

// Reusa o elemento <header> e a classe .brand — mesmo padrão visual do
// Header do dashboard (globals.css estiliza o seletor `header` genérico) —
// só sem o bloco .header-right, que mostraria um usuário logado antes
// mesmo do acesso acontecer.
export function LoginHeader() {
  return (
    <header className="login-header">
      <div className="brand">
        <BrandMark />
        <div className="brand-text">
          <span className="wd">Teck Soluções</span>
          <span className="sub">{NOME_PRODUTO}</span>
        </div>
      </div>
    </header>
  );
}
