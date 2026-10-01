import { requireFuncionalidadeForPage } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { carregarAcesso } from '@/lib/acesso';
import { carregarMonitoramentoAoVivo } from '@/lib/monitoramento/aoVivo';
import { Painel } from './painel';
import './monitoramento.css';

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="monit"><p className="sub"><b>{titulo}</b> {texto}</p></div>;
}

export default async function MonitoramentoPage() {
  await requireFuncionalidadeForPage('monitoramento');
  const acesso = await carregarAcesso();
  if (!acesso) redirect('/login');
  if (acesso.empresas.length === 0) return <Aviso titulo="Você ainda não tem empresa liberada." texto="Peça ao administrador." />;

  let dados;
  try {
    dados = await carregarMonitoramentoAoVivo(acesso.empresas, acesso.perfil === 'superadmin' ? null : acesso.escopoGerente);
  } catch (erro) {
    console.error('Falha ao carregar monitoramento ao vivo:', erro);
    return <Aviso titulo="Monitoramento indisponível." texto="Não foi possível consultar o Front V2 agora. Tente novamente em alguns minutos." />;
  }

  const atualizado = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(dados.atualizadoEm));

  return (
    <div className="monit">
      <header className="cab">
        <div><div className="kicker">Monitoramento operacional</div><h1>Quem precisa de atenção</h1><p className="sub">Responsáveis, objeções e propostas paradas nos últimos 30 dias.</p></div>
        <div className="atualizado" aria-label={`Dados atualizados em ${atualizado}`}><i aria-hidden /> Atualizado em {atualizado}</div>
      </header>

      <div className="kpis">
        <div className="kpi t-critica"><span className="kpi-rot">Casos para acompanhar</span><span className="kpi-val">{dados.casos.toLocaleString('pt-BR')}</span><span className="kpi-meta">Agrupados por responsável.</span></div>
        <div className="kpi t-objecao"><span className="kpi-rot">Com objeção</span><span className="kpi-val">{dados.objecoes.toLocaleString('pt-BR')}</span><span className="kpi-meta">Motivo identificado na proposta.</span></div>
        <div className="kpi t-parada"><span className="kpi-rot">Sem atualização</span><span className="kpi-val">{dados.semAtualizacao.toLocaleString('pt-BR')}</span><span className="kpi-meta">Há 2 dias ou mais.</span></div>
        <div className="kpi t-sem-dono"><span className="kpi-rot">Sem responsável</span><span className="kpi-val">{dados.semResponsavel.toLocaleString('pt-BR')}</span><span className="kpi-meta">Precisam de atribuição.</span></div>
      </div>

      <Painel pessoas={dados.pessoas} />

      <section className="regras" aria-labelledby="h-regras"><h2 id="h-regras">Critérios da fila</h2><ul>
        <li>Crítica: proposta com objeção, recusa ou reprovação registrada.</li>
        <li>Alta: proposta sem responsável ou sem atualização há pelo menos 2 dias.</li>
        <li>Média: proposta enviada e ainda sem retorno da Função.</li>
        <li>A tela mostra o operador, a equipe e o gerente; dados pessoais do cliente não são exibidos.</li>
      </ul></section>
    </div>
  );
}
