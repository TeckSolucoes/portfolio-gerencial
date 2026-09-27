import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { lerEmpresas } from '@/lib/empresas';
import { UsersManager } from './UsersManager';
import type { UserDTO } from './UserForms';
import '../../admin-forms.css';
import { FUNCIONALIDADES, type Funcionalidade } from '@/lib/funcionalidades';
import { salvarPermissoesPerfil } from './actions';

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== 'superadmin') redirect('/admin');

  const [rows, regrasPerfil] = await Promise.all([prisma.user.findMany({
    orderBy: { email: 'asc' },
    include: {
      permissoes: true,
      auditorias: {
        where: { latitude: { not: null }, longitude: { not: null } },
        orderBy: { criadoEm: 'desc' },
        take: 1,
      },
    },
  }), prisma.permissaoPerfil.findMany()]);
  const perfis = Object.fromEntries((['superadmin', 'gerente', 'visualizador'] as const).map((role) => [role,
    Object.fromEntries(FUNCIONALIDADES.map((f) => [f.chave, regrasPerfil.find((r) => r.role === role && r.funcionalidade === f.chave)?.permitido ?? false]))
  ])) as Record<'superadmin' | 'gerente' | 'visualizador', Record<Funcionalidade, boolean>>;
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
    permissoes: Object.fromEntries(u.permissoes.map((p) => [p.funcionalidade, p.permitido])),
  }));

  return (
    <div className="adm">
      <div className="kicker">Configurações · Superadmin</div>
      <h1>Usuários e acesso</h1>
      <p className="lede">
        Quem entra no portal e o que cada pessoa enxerga. O usuário só vê dados das empresas marcadas; a turma do gerente
        limita ainda mais.
      </p>

      <UsersManager users={users} currentUserId={session.user.id} permissoesPerfil={perfis} />

      <details className="adm-matrix">
        <summary>Matriz de acesso por perfil</summary>
        <div className="adm-profile-grid">
          {(['superadmin', 'gerente', 'visualizador'] as const).map((role) => <form action={salvarPermissoesPerfil} className="adm-profile-card" key={role}>
            <input type="hidden" name="role" value={role} />
            <h3>{role === 'superadmin' ? 'Superadmin' : role === 'gerente' ? 'Gerente' : 'Visualizador'}</h3>
            {FUNCIONALIDADES.map((f) => <label key={f.chave}><input type="checkbox" name="funcionalidades" value={f.chave} defaultChecked={perfis[role][f.chave]} /> <span>{f.nome}</span></label>)}
            <button className="btn btn-secondary" type="submit">Salvar perfil</button>
          </form>)}
        </div>
        <p className="adm-hint">O usuário herda estes checks, mas pode ter uma liberação ou bloqueio individual.</p>
      </details>
    </div>
  );
}
