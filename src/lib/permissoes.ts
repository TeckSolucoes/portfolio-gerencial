import { EMPRESAS, lerEmpresas } from './empresas';
import type { Empresa } from './empresas';
import { CHAVES_FUNCIONALIDADES, type Funcionalidade } from './funcionalidades';

export type Perfil = 'superadmin' | 'gerente' | 'visualizador';

export interface Acesso {
  userId: string;
  perfil: Perfil;
  nome: string;
  empresas: Empresa[]; // já resolvido: superadmin recebe todas
  escopoGerente: string | null; // primeiro nome do gerente; limita o usuário à turma dele
  funcionalidades: Record<Funcionalidade, boolean>;
}

export type RegraFuncionalidade = { funcionalidade: string; permitido: boolean };

export function resolverFuncionalidades(
  perfil: readonly RegraFuncionalidade[],
  usuario: readonly RegraFuncionalidade[],
): Record<Funcionalidade, boolean> {
  const porPerfil = new Map(perfil.map((r) => [r.funcionalidade, r.permitido]));
  const porUsuario = new Map(usuario.map((r) => [r.funcionalidade, r.permitido]));
  return Object.fromEntries(CHAVES_FUNCIONALIDADES.map((chave) => [chave, porUsuario.get(chave) ?? porPerfil.get(chave) ?? false])) as Record<Funcionalidade, boolean>;
}

export function montarAcesso(u: {
  id: string;
  role: Perfil;
  displayName: string;
  empresas: string;
  escopoGerente: string | null;
  permissoesPerfil?: RegraFuncionalidade[];
  permissoesUsuario?: RegraFuncionalidade[];
}): Acesso {
  return {
    userId: u.id,
    perfil: u.role,
    nome: u.displayName,
    empresas: u.role === 'superadmin' ? [...EMPRESAS] : lerEmpresas(u.empresas),
    escopoGerente: u.escopoGerente?.trim() ? u.escopoGerente.trim() : null,
    funcionalidades: resolverFuncionalidades(u.permissoesPerfil ?? [], u.permissoesUsuario ?? []),
  };
}

export const podeAcessar = (acesso: Acesso, funcionalidade: Funcionalidade) => acesso.funcionalidades[funcionalidade];

// Empresa não identificada (null) só é vista pelo superadmin.
export function podeVerEmpresa(a: Acesso, empresa: Empresa | null): boolean {
  if (a.perfil === 'superadmin') return true;
  return empresa !== null && a.empresas.includes(empresa);
}

const primeiroNome = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().split(/\s+/)[0]?.toUpperCase() ?? '';

// "Geral" é a visão da empresa inteira: quem tem escopo de gerente não a vê.
export function podeVerAba(a: Acesso, aba: string): boolean {
  if (a.perfil === 'superadmin' || !a.escopoGerente) return true;
  return aba !== 'Geral' && primeiroNome(aba) === primeiroNome(a.escopoGerente);
}

export const abasPermitidas = <T extends string>(a: Acesso, abas: readonly T[]): T[] => abas.filter((x) => podeVerAba(a, x));

// Pedido inválido ou não permitido cai na primeira empresa liberada (nunca em outra).
export function escolherEmpresa(a: Acesso, pedida: string | undefined): Empresa | null {
  const pedidaOk = a.empresas.find((e) => e === pedida?.toUpperCase());
  return pedidaOk ?? a.empresas[0] ?? null;
}

// Pedido não permitido cai na primeira aba permitida; null se nenhuma.
export function escolherAba<T extends string>(a: Acesso, pedida: string | undefined, abas: readonly T[]): T | null {
  const permitidas = abasPermitidas(a, abas);
  return permitidas.find((x) => x === pedida) ?? permitidas[0] ?? null;
}

export function filtrarPorEmpresa<T>(a: Acesso, itens: readonly T[], empresaDe: (item: T) => Empresa | null): T[] {
  return itens.filter((i) => podeVerEmpresa(a, empresaDe(i)));
}

// Monitoramento não traz gerente nos alertas: quem tem escopo de gerente fica de fora (falha fechada).
export type StatusMonitoramento = 'ok' | 'sem-empresa' | 'so-empresa-inteira';
export function statusMonitoramento(a: Acesso): StatusMonitoramento {
  if (a.empresas.length === 0) return 'sem-empresa';
  if (a.perfil !== 'superadmin' && a.escopoGerente) return 'so-empresa-inteira';
  return 'ok';
}
