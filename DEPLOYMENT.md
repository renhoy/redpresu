# Guía de Deployment - jeyca-presu en Ubuntu Linux

## 📋 Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Arquitectura de Deployment](#arquitectura-de-deployment)
3. [Fase 1: Preparar Servidor Ubuntu](#fase-1-preparar-servidor-ubuntu)
4. [Fase 2: Desplegar Supabase Self-Hosted](#fase-2-desplegar-supabase-self-hosted)
5. [Fase 3: Ejecutar Migraciones SQL](#fase-3-ejecutar-migraciones-sql)
6. [Fase 4: Desplegar Aplicación Next.js](#fase-4-desplegar-aplicación-nextjs)
7. [Fase 5: Verificación y Testing](#fase-5-verificación-y-testing)
8. [Fase 6: Mantenimiento y Backups](#fase-6-mantenimiento-y-backups)
9. [Alternativa: Todo en Docker](#alternativa-todo-en-docker)
10. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Servidor Ubuntu
- **OS:** Ubuntu 20.04 LTS o superior
- **RAM:** Mínimo 4GB (8GB recomendado)
- **CPU:** 2 cores (4 recomendado)
- **Disco:** 20GB libre mínimo
- **Acceso:** SSH con usuario sudo

### Software Necesario
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 22.x
- npm 11.x
- PM2 (global)
- Git

### Puertos Requeridos
- **3000** - Next.js (app principal)
- **8000** - Supabase Studio (UI admin)
- **54321** - Supabase API Gateway
- **54322** - Postgres (opcional exponer)

---

## Arquitectura de Deployment

```
┌─────────────────────────────────────────────┐
│         Servidor Ubuntu Linux               │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │     Docker Compose (Supabase)         │ │
│  │  - Postgres DB                        │ │
│  │  - Auth Service                       │ │
│  │  - Storage Service                    │ │
│  │  - Realtime Service                   │ │
│  │  - Studio UI (puerto 8000)            │ │
│  └───────────────────────────────────────┘ │
│                    ↕                        │
│  ┌───────────────────────────────────────┐ │
│  │     PM2 Process Manager               │ │
│  │  - Next.js App (puerto 3000)          │ │
│  │  - Puppeteer (generación PDF)         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  IP Pública: http://IP:3000                │
└─────────────────────────────────────────────┘
```

---

## Fase 1: Preparar Servidor Ubuntu

### 1.1 Conectar al Servidor

```bash
ssh usuario@IP_SERVIDOR
```

### 1.2 Ejecutar Script de Preparación

Opción A: **Script Automático** (recomendado)

```bash
# Copiar setup-server.sh al servidor
scp deployment/setup-server.sh usuario@IP_SERVIDOR:~/

# Conectar y ejecutar
ssh usuario@IP_SERVIDOR
chmod +x setup-server.sh
./setup-server.sh
```

Opción B: **Instalación Manual**

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Instalar PM2
sudo npm install -g pm2

# 6. Instalar dependencias Chromium (para Puppeteer)
sudo apt-get install -y chromium-browser \
  fonts-liberation libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 \
  libgtk-3-0 libnspr4 libnss3 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils

# 7. Instalar PostgreSQL client (para migraciones)
sudo apt-get install -y postgresql-client

# 8. Instalar Git
sudo apt-get install -y git

# 9. Crear directorios de trabajo
sudo mkdir -p /opt/jeyca-presu
sudo mkdir -p /opt/supabase
sudo chown -R $USER:$USER /opt/jeyca-presu /opt/supabase
```

### 1.3 Verificar Instalaciones

```bash
# Verificar versiones
docker --version          # Docker version 20.10+
docker-compose --version  # Docker Compose version 2.0+
node --version            # v22.x.x
npm --version             # 11.x.x
pm2 --version             # 5.x.x
git --version             # git version 2.x
psql --version            # psql (PostgreSQL) 12+
chromium-browser --version # Chromium 120+
```

---

## Fase 2: Desplegar Supabase Self-Hosted

### 2.1 Clonar Repositorio Supabase

```bash
cd /opt/supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 2.2 Configurar Variables de Entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Generar secrets seguros
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32)
SERVICE_ROLE_KEY=$(openssl rand -base64 32)

# Editar .env
nano .env
```

**Configuración mínima requerida:**

```bash
############
# Secrets
############
POSTGRES_PASSWORD=TU_PASSWORD_GENERADO
JWT_SECRET=TU_JWT_SECRET_GENERADO
ANON_KEY=TU_ANON_KEY_GENERADO
SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_GENERADO

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API Gateway
############
API_EXTERNAL_URL=http://TU_IP:54321

############
# Studio
############
STUDIO_PORT=8000

############
# Auth
############
SITE_URL=http://TU_IP:3000
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600

############
# Email (opcional - configurar después)
############
SMTP_ADMIN_EMAIL=admin@ejemplo.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password
```

### 2.3 Iniciar Supabase

```bash
# Iniciar todos los servicios
docker-compose up -d

# Verificar servicios activos
docker-compose ps

# Ver logs (opcional)
docker-compose logs -f
```

**Servicios que deben estar running:**
- supabase-db (Postgres)
- supabase-auth
- supabase-storage
- supabase-rest
- supabase-realtime
- supabase-meta
- supabase-studio
- kong (API Gateway)

### 2.4 Acceder a Supabase Studio

```bash
# Abrir en navegador
http://TU_IP:8000

# Credenciales por defecto (cambiar después)
Usuario: supabase
Password: this_password_is_insecure_and_should_be_updated
```

### 2.5 Obtener API Keys

**En Supabase Studio:**
1. Ve a Settings → API
2. Copia las keys:
   - `anon` (public) - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` (private) - SUPABASE_SERVICE_ROLE_KEY

**O desde línea de comandos:**

```bash
# Ver keys generadas
grep ANON_KEY /opt/supabase/supabase/docker/.env
grep SERVICE_ROLE_KEY /opt/supabase/supabase/docker/.env
```

---

## Fase 3: Ejecutar Migraciones SQL

### 3.1 Preparar Archivos de Migración

```bash
# Copiar migrations desde tu máquina local
scp -r migrations/ usuario@IP_SERVIDOR:/opt/jeyca-presu/
```

### 3.2 Ejecutar Script de Migraciones

**Opción A: Script Automático**

```bash
cd /opt/jeyca-presu
chmod +x deployment/deploy-migrations.sh
./deployment/deploy-migrations.sh
```

**Opción B: Ejecución Manual**

```bash
# Variables de conexión
export PGHOST=localhost
export PGPORT=54322  # Puerto expuesto de Postgres
export PGUSER=postgres
export PGPASSWORD=TU_POSTGRES_PASSWORD  # Del .env de Supabase
export PGDATABASE=postgres

# Ejecutar schema completo
psql -f migrations/SCHEMA_COMPLETO.sql

# Verificar tablas creadas
psql -c "\dt public.redpresu_*"
```

### 3.3 Verificar Migraciones

```bash
# Listar tablas creadas
psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'redpresu_%';"

# Verificar políticas RLS
psql -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'redpresu_%';"

# Verificar datos de configuración iniciales
psql -c "SELECT * FROM redpresu_config ORDER BY config_key;"
```

**Tablas esperadas (27 en total):**
- redpresu_users
- redpresu_issuers
- redpresu_tariffs
- redpresu_budgets
- redpresu_budget_items
- redpresu_subscriptions
- redpresu_config
- redpresu_contact_messages
- redpresu_user_invitations
- ... y más

---

## Fase 4: Desplegar Aplicación Next.js

### 4.1 Clonar Repositorio

```bash
cd /opt/jeyca-presu
git clone <URL_REPOSITORIO> .

# O si ya tienes archivos locales:
# rsync -avz --exclude 'node_modules' --exclude '.next' \
#   /ruta/local/jeyca-presu/ usuario@IP_SERVIDOR:/opt/jeyca-presu/
```

### 4.2 Configurar Variables de Entorno

```bash
# Copiar ejemplo
cp .env.production.example .env.local

# Editar con tus valores
nano .env.local
```

**Contenido .env.local:**

```bash
# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=http://TU_IP:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_de_supabase

# ===== RAPID-PDF =====
USE_RAPID_PDF_MODULE=true

# ===== APP URL =====
NEXT_PUBLIC_APP_URL=http://TU_IP:3000

# ===== STRIPE (deshabilitado) =====
NEXT_PUBLIC_STRIPE_ENABLED=false

# ===== NODE ENV =====
NODE_ENV=production
```

### 4.3 Instalar Dependencias y Build

```bash
cd /opt/jeyca-presu

# Instalar dependencias
npm install

# Limpiar cache (opcional)
rm -rf .next

# Build producción
npm run build

# Verificar build exitoso
ls -la .next/
```

### 4.4 Configurar PM2

**Verificar archivo ecosystem.config.js ya existe:**

```bash
cat ecosystem.config.js
```

**Iniciar aplicación con PM2:**

```bash
# Iniciar app
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs en tiempo real
pm2 logs jeyca-presu

# Guardar configuración PM2
pm2 save

# Configurar inicio automático al reiniciar servidor
pm2 startup
# Ejecutar el comando que PM2 te muestre (sudo ...)
```

### 4.5 Verificar Aplicación

```bash
# Verificar proceso corriendo
pm2 status

# Verificar puerto escuchando
sudo netstat -tulpn | grep :3000

# Test conexión
curl http://localhost:3000

# Abrir en navegador
http://TU_IP:3000
```

---

## Fase 5: Verificación y Testing

### 5.1 Testing Funcionalidades Críticas

**1. Login/Registro:**
```bash
# Abrir navegador
http://TU_IP:3000/login

# Crear usuario de prueba
http://TU_IP:3000/register
```

**2. Dashboard:**
```bash
# Verificar dashboard carga
http://TU_IP:3000/dashboard
```

**3. Crear Tarifa:**
```bash
# Ir a tarifas
http://TU_IP:3000/tariffs

# Subir CSV de prueba o crear manual
# Verificar jerarquía se renderiza
```

**4. Generar Presupuesto:**
```bash
# Crear presupuesto
http://TU_IP:3000/budgets/create

# Verificar PDF se genera
ls -la /opt/jeyca-presu/public/pdfs/
```

**5. Verificar Puppeteer:**
```bash
# Ver logs generación PDF
pm2 logs jeyca-presu | grep -i puppeteer

# Si hay errores de Chromium:
pm2 logs jeyca-presu --err
```

### 5.2 Verificar Logs

```bash
# Logs aplicación
pm2 logs jeyca-presu --lines 100

# Logs Supabase
cd /opt/supabase/supabase/docker
docker-compose logs -f --tail=100

# Logs específicos Postgres
docker-compose logs -f db

# Logs específicos Auth
docker-compose logs -f auth
```

### 5.3 Verificar Recursos

```bash
# CPU y Memoria
pm2 monit

# Uso disco
df -h

# Memoria total
free -h

# Procesos Docker
docker stats
```

### 5.4 Script de Verificación Automática

```bash
chmod +x deployment/verify-deployment.sh
./deployment/verify-deployment.sh
```

---

## Fase 6: Mantenimiento y Backups

### 6.1 Backup Base de Datos

**Script de Backup Automático:**

```bash
#!/bin/bash
# /opt/jeyca-presu/scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/jeyca-presu"
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup completo
PGPASSWORD=TU_POSTGRES_PASSWORD pg_dump \
  -h localhost \
  -p 54322 \
  -U postgres \
  -d postgres \
  --schema=public \
  --table='redpresu_*' \
  > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Eliminar backups antiguos (> 7 días)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completado: ${BACKUP_FILE}.gz"
```

**Configurar Cron (diario a las 2am):**

```bash
chmod +x /opt/jeyca-presu/scripts/backup-db.sh

# Añadir a crontab
crontab -e

# Añadir línea:
0 2 * * * /opt/jeyca-presu/scripts/backup-db.sh >> /opt/backups/backup.log 2>&1
```

### 6.2 Actualizar Aplicación

```bash
cd /opt/jeyca-presu

# 1. Backup BD antes de actualizar
./scripts/backup-db.sh

# 2. Pull cambios
git pull origin main

# 3. Instalar nuevas dependencias (si hay)
npm install

# 4. Rebuild
npm run build

# 5. Restart PM2
pm2 restart jeyca-presu

# 6. Verificar logs
pm2 logs jeyca-presu --lines 50
```

### 6.3 Monitoreo Recursos

**Configurar alertas PM2 Plus (opcional):**

```bash
pm2 plus
# Seguir instrucciones para registrar cuenta
```

**Script de Monitoreo Simple:**

```bash
#!/bin/bash
# /opt/jeyca-presu/scripts/monitor.sh

# Verificar PM2
if ! pm2 list | grep -q "jeyca-presu.*online"; then
  echo "ALERTA: jeyca-presu no está corriendo!"
  pm2 restart jeyca-presu
fi

# Verificar Supabase
if ! docker ps | grep -q "supabase-db"; then
  echo "ALERTA: Supabase DB no está corriendo!"
  cd /opt/supabase/supabase/docker && docker-compose up -d
fi

# Verificar disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "ALERTA: Disco al ${DISK_USAGE}%"
fi

# Verificar memoria
MEM_USAGE=$(free | awk '/Mem:/ {printf("%.0f", $3/$2 * 100)}')
if [ $MEM_USAGE -gt 90 ]; then
  echo "ALERTA: Memoria al ${MEM_USAGE}%"
fi
```

**Ejecutar cada 5 minutos:**

```bash
chmod +x /opt/jeyca-presu/scripts/monitor.sh

crontab -e
# Añadir:
*/5 * * * * /opt/jeyca-presu/scripts/monitor.sh >> /opt/jeyca-presu/logs/monitor.log 2>&1
```

### 6.4 Comandos Útiles Día a Día

```bash
# Ver status de todo
pm2 status
docker ps

# Restart app
pm2 restart jeyca-presu

# Restart Supabase
cd /opt/supabase/supabase/docker && docker-compose restart

# Ver logs app
pm2 logs jeyca-presu

# Ver logs Supabase
cd /opt/supabase/supabase/docker && docker-compose logs -f

# Limpiar logs antiguos
pm2 flush

# Ver espacio en disco
df -h
du -sh /opt/jeyca-presu/public/pdfs/

# Limpiar PDFs antiguos (> 30 días)
find /opt/jeyca-presu/public/pdfs/ -name "*.pdf" -mtime +30 -delete
```

---

## Alternativa: Todo en Docker

Si prefieres contenedorizar también Next.js (opcional):

### Opción A: Docker Compose Completo

**Ver archivos:**
- `deployment/Dockerfile` - Imagen Next.js
- `deployment/docker-compose.full.yml` - Supabase + Next.js

**Deployment:**

```bash
cd /opt/jeyca-presu

# Build y start todo
docker-compose -f deployment/docker-compose.full.yml up -d --build

# Verificar
docker-compose -f deployment/docker-compose.full.yml ps

# Logs
docker-compose -f deployment/docker-compose.full.yml logs -f nextjs-app
```

**Ventajas:**
- Todo aislado en containers
- Fácil replicar en otros servidores
- Rollback más sencillo

**Desventajas:**
- Más complejo debugear
- Más capas (Docker + Node)
- Rebuild necesario para cambios
- Mayor consumo de recursos

---

## Troubleshooting

### Error: "Cannot find module"

```bash
cd /opt/jeyca-presu
rm -rf node_modules .next
npm install
npm run build
pm2 restart jeyca-presu
```

### Error: Puppeteer "Failed to launch chromium"

```bash
# Reinstalar dependencias Chromium
sudo apt-get install -y chromium-browser \
  fonts-liberation libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 \
  libgtk-3-0 libnspr4 libnss3 libx11-xcb1 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils

# Verificar variable entorno
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
npm install puppeteer

# Restart app
pm2 restart jeyca-presu
```

### Error: Supabase Connection Refused

```bash
# Verificar servicios Docker
cd /opt/supabase/supabase/docker
docker-compose ps

# Restart si necesario
docker-compose restart

# Verificar logs
docker-compose logs auth
docker-compose logs kong

# Verificar puerto
sudo netstat -tulpn | grep :54321

# Verificar .env.local tiene URL correcta
grep SUPABASE_URL /opt/jeyca-presu/.env.local
```

### Error: PDF Generation Timeout

```bash
# Ver logs Puppeteer
pm2 logs jeyca-presu | grep -i puppeteer

# Verificar memoria disponible
free -h

# Aumentar memoria PM2
pm2 stop jeyca-presu
nano ecosystem.config.js
# Cambiar: max_memory_restart: '2G'
pm2 start ecosystem.config.js
```

### Error: RLS Policy "permission denied"

```bash
# Verificar políticas RLS
PGPASSWORD=TU_PASSWORD psql -h localhost -p 54322 -U postgres -d postgres -c "
  SELECT tablename, policyname, cmd, qual
  FROM pg_policies
  WHERE schemaname='public' AND tablename='redpresu_users';
"

# Re-ejecutar migraciones si faltan políticas
psql -h localhost -p 54322 -U postgres -d postgres -f migrations/SCHEMA_COMPLETO.sql
```

### Aplicación No Accesible desde Exterior

```bash
# Verificar app escucha en 0.0.0.0
netstat -tulpn | grep :3000

# Verificar firewall
sudo ufw status

# Abrir puerto si necesario
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 54321/tcp

# Verificar IP pública
curl ifconfig.me
```

### Alto Consumo de Memoria

```bash
# Ver consumo por proceso
docker stats
pm2 monit

# Limpiar logs Docker
docker system prune -a

# Limitar memoria Supabase (docker-compose.yml)
# Añadir a cada servicio:
# mem_limit: 512m

# Restart con límites
cd /opt/supabase/supabase/docker
docker-compose down
docker-compose up -d
```

---

## Contacto y Soporte

**Documentación del Proyecto:**
- `/CLAUDE.md` - Instrucciones desarrollo Fase 2
- `/arquitectura.md` - Stack tecnológico
- `/prd.md` - Requisitos funcionales

**Documentación Externa:**
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Última actualización:** 2025-11-03
**Versión:** 1.0
**Estado:** Producción Ready (MVP - 75% Fase 2)
