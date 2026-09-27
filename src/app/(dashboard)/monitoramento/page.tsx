import { requireFuncionalidadeForPage } from '@/lib/authz';
import { redirect } from 'next/navigation';
import evidencia from '@/lib/monitoramento/evidencia.json';
import { carregarAcesso } from '@/lib/acesso';
import { empresaDaEquipe } from '@/lib/empresas';
import { filtrarPorEmpresa, statusMonitoramento } from '@/lib/permissoes';
import type { Alerta } from '@/lib/monitoramento/detectar';
import { nomeEquipe } from '@/lib/relatorio/relatorio';
import { Painel } from './painel';
import { ORDEM, TIPOS } from './tipos';
import './monitoramento.css';

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="monit">
      <p className="sub">
        <b>{titulo}</b> {texto}
      </p>
    </div>
  );
}

export default async function MonitoramentoPage() {
  await requireFuncionalidadeForPage('monitoramento');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  const status = statusMonitoramento(acesso);
  if (status === 'sem-empresa') return <Aviso titulo="Você ainda não tem empresa liberada." texto="Peça ao administrador." />;
  if (status === 'so-empresa-inteira') return <Aviso titulo="Monitoramento" texto="Disponível apenas para quem vê a empresa inteira." />;

  // Filtra antes de qualquer agregação ou prop de client component.
  const alertas = filtrarPorEmpresa(acesso, evidencia.alertas as Alerta[], (a) => empresaDaEquipe(a.unidade));
  // Os totais de propostas/equipes do JSON são da base inteira (todas as empresas): só o superadmin os vê.
  const veTudo = acesso.perfil === 'superadmin';
  const nomes = Object.fromEntries([...new Set(alertas.map((a) => a.unidade))].map((u) => [u, nomeEquipe(u)]));
  const total = (t: (typeof ORDEM)[number]) => alertas.filter((a) => a.tipos.includes(t)).length;

  return (
    <div className="monit">
      <header className="cab">
        <div>
          <div className="kicker">Monitoramento</div>
          <h1>Convênio fora do padrão</h1>
          <p className="sub">Avisa quando uma equipe insere proposta num convênio que ela não costuma vender.</p>
        </div>
        <div className="fonte">
          <b>Dados reais do export do Front</b>
          <span>
            {evidencia.fonte.replace(/^Export do Front, /, '')}
            {veTudo && ` · ${evidencia.propostas.toLocaleString('pt-BR')} propostas · ${evidencia.unidades} equipes`}
          </span>
          <small>Unidade = equipe. No Função será a promotora.</small>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi t-total">
          <span className="kpi-rot">Total de alertas</span>
          <span className="kpi-val">{alertas.length.toLocaleString('pt-BR')}</span>
          <span className="kpi-meta">Um por equipe, convênio e dia.</span>
        </div>
        {ORDEM.map((t) => (
          <div key={t} className={`kpi ${TIPOS[t].classe}`}>
            <span className="kpi-rot">{TIPOS[t].nome}</span>
            <span className="kpi-val">{total(t).toLocaleString('pt-BR')}</span>
            <span className="kpi-meta">{TIPOS[t].explica}</span>
          </div>
        ))}
      </div>

      <Painel alertas={alertas} nomes={nomes} />

      <section className="regras" aria-labelledby="h-regras">
        <h2 id="h-regras">Como ler</h2>
        <ul>
          <li>Comparação com os 90 dias anteriores a cada proposta.</li>
          <li>Equipe com menos de 30 propostas de histórico não gera alerta.</li>
          <li>Um alerta por equipe, convênio e dia. Sem CPF nem nome de cliente.</li>
          <li>O caso Quero Mais / Gov. PI não existe nesta base: essa promotora só existe no Função.</li>
        </ul>
      </section>
    </div>
  );
}
