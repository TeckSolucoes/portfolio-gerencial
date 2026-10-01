'use client';

import { useActionState, useState, useTransition } from 'react';
import { EMPRESAS } from '@/lib/empresas';
import { enviarAgora, salvarWhatsapp } from './actions';

const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export function WhatsappForm({ inicial }: {
  inicial: { instanceId: string; temToken: boolean; destinatarios: string; empresas: string[]; horarios: string[]; ativo: boolean; pronto: boolean };
}) {
  const [state, formAction, salvando] = useActionState(salvarWhatsapp, undefined);
  const [envio, setEnvio] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [enviando, startEnvio] = useTransition();
  const [horarios, setHorarios] = useState(() => new Set(inicial.horarios));

  const marcar = (lista: string[]) => setHorarios(new Set(lista));
  const alternar = (h: string) =>
    setHorarios((atual) => {
      const novo = new Set(atual);
      if (novo.has(h)) novo.delete(h);
      else novo.add(h);
      return novo;
    });

  const testar = () => {
    if (!window.confirm('Enviar agora o relatório de hoje para todos os destinatários salvos?')) return;
    setEnvio(null);
    startEnvio(async () => setEnvio(await enviarAgora()));
  };

  return (
    <>
      <form action={formAction} className="adm-card">
        <h2 className="adm-section wa-sub">Conexão W-API</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="wa-instance">ID da instância</label>
            <input id="wa-instance" name="instanceId" defaultValue={inicial.instanceId} placeholder="T34398-VYR3QD-MS29SL" autoComplete="off" required maxLength={80} />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="wa-token">Token</label>
            <input
              id="wa-token"
              name="token"
              type="password"
              placeholder={inicial.temToken ? '•••••••• salvo · em branco mantém' : 'Token da instância'}
              autoComplete="new-password"
              required={!inicial.temToken}
              maxLength={300}
            />
          </div>
          <p className="adm-hint adm-span-2">Painel da W-API → Instância → ID e TOKEN. O token fica só no servidor e nunca volta para a tela.</p>
        </div>

        <h2 className="adm-section wa-sub">Destino</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label className="adm-label" htmlFor="wa-dest">Destinatários</label>
            <textarea
              id="wa-dest"
              name="destinatarios"
              className="wa-textarea"
              defaultValue={inicial.destinatarios}
              placeholder={'21999999999\n5511988887777'}
              rows={4}
              required
              aria-describedby="wa-dest-hint"
            />
            <p className="adm-hint" id="wa-dest-hint">Um por linha. DDD + número (o 55 entra sozinho), grupo terminado em @g.us ou @lid.</p>
          </div>
          <fieldset className="adm-fieldset">
            <legend className="adm-label">Empresas no relatório</legend>
            <div className="adm-check-grid">
              {EMPRESAS.map((e) => (
                <label key={e} className="adm-check-card">
                  <input type="checkbox" name="empresas" value={e} defaultChecked={inicial.empresas.includes(e)} /> {e}
                </label>
              ))}
            </div>
            <p className="adm-hint">Visão Geral do dia, uma seção por empresa na mesma mensagem.</p>
          </fieldset>
        </div>

        <h2 className="adm-section wa-sub">Agenda</h2>
        <fieldset className="adm-fieldset">
          <legend className="adm-label">Horários de envio (Brasília)</legend>
          <div className="wa-atalhos">
            <button type="button" className="btn btn-ghost" onClick={() => marcar(HORAS.slice(8, 21))}>Comercial 08h–20h</button>
            <button type="button" className="btn btn-ghost" onClick={() => marcar(HORAS)}>Toda hora</button>
            <button type="button" className="btn btn-ghost" onClick={() => marcar([])}>Limpar</button>
          </div>
          <div className="wa-horas">
            {HORAS.map((h) => (
              <label key={h} className="adm-check-card">
                <input type="checkbox" name="horarios" value={h} checked={horarios.has(h)} onChange={() => alternar(h)} /> {h.slice(0, 2)}h
              </label>
            ))}
          </div>
          <p className="adm-hint">{horarios.size} envio(s) por dia. Cada envio leva o relatório de hoje até aquela hora.</p>
        </fieldset>

        <label className="adm-check-card wa-ativo">
          <input type="checkbox" name="ativo" defaultChecked={inicial.ativo} />
          <span>Envio automático ligado</span>
        </label>

        <div className="adm-footer">
          <p className={state?.ok ? 'adm-msg adm-msg-ok' : 'adm-msg adm-msg-error'} role="alert">
            {state?.error ?? state?.ok}
          </p>
          <div className="adm-actions">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>

      <div className="adm-card">
        <div className="adm-footer wa-teste">
          <p className={envio?.ok ? 'adm-msg adm-msg-ok' : 'adm-msg adm-msg-error'} role="status">
            {envio ? envio.mensagem : inicial.pronto ? 'Dispara agora, fora da agenda, com a configuração salva.' : 'Salve a configuração para poder enviar.'}
          </p>
          <div className="adm-actions">
            <button type="button" className="btn btn-ghost" onClick={testar} disabled={!inicial.pronto || enviando}>
              {enviando ? 'Enviando…' : 'Enviar agora'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
