# PRD - jeyca-presu

## Resumen
**Problema:** Los comerciales pierden tiempo y oportunidades de venta al tener que volver a la oficina para preparar presupuestos, creando demoras de 24-48h que pueden hacer perder clientes.
**Solución:** Aplicación web que permite crear presupuestos in situ con tablets, generando PDFs profesionales al momento usando tarifas dinámicas desde CSV.
**Usuario:** Empresas pequeñas y medianas con equipos comerciales que manejan múltiples tarifas de productos/servicios (TPVs, televigilancia, centralitas).

## Módulos del Sistema

### SHARED (Desarrollar primero - orden obligatorio)
- **Database** - Estado: READ-ONLY ✅ - Modelos de datos, migraciones y configuración Supabase
- **Auth** - Estado: READ-ONLY ✅ - Sistema de autenticación con roles (superadmin, admin, vendedor)
- **Common** - Estado: READ-ONLY ✅ - Utilidades compartidas, validaciones y helpers

### FEATURES (Desarrollar después - uno por vez)
- **Tariff Management** - Estado: READ-ONLY ✅ - CRUD tarifas, procesamiento CSV a JSON, validaciones jerárquicas
- **Budget Creation** - Estado: Pendiente - Formularios dinámicos, cálculos automáticos, gestión estados
- **PDF Generation** - Estado: Pendiente - Integración Rapid-PDF, almacenamiento local, nomenclatura archivos
- **Dashboard** - Estado: Pendiente - Estadísticas básicas, listados y accesos directos

## Criterio de Completado por Módulo
- [ ] Funcionalidad core implementada y probada
- [ ] Integración con Supabase funcionando
- [ ] Validaciones de negocio implementadas
- [ ] Tests básicos creados y pasando
- [ ] Documentación de API/componentes
- [ ] Estado cambiado a READ-ONLY

## Flujo Mínimo de Valor Cubierto
1. **Database** → Estructura de datos para tarifas y presupuestos
2. **Auth** → Control de acceso por roles
3. **Tariff Management** → Subir CSV y generar formularios
4. **Budget Creation** → Crear presupuesto con cálculos automáticos
5. **PDF Generation** → Generar PDF profesional via Rapid-PDF
6. **Dashboard** → Acceso y navegación entre funcionalidades

## Meta del MVP
Comercial puede crear presupuesto completo desde tablet en menos de 5 minutos vs 24-48h actual.