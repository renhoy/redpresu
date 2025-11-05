#!/bin/bash

###############################################################################
# Script Rápido para Insertar Datos Iniciales
# jeyca-presu
#
# Este script ejecuta seed_initial_data.sql para insertar:
# - Empresa por defecto
# - Suscripción FREE
# - Configuraciones del sistema
#
# IMPORTANTE: Solo ejecutar si las tablas ya están creadas
#
# Uso:
#   chmod +x quick-seed.sh
#   ./quick-seed.sh
###############################################################################

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  INSERCIÓN DE DATOS INICIALES - jeyca-presu${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Configuración por defecto
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-54322}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

echo -e "${YELLOW}Configuración de conexión:${NC}"
echo "  Host:     $PGHOST"
echo "  Puerto:   $PGPORT"
echo "  Usuario:  $PGUSER"
echo "  Database: $PGDATABASE"
echo ""

# Verificar PGPASSWORD
if [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}ERROR: Variable PGPASSWORD no está configurada${NC}"
    echo ""
    echo "Configúrala con:"
    echo "  export PGPASSWORD=tu_password"
    echo ""
    exit 1
fi

# Verificar que psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql no está instalado${NC}"
    echo "Instálalo con: sudo apt-get install postgresql-client"
    exit 1
fi

# Verificar conexión
echo -e "${YELLOW}Verificando conexión...${NC}"
if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: No se pudo conectar a PostgreSQL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Conexión exitosa${NC}"
echo ""

# Verificar que el archivo existe
SEED_FILE="$(dirname "$0")/seed_initial_data.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo -e "${RED}ERROR: Archivo seed_initial_data.sql no encontrado${NC}"
    echo "Buscado en: $SEED_FILE"
    exit 1
fi

# Confirmar ejecución
echo -e "${YELLOW}¿Deseas ejecutar el seed data? Esto insertará:${NC}"
echo "  - Empresa por defecto (ID=1)"
echo "  - Suscripción FREE"
echo "  - 6 configuraciones del sistema"
echo ""
echo -e "${YELLOW}[Y/n]${NC} "
read -r response

if [[ ! "$response" =~ ^([yY][eE][sS]|[yY]| )$ ]] && [ -n "$response" ]; then
    echo "Operación cancelada"
    exit 0
fi

# Ejecutar seed
echo ""
echo -e "${YELLOW}Ejecutando seed_initial_data.sql...${NC}"
echo ""

if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$SEED_FILE"; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ DATOS INICIALES INSERTADOS CORRECTAMENTE${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}Siguientes pasos:${NC}"
    echo "  1. Hacer login con tu usuario superadmin"
    echo "  2. Acceder a http://IP:3000"
    echo "  3. Ir a /profile y configurar Datos del Emisor"
    echo ""
else
    echo ""
    echo -e "${RED}ERROR: Falló la ejecución del seed data${NC}"
    exit 1
fi
