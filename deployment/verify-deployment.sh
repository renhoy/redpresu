#!/bin/bash

###############################################################################
# Script de Verificación Post-Deployment
# jeyca-presu
#
# Este script verifica que todos los componentes del deployment estén
# funcionando correctamente:
# - Supabase (Docker containers)
# - Next.js (PM2 process)
# - Base de datos (tablas y conexión)
# - Aplicación web (endpoints)
# - Recursos del sistema
#
# Uso:
#   chmod +x verify-deployment.sh
#   ./verify-deployment.sh
#
# Documentación: DEPLOYMENT.md - Fase 5
###############################################################################

set -e  # Detener en caso de error crítico (pero continuamos en verificaciones)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARN=0

# Funciones de logging
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

log_warn() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    CHECKS_WARN=$((CHECKS_WARN + 1))
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

###############################################################################
# BANNER
###############################################################################

clear
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                               ║${NC}"
echo -e "${CYAN}║         VERIFICACIÓN POST-DEPLOYMENT - jeyca-presu            ║${NC}"
echo -e "${CYAN}║                                                               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# 1. VERIFICAR SUPABASE (DOCKER)
###############################################################################

log_section "1. Verificando Supabase (Docker Containers)"

if command -v docker &> /dev/null; then
    log_success "Docker instalado: $(docker --version)"

    # Verificar containers de Supabase
    SUPABASE_CONTAINERS=(
        "supabase-db"
        "supabase-auth"
        "supabase-storage"
        "supabase-rest"
        "supabase-studio"
        "kong"
    )

    for container in "${SUPABASE_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "$container"; then
            log_success "Container '$container' está corriendo"
        else
            log_fail "Container '$container' NO está corriendo"
        fi
    done

    # Verificar puerto Postgres (54322)
    if sudo netstat -tulpn 2>/dev/null | grep -q ":54322"; then
        log_success "Puerto 54322 (Postgres) está escuchando"
    else
        log_warn "Puerto 54322 (Postgres) NO está escuchando"
    fi

    # Verificar puerto API Gateway (54321)
    if sudo netstat -tulpn 2>/dev/null | grep -q ":54321"; then
        log_success "Puerto 54321 (API Gateway) está escuchando"
    else
        log_fail "Puerto 54321 (API Gateway) NO está escuchando"
    fi

    # Verificar puerto Studio (8000)
    if sudo netstat -tulpn 2>/dev/null | grep -q ":8000"; then
        log_success "Puerto 8000 (Studio UI) está escuchando"
    else
        log_warn "Puerto 8000 (Studio UI) NO está escuchando"
    fi

else
    log_fail "Docker NO está instalado"
fi

###############################################################################
# 2. VERIFICAR NEXT.JS (PM2)
###############################################################################

log_section "2. Verificando Next.js (PM2 Process)"

if command -v pm2 &> /dev/null; then
    log_success "PM2 instalado: $(pm2 -v)"

    # Verificar proceso jeyca-presu
    if pm2 list | grep -q "jeyca-presu"; then
        STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="jeyca-presu") | .pm2_env.status' 2>/dev/null || echo "unknown")

        if [ "$STATUS" == "online" ]; then
            log_success "Proceso 'jeyca-presu' está corriendo (status: online)"

            # Obtener más detalles
            UPTIME=$(pm2 jlist | jq -r '.[] | select(.name=="jeyca-presu") | .pm2_env.pm_uptime' 2>/dev/null || echo "0")
            MEMORY=$(pm2 jlist | jq -r '.[] | select(.name=="jeyca-presu") | .monit.memory' 2>/dev/null || echo "0")
            MEMORY_MB=$((MEMORY / 1024 / 1024))

            log_info "  Uptime: $(date -d @$((UPTIME/1000)) -u +%H:%M:%S 2>/dev/null || echo 'N/A')"
            log_info "  Memoria: ${MEMORY_MB}MB"

        elif [ "$STATUS" == "errored" ]; then
            log_fail "Proceso 'jeyca-presu' tiene errores"
        elif [ "$STATUS" == "stopped" ]; then
            log_fail "Proceso 'jeyca-presu' está detenido"
        else
            log_warn "Proceso 'jeyca-presu' estado desconocido: $STATUS"
        fi
    else
        log_fail "Proceso 'jeyca-presu' NO encontrado en PM2"
    fi

    # Verificar puerto 3000
    if sudo netstat -tulpn 2>/dev/null | grep -q ":3000"; then
        log_success "Puerto 3000 (Next.js) está escuchando"
    else
        log_fail "Puerto 3000 (Next.js) NO está escuchando"
    fi

