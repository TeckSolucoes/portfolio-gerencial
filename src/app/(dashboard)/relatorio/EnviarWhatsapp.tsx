'use client';

import { useRef, useState, useTransition } from 'react';
import { BolhaWhatsapp } from '@/components/BolhaWhatsapp';
import { enviarRelatorioWhatsapp, previaWhatsapp } from './actions';

// Abre a prévia da mensagem; só envia depois de o usuário ver o texto e confirmar.
export function EnviarWhatsapp({ empresa, escopo, gerenteComercialId, rotulo, data, destinatarios }: { empresa: string; escopo: string; gerenteComercialId?: string | null; rotulo: string; data: string; destinatarios: number }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  const [previa, setPrevia] = useState<string[] | null>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const [montando, startPrevia] = useTransition();
  const [enviando, startEnvio] = useTransition();

  const abrir = () => {
    setResultado(null);
    setPrevia(null);
    dialogo.current?.showModal();
    setAberto(true);
    startPrevia(async () => {
      const r = await previaWhatsapp(empresa, escopo, data, gerenteComercialId);
      if (r.ok) setPrevia(r.mensagens);
      else setResultado({ ok: false, mensagem: r.mensagem });
    });
  };

  const enviar = () =>
    startEnvio(async () => {
      const r = await enviarRelatorioWhatsapp(empresa, escopo, data, gerenteComercialId);
      setResultado(r);
      if (r.ok) dialogo.current?.close();
    });

  return (
    <div className="rel-whats no-print">
      <button type="button" className="rel-whats-trigger" onClick={abrir} aria-label="Enviar pelo WhatsApp" title="Enviar pelo WhatsApp">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5.2-1.4A9.7 9.7 0 1 0 12 2Zm0 17.5a7.6 7.6 0 0 1-3.9-1.1l-.3-.2-3 .8.8-2.9-.2-.3A7.7 7.7 0 1 1 12 19.5Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-1.4-.7-2.4-1.3-3.3-2.9-.2-.3.2-.3.6-1.1.1-.2 0-.4 0-.5l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 5 4.2.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.3Z" />
        </svg>
      </button>
      {resultado && !aberto && (
        <span className={resultado.ok ? 't-green' : 't-red'} role="status">
          {resultado.mensagem}
        </span>
      )}

      <dialog ref={dialogo} className="rel-whats-dialogo" aria-labelledby="rel-whats-titulo" onClose={() => setAberto(false)}>
        <h2 id="rel-whats-titulo">Prévia da mensagem</h2>
        <p className="muted">
          {empresa} · {rotulo} · {data.split('-').reverse().join('/')} · vai para {destinatarios} destinatário(s)
        </p>
        {montando && <p className="muted">Montando a mensagem com os dados ao vivo…</p>}
        {previa?.map((mensagem, indice) => (
          <div key={indice}>
            <p className="muted">Mensagem {indice + 1} · {indice === 0 ? 'Relatório' : 'Insights para atuação'}</p>
            <BolhaWhatsapp texto={mensagem} />
          </div>
        ))}
        {resultado && !resultado.ok && (
          <p className="t-red" role="alert">
            {resultado.mensagem}
          </p>
        )}
        <div className="rel-whats-acoes">
          <button type="button" className="sec-btn" onClick={() => dialogo.current?.close()} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="pri-btn" onClick={enviar} disabled={!previa || enviando}>
            {enviando ? 'Enviando…' : `Enviar para ${destinatarios}`}
          </button>
        </div>
      </dialog>
    </div>
  );
}
