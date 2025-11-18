# 📚 Documentación del Proyecto

Esta carpeta contiene la documentación oficial y final del proyecto **RedPresu**. La documentación está organizada para facilitar el acceso según el rol del usuario.

## 📂 Estructura de Documentación

### 🎯 Documentación Final (Raíz `/docs`)

Documentación oficial, actualizada y relevante para el mantenimiento y administración del proyecto:

| Archivo | Descripción | Audiencia |
|---------|-------------|-----------|
| **prd.md** | Product Requirements Document - Requisitos completos del producto | Product Managers, Desarrolladores |
| **planificacion.md** | Planificación del proyecto por fases y bloques | Project Managers, Desarrolladores |
| **tareas.md** | Listado detallado de tareas y estado de implementación | Desarrolladores, QA |
| **CONFIGURACION_STRIPE.md** | Guía completa de configuración de Stripe y suscripciones | **Superadmin**, DevOps |
| **GUIA_REGLAS_NEGOCIO.md** | Guía de uso del sistema de reglas de negocio | **Superadmin**, Desarrolladores |

### 🗄️ Documentación Intermedia (`/docs/old`)

Documentación histórica, de construcción y referencia técnica utilizada durante el desarrollo:

- **Bloques individuales**: Documentación específica de implementación de bloques
- **Testing**: Guías de pruebas y verificación de bloques específicos
- **Migraciones**: Documentación de migraciones de base de datos
- **Changelogs**: Historial de cambios durante el desarrollo
- **Prompts**: Prompts utilizados para generación de código

> **Nota**: Esta documentación se mantiene como referencia histórica pero NO es la fuente de verdad actual.

### 👥 Documentación de Usuario (`/public/help`)

Documentación accesible desde la aplicación web en la sección `/help`:

- **crear-tarifa.md**: Cómo crear y gestionar tarifas
- **generar-presupuesto.md**: Guía para generar presupuestos
- **gestionar-usuarios.md**: Gestión de usuarios en la aplicación
- **tours.json**: Configuración de tours guiados en la UI

**Audiencia**: Usuarios finales de la aplicación (admins y usuarios regulares)

**Acceso**: Disponible directamente desde la interfaz web en `/help`

## 🎭 Roles y Documentación

### Para Superadministradores
- **Configuración del sistema**: `CONFIGURACION_STRIPE.md`, `GUIA_REGLAS_NEGOCIO.md`
- **Gestión de suscripciones**: Panel en `/settings` + `CONFIGURACION_STRIPE.md`
- **Reglas de negocio**: Panel en `/business-rules` + `GUIA_REGLAS_NEGOCIO.md`

### Para Usuarios de la Aplicación
- **Manuales de uso**: Documentación en `/public/help`
- **Ayuda en línea**: Accesible desde la aplicación en `/help`
- **Tours guiados**: Sistema de onboarding integrado en la UI

### Para Desarrolladores
- **Arquitectura y requisitos**: `prd.md`
- **Planificación**: `planificacion.md`, `tareas.md`
- **Referencia histórica**: `/docs/old`

## 🔗 Enlaces Rápidos

- **Panel de Configuración (Superadmin)**: `/settings`
- **Sistema de Ayuda (Usuarios)**: `/help`
- **Reglas de Negocio (Superadmin)**: `/business-rules`
- **Gestión de Suscripciones (Superadmin)**: `/subscriptions`

## 📝 Mantenimiento

Al actualizar la documentación:

1. ✅ **Documentación final**: Actualizar en raíz de `/docs`
2. 🗂️ **Documentación intermedia**: Mover a `/docs/old` cuando quede obsoleta
3. 👥 **Documentación de usuario**: Actualizar en `/public/help` y será visible en la app

---

**Última actualización**: Noviembre 2024
**Versión del proyecto**: Fase 2 Completada (12/12 bloques core)