else
    log_fail "PM2 NO está instalado"
fi

###############################################################################
# 3. VERIFICAR BASE DE DATOS
###############################################################################

log_section "3. Verificando Base de Datos (PostgreSQL)"

# Configuración de conexión
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

if command -v psql &> /dev/null; then
    log_success "PostgreSQL client instalado: $(psql --version)"

    # Verificar conexión (requiere PGPASSWORD)
    if [ -z "$PGPASSWORD" ]; then
        log_warn "Variable PGPASSWORD no configurada, saltando tests de BD"
    else
        if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "Conexión a PostgreSQL exitosa"

            # Contar tablas redpresu_*
            TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'redpresu_%';" 2>/dev/null | xargs)

            if [ "$TABLE_COUNT" -gt 0 ]; then
                log_success "Tablas 'redpresu_*' encontradas: $TABLE_COUNT"
            else
                log_fail "No se encontraron tablas 'redpresu_*'"
            fi

            # Verificar políticas RLS
            POLICY_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'redpresu_%';" 2>/dev/null | xargs)

            if [ "$POLICY_COUNT" -gt 0 ]; then
                log_success "Políticas RLS activas: $POLICY_COUNT"
            else
                log_warn "No se encontraron políticas RLS"
            fi

            # Verificar tabla de usuarios
            USER_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
                -t -c "SELECT COUNT(*) FROM redpresu_users;" 2>/dev/null | xargs)

            if [ -n "$USER_COUNT" ]; then
                log_info "Usuarios registrados: $USER_COUNT"
            fi

        else
            log_fail "No se pudo conectar a PostgreSQL"
        fi
    fi
else
    log_warn "PostgreSQL client NO instalado, saltando tests de BD"
fi

###############################################################################
# 4. VERIFICAR APLICACIÓN WEB (HTTP)
###############################################################################

log_section "4. Verificando Aplicación Web (HTTP Endpoints)"

# Obtener IP del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
APP_URL="http://${SERVER_IP}:3000"

log_info "URL de prueba: $APP_URL"

# Test endpoint raíz
if curl -s -o /dev/null -w "%{http_code}" "$APP_URL" | grep -q "200\|302"; then
    log_success "Endpoint raíz '/' responde correctamente"
else
    log_fail "Endpoint raíz '/' NO responde"
fi

# Test endpoint login
if curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/login" | grep -q "200"; then
    log_success "Endpoint '/login' responde correctamente"
else
    log_warn "Endpoint '/login' NO responde"
fi

# Test endpoint API (health check si existe)
# Ajustar si tienes un endpoint específico de health check

###############################################################################
# 5. VERIFICAR ARCHIVOS Y DIRECTORIOS
###############################################################################

log_section "5. Verificando Archivos y Directorios"

# Verificar directorio de la app
if [ -d "/opt/jeyca-presu" ]; then
    log_success "Directorio de la aplicación existe: /opt/jeyca-presu"

    # Verificar archivo .env.local
    if [ -f "/opt/jeyca-presu/.env.local" ]; then
        log_success "Archivo de configuración .env.local existe"
    else
        log_fail "Archivo .env.local NO existe"
    fi

    # Verificar directorio .next (build)
    if [ -d "/opt/jeyca-presu/.next" ]; then
        log_success "Build de Next.js existe: .next/"
    else
        log_fail "Build de Next.js NO existe (.next/)"
    fi

    # Verificar directorio public/pdfs
    if [ -d "/opt/jeyca-presu/public/pdfs" ]; then
        log_success "Directorio de PDFs existe: public/pdfs/"
        PDF_COUNT=$(find /opt/jeyca-presu/public/pdfs -name "*.pdf" 2>/dev/null | wc -l)
        log_info "  PDFs generados: $PDF_COUNT"
    else
        log_warn "Directorio public/pdfs NO existe"
    fi

    # Verificar directorio public/logos
    if [ -d "/opt/jeyca-presu/public/logos" ]; then
        log_success "Directorio de logos existe: public/logos/"
    else
        log_warn "Directorio public/logos NO existe"
    fi

