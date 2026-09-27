'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

type Coordenadas = { latitude: number; longitude: number };
const CHAVE = 'portal-coordenadas-acesso';

function enviar(rota: string, coordenadas?: Coordenadas) {
  void fetch('/api/auditoria/navegacao', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rota, ...coordenadas }),
    keepalive: true,
  });
}

export function AuditTracker() {
  const pathname = usePathname();
  const ultimaRota = useRef('');

  useEffect(() => {
    if (!pathname || ultimaRota.current === pathname) return;
    ultimaRota.current = pathname;

    const salva = sessionStorage.getItem(CHAVE);
    if (salva) {
      try {
        const coordenadas = JSON.parse(salva) as Coordenadas;
        if (!Number.isFinite(coordenadas.latitude) || !Number.isFinite(coordenadas.longitude)) throw new Error('Coordenadas inválidas');
        enviar(pathname, coordenadas);
        return;
      } catch {
        sessionStorage.removeItem(CHAVE);
      }
    }

    if (!navigator.geolocation) {
      enviar(pathname);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordenadas = { latitude: coords.latitude, longitude: coords.longitude };
        sessionStorage.setItem(CHAVE, JSON.stringify(coordenadas));
        enviar(pathname, coordenadas);
      },
      () => enviar(pathname),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15 * 60 * 1000 },
    );
  }, [pathname]);

  return null;
}
