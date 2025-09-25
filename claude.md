# Claude Code - jeyca-presu

## MÓDULO ACTUAL: Common

## ARCHIVOS PERMITIDOS (puedes modificar):
- src/lib/utils/*
- src/lib/validators/*
- src/lib/helpers/*
- src/lib/constants/*

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
⚠️ Solo trabajar en el módulo Common hasta que esté READ-ONLY.

## CONFIGURACIÓN ESPECÍFICA COMMON
- Utilidades compartidas entre módulos
- Validadores para CSV y datos de negocio
- Helpers para cálculos y formateo
- Constantes del sistema centralizadas

## RESTRICCIONES TÉCNICAS
- No localStorage/sessionStorage en artifacts
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa esperados