# ──────────────────────────────────────────────────────────────────
# Portfólio Teck — Dockerfile (Node 20, Debian slim)
#
# Debian (não alpine) de propósito: better-sqlite3 é um módulo nativo
# (precisa compilar/baixar binário pra libc glibc) e o projeto irmão
# Capacity só escapou desse problema por usar node:sqlite (built-in do
# Node). Aqui usamos better-sqlite3 via @prisma/adapter-better-sqlite3,
# então ficamos com a base com melhor compatibilidade de binário nativo
# em vez de brigar com musl do alpine.
#
# Sem output:'standalone' de propósito: essa combinação (Prisma 7 com
# generator custom pra src/generated/prisma + módulo nativo) tem risco
# real do file-tracing do Next não incluir tudo corretamente, e não há
# Docker nesta máquina de desenvolvimento pra testar isso localmente
# antes do primeiro deploy real. Preferimos a imagem um pouco maior e
# `next start` de verdade a um build "otimizado" que pode falhar em
# produção sem forma fácil de depurar.
# ──────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim AS builder
WORKDIR /app

# better-sqlite3 é módulo nativo — sem binário pré-compilado pra essa combinação
# exata de node/plataforma, o npm cai pra node-gyp e precisa de Python + toolchain
# de compilação C++. Sem isso o build falha em "Could not find any Python
# installation to use" (erro real já visto num deploy). Só no builder — o runner
# não recompila nada, só copia o node_modules já compilado.
# openssl (a CLI, não só a lib) é como o Prisma detecta a versão do
# libssl/OpenSSL do sistema pra escolher o engine binário certo — sem ela,
# "node:20-bookworm-slim" emite "failed to detect the libssl/openssl version"
# e cai num binário default que pode não carregar. Suspeita real de causa
# de boot quebrado em produção (prisma migrate deploy falhando silenciosamente).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* precisa existir no momento do build (não é lido em runtime —
# o Next grava o valor direto no JS enviado ao navegador), diferente das
# outras env vars do app. EasyPanel repassa as variáveis configuradas como
# --build-arg (confirmado num deploy anterior), mas sem essa declaração
# explícita de ARG o Docker simplesmente ignora o valor.
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY

RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd -r app && useradd -r -g app -m app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Volume persistente do EasyPanel deve apontar pra /app/data — é onde o
# arquivo SQLite (DATABASE_URL=file:./data/teck-portfolio.db) vive.
RUN mkdir -p /app/data && chown -R app:app /app

USER app
EXPOSE 3000

# PORT hardcoded acima é só o default do build — o EasyPanel injeta seu próprio
# PORT em runtime (confirmado: container subiu na 80 mesmo com ENV PORT=3000 aqui),
# e "next start" respeita esse env var. Por isso o healthcheck lê $PORT em vez de
# fixar 3000 — hardcoded, ele falharia sempre com o app saudável na 80.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# prisma migrate deploy e o seed são idempotentes (ver guards de count() em
# prisma/seed.ts) — seguros rodar a cada boot. Sem isso, o primeiro acesso à
# tela de login não teria nenhum usuário pra entrar, e criar o admin exigiria
# alguém abrir o terminal do container manualmente.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && npm run start"]
