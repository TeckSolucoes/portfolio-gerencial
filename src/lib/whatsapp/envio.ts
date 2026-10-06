import 'server-only';
import { prisma } from '../prisma';
import { lerEmpresas, ROTULO_EMPRESA, type Empresa } from '../empresas';
import { metaDoMes } from '../metas';
import { carregarRelatorioAoVivo } from '../relatorio/aoVivo';
import { juntarBlocos, juntarInsights, montarBloco, montarBlocoInsights, normalizarDestinatarios } from './formato';

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

export interface MensagensWhatsapp {
  relatorio: string;
  insights: string;
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
export async function montarMensagensRelatorio(empresas: readonly Empresa[], ref: string, aba: { escopo: string; rotulo: string; gerenteComercialId?: string | null }): Promise<MensagensWhatsapp> {
  const parcial = ref === hojeSp() ? horaSp() : null;
  const variasEmpresas = empresas.length > 1;
  const conteudos = await Promise.all(
    empresas.map(async (empresa) => {
      const [relatorio, oficial] = await Promise.all([carregarRelatorioAoVivo(empresa, ref, aba.escopo, aba.gerenteComercialId), metaDoMes([empresa], ref.slice(0, 7))]);
      const entrada = { relatorio, empresa: ROTULO_EMPRESA[empresa], aba: aba.rotulo, metaOficial: oficial, horaParcial: parcial, cabecalhoCurto: variasEmpresas };
      return { relatorio: montarBloco(entrada), insights: montarBlocoInsights(entrada) };
    }),
  );
  const tituloGrupo = variasEmpresas ? empresas.map((empresa) => ROTULO_EMPRESA[empresa]).join(' e ') : null;
  const tituloInsights = empresas.map((empresa) => ROTULO_EMPRESA[empresa]).join(' e ');
  return {
    relatorio: juntarBlocos(conteudos.map((conteudo) => conteudo.relatorio), tituloGrupo),
    insights: juntarInsights(conteudos.map((conteudo) => conteudo.insights), tituloInsights),
  };
}

export const montarMensagensDeHoje = (empresas: readonly Empresa[]) => montarMensagensRelatorio(empresas, hojeSp(), { escopo: 'Geral', rotulo: 'Geral' });

export async function enviarTexto(cfg: Pick<ConfigWhatsapp, 'instanceId' | 'token'>, phone: string, message: string) {
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
export async function dispararParaTodos(cfg: ConfigWhatsapp, mensagens: string | readonly string[]): Promise<{ enviados: number; falhas: string[] }> {
  const falhas: string[] = [];
  let enviados = 0;
  for (const destino of cfg.destinatarios) {
    try {
      for (const mensagem of typeof mensagens === 'string' ? [mensagens] : mensagens) await enviarTexto(cfg, destino, mensagem);
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
  const mensagens = await montarMensagensDeHoje(cfg.empresas);
  const { enviados, falhas } = await dispararParaTodos(cfg, [mensagens.relatorio, mensagens.insights]);
  if (enviados === 0) throw new Error(`Nenhum envio deu certo. ${falhas.join(' · ')}`);
  const resumo = `Enviado para ${enviados} de ${cfg.destinatarios.length} destinatário(s) · ${cfg.empresas.join(', ')} · ${ref}`;
  return { itens: enviados, mensagem: falhas.length ? `${resumo} · falhou: ${falhas.join(' · ')}` : resumo, dados: { ref, enviados, falhas } };
}
