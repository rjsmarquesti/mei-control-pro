# ── Stage 1: deps ────────────────────────────────────────────
FROM node:20-alpine AS deps
# openssl é obrigatório — sem ele o `prisma generate` (postinstall) não detecta
# a versão do OpenSSL e gera o engine "native" genérico (libssl 1.1), mesmo com
# binaryTargets explícito incluindo linux-musl-openssl-3.0.x
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# DATABASE_URL não precisa de valor real em build-time — só é usado por
# `prisma generate` (gera tipos a partir do schema.prisma, sem conectar no banco)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# openssl necessário em runtime — sem ele o Prisma Client não detecta a versão
# do OpenSSL e tenta carregar o engine genérico "linux-musl" (libssl 1.1, ausente
# no Alpine atual) em vez do engine linux-musl-openssl-3.0.x gerado no build
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
