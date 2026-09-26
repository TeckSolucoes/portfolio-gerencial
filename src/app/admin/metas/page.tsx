import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EMPRESAS } from '@/lib/empresas';
import { formatarBRL, formatarInputBR, mesAtual, mesValido, rotuloMes, somarMeses, ultimosMeses } from '@/lib/dinheiro';
import { MetasForm } from './MetasForm';
import '../admin-forms.css';

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');

  const { mes: mesParam } = await searchParams;
  const hoje = mesAtual();
  const mes = mesParam && mesValido(mesParam) ? mesParam : hoje;

  const meses = ultimosMeses(hoje, 12);
  const linhas = await prisma.metaMensal.findMany({ where: { mes: { in: [...new Set([...meses, mes])] } } });
  const porMes = (m: string) => linhas.filter((l) => l.mes === m);
  const atuais = Object.fromEntries(porMes(mes).map((l) => [l.empresa, formatarInputBR(l.valor)]));

  return (
    <div className="adm">
      <div className="kicker">Configurações · Superadmin</div>
      <h1>Metas mensais</h1>
      <p className="lede">
        Meta de faturamento por empresa em cada mês. Meses sem meta cadastrada usam a meta de MODELO no relatório.
      </p>

      <nav className="adm-monthnav" aria-label="Navegar entre meses">
        <Link href={`/admin/metas?mes=${somarMeses(mes, -1)}`} className="btn btn-ghost">
          ← Anterior
        </Link>
        <span className="adm-month-label" aria-live="polite">
          {rotuloMes(mes)}
        </span>
        <Link href={`/admin/metas?mes=${somarMeses(mes, 1)}`} className="btn btn-ghost">
          Próximo →
        </Link>
        {mes !== hoje && (
          <Link href="/admin/metas" className="btn btn-ghost adm-month-today">
            Voltar ao mês atual
          </Link>
        )}
      </nav>

      <MetasForm mes={mes} atuais={atuais} />

      <h2 className="adm-section">Últimos 12 meses</h2>
      <div className="adm-tablewrap">
        <table className="adm-utable adm-ntable">
          <caption className="adm-sr">Metas de faturamento dos últimos 12 meses</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              {EMPRESAS.map((e) => (
                <th key={e} scope="col" className="num">
                  {e}
                </th>
              ))}
              <th scope="col" className="num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const doMes = porMes(m);
              const valor = (e: string) => doMes.find((l) => l.empresa === e)?.valor;
              return (
                <tr key={m} className={m === mes ? 'is-selected' : undefined} aria-current={m === mes ? 'true' : undefined}>
                  <th scope="row">
                    <Link href={`/admin/metas?mes=${m}`}>{m}</Link>
                    {m === hoje && <span className="adm-tag">atual</span>}
                  </th>
                  {doMes.length === 0 ? (
                    <td colSpan={EMPRESAS.length + 1} className="sem-meta">
                      sem meta: o relatório usa a meta de MODELO
                    </td>
                  ) : (
                    <>
                      {EMPRESAS.map((e) => {
                        const v = valor(e);
                        return (
                          <td key={e} className={v === undefined ? 'num sem-meta' : 'num'}>
                            {v === undefined ? 'sem meta' : formatarBRL(v)}
                          </td>
                        );
                      })}
                      <td className="num total">{formatarBRL(doMes.reduce((t, l) => t + l.valor, 0))}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
