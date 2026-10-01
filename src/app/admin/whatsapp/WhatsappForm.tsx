'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { BolhaWhatsapp } from '@/components/BolhaWhatsapp';
import { EMPRESAS } from '@/lib/empresas';
import { enviarAgora, enviarTeste, gerarPrevia, salvarWhatsapp } from './actions';

const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export function WhatsappForm({ inicial }: {
  inicial: { instanceId: string; temToken: boolean; destinatarios: string; empresas: string[]; horarios: string[]; ativo: boolean; pronto: boolean };
}) {
  const [state, formAction, salvando] = useActionState(salvarWhatsapp, undefined);
  const [envio, setEnvio] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [enviando, startEnvio] = useTransition();
  const [horarios, setHorarios] = useState(() => new Set(inicial.horarios));
  const formRef = useRef<HTMLFormElement>(null);
  const [previa, setPrevia] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [numeroTeste, setNumeroTeste] = useState('');
  const [montando, startPrevia] = useTransition();
  const [testando, startTeste] = useTransition();

  const doFormulario = () => {
    const f = new FormData(formRef.current ?? undefined);
    return { instanceId: String(f.get('instanceId') ?? ''), token: String(f.get('token') ?? ''), empresas: f.getAll('empresas').map(String) };
  };

  const verPrevia = () => {
    setAviso(null);
    startPrevia(async () => {
      const r = await gerarPrevia(doFormulario().empresas);
      if (r.ok) setPrevia(r.mensagens);
      else setAviso({ ok: false, mensagem: r.mensagem });
    });
  };

  const mandarTeste = () => {
    setAviso(null);
    startTeste(async () => setAviso(await enviarTeste({ ...doFormulario(), numero: numeroTeste })));
  };

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
      <form ref={formRef} action={formAction} className="adm-card">
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
            <p className="adm-hint">Visão Geral do dia, seguida por uma segunda mensagem com os insights para atuação.</p>
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
          <p className="adm-hint">{horarios.size} envio(s) por dia. A primeira execução consolida 32 dias; as seguintes atualizam somente as propostas do dia.</p>
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
        <h2 className="adm-section wa-sub">Prévia e teste</h2>
        <p className="adm-hint">Usa o que está preenchido acima, mesmo sem salvar. A prévia só monta a mensagem; nada é enviado.</p>

        <div className="wa-linha">
          <button type="button" className="btn btn-ghost" onClick={verPrevia} disabled={montando}>
            {montando ? 'Montando…' : 'Gerar prévia'}
          </button>
          <div className="adm-field wa-numero">
            <label className="adm-label" htmlFor="wa-teste-num">Número para teste</label>
            <input id="wa-teste-num" value={numeroTeste} onChange={(e) => setNumeroTeste(e.target.value)} placeholder="21999999999" inputMode="tel" autoComplete="off" />
          </div>
          <button type="button" className="btn btn-primary" onClick={mandarTeste} disabled={testando || !numeroTeste.trim()}>
            {testando ? 'Enviando…' : 'Enviar teste'}
          </button>
        </div>
        {aviso && (
          <p className={aviso.ok ? 'adm-msg adm-msg-ok' : 'adm-msg adm-msg-error'} role="status">
            {aviso.mensagem}
          </p>
        )}
        {previa && (
          <figure className="wa-previa">
            <figcaption className="adm-label">Prévia · 2 mensagens · {previa.reduce((total, mensagem) => total + mensagem.length, 0).toLocaleString('pt-BR')} caracteres</figcaption>
            {previa.map((mensagem, indice) => (
              <div key={indice}>
                <p className="adm-hint">Mensagem {indice + 1} · {indice === 0 ? 'Relatório' : 'Insights para atuação'}</p>
                <BolhaWhatsapp texto={mensagem} />
              </div>
            ))}
          </figure>
        )}

        <div className="adm-footer">
          <p className={envio?.ok ? 'adm-msg adm-msg-ok' : 'adm-msg adm-msg-error'} role="status">
            {envio ? envio.mensagem : inicial.pronto ? 'Dispara agora, fora da agenda, para todos os destinatários salvos.' : 'Para enviar a todos, salve a configuração completa.'}
          </p>
          <div className="adm-actions">
            <button type="button" className="btn btn-ghost" onClick={testar} disabled={!inicial.pronto || enviando}>
              {enviando ? 'Enviando…' : 'Enviar agora para todos'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
