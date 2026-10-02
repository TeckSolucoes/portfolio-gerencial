import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { RoteirosManager, type RoteiroTela } from './RoteirosManager';
import './roteiros.css';

export const dynamic = 'force-dynamic';

function regras(valor: string): { campo: string; valor: string }[] {
  try {
    const dados = JSON.parse(valor);
    return Array.isArray(dados) ? dados.filter((r) => r && typeof r.campo === 'string' && typeof r.valor === 'string') : [];
  } catch { return []; }
}

export default async function RoteirosPage() {
  await requireFuncionalidadeForPage('roteiros');
  const session = await auth();
  const podeEditar = session?.user.role === 'superadmin';
  const registros = await prisma.roteiroConvenio.findMany({ where: podeEditar ? {} : { ativo: true }, orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] });
  const roteiros: RoteiroTela[] = registros.map((r) => ({
    id: r.id, nome: r.nome, descricao: r.descricao, observacoes: r.observacoes, ativo: r.ativo,
    atualizadoEm: r.updatedAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), regras: regras(r.regrasJson),
  }));
  return <div className="roteiros">
    <header className="rot-head"><div><p className="rot-kicker">Operação · Regras de atuação</p><h1>Roteiros</h1><p>Consulte os critérios de cada convênio antes de iniciar ou direcionar uma proposta.</p></div><span>{roteiros.filter((r) => r.ativo).length} convênio{roteiros.filter((r) => r.ativo).length === 1 ? '' : 's'} ativo{roteiros.filter((r) => r.ativo).length === 1 ? '' : 's'}</span></header>
    <RoteirosManager roteiros={roteiros} podeEditar={podeEditar} />
  </div>;
}
