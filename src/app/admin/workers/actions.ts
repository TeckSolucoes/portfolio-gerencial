'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadminForAction } from '@/lib/authz';
import { definirAtivo, definirIntervalo, executarWorker } from '@/lib/workers/motor';

export type ResultadoAcao = { ok: true; aviso?: string } | { ok: false; erro: string };

async function protegida(fn: () => Promise<ResultadoAcao>): Promise<ResultadoAcao> {
  try {
    await requireSuperadminForAction();
    return await fn();
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Falha.' };
  }
}

// Dispara e devolve na hora: a coleta pode levar minutos, a tela acompanha pelo status.
export async function executarAgora(id: string): Promise<ResultadoAcao> {
  return protegida(async () => {
    const promessa = executarWorker(id, 'manual');
    // Espera só o tempo de saber se foi aceito (rejeições imediatas); o resto segue em segundo plano.
    const primeiro = await Promise.race([promessa, new Promise<'em-andamento'>((ok) => setTimeout(() => ok('em-andamento'), 400))]);
    revalidatePath('/admin/workers');
    if (primeiro === 'ja-rodando') return { ok: false, erro: 'Este worker já está rodando.' };
    if (primeiro === 'pendente') return { ok: false, erro: 'Este worker está aguardando configuração.' };
    if (primeiro === 'inexistente') return { ok: false, erro: 'Worker inexistente.' };
    return { ok: true };
  });
}

export async function alternarAtivo(id: string, ativo: boolean): Promise<ResultadoAcao> {
  return protegida(async () => {
    await definirAtivo(id, ativo);
    revalidatePath('/admin/workers');
    return { ok: true };
  });
}

// minutos = null volta ao intervalo padrão do worker.
export async function mudarIntervalo(id: string, minutos: number | null): Promise<ResultadoAcao> {
  return protegida(async () => {
    await definirIntervalo(id, minutos);
    revalidatePath('/admin/workers');
    return { ok: true };
  });
}
