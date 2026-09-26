import Link from 'next/link';
import evidencia from '@/lib/relatorio/evidencia.json';
import type { LinhaDesfecho, LinhaSoma, Relatorio, Soma } from '@/lib/relatorio/types';

const ABAS = ['Geral', 'Luana Cosme', 'Adriano Monteiro', 'Daniel Mansur', 'Marcos Mota'];

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (ymd: string) => ymd.split('-').reverse().join('/');
const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

function Cartao({ titulo, s, nota }: { titulo: string; s: Soma; nota?: string }) {
  return (
    <div className="admin-stat">
      <span className="asv">{s.qtd.toLocaleString('pt-BR')}</span>
      <span className="asl">{titulo}</span>
      <span className="asl">{moeda(s.valor)}</span>
      {nota && <span className="asl">{nota}</span>}
    </div>
  );
}

function TabelaSoma({ titulo, linhas, chave }: { titulo: string; linhas: LinhaSoma[]; chave: string }) {
  return (
    <>
      <h2 className="admin-section-title">{titulo}</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>{chave}</th>
            <th>Qtd</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <tr>
              <td colSpan={3}>Sem propostas.</td>
            </tr>
          )}
          {linhas.map((l) => (
            <tr key={l.chave}>
              <td>{l.chave}</td>
              <td>{l.qtd}</td>
              <td>{moeda(l.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TabelaCasos({ titulo, linhas, chave }: { titulo: string; linhas: LinhaDesfecho[]; chave: string }) {
  return (
    <>
      <h2 className="admin-section-title">{titulo}</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>{chave}</th>
            <th>Pagou</th>
            <th>Sem pagar ainda</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave}>
              <td>{l.chave}</td>
              <td>{l.pagou}</td>
              <td>{l.morreu + l.jornada}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default async function RelatorioPage({ searchParams }: { searchParams: Promise<{ escopo?: string }> }) {
  const { escopo: pedido } = await searchParams;
  const escopo = ABAS.includes(pedido ?? '') ? (pedido as string) : 'Geral';
  const r = (evidencia.escopos as Record<string, unknown>)[escopo] as Relatorio;
  const k = r.kpis;

  return (
    <div className="page">
      <div className="kicker">Relatório Gerencial</div>
      <h1>Vendas de {dataBr(evidencia.ref)}</h1>
      <p className="lede">
        Dados reais: {evidencia.fonte}. O relatório de 17/09 (Geral) foi conferido contra a prova: vendas do dia, novas e
        reinseridas, Front e CCNET, cartões de proposta, casos do mês, pagou e canais batem exatamente. Onde o número
        depende da esteira do CCNET, a tela avisa em vez de estimar.
      </p>

      <nav className="admin-actions" style={{ marginBottom: 22 }}>
        {ABAS.map((a) => (
          <Link key={a} href={`/relatorio?escopo=${encodeURIComponent(a)}`} className={a === escopo ? 'btn btn-primary' : 'btn'}>
            {a}
          </Link>
        ))}
      </nav>

      <h2 className="admin-section-title">Venda do dia</h2>
      <div className="admin-stat-row">
        <Cartao titulo="Total do dia" s={k.total} />
        <Cartao titulo="Vendas novas" s={k.novas} />
        <Cartao titulo="Reinseridas" s={k.reinseridas} />
        <Cartao titulo="Front (sem código)" s={k.front} />
        <Cartao titulo="CCNET (com código)" s={k.ccnet} />
        <Cartao titulo="Exceção do dia" s={k.excecaoDia} />
      </div>

      <TabelaSoma titulo="Etapas no Front (status)" linhas={r.etapasFront} chave="Status" />
      <TabelaSoma titulo="Etapas no CCNET (esteira)" linhas={r.etapasCcnet} chave="Esteira" />

      <h2 className="admin-section-title">Propostas no mês</h2>
      <div className="admin-stat-row">
        <Cartao titulo="Vendas do mês" s={k.vendasMes} />
        <Cartao titulo="Pagos do mês" s={k.pagosMes} />
        <Cartao titulo="Pagos exceção" s={k.pagosExcecaoMes} />
        <Cartao titulo="Exceção vendida no mês" s={k.excecaoMes} />
        <Cartao titulo="Cancelados do mês" s={k.canceladosMes} nota={`${pct(k.canceladosMesPct)} das propostas do mês`} />
        <Cartao titulo="Cancelados geral" s={k.canceladosGeral} />
        <Cartao titulo="Vendas geral" s={k.vendasGeral} />
      </div>

      <h2 className="admin-section-title">Casos do mês (por lote)</h2>
      <div className="admin-stat-row">
        <div className="admin-stat">
          <span className="asv">{r.resumoMes.inseriu.toLocaleString('pt-BR')}</span>
          <span className="asl">Casos inseridos</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{r.resumoMes.pagou.toLocaleString('pt-BR')}</span>
          <span className="asl">Pagou</span>
        </div>
        <div className="admin-stat">
          <span className="asv">{(r.resumoMes.inseriu - r.resumoMes.pagou).toLocaleString('pt-BR')}</span>
          <span className="asl">Ainda sem pagar</span>
        </div>
      </div>
      <p className="lede">
        Morreu, Reprovado CCNET e taxa de morte ficam pendentes: dependem da esteira do CCNET, que o export do Front não
        traz. Não estimamos esses números.
      </p>

      <table className="monit-tabela">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Casos</th>
            <th>Pagou</th>
          </tr>
        </thead>
        <tbody>
          {(['Novo', 'Compra', 'Adiantamento'] as const).map((t) => (
            <tr key={t}>
              <td>{t}</td>
              <td>{r.canalMes[t].casos}</td>
              <td>{r.canalMes[t].pagou}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TabelaCasos titulo="Por gerente" linhas={r.porGerente} chave="Gerente" />
      <TabelaCasos titulo="Por equipe" linhas={r.porEquipe} chave="Equipe" />

      <h2 className="admin-section-title">Lote por dia</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>Dia</th>
            <th>Casos novos</th>
          </tr>
        </thead>
        <tbody>
          {r.loteDia.map((l) => (
            <tr key={l.data}>
              <td>{dataBr(l.data)}</td>
              <td>{l.casos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TabelaSoma titulo="Ranking de equipes do dia" linhas={r.rankingEquipes} chave="Equipe" />
      <TabelaSoma titulo="Ranking de operadores do dia" linhas={r.rankingOperadores.slice(0, 15)} chave="Operador" />
      <TabelaSoma titulo="Por convênio" linhas={r.porConvenio} chave="Convênio" />
      <TabelaSoma titulo="Por produto" linhas={r.porProduto} chave="Produto" />
      <TabelaSoma titulo="Compra e Novo" linhas={r.porTipo} chave="Tipo" />

      <h2 className="admin-section-title">Troca de equipe na reinserção</h2>
      <table className="monit-tabela">
        <thead>
          <tr>
            <th>Proposta</th>
            <th>De</th>
            <th>Para</th>
          </tr>
        </thead>
        <tbody>
          {r.trocasEquipe.length === 0 && (
            <tr>
              <td colSpan={3}>Nenhuma troca no dia.</td>
            </tr>
          )}
          {r.trocasEquipe.map((t) => (
            <tr key={t.numero}>
              <td>{t.numero}</td>
              <td>{t.de}</td>
              <td>{t.para}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="admin-section-title">Ainda indisponível</h2>
      <p className="lede">
        Cancelados de ontem (precisa da data de cancelamento do CCNET), lista dos que morreram sem reinserir, padrão de erro
        e taxa de morte. Todos dependem do acesso ao CCNET e ao Front ao vivo.
      </p>
    </div>
  );
}
