# ============================================================================
# Dockerfile para jeyca-presu (Next.js 15 con Puppeteer)
#
# Multi-stage build para optimizar tamaño de imagen
#
# Uso:
#   docker build -t jeyca-presu:latest -f deployment/Dockerfile .
#   docker run -p 3000:3000 --env-file .env.local jeyca-presu:latest
#
# O con docker-compose:
#   docker-compose -f deployment/docker-compose.full.yml up --build
#
# Documentación: DEPLOYMENT.md - Sección "Alternativa: Todo en Docker"
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies (instalar dependencias de producción)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS deps

# Añadir libc6-compat para compatibilidad
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# ----------------------------------------------------------------------------
# Stage 2: Builder (build de la aplicación)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Copiar variables de entorno de ejemplo (se sobrescribirán en runtime)
# IMPORTANTE: NO copiar .env.local real (debe montarse como volume)
COPY .env.production.example .env.local

# Build de Next.js
# NOTA: Este build es genérico, las variables de entorno se inyectan en runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: Runner (imagen final con Chromium para Puppeteer)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Instalar Chromium y dependencias de Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Configurar Puppeteer para usar Chromium de sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Configurar entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios desde builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Crear directorios para PDFs y logos con permisos correctos
RUN mkdir -p ./public/pdfs ./public/logos && \
    chown -R nextjs:nodejs ./public

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Puerto configurable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Comando de inicio
CMD ["node", "server.js"]

# ============================================================================
# NOTAS:
#
# 1. VARIABLES DE ENTORNO:
#    - Montar .env.local como volume o pasar con --env-file
#    - O definir en docker-compose.yml
#
# 2. VOLUMES:
#    - Montar ./public/pdfs para persistir PDFs generados
#    - Montar ./public/logos para persistir logos subidos
#
# 3. PUPPETEER:
#    - Usa Chromium del sistema Alpine
#    - Variables PUPPETEER_* ya configuradas
#
# 4. STANDALONE OUTPUT:
#    - Requiere next.config.ts con: output: 'standalone'
#    - Verificar que está configurado antes de build
#
# 5. SEGURIDAD:
#    - Ejecuta como usuario no-root (nextjs:nodejs)
#    - Multi-stage build reduce tamaño imagen
#
# 6. TAMAÑO IMAGEN:
#    - Alpine base: ~150MB
#    - Con Chromium: ~350MB
#    - Con app: ~500-600MB (depende de dependencias)
# ============================================================================
