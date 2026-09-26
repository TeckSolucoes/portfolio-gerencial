import Link from 'next/link';
import { auth } from '@/lib/auth';
import { tempoRelativo } from '@/lib/tempo';
import type { Contagem } from '@/lib/transparencia/federal-agregar';
import { agregadoFederal } from '@/lib/workers/leitura';
import { estadoDosWorkers } from '@/lib/workers/motor';
import { Barras } from './barras';
import { Orgaos } from './orgaos';
import './transparencia.css';

export const dynamic = 'force-dynamic';

const ID_WORKER = 'transparencia-federal';
const n = (v: number) => v.toLocaleString('pt-BR');
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

function Cabecalho() {
  return (
    <header className="cab">
      <div>
        <div className="kicker">Transparência</div>
        <h1>Servidores federais por órgão</h1>
        <p className="sub">Quantos servidores o governo federal tem em cada órgão, pelo Portal da Transparência. Base para dimensionar o público do convênio SIAPE.</p>
      </div>
    </header>
  );
}

// Sem dados ainda: explica o porquê. Detalhes técnicos (chave, erro) só para o superadmin.
async function SemDados({ superadmin }: { superadmin: boolean }) {
  const w = (await estadoDosWorkers()).find((x) => x.id === ID_WORKER);
  let titulo = 'A primeira coleta ainda não aconteceu';
  let texto = w?.proximaEm ? `Próxima coleta agendada para ${fmtDataHora.format(new Date(w.proximaEm))}.` : 'Os dados aparecem aqui assim que a coleta rodar.';
  if (w?.pendencia) {
    titulo = 'Coleta aguardando configuração';
    texto = superadmin ? w.pendencia : 'A fonte ainda não foi configurada. Fale com o administrador.';
  } else if (w?.ultima?.status === 'erro') {
    titulo = 'A última coleta falhou';
    texto = superadmin && w.ultima.mensagem ? w.ultima.mensagem : 'O Portal da Transparência não respondeu. Uma nova tentativa acontece no próximo horário agendado.';
  } else if (w?.rodando) {
    titulo = 'Coletando agora';
    texto = 'A coleta percorre centenas de páginas do Portal e pode levar alguns minutos. Atualize esta página em seguida.';
  }
  return (
    <div className="aviso-estado" role="status">
      <b>{titulo}</b>
      <span>{texto}</span>
      {superadmin && (
        <Link href="/admin/workers" className="aviso-link">
          Abrir os workers <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

function Quadro({ titulo, id, itens, total, rotuloItem }: { titulo: string; id: string; itens: Contagem[]; total: number; rotuloItem: string }) {
  return (
    <section className="quadro" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      <Barras itens={itens} total={total} rotuloItem={rotuloItem} />
    </section>
  );
}

export default async function TransparenciaPage() {
  const session = await auth();
  const superadmin = session?.user?.role === 'superadmin';
  const cache = await agregadoFederal();

  if (!cache) {
    return (
      <div className="transp">
        <Cabecalho />
        <SemDados superadmin={superadmin} />
      </div>
    );
  }

  const d = cache.dados;
  const geradoEm = new Date(cache.geradoEm);
  const superiores = d.porOrgaoSuperior.map((c) => c.chave);

  return (
    <div className="transp">
      <Cabecalho />

      <p className="fonte">
        Fonte: Portal da Transparência do Governo Federal (servidores por órgão de exercício, SIAPE). Atualizado {tempoRelativo(geradoEm)} (
        {fmtDataHora.format(geradoEm)}). Só contagens agregadas: sem nome nem CPF.
      </p>

      <div className="kpis">
        <div className="kpi t-azul">
          <span className="kpi-rot">Pessoas</span>
          <span className="kpi-val">{n(d.totalPessoas)}</span>
          <span className="kpi-meta">Quem tem mais de um vínculo pode contar mais de uma vez.</span>
        </div>
        <div className="kpi t-verde">
          <span className="kpi-rot">Vínculos</span>
          <span className="kpi-val">{n(d.totalVinculos)}</span>
          <span className="kpi-meta">Cargos e funções ocupados.</span>
        </div>
        <div className="kpi t-laranja">
          <span className="kpi-rot">Órgãos</span>
          <span className="kpi-val">{n(d.porOrgao.length)}</span>
          <span className="kpi-meta">Em {n(d.porOrgaoSuperior.length)} órgãos superiores (ministérios e equivalentes).</span>
        </div>
      </div>

      <Quadro titulo="Por órgão superior" id="h-superior" itens={d.porOrgaoSuperior} total={d.totalPessoas} rotuloItem="Órgão superior" />

      <div className="duplo">
        <Quadro titulo="Por tipo de servidor" id="h-tipo" itens={d.porTipoServidor} total={d.totalPessoas} rotuloItem="Tipo" />
        <Quadro titulo="Por situação" id="h-situacao" itens={d.porSituacao} total={d.totalPessoas} rotuloItem="Situação" />
      </div>

      <Orgaos orgaos={d.porOrgao} superiores={superiores} />
    </div>
  );
}
