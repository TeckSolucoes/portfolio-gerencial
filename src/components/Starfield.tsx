'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  baseA: number;
  phase: number;
  speed: number;
  drift: number;
}

// Porte 1:1 do script do mockup (teck-login.html): drift contínuo (idle sine-wave +
// offset do mouse) rodando sempre via rAF, não só parallax disparado por mousemove —
// mudança deliberada depois de feedback do usuário de que o parallax só-no-mouse
// "parecia estático". Continua aplicando o drift em qualquer elemento [data-depth]
// da página (hoje só o .nebula do HeroBackdrop), igual ao script original.
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    let mx = 0;
    let my = 0;
    // smx/smy amortecem mx/my (lerp por frame) — sem isso o fundo grudava 1:1 no
    // cursor a cada mousemove, o que parecia "arrastar a imagem" em vez de um
    // parallax. Com atraso, o fundo passa a seguir com inércia.
    let smx = 0;
    let smy = 0;
    let rafId = 0;

    function seedStars() {
      const count = Math.max(90, Math.min(Math.round((W * H) / 5200), 260));
      stars = [];
      for (let i = 0; i < count; i++) {
        const layer = Math.random();
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: layer < 0.7 ? Math.random() * 0.9 + 0.4 : Math.random() * 1.4 + 1,
          baseA: layer < 0.7 ? Math.random() * 0.35 + 0.25 : Math.random() * 0.35 + 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.4 + 0.15,
          drift: (Math.random() - 0.5) * 0.05,
        });
      }
    }

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * DPR;
      canvas!.height = H * DPR;
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      seedStars();
    }

    function drawStars(t: number) {
      ctx!.clearRect(0, 0, W, H);
      for (const s of stars) {
        const tw = reduceMotion ? s.baseA : s.baseA + Math.sin(t * 0.001 * s.speed + s.phase) * 0.22;
        ctx!.globalAlpha = Math.max(0, Math.min(1, tw));
        ctx!.fillStyle = '#ece8f5';
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function applyDrift(t: number) {
      smx += (mx - smx) * 0.05;
      smy += (my - smy) * 0.05;
      const idleX = Math.sin(t * 0.00035) * 1.4 + Math.sin(t * 0.0009) * 0.6;
      const idleY = Math.cos(t * 0.00045) * 1.3 + Math.cos(t * 0.0008) * 0.5;
      const px = idleX + smx * 0.8;
      const py = idleY + smy * 0.8;
      document.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
        const depth = parseFloat(el.getAttribute('data-depth') || '10') || 10;
        el.style.transform = `translate(${-px * depth}px,${-py * depth * 0.6}px)`;
      });
      canvas!.style.transform = `translate(${-px * 6}px,${-py * 4}px)`;
    }

    function tick(t: number) {
      if (!reduceMotion) {
        for (const s of stars) {
          s.y += s.drift;
          if (s.y > H) s.y = 0;
          if (s.y < 0) s.y = H;
        }
        applyDrift(t);
      }
      drawStars(t);
      if (!reduceMotion) rafId = window.requestAnimationFrame(tick);
    }

    function handleMouseMove(e: MouseEvent) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    if (!reduceMotion && hasPointer) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    window.addEventListener('resize', resize);
    resize();
    tick(0);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas id="stars" ref={canvasRef} />;
}
