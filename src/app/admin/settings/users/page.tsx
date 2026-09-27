import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { lerEmpresas } from '@/lib/empresas';
import { UsersManager } from './UsersManager';
import type { UserDTO } from './UserForms';
import '../../admin-forms.css';

const MATRIZ: { area: string; superadmin: string; gerente: string; visualizador: string }[] = [
  {
    area: 'Relatório gerencial',
    superadmin: 'Todas as empresas, todas as visões',
    gerente: 'Empresas marcadas; com turma definida, só a turma',
    visualizador: 'Empresas marcadas; com turma definida, só a turma',
  },
  {
    area: 'Monitoramento',
    superadmin: 'Todas as empresas e totais da base',
    gerente: 'Empresas marcadas; indisponível com turma definida',
    visualizador: 'Empresas marcadas; indisponível com turma definida',
  },
  { area: 'Diário Oficial', superadmin: 'Sim', gerente: 'Sim', visualizador: 'Sim' },
  {
    area: 'Área Administração',
    superadmin: 'Sim',
    gerente: 'Entra, mas sem telas de gestão',
    visualizador: 'Não',
  },
  { area: 'Metas, Usuários e Workers', superadmin: 'Sim', gerente: 'Não', visualizador: 'Não' },
];

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');

  const rows = await prisma.user.findMany({
    orderBy: { email: 'asc' },
    include: {
      auditorias: {
        where: { latitude: { not: null }, longitude: { not: null } },
        orderBy: { criadoEm: 'desc' },
        take: 1,
      },
    },
  });
  const users: UserDTO[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    displayTitle: u.displayTitle,
    role: u.role,
    empresas: lerEmpresas(u.empresas),
    escopoGerente: u.escopoGerente,
    ultimaLatitude: u.auditorias[0]?.latitude ?? null,
    ultimaLongitude: u.auditorias[0]?.longitude ?? null,
    ultimoAcessoEm: u.auditorias[0]?.criadoEm.toISOString() ?? null,
  }));

  return (
    <div className="adm">
      <div className="kicker">Configurações · Superadmin</div>
      <h1>Usuários e acesso</h1>
      <p className="lede">
        Quem entra no portal e o que cada pessoa enxerga. O usuário só vê dados das empresas marcadas; a turma do gerente
        limita ainda mais.
      </p>

      <UsersManager users={users} currentUserId={session.user.id} />

      <details className="adm-matrix">
        <summary>Matriz de acesso por perfil</summary>
        <div className="adm-tablewrap">
          <table className="adm-utable adm-mtable">
            <caption className="adm-sr">O que cada perfil acessa</caption>
            <thead>
              <tr>
                <th scope="col">Área</th>
                <th scope="col">Superadmin</th>
                <th scope="col">Gerente</th>
                <th scope="col">Visualizador</th>
              </tr>
            </thead>
            <tbody>
              {MATRIZ.map((l) => (
                <tr key={l.area}>
                  <th scope="row">{l.area}</th>
                  <td data-label="Superadmin">{l.superadmin}</td>
                  <td data-label="Gerente">{l.gerente}</td>
                  <td data-label="Visualizador">{l.visualizador}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="adm-hint">Informativo. Regras aplicadas em permissoes.ts, no proxy e nas server actions.</p>
      </details>
    </div>
  );
}
