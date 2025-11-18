#!/bin/bash
# Exporta schema completo desde Supabase (por nombre de schema) y descarga al Mac
# {"_META_file_path_": "scripts/actualizar_schema.sh"}

SERVER_USER="jos"
SERVER_HOST="192.168.0.233"
REMOTE_DIR="/home/jos/supabase"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Solicitar nombre de schema al usuario
echo -e "${BLUE}=== Exportar Schema desde Supabase ===${NC}\n"
echo -e "${YELLOW}Ingrese el nombre del schema a exportar:${NC}"
echo -e "${YELLOW}Ejemplos: imanclip, renexweb, redpresu${NC}"
read -p "> " PREFIX

# Validar que se ingresó un nombre de schema
if [ -z "$PREFIX" ]; then
  echo -e "${RED}✗ Error: Debe ingresar un nombre de schema${NC}"
  exit 1
fi

# Convertir nombre de schema a mayúsculas para nombres de archivo
PREFIX_UPPER=$(echo "$PREFIX" | tr '[:lower:]' '[:upper:]')

REMOTE_FILE="$REMOTE_DIR/SCHEMA_${PREFIX_UPPER}.sql"
LOCAL_FILE="/Users/josius/Documents/proy/redpresu/docs/migrations/SCHEMA_${PREFIX_UPPER}.sql"

echo ""
echo -e "${BLUE}=== Actualizando schema '${PREFIX}' desde Supabase ===${NC}\n"

echo -e "${YELLOW}[1/2] Exportando schema en servidor...${NC}"
ssh $SERVER_USER@$SERVER_HOST bash -s << ENDSSH
REMOTE_DIR="/home/jos/supabase"
PREFIX="$PREFIX"
PREFIX_UPPER="$PREFIX_UPPER"
OUTPUT_FILE="\$REMOTE_DIR/SCHEMA_\${PREFIX_UPPER}.sql"
OUTPUT_FILE_TEMP="\$REMOTE_DIR/SCHEMA_\${PREFIX_UPPER}_temp.sql"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$REMOTE_DIR/SCHEMA_\${PREFIX_UPPER}_\$TIMESTAMP.sql"

mkdir -p "\$REMOTE_DIR"

# Paso 1: Exportar tipos ENUM del schema public que son referenciados
ENUMS_FILE="\$REMOTE_DIR/ENUMS_\${PREFIX_UPPER}_temp.sql"

echo "  → Exportando tipos ENUM del schema public..."
docker exec -i supabase-db psql -U postgres -d postgres -t > "\$ENUMS_FILE" <<'SQLEOF'
SELECT
  'DO \$body\$ BEGIN CREATE TYPE public.' || t.typname || ' AS ENUM (' ||
  string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) ||
  '); EXCEPTION WHEN duplicate_object THEN null; END \$body\$;'
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e'
  AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;
SQLEOF

# Paso 2: Exportar schema public completo (funciones, tablas, etc.)
PUBLIC_SCHEMA_FILE="\$REMOTE_DIR/PUBLIC_\${PREFIX_UPPER}_temp.sql"

echo "  → Exportando schema public completo..."
docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  --schema-only \
  > "\$PUBLIC_SCHEMA_FILE"

# Paso 3: Exportar el schema completo (sin prefijos, ahora usamos schema dedicado)
echo "  → Exportando schema \${PREFIX}..."
docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=\${PREFIX} \
  --no-owner \
  --no-acl \
  --schema-only \
  > "\$OUTPUT_FILE_TEMP"

