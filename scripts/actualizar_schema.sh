#!/bin/bash
# Exporta schema desde Supabase y descarga al Mac
# {"_META_file_path_": "scripts/actualizar_schema.sh"}

SERVER_USER="jos"
SERVER_HOST="192.168.0.233"
REMOTE_DIR="/home/jos/supabase"
REMOTE_FILE="$REMOTE_DIR/SCHEMA_COMPLETO.sql"
LOCAL_FILE="/Users/josius/Documents/proy/jeyca-presu/migrations/SCHEMA_COMPLETO.sql"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Actualizando schema desde Supabase ===${NC}\n"

echo -e "${YELLOW}[1/2] Exportando schema en servidor...${NC}"
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
REMOTE_DIR="/home/jos/supabase"
OUTPUT_FILE="$REMOTE_DIR/SCHEMA_COMPLETO.sql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$REMOTE_DIR/SCHEMA_$TIMESTAMP.sql"

mkdir -p "$REMOTE_DIR"

# Obtiene tablas a excluir
EXCLUDE_TABLES=$(docker exec supabase-db psql -U postgres -d postgres -t -c \
  "SELECT string_agg('--exclude-table=public.' || tablename, ' ') 
   FROM pg_tables 
   WHERE schemaname='public' AND tablename LIKE 'imanclip_%';")

# Exporta usando eval para expandir correctamente los argumentos
eval "docker exec supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  --schema-only \
  $EXCLUDE_TABLES" \
  > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  cp "$OUTPUT_FILE" "$BACKUP_FILE"
  echo "✓ Exportado: $OUTPUT_FILE"
  echo "  Tablas: $(grep -c "CREATE TABLE" "$OUTPUT_FILE")"
  echo "  Funciones: $(grep -c "CREATE FUNCTION" "$OUTPUT_FILE")"
  echo "  Políticas RLS: $(grep -c "CREATE POLICY" "$OUTPUT_FILE")"
else
  echo "✗ Error al exportar"
  exit 1
fi
ENDSSH

if [ $? -ne 0 ]; then
  echo "✗ Error en servidor"
  exit 1
fi

echo ""

echo -e "${YELLOW}[2/2] Descargando a Mac...${NC}"
scp $SERVER_USER@$SERVER_HOST:$REMOTE_FILE $LOCAL_FILE

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✓ Schema actualizado${NC}"
  echo "Archivo: $LOCAL_FILE"
  echo "Líneas: $(wc -l < "$LOCAL_FILE")"
else
  echo "✗ Error al descargar"
  exit 1
fi
