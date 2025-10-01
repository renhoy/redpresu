# Claude Code - jeyca-presu

## MÓDULO ACTUAL: Budget Creation

## ARCHIVOS PERMITIDOS (puedes modificar):
- src/app/budgets/*
- src/components/budgets/*
- src/app/actions/budgets.ts

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
- src/app/tariffs/* (Tariff Management - READ-ONLY)
- src/components/tariffs/* (Tariff Management - READ-ONLY)
- src/app/actions/tariffs.ts (Tariff Management - READ-ONLY)

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
⚠️ Solo trabajar en el módulo Budget Creation hasta que esté READ-ONLY.

## CONFIGURACIÓN ESPECÍFICA BUDGET CREATION
- Formularios dinámicos basados en jerarquía de tarifas
- Selector de tarifa activa de la empresa
- Captura de datos del cliente (nombre, tipo, contacto)
- Cálculos automáticos en tiempo real (cantidad × precio + IVA)
- Gestión de estados (borrador → pendiente → enviado → aprobado/rechazado)
- Persistencia de presupuestos con revisiones

## RESTRICCIONES TÉCNICAS
- No localStorage/sessionStorage en artifacts
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa esperados