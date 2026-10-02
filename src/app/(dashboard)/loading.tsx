import './carregando.css';

// Vale para as rotas do painel que não têm um carregamento próprio. Fica neutro de propósito:
// um esqueleto com a cara de uma tela específica (antes era o da home) engana sobre o que vem.
export default function Carregando() {
  return (
    <div className="carregando" aria-busy="true" role="status">
      <span className="sr-only">Carregando…</span>
      <div className="ck ck-kicker" />
      <div className="ck ck-titulo" />
      <div className="ck ck-linha" />
      <div className="ck-grade">
        <div className="ck ck-bloco" />
        <div className="ck ck-bloco" />
        <div className="ck ck-bloco" />
      </div>
      <div className="ck ck-painel" />
    </div>
  );
}
