import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Next.js 16 renomeou o file convention `middleware.ts` para `proxy.ts` (o
// antigo nome continua funcionando mas emite warning de depreciação — ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// Proxy roda em runtime Node.js por padrão nesta versão, então dá pra usar o
// `auth()` do NextAuth diretamente aqui (sem o split edge-config que versões
// antigas do Next exigiam).
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Link de compartilhamento externo — sem login de propósito, o token na URL
  // é a própria credencial (validado dentro da rota, checando expiração).
  if (pathname.startsWith('/share/')) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (pathname.startsWith('/admin') && req.auth.user.role === 'visualizador') {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
