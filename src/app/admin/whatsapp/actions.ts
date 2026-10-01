'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForAction, requireSessionForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';
import { gravarEmpresas, lerEmpresas } from '@/lib/empresas';
import { definirAtivo, definirHorarios, executarWorker } from '@/lib/workers/motor';
import { normalizarHorarios } from '@/lib/workers/tipos';
import { normalizarDestinatarios } from '@/lib/whatsapp/formato';
import { enviarTexto, ID_WORKER_WHATSAPP, lerConfigBruta, montarMensagensDeHoje, salvarConfigWhatsapp } from '@/lib/whatsapp/envio';

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
    await registrarAuditoria(session.user, { acao: 'Relatório enviado por WhatsApp (enviar agora)', rota: ROTA, detalhes: ultima?.mensagem ?? null });
    revalidatePath(ROTA);
    return { ok: ultima?.status === 'ok', mensagem: ultima?.mensagem ?? 'Envio concluído.' };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha no envio.' };
  }
}

// Prévia com as empresas marcadas na tela (mesmo antes de salvar): monta, não envia.
export async function gerarPrevia(empresas: string[]): Promise<{ ok: true; mensagens: string[] } | { ok: false; mensagem: string }> {
  try {
    await sessaoAutorizada();
    const lista = lerEmpresas(empresas.join(','));
    if (lista.length === 0) return { ok: false, mensagem: 'Marque pelo menos uma empresa.' };
    const mensagens = await montarMensagensDeHoje(lista);
    return { ok: true, mensagens: [mensagens.relatorio, mensagens.insights] };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha ao montar a prévia.' };
  }
}

// Teste para um número só, com o que está na tela: não precisa salvar, ligar a agenda nem incomodar
// os destinatários. Token em branco usa o salvo. A mensagem é montada aqui, nunca vem do navegador.
export async function enviarTeste(dados: { instanceId: string; token: string; numero: string; empresas: string[] }): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const session = await sessaoAutorizada();
    const atual = await lerConfigBruta();
    const instanceId = dados.instanceId.trim() || atual?.instanceId || '';
    const token = dados.token.trim() || atual?.token || '';
    if (!instanceId || !token) return { ok: false, mensagem: 'Preencha o ID da instância e o token da W-API.' };
    const numero = normalizarDestinatarios(dados.numero);
    if (!numero.ok) return { ok: false, mensagem: numero.erro };
    if (numero.lista.length > 1) return { ok: false, mensagem: 'O teste vai para um número só.' };
    const empresas = lerEmpresas(dados.empresas.join(','));
    if (empresas.length === 0) return { ok: false, mensagem: 'Marque pelo menos uma empresa.' };

    const mensagens = await montarMensagensDeHoje(empresas);
    await enviarTexto({ instanceId, token }, numero.lista[0], `*[TESTE]*\n${mensagens.relatorio}`);
    await enviarTexto({ instanceId, token }, numero.lista[0], `*[TESTE]*\n${mensagens.insights}`);
    await registrarAuditoria(session.user, { acao: 'Teste de WhatsApp enviado', rota: ROTA, detalhes: `${numero.lista[0]} · ${empresas.join(', ')}` });
    return { ok: true, mensagem: `Teste enviado para ${numero.lista[0]}. Confira no WhatsApp.` };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha no envio do teste.' };
  }
}
