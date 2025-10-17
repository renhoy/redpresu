#!/bin/bash

# Fix direct user field references in layouts and components
# This script fixes user.nombre → user.name and user.apellidos → user.last_name

echo "Fixing user field references..."

SRC_DIR="/Users/josius/Documents/proy/jeyca-presu/src"

# Fix layout files: user.nombre → user.name
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/user\.nombre\([^_]\)/user.name\1/g' {} \;
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/user\.nombre$/user.name/g' {} \;
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/user\.nombre }/user.name }/g' {} \;

# Fix creator references: creator.nombre → creator.name, creator.apellidos → creator.last_name
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/creator\.nombre/creator.name/g' {} \;
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/creator\.apellidos/creator.last_name/g' {} \;

# Fix inviter references
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/inviter\.nombre/inviter.name/g' {} \;
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/inviter\.apellidos/inviter.last_name/g' {} \;

# Fix formData references in RegisterForm
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/formData\.nombre!/formData.name!/g' {} \;
find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/formData\.apellidos!/formData.last_name!/g' {} \;

echo "✅ User field references fixed!"
