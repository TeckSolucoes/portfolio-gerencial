import type { DefaultSession } from 'next-auth';
import type { Role } from '@/generated/prisma/enums';

// Módulo aumentado para carregar role/displayName/displayTitle no token e na
// session (ver src/lib/auth.ts) — assim server components e o proxy leem
// essas informações sem round-trip extra ao banco a cada request.
declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
    displayName: string;
    displayTitle: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      displayName: string;
      displayTitle: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    displayName: string;
    displayTitle: string | null;
  }
}
