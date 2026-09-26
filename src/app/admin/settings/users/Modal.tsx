'use client';

import { useEffect, useId, useRef, useState } from 'react';

let abertos = 0;

// <dialog> nativo com showModal(): foco preso, Esc fecha e o resto da página fica inerte.
// O componente só é montado enquanto aberto, então o estado interno reinicia a cada abertura.
export function Modal({
  onClose,
  labelledBy,
  variant = 'dialog',
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  variant?: 'dialog' | 'drawer';
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    abertos += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      abertos -= 1;
      if (abertos === 0) document.body.style.overflow = '';
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`adm-modal adm-modal-${variant}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function ConfirmDialog({
  titulo,
  children,
  confirmar,
  perigo = true,
  onConfirm,
  onCancel,
}: {
  titulo: string;
  children: React.ReactNode;
  confirmar: string;
  perigo?: boolean;
  onConfirm: () => Promise<string | void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar_() {
    setBusy(true);
    setErro(null);
    const r = await onConfirm();
    if (r) {
      setErro(r);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onCancel} labelledBy={`${id}-t`}>
      <div className="adm-confirm">
        <h2 id={`${id}-t`} className="adm-confirm-title">
          {titulo}
        </h2>
        <div className="adm-confirm-body">{children}</div>
        <p className="adm-msg adm-msg-error" role="alert">
          {erro}
        </p>
        <div className="adm-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className={perigo ? 'btn btn-danger-solid' : 'btn btn-primary'}
            onClick={confirmar_}
            disabled={busy}
          >
            {busy ? 'Aguarde…' : confirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
