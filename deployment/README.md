# Deployment - jeyca-presu

Este directorio contiene todos los archivos necesarios para el deployment de **jeyca-presu** en un servidor Ubuntu Linux.

## 📁 Contenido del Directorio

```
deployment/
├── README.md                      # Este archivo
├── setup-server.sh               # Script preparación servidor Ubuntu
├── deploy-migrations.sh          # Script ejecutar migraciones SQL
├── seed_initial_data.sql         # Datos iniciales (config + empresa por defecto)
├── verify-deployment.sh          # Script verificación post-deployment
├── Dockerfile                    # Dockerfile para Next.js (alternativa Docker)
├── next.config.docker.ts         # Configuración Next.js para Docker
└── docker-compose.full.yml       # Docker Compose completo (Supabase + Next.js)
```

## 🚀 Inicio Rápido

### Opción A: Deployment Híbrido (Recomendado)

**Supabase en Docker + Next.js con PM2**

1. **Preparar servidor:**
   ```bash
   chmod +x deployment/setup-server.sh
   ./deployment/setup-server.sh
   ```

2. **Configurar Supabase:**
   ```bash
   # Seguir guía: DEPLOYMENT.md - Fase 2
   cd /opt/supabase
   git clone https://github.com/supabase/supabase
   # Configurar .env y ejecutar docker-compose
   ```

3. **Ejecutar migraciones:**
   ```bash
   chmod +x deployment/deploy-migrations.sh
   export PGPASSWORD=tu_password
   ./deployment/deploy-migrations.sh
   ```

4. **Configurar variables de entorno:**
   ```bash
   cp .env.production.example .env.local
   nano .env.local  # Editar con valores reales
   ```

5. **Build y deploy:**
   ```bash
   npm install
   npm run build
   pm2 start ecosystem.config.js
   ```

6. **Verificar:**
   ```bash
   chmod +x deployment/verify-deployment.sh
   ./deployment/verify-deployment.sh
   ```

### Opción B: Todo en Docker

**Supabase + Next.js en contenedores**

1. **Preparar entorno:**
   ```bash
   cp .env.production.example .env
   nano .env  # Configurar variables
   ```

2. **Habilitar output standalone:**
   ```bash
   cp deployment/next.config.docker.ts next.config.ts
   ```

3. **Build y start:**
   ```bash
   docker-compose -f deployment/docker-compose.full.yml up -d --build
   ```

4. **Verificar:**
   ```bash
   docker-compose -f deployment/docker-compose.full.yml ps
   docker-compose -f deployment/docker-compose.full.yml logs -f nextjs-app
   ```

## 📖 Documentación Completa

Para instrucciones detalladas paso a paso, ver: **[../DEPLOYMENT.md](../DEPLOYMENT.md)**

## 🔧 Scripts Disponibles

### setup-server.sh

Prepara el servidor Ubuntu instalando:
- Docker y Docker Compose
- Node.js 22.x y npm
- PM2
- Chromium y dependencias Puppeteer
- PostgreSQL client
- Git

**Uso:**
```bash
chmod +x deployment/setup-server.sh
./deployment/setup-server.sh
```

### deploy-migrations.sh

Ejecuta las migraciones SQL en Supabase.

**Configuración:**
```bash
export PGHOST=localhost
export PGPORT=54322
export PGUSER=postgres
export PGPASSWORD=tu_password
export PGDATABASE=postgres
```

**Uso:**
```bash
chmod +x deployment/deploy-migrations.sh
./deployment/deploy-migrations.sh
```

### seed_initial_data.sql

**⚠️ IMPORTANTE: Ejecutar DESPUÉS de deploy-migrations.sh**

Inserta todos los datos iniciales necesarios:
- ✅ Empresa por defecto (ID=1): "Empresa Principal"
- ✅ Suscripción FREE para la empresa
- ✅ Configuraciones del sistema (multiempresa, planes, textos legales, etc.)

**Uso:**
```bash
export PGPASSWORD=tu_password
psql -h localhost -p 54322 -U postgres -d postgres -f deployment/seed_initial_data.sql
```

