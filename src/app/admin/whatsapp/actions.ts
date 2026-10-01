'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForAction, requireSessionForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';
import { gravarEmpresas } from '@/lib/empresas';
import { definirAtivo, definirHorarios, executarWorker } from '@/lib/workers/motor';
import { normalizarHorarios } from '@/lib/workers/tipos';
import { normalizarDestinatarios } from '@/lib/whatsapp/formato';
import { ID_WORKER_WHATSAPP, lerConfigBruta, salvarConfigWhatsapp } from '@/lib/whatsapp/envio';

export type EstadoForm = { error?: string; ok?: string } | undefined;

const ROTA = '/admin/whatsapp';

async function sessaoAutorizada() {
  const session = await requireSessionForAction();
  await requireFuncionalidadeForAction('whatsapp');
  return session;
}

export async function salvarWhatsapp(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  try {
    const session = await sessaoAutorizada();
    const atual = await lerConfigBruta();

    const instanceId = String(formData.get('instanceId') ?? '').trim();
    // Campo de token em branco = manter o atual (ele nunca volta para a tela).
    const token = String(formData.get('token') ?? '').trim() || atual?.token || '';
    if (!instanceId) return { error: 'Informe o ID da instância da W-API.' };
    if (!token) return { error: 'Informe o token da instância da W-API.' };

    const destinatarios = normalizarDestinatarios(String(formData.get('destinatarios') ?? ''));
    if (!destinatarios.ok) return { error: destinatarios.erro };

    const empresas = gravarEmpresas(formData.getAll('empresas').map(String));
    if (!empresas) return { error: 'Escolha pelo menos uma empresa.' };

    const horarios = normalizarHorarios(formData.getAll('horarios').map(String));
    const ativo = formData.get('ativo') === 'on';

    await salvarConfigWhatsapp({
      instanceId,
      token,
      destinatarios: destinatarios.lista.join('\n'),
      empresas,
      autor: session.user.displayName || session.user.email || 'admin',
    });
    await definirHorarios(ID_WORKER_WHATSAPP, horarios);
    await definirAtivo(ID_WORKER_WHATSAPP, ativo);
    await registrarAuditoria(session.user, {
      acao: 'Configuração do WhatsApp alterada',
      rota: ROTA,
      detalhes: `${ativo ? 'ligado' : 'desligado'} · ${destinatarios.lista.length} destinatário(s) · ${empresas} · ${horarios.join(', ')}`,
    });
    revalidatePath(ROTA);
    revalidatePath('/relatorio');
    return { ok: ativo ? 'Salvo. O envio automático está ligado.' : 'Salvo. O envio automático está desligado.' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Falha ao salvar.' };
  }
}

// Espera o envio terminar para devolver o resultado real (a W-API responde em segundos).
export async function enviarAgora(): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const session = await sessaoAutorizada();
    const r = await executarWorker(ID_WORKER_WHATSAPP, 'manual');
    if (r === 'ja-rodando') return { ok: false, mensagem: 'Já existe um envio em andamento.' };
    if (r === 'pendente') return { ok: false, mensagem: 'Salve a configuração completa antes de enviar.' };
    if (r === 'inexistente') return { ok: false, mensagem: 'Worker inexistente.' };
    const ultima = await prisma.workerExecucao.findFirst({ where: { workerId: ID_WORKER_WHATSAPP }, orderBy: { iniciadoEm: 'desc' } });
    await registrarAuditoria(session.user, { acao: 'Relatório enviado por WhatsApp (teste)', rota: ROTA, detalhes: ultima?.mensagem ?? null });
    revalidatePath(ROTA);
    return { ok: ultima?.status === 'ok', mensagem: ultima?.mensagem ?? 'Envio concluído.' };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha no envio.' };
  }
}
