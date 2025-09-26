# Claude Code - jeyca-presu

## MÓDULO ACTUAL: Tariff Management

## ARCHIVOS PERMITIDOS (puedes modificar):
- src/app/(dashboard)/tariffs/*
- src/components/tariffs/*
- src/app/actions/tariffs.ts

## ARCHIVOS PROHIBIDOS (NO tocar):
- src/lib/database/* (Database - READ-ONLY)
- src/lib/types/* (Database - READ-ONLY)
- src/lib/supabase/* (Database - READ-ONLY)
- src/lib/auth/* (Auth - READ-ONLY)
- src/components/auth/* (Auth - READ-ONLY)
- src/app/(auth)/* (Auth - READ-ONLY)
- src/app/api/auth/* (Auth - READ-ONLY)
- src/app/actions/auth.ts (Auth - READ-ONLY)
- src/middleware.ts (Auth - READ-ONLY)
- auth.config.ts (Auth - READ-ONLY)
- migrations/* (Database - READ-ONLY)
- database.types.ts (Database - READ-ONLY)
- schema.sql (Database - READ-ONLY)
- seed.sql (Database - READ-ONLY)
- src/lib/utils/* (Common - READ-ONLY)
- src/lib/validators/* (Common - READ-ONLY)
- src/lib/helpers/* (Common - READ-ONLY)
- src/lib/constants/* (Common - READ-ONLY)

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
⚠️ Solo trabajar en el módulo Tariff Management hasta que esté READ-ONLY.

## CONFIGURACIÓN ESPECÍFICA TARIFF MANAGEMENT
- Gestión completa de tarifas (CRUD)
- Procesamiento de CSV con validación en tiempo real
- Formularios dinámicos para crear/editar tarifas
- Integración con validador CSV del módulo Common
- Estados de tarifa (activa, inactiva, archivada)

## RESTRICCIONES TÉCNICAS
- No localStorage/sessionStorage en artifacts
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa esperados