else
    log_fail "Directorio de la aplicación NO existe: /opt/jeyca-presu"
fi

###############################################################################
# 6. VERIFICAR RECURSOS DEL SISTEMA
###############################################################################

log_section "6. Verificando Recursos del Sistema"

# CPU
CPU_COUNT=$(nproc)
log_info "CPU cores: $CPU_COUNT"

if [ "$CPU_COUNT" -ge 2 ]; then
    log_success "CPU suficiente (≥2 cores)"
else
    log_warn "CPU limitada (<2 cores)"
fi

# Memoria RAM
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
USED_MEM=$(free -m | awk '/^Mem:/{print $3}')
FREE_MEM=$(free -m | awk '/^Mem:/{print $4}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

log_info "Memoria: ${USED_MEM}MB / ${TOTAL_MEM}MB usado (${MEM_PERCENT}%)"

if [ "$TOTAL_MEM" -ge 4096 ]; then
    log_success "Memoria suficiente (≥4GB)"
elif [ "$TOTAL_MEM" -ge 2048 ]; then
    log_warn "Memoria limitada (2-4GB)"
else
    log_warn "Memoria insuficiente (<2GB)"
fi

if [ "$MEM_PERCENT" -lt 80 ]; then
    log_success "Uso de memoria normal (<80%)"
elif [ "$MEM_PERCENT" -lt 90 ]; then
    log_warn "Uso de memoria alto (80-90%)"
else
    log_fail "Uso de memoria crítico (>90%)"
fi

# Disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')

log_info "Disco: ${DISK_USAGE}% usado, ${DISK_FREE} libre"

if [ "$DISK_USAGE" -lt 70 ]; then
    log_success "Espacio en disco suficiente (<70% usado)"
elif [ "$DISK_USAGE" -lt 85 ]; then
    log_warn "Espacio en disco limitado (70-85% usado)"
else
    log_fail "Espacio en disco crítico (>85% usado)"
fi

###############################################################################
# 7. VERIFICAR CHROMIUM/PUPPETEER
###############################################################################

log_section "7. Verificando Chromium/Puppeteer"

if command -v chromium-browser &> /dev/null; then
    log_success "Chromium instalado: $(chromium-browser --version 2>/dev/null | head -n1 || echo 'OK')"
else
    log_warn "Chromium NO instalado (requerido para generación de PDFs)"
fi

# Verificar dependencias de Puppeteer (algunas)
LIBS_REQUIRED=("libgtk-3-0" "libnss3" "libgbm1")
for lib in "${LIBS_REQUIRED[@]}"; do
    if dpkg -l | grep -q "$lib"; then
        log_success "Librería '$lib' instalada"
    else
        log_warn "Librería '$lib' NO instalada"
    fi
done

###############################################################################
# RESUMEN FINAL
###############################################################################

log_section "RESUMEN DE VERIFICACIÓN"

TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARN))

echo ""
echo -e "${GREEN}Checks exitosos:  ${CHECKS_PASSED}${NC}"
echo -e "${YELLOW}Checks con warnings: ${CHECKS_WARN}${NC}"
echo -e "${RED}Checks fallidos:  ${CHECKS_FAILED}${NC}"
echo -e "─────────────────────────────"
echo -e "Total checks:     ${TOTAL_CHECKS}"
echo ""

if [ "$CHECKS_FAILED" -eq 0 ]; then
    if [ "$CHECKS_WARN" -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}║   ✓ DEPLOYMENT VERIFICADO - TODO CORRECTO                     ║${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║                                                               ║${NC}"
        echo -e "${YELLOW}║   ⚠ DEPLOYMENT VERIFICADO - CON WARNINGS                      ║${NC}"
        echo -e "${YELLOW}║                                                               ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    fi
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}║   ✗ DEPLOYMENT CON ERRORES - REVISAR LOGS                     ║${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Comandos útiles para debugging:"
    log_info "  - Ver logs PM2:       pm2 logs jeyca-presu"
    log_info "  - Ver logs Docker:    docker-compose logs -f"
    log_info "  - Restart PM2:        pm2 restart jeyca-presu"
    log_info "  - Restart Supabase:   docker-compose restart"
    echo ""
    exit 1
fi
