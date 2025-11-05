#!/bin/bash

###############################################################################
# Script de Preparación del Servidor Ubuntu para jeyca-presu
#
# Este script instala y configura todas las dependencias necesarias:
# - Docker y Docker Compose
# - Node.js 22.x y npm
# - PM2 (Process Manager)
# - Chromium y dependencias de Puppeteer
# - PostgreSQL client
# - Directorios de trabajo
#
# Uso:
#   chmod +x setup-server.sh
#   ./setup-server.sh
#
# Requisitos:
#   - Ubuntu 20.04 LTS o superior
#   - Usuario con permisos sudo
#   - Conexión a Internet
###############################################################################

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Verificar que se ejecuta en Ubuntu
if [ ! -f /etc/os-release ]; then
    log_error "No se puede detectar el sistema operativo"
    exit 1
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    log_error "Este script está diseñado para Ubuntu. Sistema detectado: $ID"
    exit 1
fi

log_info "Sistema operativo: Ubuntu $VERSION_ID"

# Verificar permisos sudo
if ! sudo -v; then
    log_error "Este script requiere permisos sudo"
    exit 1
fi

log_info "Iniciando preparación del servidor..."
echo ""

###############################################################################
# 1. ACTUALIZAR SISTEMA
###############################################################################

log_info "Paso 1/9: Actualizando sistema..."
sudo apt update
sudo apt upgrade -y
log_info "✓ Sistema actualizado"
echo ""

###############################################################################
# 2. INSTALAR DOCKER
###############################################################################

log_info "Paso 2/9: Instalando Docker..."

if command -v docker &> /dev/null; then
    log_warn "Docker ya está instalado ($(docker --version))"
else
    # Instalar Docker
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh

    # Añadir usuario al grupo docker
    sudo usermod -aG docker $USER

    log_info "✓ Docker instalado: $(docker --version)"
fi

echo ""

###############################################################################
# 3. INSTALAR DOCKER COMPOSE
###############################################################################

log_info "Paso 3/9: Instalando Docker Compose..."

if command -v docker-compose &> /dev/null; then
    log_warn "Docker Compose ya está instalado ($(docker-compose --version))"
else
    # Instalar Docker Compose
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    log_info "✓ Docker Compose instalado: $(docker-compose --version)"
fi

echo ""

###############################################################################
# 4. INSTALAR NODE.JS 22.x
###############################################################################

log_info "Paso 4/9: Instalando Node.js 22.x..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [[ "$NODE_VERSION" == v22.* ]]; then
        log_warn "Node.js 22.x ya está instalado ($NODE_VERSION)"
    else
        log_warn "Node.js está instalado pero es versión $NODE_VERSION"
        log_info "Actualizando a Node.js 22.x..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    log_info "✓ Node.js instalado: $(node -v)"
    log_info "✓ npm instalado: $(npm -v)"
fi

echo ""

###############################################################################
# 5. INSTALAR PM2
###############################################################################

log_info "Paso 5/9: Instalando PM2..."

if command -v pm2 &> /dev/null; then
    log_warn "PM2 ya está instalado ($(pm2 -v))"
else
    sudo npm install -g pm2
    log_info "✓ PM2 instalado: $(pm2 -v)"
fi

echo ""

###############################################################################
# 6. INSTALAR DEPENDENCIAS CHROMIUM/PUPPETEER
###############################################################################

log_info "Paso 6/9: Instalando Chromium y dependencias de Puppeteer..."

sudo apt-get install -y \
    chromium-browser \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

log_info "✓ Chromium instalado: $(chromium-browser --version 2>/dev/null || echo 'OK')"
echo ""

###############################################################################
# 7. INSTALAR POSTGRESQL CLIENT
###############################################################################

log_info "Paso 7/9: Instalando PostgreSQL client..."

if command -v psql &> /dev/null; then
    log_warn "PostgreSQL client ya está instalado ($(psql --version))"
else
    sudo apt-get install -y postgresql-client
    log_info "✓ PostgreSQL client instalado: $(psql --version)"
fi

echo ""

###############################################################################
# 8. INSTALAR GIT
###############################################################################

log_info "Paso 8/9: Instalando Git..."

if command -v git &> /dev/null; then
    log_warn "Git ya está instalado ($(git --version))"
else
    sudo apt-get install -y git
    log_info "✓ Git instalado: $(git --version)"
fi

echo ""

###############################################################################
# 9. CREAR DIRECTORIOS DE TRABAJO
###############################################################################

log_info "Paso 9/9: Creando directorios de trabajo..."

# Crear directorios principales
sudo mkdir -p /opt/jeyca-presu
sudo mkdir -p /opt/supabase
sudo mkdir -p /opt/backups/jeyca-presu

# Cambiar propietario al usuario actual
sudo chown -R $USER:$USER /opt/jeyca-presu
sudo chown -R $USER:$USER /opt/supabase
sudo chown -R $USER:$USER /opt/backups

log_info "✓ Directorios creados:"
log_info "  - /opt/jeyca-presu (aplicación)"
log_info "  - /opt/supabase (Supabase self-hosted)"
log_info "  - /opt/backups/jeyca-presu (backups)"
echo ""

###############################################################################
# VERIFICACIÓN FINAL
###############################################################################

log_info "==================================================================="
log_info "VERIFICACIÓN DE INSTALACIONES"
log_info "==================================================================="

echo ""
log_info "Docker:           $(docker --version)"
log_info "Docker Compose:   $(docker-compose --version)"
log_info "Node.js:          $(node --version)"
log_info "npm:              $(npm --version)"
log_info "PM2:              $(pm2 --version)"
log_info "PostgreSQL:       $(psql --version)"
log_info "Git:              $(git --version)"
echo ""

log_info "==================================================================="
log_info "PREPARACIÓN COMPLETADA EXITOSAMENTE"
log_info "==================================================================="
echo ""

log_warn "IMPORTANTE: Se ha añadido tu usuario al grupo 'docker'."
log_warn "Para aplicar los cambios, ejecuta:"
echo ""
echo "    newgrp docker"
echo ""
log_warn "O cierra sesión y vuelve a iniciar sesión."
echo ""

log_info "Siguientes pasos:"
log_info "1. Configurar Supabase Self-Hosted (ver DEPLOYMENT.md - Fase 2)"
log_info "2. Ejecutar migraciones SQL"
log_info "3. Clonar repositorio jeyca-presu en /opt/jeyca-presu"
log_info "4. Configurar variables de entorno (.env.local)"
log_info "5. Build y deploy con PM2"
echo ""

log_info "Documentación completa: DEPLOYMENT.md"
echo ""
