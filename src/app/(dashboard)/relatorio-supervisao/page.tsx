import { requireFuncionalidadeForPage } from '@/lib/authz';
import './relatorio-supervisao.css';

export const dynamic = 'force-dynamic';

export default async function RelatorioSupervisaoPage() {
  await requireFuncionalidadeForPage('relatorio_supervisao');

  return (
    <main className="supervisao">
      <header className="supervisao-head">
        <div>
          <p className="supervisao-kicker">Operação · Acompanhamento</p>
          <h1>Relatório Supervisão</h1>
          <p>A visão de supervisão está sendo preparada. Os indicadores e filtros serão definidos na próxima etapa.</p>
        </div>
        <span>Em preparação</span>
      </header>
      <section className="supervisao-empty" aria-label="Relatório em preparação">
        <div aria-hidden="true">↗</div>
        <h2>Estrutura criada</h2>
        <p>Esta área receberá a leitura operacional específica da supervisão.</p>
      </section>
    </main>
  );
}
