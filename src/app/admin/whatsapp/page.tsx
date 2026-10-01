import { requireFuncionalidadeForPage } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { lerEmpresas } from '@/lib/empresas';
import { estadoDosWorkers } from '@/lib/workers/motor';
import { FUSO } from '@/lib/workers/tipos';
import { ID_WORKER_WHATSAPP, lerConfigBruta } from '@/lib/whatsapp/envio';
import { WhatsappForm } from './WhatsappForm';
import '../admin-forms.css';
import './whatsapp.css';

export const dynamic = 'force-dynamic';

// Sem agenda própria salva, a tela sugere de hora em hora no horário comercial.
const HORARIOS_SUGERIDOS = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);

const quando = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';

export default async function WhatsappPage() {
  await requireFuncionalidadeForPage('whatsapp');

  const [config, estados, historico] = await Promise.all([
    lerConfigBruta(),
    estadoDosWorkers(),
    prisma.workerExecucao.findMany({ where: { workerId: ID_WORKER_WHATSAPP }, orderBy: { iniciadoEm: 'desc' }, take: 15 }),
  ]);
  const estado = estados.find((w) => w.id === ID_WORKER_WHATSAPP)!;

  return (
    <div className="adm">
      <div className="kicker">Configurações · WhatsApp</div>
      <h1>Envio do relatório por WhatsApp</h1>
      <p className="lede">Resumo do Relatório Gerencial disparado pela W-API nos horários escolhidos. Os números são os mesmos da tela, lidos ao vivo na hora do envio.</p>

      <div className="wa-status" role="status">
        <span className={`wa-pill ${estado.pendencia ? 'is-warn' : estado.ativo ? 'is-on' : ''}`}>
          {estado.pendencia ? 'Aguardando configuração' : estado.ativo ? 'Ligado' : 'Desligado'}
        </span>
        <span>Próximo envio: <b>{estado.proximaEm ? quando(estado.proximaEm) : '—'}</b></span>
        <span>
          Último: <b>{quando(estado.ultima?.iniciadoEm)}</b>
          {estado.ultima && <> · {estado.ultima.status === 'ok' ? 'ok' : estado.ultima.status === 'erro' ? 'erro' : 'enviando'}</>}
        </span>
      </div>

      <WhatsappForm
        inicial={{
          instanceId: config?.instanceId ?? '',
          temToken: Boolean(config?.token),
          destinatarios: config?.destinatarios ?? '',
          empresas: config ? lerEmpresas(config.empresas) : [],
          horarios: estado.horariosProprios ? estado.horarios : HORARIOS_SUGERIDOS,
          ativo: estado.ativo,
          pronto: !estado.pendencia,
        }}
      />

      <h2 className="adm-section">Últimos envios</h2>
      {historico.length === 0 ? (
        <p className="adm-hint">Nenhum envio ainda.</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-utable">
            <caption className="adm-sr">Histórico de envios do relatório por WhatsApp</caption>
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Origem</th>
                <th scope="col">Status</th>
                <th scope="col">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <td>{quando(h.iniciadoEm.toISOString())}</td>
                  <td>{h.origem === 'manual' ? 'Manual' : 'Agenda'}</td>
                  <td className={h.status === 'erro' ? 'wa-erro' : h.status === 'ok' ? 'wa-ok' : undefined}>{h.status}</td>
                  <td>{h.mensagem ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
