'use server';

import { carregarAcesso } from '@/lib/acesso';
import { auth } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/auditoria';
import { EMPRESAS, type Empresa } from '@/lib/empresas';
import { podeAcessar, podeVerAba } from '@/lib/permissoes';
import { ABAS } from '@/lib/relatorio/abas';
import { dispararParaTodos, lerConfigWhatsapp, montarMensagensRelatorio } from '@/lib/whatsapp/envio';

type Resultado = { ok: boolean; mensagem: string };

// Mesmas travas da tela: funcionalidade, empresa liberada e aba que o usuário pode ver.
async function validar(empresa: string, escopo: string, data: string) {
  const session = await auth();
  const acesso = await carregarAcesso();
  if (!session?.user || !acesso) return { valido: false, erro: 'Não autenticado.' } as const;
  if (!podeAcessar(acesso, 'whatsapp')) return { valido: false, erro: 'Sem permissão para enviar por WhatsApp.' } as const;
  const aba = ABAS.find((a) => a.escopo === escopo);
  if (!(EMPRESAS as readonly string[]).includes(empresa) || !acesso.empresas.includes(empresa as Empresa)) return { valido: false, erro: 'Empresa não liberada.' } as const;
  if (!aba || !podeVerAba(acesso, aba.escopo)) return { valido: false, erro: 'Visão do relatório não liberada.' } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { valido: false, erro: 'Data inválida.' } as const;
  return { valido: true, user: session.user, empresa: empresa as Empresa, aba } as const;
}

export async function previaWhatsapp(empresa: string, escopo: string, data: string): Promise<{ ok: true; mensagens: string[] } | { ok: false; mensagem: string }> {
  try {
    const v = await validar(empresa, escopo, data);
    if (!v.valido) return { ok: false, mensagem: v.erro };
    const mensagens = await montarMensagensRelatorio([v.empresa], data, v.aba);
    return { ok: true, mensagens: [mensagens.relatorio, mensagens.insights] };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha ao montar a prévia.' };
  }
}

// Envia a visão que está na tela (empresa, aba e data) para os destinatários da aba WhatsApp.
export async function enviarRelatorioWhatsapp(empresa: string, escopo: string, data: string): Promise<Resultado> {
  try {
    const v = await validar(empresa, escopo, data);
    if (!v.valido) return { ok: false, mensagem: v.erro };
    const cfg = await lerConfigWhatsapp();
    if (!cfg) return { ok: false, mensagem: 'Configure a W-API na aba WhatsApp antes de enviar.' };

    const mensagens = await montarMensagensRelatorio([v.empresa], data, v.aba);
    const { enviados, falhas } = await dispararParaTodos(cfg, [mensagens.relatorio, mensagens.insights]);
    await registrarAuditoria(v.user, {
      acao: 'Relatório enviado por WhatsApp',
      rota: '/relatorio',
      detalhes: `${empresa} · ${v.aba.rotulo} · ${data} · ${enviados}/${cfg.destinatarios.length}${falhas.length ? ` · falhou: ${falhas.join(' · ')}` : ''}`,
    });
    if (enviados === 0) return { ok: false, mensagem: `Não enviado. ${falhas.join(' · ')}` };
    return { ok: true, mensagem: falhas.length ? `Enviado para ${enviados} de ${cfg.destinatarios.length}. Falhou: ${falhas.join(' · ')}` : `Enviado para ${enviados} destinatário(s).` };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : 'Falha no envio.' };
  }
}
