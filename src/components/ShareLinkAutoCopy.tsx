'use client';

import { useEffect, useRef, useState } from 'react';

// Copia pro clipboard só quando o link muda DEPOIS do mount (ou seja, uma ação
// de "gerar" acabou de rodar) — não no carregamento normal da página com um
// link já existente. O ref começa já igual ao valor atual por isso.
export function ShareLinkAutoCopy({ shareUrl }: { shareUrl: string }) {
  const prevRef = useRef(shareUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shareUrl !== prevRef.current) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {});
    }
    prevRef.current = shareUrl;
  }, [shareUrl]);

  return (
    <p className="admin-hint" style={{ margin: '0 0 12px', wordBreak: 'break-all', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <code>{shareUrl}</code>
      {copied && <span style={{ color: 'var(--good)' }}>✓ Copiado</span>}
    </p>
  );
}
