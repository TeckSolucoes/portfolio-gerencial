import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { registrarAuditoria } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

const numeroValido = (valor: unknown, min: number, max: number) =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= min && valor <= max;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => null) as { rota?: unknown; latitude?: unknown; longitude?: unknown } | null;
  const rota = typeof body?.rota === 'string' ? body.rota : '';
  if (!rota.startsWith('/') || rota.length > 240) {
    return NextResponse.json({ erro: 'Rota inválida.' }, { status: 400 });
  }

  const temLatitude = body?.latitude !== null && body?.latitude !== undefined;
  const temLongitude = body?.longitude !== null && body?.longitude !== undefined;
  if (temLatitude !== temLongitude ||
      (temLatitude && (!numeroValido(body?.latitude, -90, 90) || !numeroValido(body?.longitude, -180, 180)))) {
    return NextResponse.json({ erro: 'Coordenadas inválidas.' }, { status: 400 });
  }

  await registrarAuditoria(session.user, {
    acao: 'Acesso à página',
    rota,
    latitude: temLatitude ? body?.latitude as number : null,
    longitude: temLongitude ? body?.longitude as number : null,
  });
  return new NextResponse(null, { status: 204 });
}
