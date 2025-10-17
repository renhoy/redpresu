#!/bin/bash

# Refactor field names for redpresu_users and redpresu_issuers tables
# This script updates TypeScript files to use the new field naming convention

echo "Starting field name refactoring..."

# Target directories
SRC_DIR="/Users/josius/Documents/proy/jeyca-presu/src"

# Find all TypeScript files
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  echo "Processing: $file"

  # Create a backup
  cp "$file" "$file.bak"

  # Redpresu_users table field changes:
  # empresa_id → company_id (already done in database types, skip)
  # nombre → name
  # apellidos → last_name

  # Replace field access patterns for nombre → name
  sed -i '' 's/\.nombre\([^_a-zA-Z]\|$\)/.name\1/g' "$file"
  sed -i '' "s/'nombre'/'name'/g" "$file"
  sed -i '' 's/"nombre"/"name"/g' "$file"
  sed -i '' 's/nombre:/name:/g' "$file"

  # Replace field access patterns for apellidos → last_name
  sed -i '' 's/\.apellidos\([^_a-zA-Z]\|$\)/.last_name\1/g' "$file"
  sed -i '' "s/'apellidos'/'last_name'/g" "$file"
  sed -i '' 's/"apellidos"/"last_name"/g' "$file"
  sed -i '' 's/apellidos:/last_name:/g' "$file"

  # Redpresu_issuers table field changes (remove issuers_ prefix):
  # issuers_type → type
  sed -i '' 's/issuers_type/type/g' "$file"

  # issuers_name → name
  sed -i '' 's/issuers_name/name/g' "$file"

  # issuers_nif → nif
  sed -i '' 's/issuers_nif/nif/g' "$file"

  # issuers_address → address
  sed -i '' 's/issuers_address/address/g' "$file"

  # issuers_postal_code → postal_code
  sed -i '' 's/issuers_postal_code/postal_code/g' "$file"

  # issuers_locality → locality
  sed -i '' 's/issuers_locality/locality/g' "$file"

  # issuers_province → province
  sed -i '' 's/issuers_province/province/g' "$file"

  # issuers_country → country
  sed -i '' 's/issuers_country/country/g' "$file"

  # issuers_phone → phone
  sed -i '' 's/issuers_phone/phone/g' "$file"

  # issuers_email → email
  sed -i '' 's/issuers_email/email/g' "$file"

  # issuers_web → web
  sed -i '' 's/issuers_web/web/g' "$file"

  # issuers_irpf_percentage → irpf_percentage
  sed -i '' 's/issuers_irpf_percentage/irpf_percentage/g' "$file"

  # issuers_logo_url → logo_url
  sed -i '' 's/issuers_logo_url/logo_url/g' "$file"

  # issuers_note → note
  sed -i '' 's/issuers_note/note/g' "$file"

  echo "  ✓ Completed: $file"
done

echo ""
echo "✅ Refactoring complete!"
echo ""
echo "Summary:"
echo "- Updated redpresu_users fields: nombre→name, apellidos→last_name"
echo "- Updated redpresu_issuers fields: removed 'issuers_' prefix from all fields"
echo ""
echo "⚠️  Backup files created with .bak extension"
echo "⚠️  Please review changes and test thoroughly before committing"
echo ""
echo "To remove backup files after verification:"
echo "  find $SRC_DIR -name '*.bak' -delete"
