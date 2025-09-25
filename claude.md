# Claude Code - jeyca-presu

## MÓDULO ACTUAL: Database

## ARCHIVOS PERMITIDOS (puedes modificar):
- lib/database/*
- lib/types/*
- lib/supabase/*
- migrations/*
- database.types.ts
- schema.sql
- seed.sql

## ARCHIVOS PROHIBIDOS (NO tocar):
(ninguno aún - primer módulo)

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
⚠️ Solo trabajar en el módulo Database hasta que esté READ-ONLY.

## CONFIGURACIÓN ESPECÍFICA DATABASE
- Empresa única en MVP (empresa_id = 1 siempre)
- Supabase con políticas RLS por rol
- Estados de presupuesto: borrador → pendiente → enviado → {aprobado|rechazado|caducado}
- JSON storage para tariff_data y budget_data
- Campos calculados: total, iva, base para listados

## RESTRICCIONES TÉCNICAS
- No localStorage/sessionStorage en artifacts
- Compatibilidad tablet obligatoria
- Límite 60 segundos generación PDF
- Máximo 200 clientes por empresa esperados