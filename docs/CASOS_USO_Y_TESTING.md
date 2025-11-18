# 🧪 Casos de Uso y Plan de Testing Completo

**Proyecto:** RedPresu - Sistema de Gestión de Presupuestos
**Versión:** Fase 2 Completada (12/12 bloques)
**Última actualización:** Noviembre 2024

---

## 📋 Índice

1. [Roles y Permisos](#roles-y-permisos)
2. [Matriz de Acceso por Rol](#matriz-de-acceso-por-rol)
3. [Casos de Uso por Módulo](#casos-de-uso-por-módulo)
4. [Plan de Testing Completo](#plan-de-testing-completo)
5. [Configuraciones Críticas](#configuraciones-críticas)
6. [Checklist de Regresión](#checklist-de-regresión)

---

## 🎭 Roles y Permisos

### Roles del Sistema

| Rol | Nombre | Descripción | Límites |
|-----|--------|-------------|---------|
| `superadmin` | Super Administrador | Acceso total al sistema, gestión de todas las empresas | Sin límites |
| `admin` | Administrador | Gestión completa de su empresa y usuarios | 1 empresa, 50 usuarios |
| `comercial` | Comercial/Vendedor | Creación y gestión de presupuestos | 100 presupuestos, 50 clientes |

### Permisos por Rol

**Superadmin:**
- ✅ Todas las funcionalidades del sistema
- ✅ Gestión de múltiples empresas
- ✅ Configuración global (`/settings`)
- ✅ Reglas de negocio (`/settings/business-rules`)
- ✅ Suscripciones y planes
- ✅ Mensajes de contacto

**Admin:**
- ✅ Gestión de su empresa
- ✅ CRUD de tarifas (crear, editar, eliminar, exportar)
- ✅ CRUD de presupuestos
- ✅ CRUD de usuarios de su empresa
- ✅ Configuración de empresa
- ⛔ No puede gestionar otras empresas
- ⛔ No puede cambiar configuración global

**Comercial:**
- ✅ Visualizar tarifas (solo lectura)
- ✅ Crear y editar presupuestos
- ✅ Gestionar clientes
- ✅ Exportar presupuestos a PDF
- ⛔ No puede crear/editar tarifas
- ⛔ No puede eliminar presupuestos
- ⛔ No puede gestionar usuarios
- ⛔ No puede acceder a configuración

---

## 🗺️ Matriz de Acceso por Rol

| Ruta | Superadmin | Admin | Comercial | Público |
|------|------------|-------|-----------|---------|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/register` | ✅ | ✅ | ✅ | ✅ (si `public_registration_enabled=true`) |
| `/forgot-password` | ✅ | ✅ | ✅ | ✅ |
| `/reset-password` | ✅ | ✅ | ✅ | ✅ |
| `/accept-invitation` | ✅ | ✅ | ✅ | ✅ |
| `/contact` | ✅ | ✅ | ✅ | ✅ |
| `/pricing` | ✅ | ✅ | ✅ | ✅ |
| `/legal` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ✅ | ✅ | ✅ | ⛔ |
| `/tariffs` | ✅ | ✅ | ✅ (solo lectura) | ⛔ |
| `/tariffs/create` | ✅ | ✅ | ⛔ | ⛔ |
| `/tariffs/edit/[id]` | ✅ | ✅ | ⛔ | ⛔ |
| `/budgets` | ✅ | ✅ | ✅ | ⛔ |
| `/budgets/create` | ✅ | ✅ | ✅ | ⛔ |
| `/budgets/[id]/edit-notes` | ✅ | ✅ | ✅ | ⛔ |
| `/budgets/[id]/versions` | ✅ | ✅ | ✅ | ⛔ |
| `/users` | ✅ | ✅ | ⛔ | ⛔ |
| `/users/create` | ✅ | ✅ | ⛔ | ⛔ |
| `/users/[id]/edit` | ✅ | ✅ | ⛔ | ⛔ |
| `/companies` | ✅ | ⛔ | ⛔ | ⛔ |
| `/companies/create` | ✅ | ⛔ | ⛔ | ⛔ |
| `/companies/[id]/edit` | ✅ | ⛔ | ⛔ | ⛔ |
| `/companies/edit` | ✅ | ✅ | ⛔ | ⛔ |
| `/settings` | ✅ | ⛔ | ⛔ | ⛔ |
| `/settings/business-rules` | ✅ | ⛔ | ⛔ | ⛔ |
| `/settings/mock-emails` | ✅ | ⛔ | ⛔ | ⛔ |
| `/settings/subscriptions-testing` | ✅ | ⛔ | ⛔ | ⛔ |
| `/subscriptions` | ✅ | ✅ | ⛔ | ⛔ |
| `/contact-messages` | ✅ | ⛔ | ⛔ | ⛔ |
| `/help` | ✅ | ✅ | ✅ | ⛔ |
| `/help/[slug]` | ✅ | ✅ | ✅ | ⛔ |

---

## 📦 Casos de Uso por Módulo

### 1. Autenticación y Registro

#### CU-AUTH-001: Registro de Nuevo Usuario
**Actor:** Usuario público
**Precondición:** `public_registration_enabled = true`
**Flujo Principal:**
1. Usuario accede a `/register`
2. Completa formulario:
   - Email (único)
   - Contraseña (mínimo 8 caracteres)
   - Nombre completo
   - Nombre de empresa
3. Sistema valida datos
4. Sistema crea:
   - Usuario en auth
   - Empresa nueva
   - Asigna rol `admin` al primer usuario
5. Redirección a `/dashboard`

**Flujo Alternativo:**
- **A1:** Email ya existe → Mostrar error "Email ya registrado"
- **A2:** Contraseña débil → Mostrar requisitos
- **A3:** Registro público deshabilitado → Mostrar mensaje "Registro solo por invitación"

**Casos de Test:**
- ✅ TC-AUTH-001-01: Registro exitoso con datos válidos
- ⛔ TC-AUTH-001-02: Email duplicado
- ⛔ TC-AUTH-001-03: Contraseña menor a 8 caracteres
- ⛔ TC-AUTH-001-04: Campos vacíos
- ⛔ TC-AUTH-001-05: Email inválido

#### CU-AUTH-002: Login de Usuario
**Actor:** Usuario registrado
**Flujo Principal:**
1. Usuario accede a `/login`
2. Introduce email y contraseña
3. Sistema valida credenciales
4. Redirección a `/dashboard`

**Flujo Alternativo:**
- **A1:** Credenciales incorrectas → Error "Email o contraseña incorrectos"
- **A2:** Usuario inactivo → Error "Cuenta desactivada"

**Casos de Test:**
- ✅ TC-AUTH-002-01: Login exitoso superadmin
- ✅ TC-AUTH-002-02: Login exitoso admin
- ✅ TC-AUTH-002-03: Login exitoso comercial
- ⛔ TC-AUTH-002-04: Contraseña incorrecta
- ⛔ TC-AUTH-002-05: Email no existe
- ⛔ TC-AUTH-002-06: Usuario inactivo

#### CU-AUTH-003: Recuperación de Contraseña
**Actor:** Usuario registrado
**Flujo Principal:**
1. Usuario accede a `/forgot-password`
2. Introduce email
3. Sistema envía enlace de recuperación
4. Usuario recibe email (o mock en dev)
5. Click en enlace → redirección a `/reset-password?token=xxx`
6. Introduce nueva contraseña
7. Sistema actualiza contraseña
8. Redirección a `/login`

**Casos de Test:**
- ✅ TC-AUTH-003-01: Envío de email exitoso
- ✅ TC-AUTH-003-02: Reset con token válido
- ⛔ TC-AUTH-003-03: Email no existe (no mostrar mensaje específico por seguridad)
- ⛔ TC-AUTH-003-04: Token expirado
- ⛔ TC-AUTH-003-05: Token inválido

#### CU-AUTH-004: Aceptar Invitación
**Actor:** Usuario invitado
**Flujo Principal:**
1. Usuario recibe email de invitación
2. Click en enlace → `/accept-invitation?token=xxx`
3. Completa contraseña
4. Sistema activa usuario
5. Redirección a `/dashboard`

**Casos de Test:**
- ✅ TC-AUTH-004-01: Aceptación exitosa
- ⛔ TC-AUTH-004-02: Token ya usado
- ⛔ TC-AUTH-004-03: Token expirado

---

### 2. Dashboard

#### CU-DASH-001: Visualizar Dashboard
**Actor:** Todos los roles autenticados
**Flujo Principal:**
1. Usuario accede a `/dashboard`
2. Sistema muestra estadísticas según rol:
   - **Superadmin:** Stats globales + todas las empresas
   - **Admin:** Stats de su empresa
   - **Comercial:** Stats de sus presupuestos

**Casos de Test:**
- ✅ TC-DASH-001-01: Dashboard superadmin muestra todas las empresas
- ✅ TC-DASH-001-02: Dashboard admin muestra solo su empresa
- ✅ TC-DASH-001-03: Dashboard comercial muestra sus presupuestos
- ✅ TC-DASH-001-04: Gráficos cargan correctamente
- ✅ TC-DASH-001-05: Estadísticas calculan correctamente

---

### 3. Tarifas

#### CU-TARIFF-001: Listar Tarifas
**Actor:** Admin, Comercial, Superadmin
**Flujo Principal:**
1. Usuario accede a `/tariffs`
2. Sistema muestra listado de tarifas de su empresa
3. Comercial: ve tarifas pero sin botones de edición/eliminación
4. Admin/Superadmin: ve todas las acciones

**Casos de Test:**
- ✅ TC-TARIFF-001-01: Admin ve sus tarifas con botones de acción
- ✅ TC-TARIFF-001-02: Comercial ve tarifas sin botones de edición
- ✅ TC-TARIFF-001-03: Filtrado por búsqueda funciona
- ✅ TC-TARIFF-001-04: Ordenamiento por columnas
- ✅ TC-TARIFF-001-05: Paginación funciona

#### CU-TARIFF-002: Crear Tarifa
**Actor:** Admin, Superadmin
**Precondición:** Usuario tiene permiso `TARIFFS_WRITE`
**Flujo Principal:**
1. Usuario accede a `/tariffs/create`
2. Completa formulario:
   - **Datos Tarifa:** Título, descripción, validez, estado
   - **Datos Empresa:** Logo, nombre, NIF, dirección, contacto
   - **Configuración Visual:** Plantilla PDF, colores
   - **Notas:** Resumen PDF, condiciones, notas legales
3. Sube archivo CSV con estructura jerárquica
4. Sistema valida CSV:
   - Estructura correcta (Capítulo/Subcapítulo/Apartado/Partida)
   - IDs únicos
   - Niveles jerárquicos válidos
   - Campos requeridos completos
5. Sistema detecta IVAs automáticamente
6. Guarda tarifa
7. Redirección a `/tariffs`

**Flujo Alternativo:**
- **A1:** Usuario tiene tarifa marcada como plantilla → Pre-carga datos
- **A2:** No hay plantilla → Pre-carga datos del issuer de la empresa
- **A3:** CSV con errores → Muestra validación detallada
- **A4:** Límite de tarifas alcanzado (según plan) → Error de límite

**Casos de Test:**
- ✅ TC-TARIFF-002-01: Creación exitosa con CSV válido
- ✅ TC-TARIFF-002-02: Pre-carga desde plantilla funciona
- ✅ TC-TARIFF-002-03: Pre-carga datos issuer sin plantilla
- ✅ TC-TARIFF-002-04: Detección automática de IVAs
- ⛔ TC-TARIFF-002-05: CSV con estructura jerárquica inválida
- ⛔ TC-TARIFF-002-06: CSV con IDs duplicados
- ⛔ TC-TARIFF-002-07: CSV con campos vacíos en partidas
- ⛔ TC-TARIFF-002-08: Archivo no CSV
- ⛔ TC-TARIFF-002-09: CSV vacío
- ⛔ TC-TARIFF-002-10: Límite de tarifas alcanzado (plan Free: 3 tarifas)
- ⛔ TC-TARIFF-002-11: Campos requeridos vacíos

#### CU-TARIFF-003: Editar Tarifa
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario accede a `/tariffs/edit/[id]`
2. Sistema carga datos existentes
3. Usuario modifica campos deseados
4. Puede reemplazar CSV
5. Sistema re-valida
6. Guarda cambios

**Casos de Test:**
- ✅ TC-TARIFF-003-01: Edición exitosa sin cambiar CSV
- ✅ TC-TARIFF-003-02: Edición exitosa con nuevo CSV
- ✅ TC-TARIFF-003-03: Cambio de colores se refleja
- ⛔ TC-TARIFF-003-04: Intento de editar tarifa de otra empresa
- ⛔ TC-TARIFF-003-05: CSV nuevo con errores

#### CU-TARIFF-004: Eliminar Tarifa
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario click en "Eliminar" en listado
2. Sistema muestra confirmación
3. Usuario confirma
4. Sistema verifica que no haya presupuestos asociados
5. Elimina tarifa
6. Actualiza listado

**Flujo Alternativo:**
- **A1:** Tarifa tiene presupuestos asociados → Error "No se puede eliminar, tiene presupuestos asociados"

**Casos de Test:**
- ✅ TC-TARIFF-004-01: Eliminación exitosa sin presupuestos
- ⛔ TC-TARIFF-004-02: Tarifa con presupuestos asociados
- ⛔ TC-TARIFF-004-03: Intento de eliminar tarifa de otra empresa

#### CU-TARIFF-005: Marcar como Plantilla
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario activa toggle "Usar como plantilla"
2. Sistema desmarca otras tarifas como plantilla
3. Esta tarifa se marca como plantilla única

**Casos de Test:**
- ✅ TC-TARIFF-005-01: Solo una tarifa puede ser plantilla
- ✅ TC-TARIFF-005-02: Nueva tarifa pre-carga datos de plantilla

#### CU-TARIFF-006: Exportar Tarifa
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario click en "Exportar"
2. Sistema genera CSV con estructura completa
3. Descarga archivo

**Casos de Test:**
- ✅ TC-TARIFF-006-01: Exportación genera CSV válido
- ✅ TC-TARIFF-006-02: CSV exportado puede re-importarse

---

### 4. Presupuestos

#### CU-BUDGET-001: Listar Presupuestos
**Actor:** Admin, Comercial, Superadmin
**Flujo Principal:**
1. Usuario accede a `/budgets`
2. Sistema muestra presupuestos:
   - **Admin:** Todos los presupuestos de su empresa
   - **Comercial:** Solo presupuestos creados por él
   - **Superadmin:** Todos los presupuestos

**Casos de Test:**
- ✅ TC-BUDGET-001-01: Admin ve todos los presupuestos de empresa
- ✅ TC-BUDGET-001-02: Comercial ve solo sus presupuestos
- ✅ TC-BUDGET-001-03: Filtros funcionan (estado, fecha, cliente)
- ✅ TC-BUDGET-001-04: Búsqueda por código/cliente

#### CU-BUDGET-002: Crear Presupuesto (Wizard Multi-paso)
**Actor:** Admin, Comercial, Superadmin
**Precondición:** Existe al menos 1 tarifa activa
**Flujo Principal:**

**PASO 1: Selección de Tarifa**
1. Usuario accede a `/budgets/create`
2. Sistema muestra tarifas activas
3. Usuario selecciona tarifa
4. Click "Siguiente"

**PASO 2: Datos del Cliente**
5. Usuario completa:
   - Tipo cliente: [Particular | Autónomo | Empresa]
   - Nombre completo
   - Email
   - Teléfono
   - NIF/CIF (si aplica)
   - Dirección
6. Click "Siguiente"

**PASO 3: Datos del Presupuesto**
7. Usuario completa:
   - Título del presupuesto
   - Descripción
   - Condiciones de pago
   - Validez (hereda de tarifa)
8. Click "Siguiente"

**PASO 4: Selección de Partidas**
9. Sistema muestra estructura jerárquica de tarifa
10. Usuario navega y selecciona partidas:
    - Capítulo → Subcapítulo → Apartado → Partidas
11. Para cada partida seleccionada:
    - Introduce cantidad (unidades)
    - Precio se calcula automáticamente
    - Puede aplicar descuento %
12. Sistema calcula:
    - Subtotal por partida
    - Total por capítulo
    - Base imponible
    - IVA por tipo
    - IRPF (si cliente es empresa/autónomo y emisor es autónomo)
    - Recargo de Equivalencia (si cliente tiene RE)
    - **Total presupuesto**

**PASO 5: Revisión y Creación**
13. Usuario revisa resumen
14. Click "Crear Presupuesto"
15. Sistema genera:
    - Presupuesto en estado "Borrador"
    - Código único (formato: PRE-YYYY-NNNN)
    - Versión 1.0
16. Redirección a `/budgets` con mensaje de éxito

**Flujo Alternativo:**
- **A1:** No hay tarifas activas → Mensaje "Debe crear al menos una tarifa"
- **A2:** Límite de presupuestos alcanzado (plan Free: 10) → Error de límite
- **A3:** Usuario vuelve atrás → Datos se mantienen
- **A4:** Cliente ya existe → Sugerencia de autocompletado

**Casos de Test:**
- ✅ TC-BUDGET-002-01: Creación exitosa completa (5 pasos)
- ✅ TC-BUDGET-002-02: Selección de tarifa funciona
- ✅ TC-BUDGET-002-03: Validación de cliente según tipo
- ✅ TC-BUDGET-002-04: Cálculos automáticos correctos (IVA, IRPF, RE)
- ✅ TC-BUDGET-002-05: Descuentos se aplican correctamente
- ✅ TC-BUDGET-002-06: Navegación hacia atrás mantiene datos
- ✅ TC-BUDGET-002-07: Autocompletado de cliente existente
- ⛔ TC-BUDGET-002-08: Sin tarifas disponibles
- ⛔ TC-BUDGET-002-09: Límite de presupuestos alcanzado
- ⛔ TC-BUDGET-002-10: Campos requeridos vacíos
- ⛔ TC-BUDGET-002-11: Email inválido
- ⛔ TC-BUDGET-002-12: Sin partidas seleccionadas

#### CU-BUDGET-003: Editar Notas de Presupuesto
**Actor:** Admin, Comercial (propietario), Superadmin
**Flujo Principal:**
1. Usuario accede a `/budgets/[id]/edit-notes`
2. Sistema muestra editor rich-text
3. Usuario edita:
   - Notas internas (solo visibles en app)
   - Notas para el cliente (visibles en PDF)
4. Sistema auto-guarda
5. Click "Guardar"

**Casos de Test:**
- ✅ TC-BUDGET-003-01: Edición de notas con rich-text
- ✅ TC-BUDGET-003-02: Formato se mantiene (negrita, listas, etc.)
- ✅ TC-BUDGET-003-03: Auto-guardado funciona
- ⛔ TC-BUDGET-003-04: Comercial intenta editar presupuesto de otro

#### CU-BUDGET-004: Ver Versiones de Presupuesto
**Actor:** Admin, Comercial (propietario), Superadmin
**Flujo Principal:**
1. Usuario accede a `/budgets/[id]/versions`
2. Sistema muestra historial de versiones:
   - Número de versión
   - Fecha de creación
   - Usuario que la creó
   - Cambios realizados
   - Total
3. Usuario puede:
   - Ver detalles de cada versión
   - Comparar versiones
   - Restaurar versión anterior

**Casos de Test:**
- ✅ TC-BUDGET-004-01: Listado de versiones correcto
- ✅ TC-BUDGET-004-02: Comparación entre versiones funciona
- ✅ TC-BUDGET-004-03: Restauración de versión crea nueva versión

#### CU-BUDGET-005: Cambiar Estado de Presupuesto
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario selecciona presupuesto
2. Cambia estado:
   - **Borrador** → Enviado
   - **Enviado** → Aprobado / Rechazado
   - **Aprobado** → Facturado (Fase 3)
3. Sistema registra cambio con timestamp y usuario

**Casos de Test:**
- ✅ TC-BUDGET-005-01: Cambio de Borrador a Enviado
- ✅ TC-BUDGET-005-02: Cambio de Enviado a Aprobado
- ✅ TC-BUDGET-005-03: Cambio de Enviado a Rechazado
- ⛔ TC-BUDGET-005-04: Comercial no puede aprobar (solo admin)

#### CU-BUDGET-006: Exportar Presupuesto a PDF
**Actor:** Admin, Comercial, Superadmin
**Flujo Principal:**
1. Usuario click en "Exportar PDF"
2. Sistema genera PDF con:
   - Logo y datos de empresa
   - Datos del cliente
   - Estructura jerárquica de partidas seleccionadas
   - Subtotales por capítulo
   - Desglose de IVA
   - IRPF (si aplica)
   - RE (si aplica)
   - Total presupuesto
   - Notas y condiciones
   - Firma digital (opcional)
3. Descarga PDF

**Casos de Test:**
- ✅ TC-BUDGET-006-01: PDF se genera correctamente
- ✅ TC-BUDGET-006-02: Plantilla de colores se aplica
- ✅ TC-BUDGET-006-03: Logo aparece en PDF
- ✅ TC-BUDGET-006-04: Cálculos en PDF coinciden con app
- ✅ TC-BUDGET-006-05: Estructura jerárquica se mantiene en PDF

#### CU-BUDGET-007: Enviar Presupuesto por Email
**Actor:** Admin, Comercial, Superadmin
**Flujo Principal:**
1. Usuario click en "Enviar por Email"
2. Sistema pre-llena email del cliente
3. Usuario puede editar:
   - Destinatario
   - Asunto
   - Mensaje
4. Sistema adjunta PDF
5. Envía email
6. Cambia estado a "Enviado"
7. Registra envío en historial

**Casos de Test:**
- ✅ TC-BUDGET-007-01: Envío exitoso con PDF adjunto
- ✅ TC-BUDGET-007-02: Estado cambia a "Enviado"
- ✅ TC-BUDGET-007-03: Email registrado en historial
- ⛔ TC-BUDGET-007-04: Email del cliente inválido

---

### 5. Usuarios

#### CU-USER-001: Listar Usuarios
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario accede a `/users`
2. Sistema muestra usuarios:
   - **Admin:** Usuarios de su empresa
   - **Superadmin:** Usuarios de todas las empresas
3. Muestra: Nombre, Email, Rol, Estado, Empresa

**Casos de Test:**
- ✅ TC-USER-001-01: Admin ve solo usuarios de su empresa
- ✅ TC-USER-001-02: Superadmin ve todos los usuarios
- ✅ TC-USER-001-03: Filtro por rol funciona
- ✅ TC-USER-001-04: Búsqueda por nombre/email

#### CU-USER-002: Crear Usuario (Invitación)
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario accede a `/users/create`
2. Completa formulario:
   - Email (único)
   - Nombre completo
   - Rol: [admin | comercial]
   - Teléfono (opcional)
3. Sistema valida:
   - Email no existe
   - Límite de usuarios no alcanzado
4. Sistema crea usuario inactivo
5. Envía email de invitación
6. Redirección a `/users`

**Flujo Alternativo:**
- **A1:** Límite de usuarios alcanzado → Error según plan
- **A2:** Email ya existe → Error "Email ya registrado"

**Casos de Test:**
- ✅ TC-USER-002-01: Invitación exitosa rol comercial
- ✅ TC-USER-002-02: Invitación exitosa rol admin
- ✅ TC-USER-002-03: Email de invitación enviado
- ⛔ TC-USER-002-04: Email duplicado
- ⛔ TC-USER-002-05: Límite de usuarios alcanzado (Free: 3 usuarios)
- ⛔ TC-USER-002-06: Admin intenta crear superadmin

#### CU-USER-003: Editar Usuario
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario accede a `/users/[id]/edit`
2. Puede editar:
   - Nombre
   - Teléfono
   - Rol (Admin puede cambiar entre admin/comercial)
   - Estado (activo/inactivo)
3. Guarda cambios

**Casos de Test:**
- ✅ TC-USER-003-01: Edición exitosa
- ✅ TC-USER-003-02: Cambio de rol funciona
- ✅ TC-USER-003-03: Desactivar usuario funciona
- ⛔ TC-USER-003-04: Admin intenta editar usuario de otra empresa
- ⛔ TC-USER-003-05: Intento de cambiar rol a superadmin

#### CU-USER-004: Eliminar Usuario
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario click en "Eliminar"
2. Sistema muestra confirmación
3. Usuario confirma
4. Sistema verifica que no haya recursos asociados
5. Marca usuario como inactivo (soft delete)

**Casos de Test:**
- ✅ TC-USER-004-01: Eliminación exitosa
- ⛔ TC-USER-004-02: No se puede eliminar usuario con presupuestos

---

### 6. Empresas (Solo Superadmin)

#### CU-COMPANY-001: Listar Empresas
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/companies`
2. Sistema muestra todas las empresas:
   - Nombre
   - Plan de suscripción
   - Estado
   - Número de usuarios
   - Fecha de creación

**Casos de Test:**
- ✅ TC-COMPANY-001-01: Listado completo de empresas
- ✅ TC-COMPANY-001-02: Filtros funcionan
- ⛔ TC-COMPANY-001-03: Admin no puede acceder

#### CU-COMPANY-002: Crear Empresa
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/companies/create`
2. Completa datos de empresa
3. Sistema crea empresa
4. Permite crear primer admin

**Casos de Test:**
- ✅ TC-COMPANY-002-01: Creación exitosa
- ✅ TC-COMPANY-002-02: Primer usuario es admin

#### CU-COMPANY-003: Editar Empresa
**Actor:** Superadmin, Admin (solo su empresa)
**Flujo Principal:**
1. Usuario accede a `/companies/[id]/edit` (superadmin) o `/companies/edit` (admin)
2. Edita datos de empresa
3. Guarda cambios

**Casos de Test:**
- ✅ TC-COMPANY-003-01: Superadmin edita cualquier empresa
- ✅ TC-COMPANY-003-02: Admin edita solo su empresa
- ⛔ TC-COMPANY-003-03: Admin intenta acceder a `/companies/[id]/edit`

---

### 7. Configuración (Solo Superadmin)

#### CU-CONFIG-001: Configuración General
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/settings`
2. Ve categorías:
   - **Aplicación:** app_name, app_mode, multiempresa, public_registration
   - **Suscripciones y Pagos:** subscriptions_enabled, planes, grace_period
   - **Usuarios e Invitaciones:** invitation_expiry, max_users
   - **Tarifas y Presupuestos:** validez_default
   - **PDF:** plantillas, colores
   - **Contacto y Legal:** emails, políticas
3. Edita valores
4. Sistema valida
5. Guarda y recarga cache si es necesario

**Casos de Test:**
- ✅ TC-CONFIG-001-01: Cambio de app_name funciona
- ✅ TC-CONFIG-001-02: Activar/desactivar subscriptions_enabled
- ✅ TC-CONFIG-001-03: Cambio de multiempresa invalida cache
- ✅ TC-CONFIG-001-04: Cambio de public_registration funciona
- ⛔ TC-CONFIG-001-05: Admin no puede acceder

#### CU-CONFIG-002: Configurar Stripe
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/settings` → Suscripciones y Pagos
2. Activa `subscriptions_enabled`
3. Edita configuración de planes (JSON):
   ```json
   {
     "free": {"name": "Free", "price": 0, "limits": {...}},
     "pro": {"name": "Pro", "price": 29, "limits": {...}},
     "enterprise": {"name": "Enterprise", "price": 99, "limits": {...}}
   }
   ```
4. Guarda cambios
5. Sistema invalida cache

**Casos de Test:**
- ✅ TC-CONFIG-002-01: Activación de suscripciones funciona
- ✅ TC-CONFIG-002-02: Límites de planes se aplican
- ✅ TC-CONFIG-002-03: Cambio invalida cache correctamente

#### CU-CONFIG-003: Modo Multiempresa / Monoempresa
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/settings` → Aplicación
2. Activa/desactiva `multiempresa`
3. Sistema invalida cache
4. Rutas se adaptan:
   - **multiempresa=true:** `/register` público, `/companies` visible
   - **multiempresa=false:** `/register` oculto, solo invitaciones

**Casos de Test:**
- ✅ TC-CONFIG-003-01: Cambio a monoempresa oculta registro
- ✅ TC-CONFIG-003-02: Cambio a multiempresa muestra registro
- ✅ TC-CONFIG-003-03: Cache se invalida automáticamente

---

### 8. Reglas de Negocio (Solo Superadmin)

#### CU-RULES-001: Listar Reglas
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/settings/business-rules`
2. Selecciona empresa
3. Sistema muestra reglas de la empresa:
   - Nombre
   - Tipo
   - Estado (activa/inactiva)
   - Fecha creación

**Casos de Test:**
- ✅ TC-RULES-001-01: Listado de reglas por empresa
- ✅ TC-RULES-001-02: Filtros funcionan

#### CU-RULES-002: Crear Regla
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario click "Nueva Regla"
2. Completa:
   - Nombre
   - Descripción
   - Tipo: [validation | calculation | notification]
   - Condiciones (JSON)
   - Acciones (JSON)
3. Sistema valida sintaxis
4. Guarda regla como inactiva
5. Usuario puede activarla

**Casos de Test:**
- ✅ TC-RULES-002-01: Creación exitosa de regla
- ✅ TC-RULES-002-02: Validación de sintaxis funciona
- ⛔ TC-RULES-002-03: JSON inválido

#### CU-RULES-003: Activar/Desactivar Regla
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario toggle estado
2. Sistema actualiza regla
3. Registra cambio en auditoría

**Casos de Test:**
- ✅ TC-RULES-003-01: Activación funciona
- ✅ TC-RULES-003-02: Desactivación funciona
- ✅ TC-RULES-003-03: Auditoría registra cambio

---

### 9. Suscripciones

#### CU-SUB-001: Ver Plan Actual
**Actor:** Admin, Superadmin
**Flujo Principal:**
1. Usuario accede a `/subscriptions`
2. Sistema muestra:
   - Plan actual
   - Límites y uso actual
   - Fecha de renovación
   - Método de pago

**Casos de Test:**
- ✅ TC-SUB-001-01: Información del plan correcta
- ✅ TC-SUB-001-02: Límites y uso se muestran

#### CU-SUB-002: Actualizar Plan
**Actor:** Admin
**Flujo Principal:**
1. Usuario click "Cambiar Plan"
2. Selecciona nuevo plan
3. Introduce método de pago (Stripe)
4. Confirma
5. Sistema actualiza suscripción
6. Nuevos límites se aplican inmediatamente

**Casos de Test:**
- ✅ TC-SUB-002-01: Upgrade de Free a Pro
- ✅ TC-SUB-002-02: Upgrade de Pro a Enterprise
- ✅ TC-SUB-002-03: Límites se actualizan
- ⛔ TC-SUB-002-04: Downgrade con recursos que exceden límites

---

### 10. Ayuda

#### CU-HELP-001: Ver Artículos de Ayuda
**Actor:** Todos los roles autenticados
**Flujo Principal:**
1. Usuario accede a `/help`
2. Sistema muestra artículos según rol
3. Usuario click en artículo
4. Sistema muestra contenido en markdown

**Casos de Test:**
- ✅ TC-HELP-001-01: Artículos visibles según rol
- ✅ TC-HELP-001-02: Markdown se renderiza correctamente
- ✅ TC-HELP-001-03: Tours interactivos funcionan

---

### 11. Contacto

#### CU-CONTACT-001: Enviar Mensaje de Contacto
**Actor:** Público
**Flujo Principal:**
1. Usuario accede a `/contact`
2. Completa formulario:
   - Nombre
   - Email
   - Asunto
   - Mensaje
3. Envía
4. Sistema guarda en BD
5. Envía notificación a admin

**Casos de Test:**
- ✅ TC-CONTACT-001-01: Envío exitoso
- ✅ TC-CONTACT-001-02: Email de notificación enviado
- ⛔ TC-CONTACT-001-03: Campos vacíos

#### CU-CONTACT-002: Ver Mensajes de Contacto
**Actor:** Superadmin
**Flujo Principal:**
1. Usuario accede a `/contact-messages`
2. Sistema muestra todos los mensajes
3. Puede marcar como leído/no leído

**Casos de Test:**
- ✅ TC-CONTACT-002-01: Listado completo
- ✅ TC-CONTACT-002-02: Marcar como leído funciona

---

## 🧪 Plan de Testing Completo

### Estrategia de Testing

**Tipos de Testing:**
1. **Pruebas Funcionales** - Verificar que cada funcionalidad cumple requisitos
2. **Pruebas de Permisos** - Verificar control de acceso por rol
3. **Pruebas de Límites** - Verificar límites según plan de suscripción
4. **Pruebas de Integración** - Verificar flujos completos end-to-end
5. **Pruebas de Regresión** - Verificar que cambios no rompan funcionalidad existente
6. **Pruebas de UI/UX** - Verificar responsive, accesibilidad, usabilidad

### Entorno de Testing

**Configuraciones a Probar:**
- `multiempresa = true` (modo SaaS)
- `multiempresa = false` (modo On-premise)
- `subscriptions_enabled = true`
- `subscriptions_enabled = false`
- `public_registration_enabled = true`
- `public_registration_enabled = false`

**Roles a Probar:**
- Superadmin
- Admin
- Comercial
- Usuario no autenticado

**Planes a Probar:**
- Free (límites restrictivos)
- Pro (límites medios)
- Enterprise (sin límites)

---

### Test Suite por Módulo

#### 🔐 Módulo: Autenticación

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-AUTH-001 | Registro exitoso | `public_registration=true` | 1. Ir a `/register`<br>2. Completar formulario válido<br>3. Submit | Usuario creado, empresa creada, redirect a `/dashboard` | Alta |
| TC-AUTH-002 | Registro con email duplicado | Usuario existe | 1. Ir a `/register`<br>2. Email existente<br>3. Submit | Error "Email ya registrado" | Alta |
| TC-AUTH-003 | Registro deshabilitado | `public_registration=false` | 1. Ir a `/register` | Mensaje "Registro solo por invitación" | Media |
| TC-AUTH-004 | Login superadmin | Superadmin existe | 1. Ir a `/login`<br>2. Credenciales superadmin<br>3. Submit | Login exitoso, redirect `/dashboard` | Alta |
| TC-AUTH-005 | Login admin | Admin existe | 1. Ir a `/login`<br>2. Credenciales admin<br>3. Submit | Login exitoso, redirect `/dashboard` | Alta |
| TC-AUTH-006 | Login comercial | Comercial existe | 1. Ir a `/login`<br>2. Credenciales comercial<br>3. Submit | Login exitoso, redirect `/dashboard` | Alta |
| TC-AUTH-007 | Login contraseña incorrecta | Usuario existe | 1. Ir a `/login`<br>2. Contraseña incorrecta<br>3. Submit | Error "Credenciales incorrectas" | Alta |
| TC-AUTH-008 | Recuperar contraseña | Usuario existe | 1. Ir a `/forgot-password`<br>2. Email válido<br>3. Submit | Email enviado, link funciona | Media |
| TC-AUTH-009 | Aceptar invitación | Token válido | 1. Click link invitación<br>2. Crear contraseña<br>3. Submit | Usuario activado, login automático | Alta |
| TC-AUTH-010 | Token invitación expirado | Token expirado | 1. Click link viejo | Error "Token expirado" | Media |

#### 📊 Módulo: Dashboard

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-DASH-001 | Dashboard superadmin | Login como superadmin | 1. Ir a `/dashboard` | Stats globales, todas las empresas | Alta |
| TC-DASH-002 | Dashboard admin | Login como admin | 1. Ir a `/dashboard` | Stats de su empresa solamente | Alta |
| TC-DASH-003 | Dashboard comercial | Login como comercial | 1. Ir a `/dashboard` | Stats de sus presupuestos | Alta |
| TC-DASH-004 | Gráficos cargan | Login | 1. Ir a `/dashboard`<br>2. Esperar carga | Gráficos se muestran sin errores | Media |

#### 📋 Módulo: Tarifas

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-TARIFF-001 | Listar tarifas como admin | Login como admin | 1. Ir a `/tariffs` | Ve tarifas de su empresa con botones acción | Alta |
| TC-TARIFF-002 | Listar tarifas como comercial | Login como comercial | 1. Ir a `/tariffs` | Ve tarifas pero sin botones editar/eliminar | Alta |
| TC-TARIFF-003 | Crear tarifa con CSV válido | Login como admin | 1. Ir a `/tariffs/create`<br>2. Completar formulario<br>3. Subir CSV válido<br>4. Submit | Tarifa creada, IVAs detectados, redirect | Crítica |
| TC-TARIFF-004 | Crear tarifa CSV inválido | Login como admin | 1. Ir a `/tariffs/create`<br>2. Subir CSV con errores<br>3. Submit | Errores de validación mostrados | Alta |
| TC-TARIFF-005 | Pre-carga desde plantilla | Admin, tarifa plantilla existe | 1. Ir a `/tariffs/create` | Datos de plantilla pre-cargados | Media |
| TC-TARIFF-006 | Pre-carga desde issuer | Admin, sin plantilla | 1. Ir a `/tariffs/create` | Datos de empresa pre-cargados | Media |
| TC-TARIFF-007 | Límite tarifas Free | Plan Free, 3 tarifas | 1. Crear 4ª tarifa | Error "Límite alcanzado, actualice plan" | Alta |
| TC-TARIFF-008 | Editar tarifa | Admin, tarifa existe | 1. Ir a `/tariffs/edit/[id]`<br>2. Modificar datos<br>3. Guardar | Tarifa actualizada | Alta |
| TC-TARIFF-009 | Eliminar tarifa sin presupuestos | Admin, tarifa sin uso | 1. Click "Eliminar"<br>2. Confirmar | Tarifa eliminada | Media |
| TC-TARIFF-010 | Eliminar tarifa con presupuestos | Admin, tarifa con presupuestos | 1. Click "Eliminar"<br>2. Confirmar | Error "No se puede eliminar" | Alta |
| TC-TARIFF-011 | Marcar como plantilla | Admin, 2+ tarifas | 1. Activar "Plantilla" en tarifa A<br>2. Activar "Plantilla" en tarifa B | Solo B es plantilla, A se desmarca | Media |
| TC-TARIFF-012 | Exportar tarifa | Admin, tarifa existe | 1. Click "Exportar" | CSV descargado, puede reimportarse | Media |
| TC-TARIFF-013 | Comercial intenta crear | Login como comercial | 1. Ir a `/tariffs/create` | Acceso denegado / botón no visible | Alta |

#### 💰 Módulo: Presupuestos

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-BUDGET-001 | Crear presupuesto completo | Admin, 1+ tarifas | 1. Ir a `/budgets/create`<br>2. Seleccionar tarifa<br>3. Datos cliente<br>4. Datos presupuesto<br>5. Seleccionar partidas con cantidades<br>6. Revisar y crear | Presupuesto creado, cálculos correctos | Crítica |
| TC-BUDGET-002 | Cálculo IVA correcto | Crear presupuesto | Seleccionar partidas con IVA 5%, 10%, 21% | IVA calculado correctamente por tipo | Crítica |
| TC-BUDGET-003 | Cálculo IRPF correcto | Emisor autónomo, cliente empresa | Crear presupuesto | IRPF aplicado según % configurado | Alta |
| TC-BUDGET-004 | Cálculo RE correcto | Cliente con RE | Crear presupuesto | RE aplicado según % IVA | Alta |
| TC-BUDGET-005 | Descuentos funcionan | Crear presupuesto | Aplicar descuento 10% en partida | Precio reducido correctamente | Media |
| TC-BUDGET-006 | Límite presupuestos Free | Plan Free, 10 presupuestos | Crear 11º presupuesto | Error "Límite alcanzado" | Alta |
| TC-BUDGET-007 | Comercial ve solo sus presupuestos | Login comercial, presupuestos de varios usuarios | Ir a `/budgets` | Solo ve presupuestos creados por él | Alta |
| TC-BUDGET-008 | Admin ve todos presupuestos empresa | Login admin, presupuestos de varios usuarios | Ir a `/budgets` | Ve todos los presupuestos de su empresa | Alta |
| TC-BUDGET-009 | Editar notas | Presupuesto existe | 1. Ir a `/budgets/[id]/edit-notes`<br>2. Editar con rich-text<br>3. Guardar | Notas guardadas con formato | Media |
| TC-BUDGET-010 | Ver versiones | Presupuesto con 2+ versiones | 1. Ir a `/budgets/[id]/versions` | Historial completo visible | Media |
| TC-BUDGET-011 | Restaurar versión | Presupuesto con 2+ versiones | 1. Click "Restaurar" en v1 | Nueva versión creada con datos de v1 | Media |
| TC-BUDGET-012 | Cambiar estado Borrador→Enviado | Admin, presupuesto en borrador | 1. Cambiar estado a "Enviado" | Estado actualizado, timestamp registrado | Alta |
| TC-BUDGET-013 | Exportar PDF | Presupuesto existe | 1. Click "Exportar PDF" | PDF descargado, datos correctos | Crítica |
| TC-BUDGET-014 | PDF con logo | Presupuesto con logo | 1. Exportar PDF | Logo visible en PDF | Media |
| TC-BUDGET-015 | PDF con colores personalizados | Presupuesto con colores | 1. Exportar PDF | Colores aplicados en PDF | Media |
| TC-BUDGET-016 | Enviar por email | Presupuesto, cliente con email | 1. Click "Enviar"<br>2. Confirmar | Email enviado, PDF adjunto, estado "Enviado" | Alta |
| TC-BUDGET-017 | Sin tarifas disponibles | Admin, 0 tarifas | 1. Ir a `/budgets/create` | Mensaje "Debe crear al menos una tarifa" | Media |
| TC-BUDGET-018 | Navegación atrás mantiene datos | En creación | 1. Paso 3<br>2. Volver a Paso 2<br>3. Volver a Paso 3 | Datos introducidos se mantienen | Media |
| TC-BUDGET-019 | Autocompletado cliente | Cliente existe | 1. Empezar a escribir nombre cliente | Sugerencias aparecen | Baja |

#### 👥 Módulo: Usuarios

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-USER-001 | Listar usuarios como admin | Login admin | 1. Ir a `/users` | Ve solo usuarios de su empresa | Alta |
| TC-USER-002 | Listar usuarios como superadmin | Login superadmin | 1. Ir a `/users` | Ve usuarios de todas las empresas | Alta |
| TC-USER-003 | Invitar comercial | Admin, límite no alcanzado | 1. Ir a `/users/create`<br>2. Email, nombre, rol=comercial<br>3. Enviar | Usuario creado, email enviado | Alta |
| TC-USER-004 | Invitar admin | Admin | 1. Crear usuario rol=admin | Usuario admin creado | Alta |
| TC-USER-005 | Límite usuarios Free | Plan Free, 3 usuarios | 1. Crear 4º usuario | Error "Límite alcanzado" | Alta |
| TC-USER-006 | Email duplicado | Usuario existe | 1. Invitar con email existente | Error "Email ya existe" | Media |
| TC-USER-007 | Editar usuario | Admin, usuario existe | 1. Ir a `/users/[id]/edit`<br>2. Cambiar nombre<br>3. Guardar | Usuario actualizado | Media |
| TC-USER-008 | Cambiar rol usuario | Admin | 1. Editar usuario<br>2. Cambiar comercial→admin | Rol actualizado | Media |
| TC-USER-009 | Desactivar usuario | Admin | 1. Editar usuario<br>2. Estado=inactivo<br>3. Guardar | Usuario no puede hacer login | Media |
| TC-USER-010 | Eliminar usuario | Admin | 1. Click "Eliminar"<br>2. Confirmar | Usuario marcado inactivo | Media |
| TC-USER-011 | Comercial intenta acceder | Login comercial | 1. Ir a `/users` | Acceso denegado / 404 | Alta |
| TC-USER-012 | Admin intenta crear superadmin | Admin | 1. Crear usuario rol=superadmin | Opción no disponible | Alta |

#### 🏢 Módulo: Empresas

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-COMPANY-001 | Listar empresas | Login superadmin | 1. Ir a `/companies` | Todas las empresas visibles | Alta |
| TC-COMPANY-002 | Crear empresa | Superadmin | 1. Ir a `/companies/create`<br>2. Completar datos<br>3. Crear | Empresa creada | Media |
| TC-COMPANY-003 | Editar empresa como superadmin | Superadmin | 1. Ir a `/companies/[id]/edit`<br>2. Modificar<br>3. Guardar | Empresa actualizada | Media |
| TC-COMPANY-004 | Editar propia empresa como admin | Admin | 1. Ir a `/companies/edit`<br>2. Modificar<br>3. Guardar | Empresa actualizada | Media |
| TC-COMPANY-005 | Admin intenta acceder a listado | Login admin | 1. Ir a `/companies` | Acceso denegado | Alta |
| TC-COMPANY-006 | Admin intenta editar otra empresa | Admin | 1. Ir a `/companies/[otra_id]/edit` | Acceso denegado | Alta |

#### ⚙️ Módulo: Configuración

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-CONFIG-001 | Ver configuración | Login superadmin | 1. Ir a `/settings` | 6 categorías visibles | Alta |
| TC-CONFIG-002 | Cambiar app_name | Superadmin | 1. Editar app_name<br>2. Guardar | Nombre actualizado en toda la app | Media |
| TC-CONFIG-003 | Activar suscripciones | Superadmin | 1. Activar `subscriptions_enabled`<br>2. Guardar | Límites de planes se aplican | Alta |
| TC-CONFIG-004 | Desactivar suscripciones | Superadmin | 1. Desactivar `subscriptions_enabled`<br>2. Guardar | Límites no se aplican | Alta |
| TC-CONFIG-005 | Cambiar a monoempresa | Superadmin, `multiempresa=true` | 1. Cambiar a `false`<br>2. Guardar | `/register` oculto, cache invalidado | Alta |
| TC-CONFIG-006 | Cambiar a multiempresa | Superadmin, `multiempresa=false` | 1. Cambiar a `true`<br>2. Guardar | `/register` visible, cache invalidado | Alta |
| TC-CONFIG-007 | Editar planes Stripe | Superadmin | 1. Editar JSON de planes<br>2. Guardar | Planes actualizados | Media |
| TC-CONFIG-008 | JSON inválido en planes | Superadmin | 1. Editar JSON con error<br>2. Guardar | Error de validación | Media |
| TC-CONFIG-009 | Admin intenta acceder | Login admin | 1. Ir a `/settings` | Acceso denegado | Alta |

#### 🔧 Módulo: Reglas de Negocio

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-RULES-001 | Listar reglas | Superadmin | 1. Ir a `/settings/business-rules`<br>2. Seleccionar empresa | Reglas de empresa mostradas | Media |
| TC-RULES-002 | Crear regla | Superadmin | 1. Click "Nueva"<br>2. Completar datos<br>3. Guardar | Regla creada (inactiva) | Media |
| TC-RULES-003 | Validar sintaxis JSON | Superadmin | 1. Crear regla con JSON válido | Sin errores | Media |
| TC-RULES-004 | JSON inválido en regla | Superadmin | 1. Crear regla con JSON inválido | Error de validación | Media |
| TC-RULES-005 | Activar regla | Regla existe | 1. Toggle activar | Regla activa, auditado | Media |
| TC-RULES-006 | Desactivar regla | Regla activa | 1. Toggle desactivar | Regla inactiva, auditado | Media |
| TC-RULES-007 | Ver auditoría | Regla con cambios | 1. Ver historial | Todos los cambios registrados | Baja |
| TC-RULES-008 | Admin intenta acceder | Login admin | 1. Ir a `/settings/business-rules` | Acceso denegado | Alta |

#### 💳 Módulo: Suscripciones

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-SUB-001 | Ver plan actual | Admin, subscriptions_enabled | 1. Ir a `/subscriptions` | Información del plan visible | Alta |
| TC-SUB-002 | Upgrade Free→Pro | Plan Free | 1. Seleccionar Pro<br>2. Pagar<br>3. Confirmar | Plan actualizado, límites aumentados | Alta |
| TC-SUB-003 | Upgrade Pro→Enterprise | Plan Pro | 1. Seleccionar Enterprise<br>2. Pagar<br>3. Confirmar | Plan actualizado | Media |
| TC-SUB-004 | Downgrade con recursos excedidos | Plan Pro, 15 tarifas | 1. Intentar downgrade a Free (máx 3) | Error "Debe eliminar recursos primero" | Alta |
| TC-SUB-005 | Ver uso de límites | Plan activo | 1. Ir a `/subscriptions` | Uso actual vs límite mostrado | Media |
| TC-SUB-006 | Comercial intenta acceder | Login comercial | 1. Ir a `/subscriptions` | Acceso denegado | Alta |

#### 📚 Módulo: Ayuda

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-HELP-001 | Listar artículos | Login | 1. Ir a `/help` | Artículos visibles según rol | Media |
| TC-HELP-002 | Ver artículo | Login | 1. Click en artículo | Markdown renderizado correctamente | Media |
| TC-HELP-003 | Artículo superadmin | Login comercial | Ver artículos | Artículos de superadmin no visibles | Baja |
| TC-HELP-004 | Tour interactivo | Artículo con tour | 1. Click "Iniciar tour" | Tour se ejecuta | Baja |

#### 📧 Módulo: Contacto

| ID | Caso de Test | Precondición | Pasos | Resultado Esperado | Prioridad |
|----|--------------|--------------|-------|-------------------|-----------|
| TC-CONTACT-001 | Enviar mensaje | Público | 1. Ir a `/contact`<br>2. Completar formulario<br>3. Enviar | Mensaje guardado, email enviado | Media |
| TC-CONTACT-002 | Campos vacíos | Público | 1. Enviar sin completar | Errores de validación | Media |
| TC-CONTACT-003 | Ver mensajes | Superadmin | 1. Ir a `/contact-messages` | Todos los mensajes visibles | Media |
| TC-CONTACT-004 | Marcar como leído | Superadmin | 1. Click "Marcar leído" | Estado actualizado | Baja |

---

## ⚙️ Configuraciones Críticas a Probar

### Escenarios de Configuración

#### Escenario 1: Modo SaaS Multiempresa con Suscripciones
```
multiempresa = true
subscriptions_enabled = true
public_registration_enabled = true
```

**Tests Críticos:**
- ✅ Registro público funciona
- ✅ Cada registro crea su empresa
- ✅ Límites de plan Free se aplican
- ✅ Upgrade/downgrade funciona
- ✅ `/companies` visible para superadmin
- ✅ RLS aísla datos entre empresas

#### Escenario 2: Modo On-Premise Monoempresa sin Suscripciones
```
multiempresa = false
subscriptions_enabled = false
public_registration_enabled = false
```

**Tests Críticos:**
- ✅ `/register` oculto o deshabilitado
- ✅ Solo invitaciones funcionan
- ✅ No hay límites de recursos
- ✅ `/companies` no necesario
- ✅ `/subscriptions` oculto

#### Escenario 3: SaaS con Registro Privado
```
multiempresa = true
subscriptions_enabled = true
public_registration_enabled = false
```

**Tests Críticos:**
- ✅ `/register` muestra mensaje "Solo invitaciones"
- ✅ Invitaciones funcionan
- ✅ Límites se aplican
- ✅ Superadmin puede crear empresas

#### Escenario 4: Multiempresa sin Suscripciones
```
multiempresa = true
subscriptions_enabled = false
public_registration_enabled = true
```

**Tests Críticos:**
- ✅ Registro público abierto
- ✅ No hay límites
- ✅ `/subscriptions` oculto
- ✅ Empresas aisladas

---

## 🎯 Checklist de Regresión (Ejecutar después de cada cambio)

### Pre-Deploy Checklist

#### Autenticación
- [ ] Login superadmin funciona
- [ ] Login admin funciona
- [ ] Login comercial funciona
- [ ] Logout funciona
- [ ] Recuperación de contraseña funciona
- [ ] Invitaciones funcionan

#### Permisos y Roles
- [ ] Superadmin accede a todo
- [ ] Admin NO accede a `/settings`
- [ ] Admin NO accede a `/companies` (listado)
- [ ] Comercial NO accede a `/users`
- [ ] Comercial NO accede a `/tariffs/create`
- [ ] Comercial NO puede eliminar presupuestos

#### Tarifas
- [ ] Crear tarifa con CSV válido funciona
- [ ] Detección automática de IVAs funciona
- [ ] Pre-carga desde plantilla funciona
- [ ] Límites de plan se aplican (si subscriptions_enabled=true)
- [ ] Eliminar tarifa sin presupuestos funciona
- [ ] No se puede eliminar tarifa con presupuestos

#### Presupuestos
- [ ] Crear presupuesto completo funciona (5 pasos)
- [ ] Cálculo IVA correcto
- [ ] Cálculo IRPF correcto (si aplica)
- [ ] Cálculo RE correcto (si aplica)
- [ ] Descuentos funcionan
- [ ] Exportar PDF funciona
- [ ] Enviar por email funciona
- [ ] Versiones se crean correctamente
- [ ] Comercial ve solo sus presupuestos
- [ ] Admin ve todos los presupuestos de su empresa

#### Usuarios
- [ ] Crear usuario (invitación) funciona
- [ ] Email de invitación se envía
- [ ] Aceptar invitación funciona
- [ ] Editar usuario funciona
- [ ] Cambiar rol funciona
- [ ] Desactivar usuario funciona
- [ ] Límites de usuarios se aplican (si subscriptions_enabled=true)

#### Configuración
- [ ] Solo superadmin accede a `/settings`
- [ ] Cambio de `multiempresa` invalida cache
- [ ] Cambio de `subscriptions_enabled` invalida cache
- [ ] Cambios en configuración se aplican inmediatamente

#### Suscripciones (si habilitadas)
- [ ] Ver plan actual funciona
- [ ] Upgrade funciona
- [ ] Límites de plan se aplican
- [ ] No se puede downgrade con recursos excedidos

#### RLS y Multi-Tenant
- [ ] Admin solo ve datos de su empresa (tarifas, presupuestos, usuarios)
- [ ] Comercial solo ve sus presupuestos
- [ ] No se puede acceder a recursos de otra empresa via URL directa
- [ ] Superadmin ve todos los datos

#### Responsive y UI
- [ ] App funciona en mobile (Chrome/Safari iOS y Android)
- [ ] Touch interactions funcionan
- [ ] Navegación funciona
- [ ] Formularios validados correctamente

#### Emails
- [ ] Emails de invitación se envían
- [ ] Emails de recuperación de contraseña se envían
- [ ] Emails de contacto se envían
- [ ] Emails de presupuesto se envían con PDF adjunto

---

## 📊 Matriz de Testing de Límites por Plan

| Recurso | Free | Pro | Enterprise | Test |
|---------|------|-----|------------|------|
| **Tarifas** | 3 | 50 | Ilimitado | ✅ Crear 4ª tarifa en Free debe fallar |
| **Presupuestos** | 10 | 500 | Ilimitado | ✅ Crear 11º presupuesto en Free debe fallar |
| **Usuarios** | 3 | 20 | Ilimitado | ✅ Invitar 4º usuario en Free debe fallar |
| **Clientes** | 50 | 500 | Ilimitado | ✅ Crear cliente 51 en Free debe fallar |

---

## 🚨 Casos Edge a Probar

### Edge Cases Críticos

1. **Usuario sin empresa asignada**
   - ¿Qué pasa? → Error o redirect a crear empresa

2. **Tarifa sin partidas**
   - ¿Se puede crear presupuesto? → No

3. **Presupuesto sin partidas seleccionadas**
   - ¿Se puede crear? → No, validación

4. **Cambio de plan con recursos que exceden límites**
   - Free→Pro con 5 tarifas → OK
   - Pro→Free con 5 tarifas → ERROR

5. **Usuario invitado pero empresa eliminada**
   - ¿Token funciona? → Error

6. **Presupuesto con cliente eliminado**
   - ¿Se puede ver? → Sí, datos guardados

7. **CSV con 10,000 partidas**
   - ¿Performance? → Debe cargar en <5s

8. **Múltiples usuarios editando mismo presupuesto**
   - ¿Conflictos? → Última escritura gana (optimistic locking en Fase 3)

9. **Cambio de `multiempresa` con datos existentes**
   - true→false → OK, empresas siguen existiendo
   - false→true → OK

10. **Stripe webhook falla**
    - ¿Suscripción se actualiza? → Reintentos automáticos

---

## 📝 Notas Finales

### Herramientas Recomendadas

- **Testing Manual:** Uso de usuarios de prueba en cada rol
- **Testing Automático:** Playwright / Cypress para E2E (Fase 3)
- **Testing de Carga:** k6 / Artillery para performance (Fase 3)
- **Monitoreo:** Sentry para errores en producción

### Prioridades de Testing

1. **Crítico (P0):** Autenticación, creación de tarifas/presupuestos, permisos
2. **Alto (P1):** Límites de planes, cálculos fiscales, RLS
3. **Medio (P2):** Exportaciones, emails, versiones
4. **Bajo (P3):** UI/UX, tours, ayuda

### Reporte de Bugs

**Template:**
```
Título: [MÓDULO] Descripción breve
Pasos para reproducir:
1. ...
2. ...
3. ...

Resultado esperado: ...
Resultado actual: ...
Severidad: [Crítica/Alta/Media/Baja]
Rol afectado: [Superadmin/Admin/Comercial/Todos]
Configuración: multiempresa=?, subscriptions_enabled=?
```

---

**Documento creado:** Noviembre 2024
**Versión:** 1.0
**Mantenedor:** Equipo de Desarrollo RedPresu
