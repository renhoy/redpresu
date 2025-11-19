# Redpresu - Sistema de Presupuestos

Sistema de gestión de presupuestos empresariales con generación automática de PDFs.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 15.5.4 (App Router) + Turbopack
- **Lenguaje:** TypeScript 5
- **React:** 19.1.0
- **Estilos:** Tailwind CSS 3.4
- **Componentes:** shadcn/ui (Radix UI)
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con RLS
- **PDF:** Rapid-PDF (módulo integrado con Puppeteer)

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.production.example .env.local
# Editar .env.local con tus valores

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
npm start
```

## 🔧 Configuración

### Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# App URL
NEXT_PUBLIC_APP_URL=http://tu-dominio.com

# Entorno
NODE_ENV=production
```

## 📚 Características

- ✅ Gestión de tarifas jerárquicas (6 niveles)
- ✅ Generación automática de presupuestos en PDF
- ✅ Sistema de autenticación multi-rol
- ✅ Gestión de usuarios y empresas
- ✅ Import/Export de tarifas (CSV/JSON)
- ✅ Sistema de ayuda interactivo con tours
- ✅ Responsive (móvil/tablet/desktop)
- ✅ Generación de PDFs con templates personalizables

## 📝 Licencia

Propiedad de Redpresu

---

**Versión:** 2.0
**Última actualización:** 2025-01-29
