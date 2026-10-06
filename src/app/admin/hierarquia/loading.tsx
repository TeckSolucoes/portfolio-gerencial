import './hierarquia.css';

export default function Loading() {
  return <div className="hierarquia" aria-busy="true" aria-live="polite">
    <div className="hier-skeleton hier-skeleton-head" />
    <div className="hier-skeleton hier-skeleton-tabs" />
    <div className="hier-skeleton-grid">
      <div className="hier-skeleton" />
      <div className="hier-skeleton" />
      <div className="hier-skeleton" />
    </div>
    <span className="hier-sr">Carregando Estrutura Comercial…</span>
  </div>;
}
