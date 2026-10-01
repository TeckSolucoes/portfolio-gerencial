'use client';

import { useRef, useState, useTransition } from 'react';
import { BolhaWhatsapp } from '@/components/BolhaWhatsapp';
import { enviarRelatorioWhatsapp, previaWhatsapp } from './actions';

// Abre a prévia da mensagem; só envia depois de o usuário ver o texto e confirmar.
export function EnviarWhatsapp({ empresa, escopo, rotulo, data, destinatarios }: { empresa: string; escopo: string; rotulo: string; data: string; destinatarios: number }) {
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
      const r = await previaWhatsapp(empresa, escopo, data);
      if (r.ok) setPrevia(r.mensagens);
      else setResultado({ ok: false, mensagem: r.mensagem });
    });
  };

  const enviar = () =>
    startEnvio(async () => {
      const r = await enviarRelatorioWhatsapp(empresa, escopo, data);
      setResultado(r);
      if (r.ok) dialogo.current?.close();
    });

  return (
    <div className="rel-whats no-print">
      <button type="button" onClick={abrir}>Enviar pelo WhatsApp</button>
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
