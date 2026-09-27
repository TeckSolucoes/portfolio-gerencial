import { requireFuncionalidadeForPage } from '@/lib/authz';
import { carregarEstadoNoc } from '@/lib/noc';
import Link from 'next/link';
import './noc.css';

export const dynamic = 'force-dynamic';

const dataHora = (valor: string | null) => valor
  ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  : '—';

export default async function NocPage() {
  await requireFuncionalidadeForPage('noc');
  const estado = await carregarEstadoNoc();
  return <div className="noc">
    <header className="noc-head">
      <div>
        <p className="noc-kicker">Operação · Saúde do portal</p>
        <h1>NOC</h1>
        <p className="noc-sub">Banco, volume, backup, workers e fontes acompanhados em um único painel.</p>
      </div>
      <div className={`noc-geral ${estado.nivel}`}><span />{estado.nivel === 'ok' ? 'Operação normal' : estado.nivel === 'erro' ? 'Ação necessária' : 'Requer atenção'}</div>
    </header>

    <section className="noc-kpis" aria-label="Resumo das fontes">
      <article><span>Fontes</span><strong>{estado.totais.fontes}</strong></article>
      <article className="ok"><span>Saudáveis</span><strong>{estado.totais.saudaveis}</strong></article>
      <article className="atencao"><span>Atenção</span><strong>{estado.totais.atencao}</strong></article>
      <article className="erro"><span>Com erro</span><strong>{estado.totais.erros}</strong></article>
    </section>

    <section aria-labelledby="noc-servicos">
      <div className="noc-section-head"><div><h2 id="noc-servicos">Infraestrutura</h2><p>Verificações feitas no servidor desta instância.</p></div><Link href="/noc">Atualizar</Link></div>
      <div className="noc-services">
        {estado.servicos.map((item) => <article key={item.nome} className={`noc-card ${item.nivel}`}>
          <div className="noc-card-title"><span className="noc-dot" /><h3>{item.nome}</h3></div>
          <strong>{item.resumo}</strong>
          {item.detalhe && <p>{item.detalhe}</p>}
        </article>)}
      </div>
    </section>

    <section aria-labelledby="noc-fontes">
      <div className="noc-section-head"><div><h2 id="noc-fontes">Workers e fontes</h2><p>Última tentativa, próxima execução e mensagem operacional.</p></div><time dateTime={estado.geradoEm}>Atualizado em {dataHora(estado.geradoEm)}</time></div>
      <div className="noc-table-wrap">
        <table className="noc-table">
          <thead><tr><th>Fonte</th><th>Estado</th><th>Última execução</th><th>Próxima</th><th>Detalhe</th></tr></thead>
          <tbody>{estado.fontes.map((fonte) => <tr key={fonte.nome}>
            <th><span>{fonte.nome}</span><small>{fonte.grupo}</small></th>
            <td><span className={`noc-status ${fonte.nivel}`}><i />{fonte.resumo}</span></td>
            <td>{dataHora(fonte.ultimaExecucao)}</td>
            <td>{dataHora(fonte.proximaExecucao)}</td>
            <td className="noc-detail">{fonte.detalhe}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
