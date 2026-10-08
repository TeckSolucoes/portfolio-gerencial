import { requireFuncionalidadeForPage } from '@/lib/authz';
import { redirect } from 'next/navigation';
import { listarSalas } from '@/lib/escritorio/servico';
import { EscritorioClient } from './EscritorioClient';
import './escritorio.css';
export const dynamic = 'force-dynamic';
export default async function EscritorioPage() {
  const acesso = await requireFuncionalidadeForPage('hierarquia');
  if (acesso.perfil !== 'superadmin') redirect('/');
  return <EscritorioClient salas={await listarSalas()} />;
}
