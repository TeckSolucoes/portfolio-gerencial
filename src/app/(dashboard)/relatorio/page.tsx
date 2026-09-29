import { redirect } from 'next/navigation';
import { requireFuncionalidadeForPage } from '@/lib/authz';

export default async function RelatorioPage() {
  await requireFuncionalidadeForPage('relatorio');
  redirect('/relatorio/construtor');
}
