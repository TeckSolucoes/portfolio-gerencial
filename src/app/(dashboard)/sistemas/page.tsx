import { auth } from '@/lib/auth';
import { requireFuncionalidadeForPage } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { Inventario } from './Inventario';
import '../institucional.css';
import './sistemas.css';

export default async function SistemasPage() {
  await requireFuncionalidadeForPage('sistemas');
  const session = await auth();
  const sistemas = await prisma.sistema.findMany({ orderBy: [{ categoria: 'asc' }, { nome: 'asc' }] });
  const internos = sistemas.filter((s) => s.classificacao === 'interno').length;

  return (
    <div className="institucional sistemas">
      <section className="intro">
        <div className="kicker">Inventário</div>
        <h1>Sistemas e aplicações</h1>
        <p className="lede">Tudo o que a empresa usa, com link de acesso, classificação e responsável. A carga inicial veio do Catálogo de sistemas da Intranet.</p>
        <div className="sis-totais">
          <span><b>{sistemas.length}</b> sistemas</span>
          <span><b>{internos}</b> internos</span>
          <span><b>{sistemas.length - internos}</b> externos</span>
        </div>
      </section>
      <Inventario
        sistemas={sistemas.map((s) => ({
          id: s.id, nome: s.nome, url: s.url, classificacao: s.classificacao, categoria: s.categoria, empresa: s.empresa,
          responsavel: s.responsavel, situacao: s.situacao, descricao: s.descricao, atualizadoPor: s.atualizadoPor, atualizadoEm: s.updatedAt.toISOString(),
        }))}
        podeEditar={session?.user.role === 'superadmin'}
      />
    </div>
  );
}
