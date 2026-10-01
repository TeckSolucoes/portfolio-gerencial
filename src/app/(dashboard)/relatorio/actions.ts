'use server';

import { carregarAcesso } from '@/lib/acesso';
import { auth } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/auditoria';
import { EMPRESAS, type Empresa } from '@/lib/empresas';
import { podeAcessar, podeVerAba } from '@/lib/permissoes';
import { ABAS } from '@/lib/relatorio/abas';
import { dispararParaTodos, lerConfigWhatsapp, montarMensagemRelatorio } from '@/lib/whatsapp/envio';

// Envia a visão que está na tela (empresa, aba e data) para os destinatários da aba WhatsApp.
export async function enviarRelatorioWhatsapp(empresa: string, escopo: string, data: string): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const session = await auth();
    const acesso = await carregarAcesso();
    if (!session?.user || !acesso) return { ok: false, mensagem: 'Não autenticado.' };
    if (!podeAcessar(acesso, 'whatsapp')) return { ok: false, mensagem: 'Sem permissão para enviar por WhatsApp.' };

    const aba = ABAS.find((a) => a.escopo === escopo);
    if (!(EMPRESAS as readonly string[]).includes(empresa) || !acesso.empresas.includes(empresa as Empresa)) return { ok: false, mensagem: 'Empresa não liberada.' };
    if (!aba || !podeVerAba(acesso, aba.escopo)) return { ok: false, mensagem: 'Visão do relatório não liberada.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, mensagem: 'Data inválida.' };

    const cfg = await lerConfigWhatsapp();
    if (!cfg) return { ok: false, mensagem: 'Configure a W-API na aba WhatsApp antes de enviar.' };

    const texto = await montarMensagemRelatorio([empresa as Empresa], data, aba);
    const { enviados, falhas } = await dispararParaTodos(cfg, texto);
    await registrarAuditoria(session.user, {
      acao: 'Relatório enviado por WhatsApp',
      rota: '/relatorio',
      detalhes: `${empresa} · ${aba.rotulo} · ${data} · ${enviados}/${cfg.destinatarios.length}${falhas.length ? ` · falhou: ${falhas.join(' · ')}` : ''}`,
    });
    if (enviados === 0) return { ok: false, mensagem: `Não enviado. ${falhas.join(' · ')}` };
    return { ok: true, mensagem: falhas.length ? `Enviado para ${enviados} de ${cfg.destinatarios.length}. Falhou: ${falhas.join(' · ')}` : `Enviado para ${enviados} destinatário(s).` };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha no envio.' };
  }
}
