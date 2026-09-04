import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Role } from '@/generated/prisma/enums';

// Rate limit de força bruta por conta (não por IP — app interno, poucos
// usuários, IP compartilhado de escritório não deve travar todo mundo).
const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_DURATION_MINUTES = 15;

// Sem RECAPTCHA_SECRET_KEY configurada (chave ainda não gerada, ver
// .env.example), pula a verificação — login continua funcionando normal em
// vez de travar todo mundo até a chave existir.
async function verifyCaptcha(token: unknown): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

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
        captchaToken: { label: 'Captcha', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') return null;

        if (!(await verifyCaptcha(credentials?.captchaToken))) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Conta bloqueada: nega sem sequer comparar a senha (evita gastar o
        // bcrypt e, mais importante, evita reabrir tentativas por engano).
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return null;

        if (!bcrypt.compareSync(password, user.passwordHash)) {
          // lockedUntil já vencido (se existia) conta como reset — a próxima
          // sequência de erros começa do zero, não empilha em cima do bloqueio antigo.
          const attempts = user.lockedUntil && user.lockedUntil.getTime() <= Date.now() ? 1 : user.failedLoginAttempts + 1;
          const lockingNow = attempts >= MAX_LOGIN_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lockingNow ? 0 : attempts,
              lockedUntil: lockingNow ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) : null,
            },
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

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
