#!/bin/bash

###############################################################################
# Script para Ejecutar Migraciones SQL en Producción
# redpresu
#
# Este script ejecuta las migraciones SQL necesarias para configurar
# la base de datos de redpresu en Supabase (self-hosted o cloud).
#
# Uso:
#   chmod +x deploy-migrations.sh
#   ./deploy-migrations.sh
#
# Requisitos:
#   - PostgreSQL client instalado (psql)
#   - Supabase corriendo y accesible
#   - Credenciales de conexión configuradas
#
# Documentación: DEPLOYMENT.md - Fase 3
###############################################################################

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

###############################################################################
# CONFIGURACIÓN
###############################################################################

# Directorio de migraciones
MIGRATIONS_DIR="./migrations"

# Archivo principal de schema
SCHEMA_FILE="$MIGRATIONS_DIR/SCHEMA_COMPLETO.sql"

# Configuración de conexión PostgreSQL
# Puedes configurar estas variables o usar las del entorno
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

# PGPASSWORD debe estar configurada como variable de entorno
# export PGPASSWORD=tu_password

###############################################################################
# VERIFICACIONES PREVIAS
###############################################################################

log_info "==================================================================="
log_info "SCRIPT DE MIGRACIONES SQL - redpresu"
log_info "==================================================================="
echo ""

# Verificar que psql está instalado
if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL client (psql) no está instalado"
    log_error "Instalar con: sudo apt-get install postgresql-client"
    exit 1
fi

log_info "PostgreSQL client: $(psql --version)"
echo ""

# Verificar que existe el directorio de migraciones
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
    log_error "Asegúrate de ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

log_info "Directorio de migraciones: $MIGRATIONS_DIR"
echo ""

# Verificar que existe el archivo de schema
if [ ! -f "$SCHEMA_FILE" ]; then
    log_error "Archivo de schema no encontrado: $SCHEMA_FILE"
    exit 1
fi

log_info "Archivo de schema: $SCHEMA_FILE"
echo ""

# Verificar configuración de conexión
log_info "Configuración de conexión PostgreSQL:"
log_info "  Host:     $PGHOST"
log_info "  Puerto:   $PGPORT"
log_info "  Usuario:  $PGUSER"
log_info "  Database: $PGDATABASE"
echo ""

# Verificar que PGPASSWORD está configurada
if [ -z "$PGPASSWORD" ]; then
    log_error "Variable PGPASSWORD no está configurada"
    log_error "Configúrala con: export PGPASSWORD=tu_password"
    exit 1
fi

log_info "✓ Variable PGPASSWORD configurada"
echo ""

###############################################################################
# VERIFICAR CONEXIÓN
###############################################################################

log_step "Verificando conexión a PostgreSQL..."

if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT version();" > /dev/null 2>&1; then
    log_error "No se pudo conectar a PostgreSQL"
    log_error "Verifica que Supabase está corriendo y las credenciales son correctas"
    exit 1
fi

log_info "✓ Conexión exitosa a PostgreSQL"
echo ""

###############################################################################
# BACKUP PREVIO (OPCIONAL)
###############################################################################

log_step "¿Deseas crear un backup antes de ejecutar las migraciones? [Y/n]"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY]| )$ ]] || [ -z "$response" ]; then
    BACKUP_DIR="/opt/backups/redpresu"
    BACKUP_FILE="$BACKUP_DIR/backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql"

    mkdir -p "$BACKUP_DIR"

    log_info "Creando backup en: $BACKUP_FILE"

    if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
        --schema=public --table='redpresu_*' > "$BACKUP_FILE"; then

        # Comprimir backup
        gzip "$BACKUP_FILE"
        log_info "✓ Backup creado: ${BACKUP_FILE}.gz"
    else
        log_error "Error al crear backup"
        exit 1
    fi
else
    log_warn "Saltando creación de backup"
fi

echo ""

###############################################################################
# EJECUTAR MIGRACIONES
###############################################################################

log_step "Ejecutando migraciones SQL..."
echo ""

log_info "Ejecutando schema completo: $SCHEMA_FILE"
log_warn "Este proceso puede tardar varios minutos..."
echo ""

# Ejecutar schema completo
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -f "$SCHEMA_FILE" > /tmp/migration_output.log 2>&1; then

    log_info "✓ Migraciones ejecutadas exitosamente"
else
    log_error "Error al ejecutar migraciones"
    log_error "Ver detalles en: /tmp/migration_output.log"
    cat /tmp/migration_output.log
    exit 1
fi

echo ""

###############################################################################
# VERIFICAR MIGRACIONES
###############################################################################

log_step "Verificando migraciones..."
echo ""

# Contar tablas redpresu_*
TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'redpresu_%';")

log_info "Tablas 'redpresu_*' creadas: $TABLE_COUNT"

# Listar tablas creadas
log_info "Listado de tablas:"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'redpresu_%' ORDER BY tablename;"

echo ""

# Verificar políticas RLS
POLICY_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'redpresu_%';")

log_info "Políticas RLS creadas: $POLICY_COUNT"

echo ""

# Verificar datos de configuración iniciales
log_info "Verificando datos de configuración iniciales..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
    -c "SELECT config_key, config_value FROM redpresu_config ORDER BY config_key LIMIT 10;"

echo ""

###############################################################################
# RESUMEN FINAL
###############################################################################

log_info "==================================================================="
log_info "MIGRACIONES COMPLETADAS EXITOSAMENTE"
log_info "==================================================================="
echo ""

log_info "Resumen:"
log_info "  - Tablas creadas: $TABLE_COUNT"
log_info "  - Políticas RLS: $POLICY_COUNT"
log_info "  - Schema: public"
log_info "  - Prefijo: redpresu_*"
echo ""

log_info "Siguientes pasos:"
log_info "1. Configurar variables de entorno (.env.local)"
log_info "2. Build aplicación: npm run build"
log_info "3. Iniciar aplicación: pm2 start ecosystem.config.js"
log_info "4. Verificar funcionamiento: http://IP:3000"
echo ""

log_info "Documentación completa: DEPLOYMENT.md"
echo ""

###############################################################################
# LIMPIEZA
###############################################################################

rm -f /tmp/migration_output.log

log_info "✓ Script finalizado"
