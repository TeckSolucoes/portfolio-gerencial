import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Role } from '@/generated/prisma/enums';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!bcrypt.compareSync(password, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
          displayTitle: user.displayTitle,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.displayName = user.displayName;
        token.displayTitle = user.displayTitle;
      }
      return token;
    },
    session({ session, token }) {
      // `token` chega tipado com os campos extras como `unknown` aqui — o
      // module augmentation de `next-auth/jwt` (src/types/next-auth.d.ts)
      // não se aplica ao param do callback `session` nesta versão do
      // pacote (mesmo o `jwt` callback abaixo enxergando os tipos certos).
      // Cast explícito em vez de depender do merge.
      session.user.id = token.sub!;
      session.user.role = token.role as Role;
      session.user.displayName = token.displayName as string;
      session.user.displayTitle = token.displayTitle as string | null;
      return session;
    },
  },
});
