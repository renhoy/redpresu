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

# Exporta el schema completo (sin prefijos, ahora usamos schema dedicado)
docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=\${PREFIX} \
  --no-owner \
  --no-acl \
  --schema-only \
  > "\$OUTPUT_FILE_TEMP"

if [ \$? -eq 0 ]; then
  # Limpiar el dump: eliminar líneas problemáticas
  # 1. Eliminar "CREATE SCHEMA public;" si existe
  # 2. Eliminar "COMMENT ON SCHEMA public IS..." si existe
  # 3. Mantener todo lo demás
  grep -v "^CREATE SCHEMA public;" "\$OUTPUT_FILE_TEMP" | \
    grep -v "^COMMENT ON SCHEMA public IS" > "\$OUTPUT_FILE"

  # Crear backup
  cp "\$OUTPUT_FILE" "\$BACKUP_FILE"

  # Eliminar archivo temporal
  rm -f "\$OUTPUT_FILE_TEMP"

  echo "✓ Exportado: \$OUTPUT_FILE"
  echo "  Tablas: \$(grep -c "CREATE TABLE" "\$OUTPUT_FILE")"
  echo "  Funciones: \$(grep -c "CREATE FUNCTION" "\$OUTPUT_FILE")"
  echo "  Políticas RLS: \$(grep -c "CREATE POLICY" "\$OUTPUT_FILE")"
  echo "  Views: \$(grep -c "CREATE VIEW" "\$OUTPUT_FILE")"
  echo "  Triggers: \$(grep -c "CREATE TRIGGER" "\$OUTPUT_FILE")"
else
  echo "✗ Error al exportar"
  rm -f "\$OUTPUT_FILE_TEMP"
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