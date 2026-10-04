# ========================================================
# SERVICIO NACIONAL DE ADUANA DEL ECUADOR - SENAE
# Sistema de Control Financiero Previo al Pago v2.0
# Imagen de Producción Optimizada (Node.js 20 LTS Alpine)
# Compatible con Rocky Linux 9 / Docker / Podman
# ========================================================

# 1. Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# 2. Compilación
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generar cliente de base de datos
RUN npx prisma generate

# Construcción de producción standalone
RUN npm run build

# 3. Contenedor de Ejecución (Hardened Security)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuario institucional sin privilegios
RUN addgroup --system --gid 1001 senae && \
    adduser --system --uid 1001 -G senae senae

COPY --from=builder /app/public ./public
COPY --from=builder --chown=senae:senae /app/.next/standalone ./
COPY --from=builder --chown=senae:senae /app/.next/static ./.next/static
COPY --from=builder --chown=senae:senae /app/prisma ./prisma
COPY --from=builder --chown=senae:senae /app/data ./data

USER senae

EXPOSE 3000

CMD ["node", "server.js"]