**Qué incluye:**
- `redpresu_companies`: Empresa por defecto
- `redpresu_subscriptions`: Plan FREE activo
- `redpresu_config`: 6 configuraciones críticas
  - multiempresa (true)
  - subscriptions_enabled (false)
  - subscription_plans (Free, Pro, Enterprise)
  - forms_legal_notice (texto legal formularios)
  - legal_page_content (página /legal)
  - invitation_email_template (template emails)

### verify-deployment.sh

Verifica que todos los componentes estén funcionando correctamente:
- Supabase (Docker containers)
- Next.js (PM2 process)
- Base de datos (tablas y conexión)
- Aplicación web (endpoints)
- Recursos del sistema

**Uso:**
```bash
chmod +x deployment/verify-deployment.sh
./deployment/verify-deployment.sh
```

## 🐳 Archivos Docker

### Dockerfile

Imagen multi-stage para Next.js con Puppeteer/Chromium.

**Características:**
- Base Alpine Linux (ligera)
- Chromium incluido
- Usuario no-root (nextjs)
- Output standalone
- Healthcheck integrado

**Build:**
```bash
docker build -t jeyca-presu:latest -f deployment/Dockerfile .
```

### docker-compose.full.yml

Orquestación completa de todos los servicios:
- Postgres (DB)
- Supabase Auth
- Supabase Storage
- Supabase REST
- Supabase Realtime
- Supabase Studio
- Kong (API Gateway)
- Next.js App

**Uso:**
```bash
docker-compose -f deployment/docker-compose.full.yml up -d
```

### next.config.docker.ts

Configuración de Next.js adaptada para Docker con `output: "standalone"`.

**Uso:**
```bash
# Reemplazar next.config.ts antes de build Docker
cp deployment/next.config.docker.ts next.config.ts
```

## 📋 Checklist de Deployment

- [ ] Servidor Ubuntu preparado (setup-server.sh ejecutado)
- [ ] Supabase configurado y corriendo
- [ ] Migraciones SQL ejecutadas (deploy-migrations.sh)
- [ ] Variables de entorno configuradas (.env.local)
- [ ] Aplicación construida (npm run build)
- [ ] PM2 configurado y corriendo (o Docker)
- [ ] Verificación exitosa (verify-deployment.sh)
- [ ] Backup configurado
- [ ] Monitoreo configurado

## 🔍 Verificación Rápida

```bash
# Ver servicios Docker (Supabase)
docker ps

# Ver proceso PM2 (Next.js)
pm2 status

# Ver logs aplicación
pm2 logs jeyca-presu

# Ver logs Supabase
cd /opt/supabase/supabase/docker
docker-compose logs -f

# Test endpoint
curl http://localhost:3000
```

## 🆘 Troubleshooting

### Problema: "Cannot find module"
```bash
rm -rf node_modules .next
npm install
npm run build
pm2 restart jeyca-presu
```

### Problema: Puppeteer no funciona
```bash
sudo apt-get install -y chromium-browser fonts-liberation \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 \
  libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
  libxrandr2 xdg-utils
pm2 restart jeyca-presu
```

### Problema: No conecta a Supabase
```bash
# Verificar Supabase corriendo
docker ps | grep supabase

# Verificar puerto
sudo netstat -tulpn | grep :54321

# Verificar .env.local
cat .env.local | grep SUPABASE_URL
```

Ver más en: **[../DEPLOYMENT.md](../DEPLOYMENT.md) - Sección Troubleshooting**

## 📞 Recursos

- **Documentación Principal:** [../DEPLOYMENT.md](../DEPLOYMENT.md)
- **Configuración PM2:** [../ecosystem.config.js](../ecosystem.config.js)
- **Variables de Entorno:** [../.env.production.example](../.env.production.example)
- **Arquitectura:** [../arquitectura.md](../arquitectura.md)
- **Supabase Docs:** https://supabase.com/docs/guides/self-hosting
- **Next.js Docs:** https://nextjs.org/docs
- **PM2 Docs:** https://pm2.keymetrics.io/docs/

---

**Última actualización:** 2025-11-03
**Versión:** 1.0
**Estado:** Producción Ready (MVP - 75% Fase 2)
