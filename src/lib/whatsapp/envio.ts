import 'server-only';
import { prisma } from '../prisma';
import { lerEmpresas, ROTULO_EMPRESA, type Empresa } from '../empresas';
import { metaDoMes } from '../metas';
import { carregarRelatorioAoVivo } from '../relatorio/aoVivo';
import { juntarBlocos, montarBloco, normalizarDestinatarios } from './formato';

export const ID_WORKER_WHATSAPP = 'whatsapp-relatorio';
const ID_CONFIG = 'padrao';
const URL_WAPI = 'https://api.w-api.app/v1/message/send-text';
const FUSO = 'America/Sao_Paulo';

export interface ConfigWhatsapp {
  instanceId: string;
  token: string;
  destinatarios: string[];
  empresas: Empresa[];
}

export async function lerConfigBruta() {
  return prisma.whatsappConfig.findUnique({ where: { id: ID_CONFIG } });
}

// null = falta algo para conseguir enviar (o worker fica "pendente").
export async function lerConfigWhatsapp(): Promise<ConfigWhatsapp | null> {
  const c = await lerConfigBruta();
  if (!c?.instanceId || !c.token) return null;
  const destinatarios = normalizarDestinatarios(c.destinatarios);
  const empresas = lerEmpresas(c.empresas);
  if (!destinatarios.ok || empresas.length === 0) return null;
  return { instanceId: c.instanceId, token: c.token, destinatarios: destinatarios.lista, empresas };
}

export async function salvarConfigWhatsapp(dados: { instanceId: string; token: string; destinatarios: string; empresas: string; autor: string }) {
  const { autor, ...campos } = dados;
  await prisma.whatsappConfig.upsert({
    where: { id: ID_CONFIG },
    create: { id: ID_CONFIG, ...campos, atualizadoPor: autor },
    update: { ...campos, atualizadoPor: autor },
  });
}

const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
const horaSp = () => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());

// Mesmo número da tela: relatório ao vivo + meta oficial do mês (quando cadastrada).
export async function montarMensagemRelatorio(empresas: readonly Empresa[], ref: string, aba: { escopo: string; rotulo: string }): Promise<string> {
  const parcial = ref === hojeSp() ? horaSp() : null;
  const blocos = await Promise.all(
    empresas.map(async (empresa) => {
      const [relatorio, oficial] = await Promise.all([carregarRelatorioAoVivo(empresa, ref, aba.escopo), metaDoMes([empresa], ref.slice(0, 7))]);
      return montarBloco({ relatorio, empresa: ROTULO_EMPRESA[empresa], aba: aba.rotulo, metaOficial: oficial, horaParcial: parcial });
    }),
  );
  const base = process.env.NEXTAUTH_URL?.replace(/\/+$/, '');
  const link = base && empresas.length === 1 ? `${base}/relatorio?empresa=${empresas[0]}&escopo=${encodeURIComponent(aba.escopo)}&data=${ref}` : base ? `${base}/relatorio` : null;
  return juntarBlocos(blocos, link);
}

async function enviarTexto(cfg: ConfigWhatsapp, phone: string, message: string) {
  const resposta = await fetch(`${URL_WAPI}?instanceId=${encodeURIComponent(cfg.instanceId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) {
    const corpo = (await resposta.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(`W-API respondeu ${resposta.status}${corpo ? `: ${corpo}` : ''}`);
  }
}

// Tenta todos os destinatários; um número com problema não impede os outros de receber.
export async function dispararParaTodos(cfg: ConfigWhatsapp, mensagem: string): Promise<{ enviados: number; falhas: string[] }> {
  const falhas: string[] = [];
  let enviados = 0;
  for (const destino of cfg.destinatarios) {
    try {
      await enviarTexto(cfg, destino, mensagem);
      enviados += 1;
    } catch (e) {
      falhas.push(`${destino}: ${e instanceof Error ? e.message : 'falha no envio'}`);
    }
  }
  return { enviados, falhas };
}

export async function dispararRelatorioAgendado() {
  const cfg = await lerConfigWhatsapp();
  if (!cfg) throw new Error('Configuração do WhatsApp incompleta.');
  const ref = hojeSp();
  const mensagem = await montarMensagemRelatorio(cfg.empresas, ref, { escopo: 'Geral', rotulo: 'Geral' });
  const { enviados, falhas } = await dispararParaTodos(cfg, mensagem);
  if (enviados === 0) throw new Error(`Nenhum envio deu certo. ${falhas.join(' · ')}`);
  const resumo = `Enviado para ${enviados} de ${cfg.destinatarios.length} destinatário(s) · ${cfg.empresas.join(', ')} · ${ref}`;
  return { itens: enviados, mensagem: falhas.length ? `${resumo} · falhou: ${falhas.join(' · ')}` : resumo, dados: { ref, enviados, falhas } };
}
