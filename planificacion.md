# Planificación - jeyca-presu

## FASE 1: SHARED (Orden obligatorio - 3 semanas)
1. **Database Module** - 1 semana - Modelos Supabase, migraciones, tipos TypeScript, configuración RLS
2. **Auth Module** - 1 semana - Sistema autenticación, roles (superadmin/admin/vendedor), protección rutas
3. **Common Module** - 1 semana - Validadores CSV, utilidades cálculo, helpers formato, constantes

## FASE 2: FEATURES (Uno por vez - 4 semanas)
1. **Tariff Management** - 1 semana - CRUD tarifas, procesamiento CSV→JSON, validación jerárquica
2. **Budget Creation** - 1 semana - Formularios dinámicos, cálculos tiempo real, gestión estados
3. **PDF Generation** - 1 semana - Integración Rapid-PDF, payload construction, almacenamiento local
4. **Dashboard** - 1 semana - Estadísticas básicas, listados con filtros, navegación

## FASE 3: INTEGRACIÓN (1 semana)
1. **Testing E2E** - Flujo completo CSV→Formulario→PDF
2. **Optimización** - Performance, UX tablet, validaciones finales
3. **Deployment** - Configuración producción, variables entorno

## DEPENDENCIAS CRÍTICAS
- **Database** → Base para todos los módulos
- **Auth** → Necesario antes de cualquier CRUD
- **Common** → Utilidades para procesamiento CSV y cálculos
- **Tariff Management** → Prerequisito para Budget Creation
- **Budget Creation** → Prerequisito para PDF Generation

## HITOS CLAVE
- **Semana 3:** SHARED completo → formularios básicos funcionando
- **Semana 5:** Tariff + Budget → presupuestos calculados correctamente  
- **Semana 7:** PDF Generation → flujo completo end-to-end
- **Semana 8:** MVP funcional → comerciales pueden usar en campo

## REGLA FUNDAMENTAL
❌ NO empezar siguiente módulo hasta que anterior esté READ-ONLY
✅ Un módulo completo = funcional + testado + documentado + bloqueado

## RIESGOS IDENTIFICADOS
1. **Rapid-PDF externo** - Dependencia crítica externa (tener plan B)
2. **Complejidad CSV** - Validaciones jerárquicas complejas (dividir en subtareas)
3. **UX Tablet** - Interfaz debe ser touch-friendly (testear en dispositivo real)
4. **Performance** - Cálculos tiempo real en formularios grandes (optimizar renders)