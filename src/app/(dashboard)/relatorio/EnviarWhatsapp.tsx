'use client';

import { useState, useTransition } from 'react';
import { enviarRelatorioWhatsapp } from './actions';

export function EnviarWhatsapp({ empresa, escopo, rotulo, data, destinatarios }: { empresa: string; escopo: string; rotulo: string; data: string; destinatarios: number }) {
  const [pendente, start] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  const enviar = () => {
    const dia = data.split('-').reverse().join('/');
    if (!window.confirm(`Enviar o relatório ${empresa} · ${rotulo} de ${dia} para ${destinatarios} destinatário(s) no WhatsApp?`)) return;
    setResultado(null);
    start(async () => setResultado(await enviarRelatorioWhatsapp(empresa, escopo, data)));
  };

  return (
    <div className="rel-whats no-print">
      <button type="button" onClick={enviar} disabled={pendente}>
        {pendente ? 'Enviando…' : 'Enviar pelo WhatsApp'}
      </button>
      {resultado && (
        <span className={resultado.ok ? 't-green' : 't-red'} role="status">
          {resultado.mensagem}
        </span>
      )}
    </div>
  );
}
