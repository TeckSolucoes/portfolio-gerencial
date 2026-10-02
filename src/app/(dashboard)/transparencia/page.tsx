import { requireFuncionalidadeForPage } from '@/lib/authz';
import Link from 'next/link';
import { FAIXAS_PADRAO } from '@/lib/transparencia/clientesNovos';
import { detalheDoMes, importacoes, indicadores, mesesProcessados, ORIGENS } from '@/lib/transparencia/painel';
import { estadoDosWorkers } from '@/lib/workers/motor';
import { Barras } from './barras';
import { EnvioBase } from './upload';
import './transparencia.css';

export const dynamic = 'force-dynamic';

const ID_WORKER = 'transparencia-servidores';
const n = (v: number) => v.toLocaleString('pt-BR');
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const nomeMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const dataBr = (ymd: string) => (ymd ? ymd.split('-').reverse().join('/') : '—');

async function SemMeses() {
  const w = (await estadoDosWorkers()).find((x) => x.id === ID_WORKER);
  let texto = 'O worker "Servidores federais" baixa o arquivo mensal do Portal nos horários agendados. Na primeira vez ele baixa também o mês anterior, e a primeira lista já sai completa.';
  if (w?.rodando) texto = 'Baixando e lendo o arquivo do Portal agora (centenas de MB). Pode levar alguns minutos: atualize a página em seguida.';
  else if (w?.ultima?.status === 'erro' && w.ultima.mensagem) texto = `A última tentativa falhou: ${w.ultima.mensagem}`;
  else if (w?.ultima?.mensagem) texto = `Última execução: ${w.ultima.mensagem}`;
  return (
    <div className="aviso-estado" role="status">
      <b>Nenhum mês processado ainda</b>
      <span>{texto}</span>
      <Link href="/admin/workers" className="aviso-link">
        Abrir os workers <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export default async function TransparenciaPage({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  await requireFuncionalidadeForPage('transparencia');
  const [meses, bases, inds] = await Promise.all([mesesProcessados(), importacoes(), indicadores()]);
  const pedido = (await searchParams).mes;
  const mesSel = meses.find((m) => m.mes === (Array.isArray(pedido) ? pedido[0] : pedido)) ?? meses[0] ?? null;
  const detalhe = mesSel ? await detalheDoMes(mesSel.mes) : null;

  return (
    <div className="transp">
      <header className="cab">
        <div>
          <div className="kicker">Portal Transparência</div>
          <h1>Servidores federais que ainda não são clientes</h1>
          <p className="sub">
            Todo mês o painel compara o cadastro oficial de servidores do Portal da Transparência com o mês anterior, tira quem já é cliente e gera a
            lista para o comercial acionar. Depois mede quem virou tomador.
          </p>
        </div>
      </header>

      <p className="fonte">
        Restrito a superadmin: a lista tem nome de pessoas. Fonte: Portal da Transparência (servidores SIAPE, arquivo mensal oficial). Listas com mais
        de 12 meses são apagadas automaticamente.
      </p>

      <section className="quadro" aria-labelledby="h-base">
        <h2 id="h-base">Nossa base de clientes</h2>
        <ul className="bases">
          {(Object.keys(ORIGENS) as (keyof typeof ORIGENS)[]).map((o) => {
            const b = bases.find((x) => x.origem === o);
            return (
              <li key={o}>
                <b>{ORIGENS[o]}</b>
                <span>{b ? `${n(b.linhas)} linhas · enviada em ${fmtDataHora.format(b.importadoEm)}` : 'Ainda não enviada'}</span>
              </li>
            );
          })}
        </ul>
        <EnvioBase />
      </section>

      {!mesSel || !detalhe ? (
        <SemMeses />
      ) : (
        <>
          <nav className="periodos" aria-label="Mês do arquivo do Portal">
            {meses.map((m) => (
              <Link key={m.mes} href={`/transparencia?mes=${m.mes}`} className="pill" aria-current={m.mes === mesSel.mes ? 'page' : undefined} scroll={false}>
                {nomeMes(m.mes)}
              </Link>
            ))}
          </nav>

          <div className="kpis kpis-4">
            <div className="kpi t-azul">
              <span className="kpi-rot">Servidores no mês</span>
              <span className="kpi-val">{n(mesSel.totalServidores)}</span>
              <span className="kpi-meta">Cadastro SIAPE de {nomeMes(mesSel.mes)}.</span>
            </div>
            <div className="kpi t-laranja">
              <span className="kpi-rot">Entraram</span>
              <span className="kpi-val">{n(mesSel.entraram)}</span>
              <span className="kpi-meta">Não estavam no mês anterior.</span>
            </div>
            <div className="kpi t-cinza">
              <span className="kpi-rot">Já eram clientes</span>
              <span className="kpi-val">{n(mesSel.jaClientes)}</span>
              <span className="kpi-meta">Encontrados no Front ou no Função.</span>
            </div>
            <div className="kpi t-verde">
              <span className="kpi-rot">Para acionar</span>
              <span className="kpi-val">{n(mesSel.acionaveis)}</span>
              <span className="kpi-meta">{n(detalhe.recemNomeados)} {detalhe.recemNomeados === 1 ? 'recém-nomeado' : 'recém-nomeados'}.</span>
            </div>
          </div>

          <div className="acoes">
            <a className="botao" href={`/api/transparencia/planilha?mes=${mesSel.mes}`} download>
              Baixar planilha de {nomeMes(mesSel.mes)} ({n(mesSel.acionaveis)} pessoas)
            </a>
            <span>Abre no Excel. Processado em {fmtDataHora.format(mesSel.processadoEm)}.</span>
          </div>

          {detalhe.porOrgao.length > 0 && (
            <section className="quadro" aria-labelledby="h-orgao">
              <h2 id="h-orgao">Onde estão os acionáveis (10 maiores órgãos superiores)</h2>
              <Barras itens={detalhe.porOrgao} total={mesSel.acionaveis} rotuloItem="Órgão superior" rotuloValor="Pessoas" />
            </section>
          )}

          <section className="quadro" aria-labelledby="h-previa">
            <h2 id="h-previa">Prévia da lista {mesSel.acionaveis > detalhe.previa.length && `(primeiras ${detalhe.previa.length}; a planilha tem todas)`}</h2>
            {detalhe.previa.length === 0 ? (
              <p className="vazio">Ninguém para acionar neste mês.</p>
            ) : (
              <div className="rolagem">
                <table className="lista">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Órgão</th>
                      <th scope="col">UF</th>
                      <th scope="col">Ingresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhe.previa.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nome}</td>
                        <td>{p.tipo === 'recem-nomeado' ? <span className="etiqueta">Recém-nomeado</span> : 'Transferido/outro'}</td>
                        <td>{p.orgao}</td>
                        <td>{p.uf || '—'}</td>
                        <td className="num">{dataBr(p.ingressoCargo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <section className="quadro" aria-labelledby="h-ind">
        <h2 id="h-ind">Tomadores por faixa de valor</h2>
        <p className="quadro-sub">
          Para cada lista mensal: dos acionáveis, quantos fecharam contrato a partir daquele mês (primeiro contrato de cada pessoa, pela nossa base).
        </p>
        {inds.length === 0 ? (
          <p className="vazio">Aparece quando houver uma lista mensal e a nossa base enviada.</p>
        ) : (
          <div className="rolagem">
            <table className="lista indicador">
              <thead>
                <tr>
                  <th scope="col">Lista</th>
                  <th scope="col" className="num">
                    Acionáveis
                  </th>
                  <th scope="col" className="num">
                    Tomadores
                  </th>
                  <th scope="col" className="num">
                    Conversão
                  </th>
                  {FAIXAS_PADRAO.map((f) => (
                    <th key={f.rotulo} scope="col" className="num">
                      {f.rotulo}
                    </th>
                  ))}
                  <th scope="col" className="num">
                    Valor total
                  </th>
                </tr>
              </thead>
              <tbody>
                {inds.map((i) => (
                  <tr key={i.mes}>
                    <th scope="row">{nomeMes(i.mes)}</th>
                    <td className="num">{n(i.acionaveis)}</td>
                    <td className="num">{n(i.tomadores)}</td>
                    <td className="num">{i.conversao.toLocaleString('pt-BR')}%</td>
                    {i.porFaixa.map((f) => (
                      <td key={f.rotulo} className="num">
                        {n(f.tomadores)}
                        <small>{brl(f.valor)}</small>
                      </td>
                    ))}
                    <td className="num">{brl(i.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
