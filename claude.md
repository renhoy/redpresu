# Claude Code - jeyca-presu

## MÓDULO ACTUAL: Auth

## ARCHIVOS PERMITIDOS (puedes modificar):
- src/lib/auth/*
- src/components/auth/*
- src/app/(auth)/*
- src/app/api/auth/*
- src/middleware.ts
- auth.config.ts

## ARCHIVOS PROHIBIDOS (NO tocar):
- src/lib/database/* (Database - READ-ONLY)
- src/lib/types/* (Database - READ-ONLY)
- src/lib/supabase/* (Database - READ-ONLY)
- migrations/* (Database - READ-ONLY)
- database.types.ts (Database - READ-ONLY)
- schema.sql (Database - READ-ONLY)
- seed.sql (Database - READ-ONLY)

## STACK TÉCNICO CONFIRMADO
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con RLS
- **PDF:** Rapid-PDF (microservicio externo)
- **Storage:** Directorios locales (/public/pdfs/, /public/logos/)

## REGLA CRÍTICA
⚠️ Antes de modificar cualquier archivo, verificar que está en PERMITIDOS.
⚠️ Si necesitas tocar archivos PROHIBIDOS = PARAR inmediatamente y escalar.
⚠️ Solo trabajar en el módulo Auth hasta que esté READ-ONLY.

## CONFIGURACIÓN ESPECÍFICA AUTH
- Supabase Auth con extensión custom en public.users
- Roles: superadmin, admin, vendedor con permisos diferenciados
- Middleware para protección de rutas por rol
- Login/logout con redirect automático según rol
- Sesión persistente con refresh automático

## RESTRICCIONES TÉCNICAS
- No localStorage/sessionStorage en artifacts
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa esperados