if [ \$? -eq 0 ]; then
  # Paso 4: Combinar ENUMs + Schema Public + Schema Específico en un solo archivo
  {
    echo "-- ============================================"
    echo "-- Schema Export: \${PREFIX}"
    echo "-- Generated: \$(date)"
    echo "-- ============================================"
    echo ""
    echo "-- NOTA: El schema debe existir antes de ejecutar este SQL"
    echo "-- CREATE SCHEMA IF NOT EXISTS \${PREFIX};"
    echo ""
    echo "-- ============================================"
    echo "-- Tipos ENUM del schema public"
    echo "-- ============================================"
    echo ""

    # Agregar ENUMs si existen
    if [ -s "\$ENUMS_FILE" ]; then
      # Limpiar espacios en blanco
      grep -v "^$" "\$ENUMS_FILE" | sed 's/^[[:space:]]*//'
    fi

    echo ""
    echo "-- ============================================"
    echo "-- Schema public (tablas, funciones, etc.)"
    echo "-- ============================================"
    echo ""

    # Agregar schema public completo si existe, limpiando líneas problemáticas
    if [ -s "\$PUBLIC_SCHEMA_FILE" ]; then
      grep -v "^CREATE SCHEMA public;" "\$PUBLIC_SCHEMA_FILE" | \
        grep -v "^COMMENT ON SCHEMA public IS"
    fi

    echo ""
    echo "-- ============================================"
    echo "-- Schema: \${PREFIX}"
    echo "-- ============================================"
    echo ""

    # Agregar contenido del schema limpio
    # Eliminar líneas problemáticas:
    # - CREATE SCHEMA public;
    # - CREATE SCHEMA <schema_name>;
    # - COMMENT ON SCHEMA public IS...
    grep -v "^CREATE SCHEMA public;" "\$OUTPUT_FILE_TEMP" | \
      grep -v "^CREATE SCHEMA \${PREFIX};" | \
      grep -v "^COMMENT ON SCHEMA public IS"
  } > "\$OUTPUT_FILE"

  # Crear backup
  cp "\$OUTPUT_FILE" "\$BACKUP_FILE"

  # Eliminar archivos temporales
  rm -f "\$OUTPUT_FILE_TEMP" "\$ENUMS_FILE" "\$PUBLIC_SCHEMA_FILE"

  echo "✓ Exportado: \$OUTPUT_FILE"
  echo ""
  echo "Estadísticas del export:"
  echo "  Tipos ENUM: \$(grep -c "CREATE TYPE" "\$OUTPUT_FILE" || echo 0)"
  echo "  Tablas public: \$(grep -c "CREATE TABLE public\." "\$OUTPUT_FILE" || echo 0)"
  echo "  Funciones public: \$(grep -c "CREATE.*FUNCTION public\." "\$OUTPUT_FILE" || echo 0)"
  echo "  Tablas \${PREFIX}: \$(grep -c "CREATE TABLE \${PREFIX}\." "\$OUTPUT_FILE" || echo 0)"
  echo "  Funciones \${PREFIX}: \$(grep -c "CREATE.*FUNCTION \${PREFIX}\." "\$OUTPUT_FILE" || echo 0)"
  echo "  Políticas RLS: \$(grep -c "CREATE POLICY" "\$OUTPUT_FILE" || echo 0)"
  echo "  Views: \$(grep -c "CREATE VIEW" "\$OUTPUT_FILE" || echo 0)"
  echo "  Triggers: \$(grep -c "CREATE TRIGGER" "\$OUTPUT_FILE" || echo 0)"
else
  echo "✗ Error al exportar"
  rm -f "\$OUTPUT_FILE_TEMP" "\$ENUMS_FILE" "\$PUBLIC_SCHEMA_FILE"
  exit 1
fi
ENDSSH

if [ $? -ne 0 ]; then
  echo "✗ Error en servidor"
  exit 1
fi

echo ""
echo -e "${YELLOW}[2/2] Descargando a Mac...${NC}"

# Crea el directorio de destino si no existe
mkdir -p "$(dirname "$LOCAL_FILE")"

scp $SERVER_USER@$SERVER_HOST:$REMOTE_FILE $LOCAL_FILE

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✓ Schema '${PREFIX}' actualizado${NC}"
  echo "Archivo: $LOCAL_FILE"
  echo "Líneas: $(wc -l < "$LOCAL_FILE")"
else
  echo "✗ Error al descargar"
  exit 1
fi