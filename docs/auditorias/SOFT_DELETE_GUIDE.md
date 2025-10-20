# 🗑️ Guía de Soft-Delete para Empresas - jeyca-presu

**Fecha:** 2025-01-20
**Vulnerabilidad:** VULN-007 - Implementar soft-delete para empresas
**Estado:** ✅ IMPLEMENTADA

---

## 📋 Resumen

Sistema de eliminación en dos fases para empresas que previene pérdida accidental de datos y permite recuperación, con backup automático completo antes de eliminación permanente.

**Ubicación:** `/src/app/actions/companies.ts`

---

## 🎯 Objetivos

1. **Prevenir pérdida accidental**: Soft-delete como primera capa de protección
2. **Permitir recuperación**: Empresas eliminadas pueden restaurarse
3. **Backup completo**: Snapshot de todos los datos antes de eliminación permanente
4. **Auditoría**: Log completo de todas las eliminaciones
5. **Confirmación doble**: Usuario debe escribir nombre exacto de empresa

---

## 🔄 Flujo de Eliminación

### Fase 1: Soft-Delete (Eliminación Suave)

```
[Empresa Activa]
       ↓
   deleteCompany()
       ↓
[deleted_at = timestamp]
       ↓
[Empresa Oculta] (pero datos intactos)
       ↓
   ← restoreCompany() (recuperación posible)
       ↓
[Empresa Activa] (restaurada)
```

### Fase 2: Eliminación Permanente

```
[Empresa Soft-Deleted]
       ↓
permanentlyDeleteCompany()
       ↓
[Backup completo creado]
       ↓
[Usuario confirma nombre exacto]
       ↓
[Eliminación en cascada]
       ↓
[Datos borrados físicamente]
       ↓
❌ NO hay recuperación automática
```

---

## 🛠️ Funciones Implementadas

### 1. `deleteCompany(companyId)` - Soft-Delete

**Descripción:** Marca empresa como eliminada sin borrar datos.

**Proceso:**
1. Verificar permisos (solo superadmin)
2. Validar empresa existe y está activa (deleted_at IS NULL)
3. Proteger empresa por defecto (company_id = 1)
4. Obtener estadísticas (usuarios, tarifas, presupuestos)
5. Marcar deleted_at = NOW()
6. Registrar en audit log

**Código:**
```typescript
// src/app/actions/companies.ts - línea 295

export async function deleteCompany(companyId: string): Promise<ActionResult> {
  // 1. Autenticación y permisos
  const user = await getServerUser()
  if (user.role !== "superadmin") {
    return { success: false, error: "Sin permisos" }
  }

  // 2. Obtener empresa activa
  const { data: company } = await supabaseAdmin
    .from("redpresu_issuers")
    .select("*")
    .eq("id", companyId)
    .is("deleted_at", null) // Solo activas
    .single()

  // 3. Protección empresa por defecto
  if (company.company_id === 1) {
    return { success: false, error: "No se puede eliminar empresa por defecto" }
  }

  // 4. Obtener estadísticas para auditoría
  const { count: usersCount } = await supabaseAdmin
    .from("redpresu_users")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.company_id)

  // ... (tarifas, presupuestos)

  // 5. SOFT DELETE
  await supabaseAdmin
    .from("redpresu_issuers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", companyId)

  // 6. Audit log
  await supabaseAdmin
    .from("redpresu_company_deletion_log")
    .insert({
      company_id: company.company_id,
      deleted_by: user.id,
      deletion_type: "soft_delete",
      users_count: usersCount || 0,
      // ...
    })

  return { success: true, data: company }
}
```

**Resultado:**
- ✅ Empresa oculta en listados
- ✅ Usuarios, tarifas y presupuestos inaccesibles vía RLS
- ✅ Datos físicamente intactos
- ✅ Recuperación posible con `restoreCompany()`

---

### 2. `restoreCompany(companyId)` - Restaurar

**Descripción:** Restaura empresa soft-deleted.

**Proceso:**
1. Verificar permisos (solo superadmin)
2. Validar empresa existe y está eliminada (deleted_at NOT NULL)
3. Quitar marca de eliminación (deleted_at = NULL)
4. Registrar restauración en audit log

**Código:**
```typescript
// src/app/actions/companies.ts - línea 426

export async function restoreCompany(companyId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (user.role !== "superadmin") {
    return { success: false, error: "Sin permisos" }
  }

  // Obtener empresa ELIMINADA
  const { data: company } = await supabaseAdmin
    .from("redpresu_issuers")
    .select("*")
    .eq("id", companyId)
    .not("deleted_at", "is", null) // Solo eliminadas
    .single()

  // Restaurar
  const { data: restoredCompany } = await supabaseAdmin
    .from("redpresu_issuers")
    .update({ deleted_at: null })
    .eq("id", companyId)
    .select()
    .single()

  // Audit log
  await supabaseAdmin
    .from("redpresu_company_deletion_log")
    .insert({
      deletion_type: "restore",
      deleted_by: user.id,
      // ...
    })

  return { success: true, data: restoredCompany }
}
```

**Resultado:**
- ✅ Empresa visible de nuevo
- ✅ Usuarios pueden acceder de nuevo
- ✅ Todos los datos intactos

---

### 3. `getDeletedCompanies()` - Listar Eliminadas

**Descripción:** Obtiene lista de empresas soft-deleted.

**Proceso:**
1. Verificar permisos (solo superadmin)
2. SELECT WHERE deleted_at IS NOT NULL
3. Contar usuarios, tarifas, presupuestos asociados

**Código:**
```typescript
// src/app/actions/companies.ts - línea 531

export async function getDeletedCompanies(): Promise<ActionResult> {
  const user = await getServerUser()
  if (user.role !== "superadmin") {
    return { success: false, error: "Sin permisos" }
  }

  const { data: deletedCompanies } = await supabaseAdmin
    .from("redpresu_issuers")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })

  // Contar datos asociados
  const companiesWithCounts = await Promise.all(
    deletedCompanies.map(async (company) => {
      const { count: userCount } = await supabaseAdmin
        .from("redpresu_users")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.company_id)

      // ... (tariffs, budgets)

      return {
        ...company,
        user_count: userCount || 0,
        // ...
      }
    })
  )

  return { success: true, data: companiesWithCounts }
}
```

---

### 4. `permanentlyDeleteCompany(companyId, confirmationText)` - Eliminación Permanente

**Descripción:** Elimina empresa FÍSICAMENTE de la base de datos.

**⚠️ PELIGRO:** Esta operación NO se puede deshacer.

**Proceso:**
1. Verificar permisos (solo superadmin)
2. Validar empresa está soft-deleted (deleted_at NOT NULL)
3. Proteger empresa por defecto (company_id = 1)
4. **Verificar confirmación** (nombre exacto de empresa)
5. **Crear backup completo** en audit log
6. Eliminar en cascada:
   - Presupuestos (redpresu_budgets)
   - Tarifas (redpresu_tariffs)
   - Usuarios (redpresu_users)
   - Emisor (redpresu_issuers)
   - Company (redpresu_companies)

**Código:**
```typescript
// src/app/actions/companies.ts - línea 547

export async function permanentlyDeleteCompany(
  companyId: string,
  confirmationText: string
): Promise<ActionResult> {
  // 1. Autenticación
  const user = await getServerUser()
  if (user.role !== "superadmin") {
    return { success: false, error: "Solo superadmin" }
  }

  // 2. Obtener empresa SOFT-DELETED
  const { data: company } = await supabaseAdmin
    .from("redpresu_issuers")
    .select("*")
    .eq("id", companyId)
    .not("deleted_at", "is", null) // DEBE estar ya eliminada
    .single()

  if (!company) {
    return {
      success: false,
      error: "Empresa no encontrada o no está soft-deleted. Primero elimínala."
    }
  }

  // 3. Protección empresa por defecto
  if (company.company_id === 1) {
    return { success: false, error: "No se puede eliminar empresa por defecto" }
  }

  // 4. VERIFICAR CONFIRMACIÓN (nombre exacto)
  if (confirmationText.trim() !== company.name.trim()) {
    return {
      success: false,
      error: `Debes escribir exactamente "${company.name}" para confirmar`
    }
  }

  log.warn("[permanentlyDeleteCompany] CONFIRMACIÓN VALIDADA")

  // 5. CREAR BACKUP COMPLETO (CRÍTICO)
  const { data: allUsers } = await supabaseAdmin
    .from("redpresu_users")
    .select("*")
    .eq("company_id", company.company_id)

  const { data: allTariffs } = await supabaseAdmin
    .from("redpresu_tariffs")
    .select("*")
    .eq("company_id", company.company_id)

  const { data: allBudgets } = await supabaseAdmin
    .from("redpresu_budgets")
    .select("*")
    .eq("company_id", company.company_id)

  // SECURITY (VULN-007): Guardar backup ANTES de eliminar
  const { error: backupError } = await supabaseAdmin
    .from("redpresu_company_deletion_log")
    .insert({
      company_id: company.company_id,
      deleted_by: user.id,
      deletion_type: "permanent_delete",
      full_backup: {
        users: allUsers || [],
        tariffs: allTariffs || [],
        budgets: allBudgets || [],
        company: companyData,
        issuer: company,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deleted_by_email: user.email
      }
    })

  if (backupError) {
    log.error("ERROR CRÍTICO creando backup:", backupError)
    return {
      success: false,
      error: "Error creando backup. Operación cancelada por seguridad."
    }
  }

  log.info("Backup creado exitosamente")

  // 6. ELIMINACIÓN EN CASCADA

  // 6.1. Eliminar presupuestos
  const { count: budgetsDeleted } = await supabaseAdmin
    .from("redpresu_budgets")
    .delete({ count: "exact" })
    .eq("company_id", company.company_id)

  log.info("Presupuestos eliminados:", budgetsDeleted)

  // 6.2. Eliminar tarifas
  const { count: tariffsDeleted } = await supabaseAdmin
    .from("redpresu_tariffs")
    .delete({ count: "exact" })
    .eq("company_id", company.company_id)

  log.info("Tarifas eliminadas:", tariffsDeleted)

  // 6.3. Eliminar usuarios
  const { count: usersDeleted } = await supabaseAdmin
    .from("redpresu_users")
    .delete({ count: "exact" })
    .eq("company_id", company.company_id)

  log.info("Usuarios eliminados:", usersDeleted)

  // 6.4. Eliminar emisor
  await supabaseAdmin
    .from("redpresu_issuers")
    .delete()
    .eq("id", companyId)

  log.info("Emisor eliminado")

  // 6.5. Eliminar company
  await supabaseAdmin
    .from("redpresu_companies")
    .delete()
    .eq("id", company.company_id)

  log.info("Company eliminada")

  // 7. CONFIRMACIÓN
  log.warn("✅ ELIMINACIÓN PERMANENTE COMPLETADA:", company.name)

  return {
    success: true,
    data: {
      message: `Empresa "${company.name}" eliminada permanentemente`,
      stats: {
        budgets: budgetsDeleted,
        tariffs: tariffsDeleted,
        users: usersDeleted
      },
      backupCreated: true
    }
  }
}
```

**Resultado:**
- ✅ Todos los datos eliminados físicamente
- ✅ Backup completo guardado en audit log
- ❌ NO hay recuperación automática (solo manual desde backup)

---

## 📊 Tabla de Datos Eliminados

### Soft-Delete (`deleteCompany`)

| Tabla | Acción | Recuperable |
|-------|--------|-------------|
| `redpresu_issuers` | UPDATE deleted_at = NOW() | ✅ SÍ (restoreCompany) |
| `redpresu_companies` | Sin cambios | ✅ SÍ |
| `redpresu_users` | Sin cambios (inaccesibles vía RLS) | ✅ SÍ |
| `redpresu_tariffs` | Sin cambios (inaccesibles vía RLS) | ✅ SÍ |
| `redpresu_budgets` | Sin cambios (inaccesibles vía RLS) | ✅ SÍ |

### Eliminación Permanente (`permanentlyDeleteCompany`)

| Tabla | Acción | Recuperable |
|-------|--------|-------------|
| `redpresu_budgets` | DELETE WHERE company_id = X | ❌ NO (solo desde backup) |
| `redpresu_tariffs` | DELETE WHERE company_id = X | ❌ NO (solo desde backup) |
| `redpresu_users` | DELETE WHERE company_id = X | ❌ NO (solo desde backup) |
| `redpresu_issuers` | DELETE WHERE id = X | ❌ NO (solo desde backup) |
| `redpresu_companies` | DELETE WHERE id = X | ❌ NO (solo desde backup) |
| `redpresu_company_deletion_log` | INSERT full_backup | ✅ SÍ (backup completo) |

---

## 🔒 Protecciones Implementadas

### 1. Solo Superadmin

```typescript
if (user.role !== "superadmin") {
  return { success: false, error: "Sin permisos" }
}
```

### 2. Empresa Por Defecto

```typescript
if (company.company_id === 1) {
  return { success: false, error: "No se puede eliminar empresa por defecto" }
}
```

### 3. Confirmación Doble (Nombre Exacto)

```typescript
if (confirmationText.trim() !== company.name.trim()) {
  return {
    success: false,
    error: `Debes escribir exactamente "${company.name}" para confirmar`
  }
}
```

### 4. Backup Obligatorio Antes de Eliminar

```typescript
const { error: backupError } = await supabaseAdmin
  .from("redpresu_company_deletion_log")
  .insert({ full_backup: { users, tariffs, budgets, company, issuer } })

if (backupError) {
  return { success: false, error: "Error creando backup. Operación cancelada." }
}
```

### 5. Solo Empresas Ya Soft-Deleted

```typescript
// permanentlyDeleteCompany solo funciona si la empresa YA está soft-deleted
.not("deleted_at", "is", null)
```

---

## 🧪 Testing

### Test 1: Soft-Delete Empresa

```typescript
// 1. Eliminar empresa (soft-delete)
const result = await deleteCompany("uuid-empresa-test")

// Verificar
expect(result.success).toBe(true)

// 2. Verificar empresa oculta
const { data: companies } = await getCompanies()
expect(companies.find(c => c.id === "uuid-empresa-test")).toBeUndefined()

// 3. Verificar empresa en lista eliminadas
const { data: deleted } = await getDeletedCompanies()
expect(deleted.find(c => c.id === "uuid-empresa-test")).toBeDefined()
```

### Test 2: Restaurar Empresa

```typescript
// 1. Restaurar
const result = await restoreCompany("uuid-empresa-test")

// Verificar
expect(result.success).toBe(true)

// 2. Verificar empresa visible de nuevo
const { data: companies } = await getCompanies()
expect(companies.find(c => c.id === "uuid-empresa-test")).toBeDefined()
```

### Test 3: Eliminación Permanente (Confirmación Incorrecta)

```typescript
// 1. Intentar eliminar sin confirmación correcta
const result = await permanentlyDeleteCompany("uuid-empresa-test", "nombre incorrecto")

// Verificar rechazo
expect(result.success).toBe(false)
expect(result.error).toContain("Debes escribir exactamente")
```

### Test 4: Eliminación Permanente (Éxito)

```typescript
// Pre-requisito: empresa DEBE estar soft-deleted primero
await deleteCompany("uuid-empresa-test")

// 1. Eliminar permanentemente
const result = await permanentlyDeleteCompany(
  "uuid-empresa-test",
  "Nombre Exacto Empresa Test" // Nombre exacto
)

// Verificar éxito
expect(result.success).toBe(true)
expect(result.data.backupCreated).toBe(true)
expect(result.data.stats.users).toBeGreaterThanOrEqual(0)

// 2. Verificar empresa NO existe
const { data: companies } = await getCompanies()
expect(companies.find(c => c.id === "uuid-empresa-test")).toBeUndefined()

// 3. Verificar empresa NO está en eliminadas
const { data: deleted } = await getDeletedCompanies()
expect(deleted.find(c => c.id === "uuid-empresa-test")).toBeUndefined()

// 4. Verificar backup existe
const { data: auditLogs } = await supabaseAdmin
  .from("redpresu_company_deletion_log")
  .select("*")
  .eq("deletion_type", "permanent_delete")
  .order("created_at", { ascending: false })
  .limit(1)

expect(auditLogs[0].full_backup).toBeDefined()
expect(auditLogs[0].full_backup.users).toBeDefined()
```

### Test 5: Protección Empresa Por Defecto

```typescript
// 1. Intentar eliminar empresa por defecto
const result = await permanentlyDeleteCompany("uuid-empresa-1", "Empresa Por Defecto")

// Verificar rechazo
expect(result.success).toBe(false)
expect(result.error).toContain("empresa por defecto")
```

---

## 📈 Auditoría y Backup

### Tabla: `redpresu_company_deletion_log`

**Columnas principales:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del log |
| `company_id` | INTEGER | ID numérico de la empresa |
| `issuer_id` | UUID | UUID del emisor |
| `deleted_by` | UUID | Usuario que realizó la operación |
| `deletion_type` | TEXT | "soft_delete", "restore", "permanent_delete" |
| `company_snapshot` | JSONB | Snapshot de redpresu_companies |
| `issuer_snapshot` | JSONB | Snapshot de redpresu_issuers |
| `users_count` | INTEGER | Cantidad de usuarios |
| `tariffs_count` | INTEGER | Cantidad de tarifas |
| `budgets_count` | INTEGER | Cantidad de presupuestos |
| `deletion_reason` | TEXT | Razón de la eliminación |
| `full_backup` | JSONB | **Backup completo de TODOS los datos** |
| `created_at` | TIMESTAMPTZ | Timestamp del evento |

### Estructura `full_backup` (Solo en permanent_delete)

```json
{
  "users": [
    {
      "id": "uuid-user-1",
      "email": "user1@empresa.com",
      "name": "Usuario 1",
      // ... todos los campos
    }
  ],
  "tariffs": [
    {
      "id": "uuid-tariff-1",
      "name": "Tarifa 1",
      "estructura_precios": { /* ... */ },
      // ... todos los campos
    }
  ],
  "budgets": [
    {
      "id": "uuid-budget-1",
      "client_name": "Cliente 1",
      "budget_json_data": { /* ... */ },
      // ... todos los campos
    }
  ],
  "company": {
    "id": 1,
    "name": "Empresa Test",
    // ... todos los campos
  },
  "issuer": {
    "id": "uuid-emisor",
    "name": "Empresa Test",
    // ... todos los campos
  },
  "deleted_at": "2025-01-20T12:00:00Z",
  "deleted_by": "uuid-superadmin",
  "deleted_by_email": "admin@sistema.com"
}
```

### Consultar Backups

```sql
-- Ver todas las eliminaciones permanentes
SELECT
  id,
  company_id,
  deletion_type,
  deleted_by,
  users_count,
  tariffs_count,
  budgets_count,
  created_at
FROM redpresu_company_deletion_log
WHERE deletion_type = 'permanent_delete'
ORDER BY created_at DESC;

-- Ver backup completo de una empresa específica
SELECT full_backup
FROM redpresu_company_deletion_log
WHERE company_id = 5
  AND deletion_type = 'permanent_delete'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🔄 Recuperación de Emergencia

### Restaurar desde Backup (Manual)

Si necesitas recuperar una empresa eliminada permanentemente:

**Pasos:**

1. **Obtener backup:**
```sql
SELECT full_backup
FROM redpresu_company_deletion_log
WHERE company_id = X
  AND deletion_type = 'permanent_delete'
ORDER BY created_at DESC
LIMIT 1;
```

2. **Restaurar company:**
```sql
INSERT INTO redpresu_companies (id, name, created_at, updated_at)
VALUES (
  [full_backup.company.id],
  [full_backup.company.name],
  [full_backup.company.created_at],
  [full_backup.company.updated_at]
);
```

3. **Restaurar issuer:**
```sql
INSERT INTO redpresu_issuers (id, company_id, name, nif, ...)
VALUES (
  [full_backup.issuer.id],
  [full_backup.issuer.company_id],
  [full_backup.issuer.name],
  [full_backup.issuer.nif],
  ...
);
```

4. **Restaurar usuarios:**
```sql
INSERT INTO redpresu_users (id, email, name, company_id, ...)
SELECT *
FROM jsonb_populate_recordset(null::redpresu_users, [full_backup.users]::jsonb);
```

5. **Restaurar tarifas:**
```sql
INSERT INTO redpresu_tariffs (id, name, company_id, estructura_precios, ...)
SELECT *
FROM jsonb_populate_recordset(null::redpresu_tariffs, [full_backup.tariffs]::jsonb);
```

6. **Restaurar presupuestos:**
```sql
INSERT INTO redpresu_budgets (id, client_name, company_id, budget_json_data, ...)
SELECT *
FROM jsonb_populate_recordset(null::redpresu_budgets, [full_backup.budgets]::jsonb);
```

**NOTA:** La recuperación manual debe hacerse con cuidado y verificando integridad de IDs, company_id, etc.

---

## 📚 Referencias

- **Soft-Delete Pattern**: https://en.wikipedia.org/wiki/Soft_delete
- **OWASP - Data Protection**: https://owasp.org/www-community/vulnerabilities/Missing_Data_Protection
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

---

## 🔐 Conclusión

**VULN-007: Implementar soft-delete para empresas** - ✅ **COMPLETADA**

El sistema jeyca-presu ahora tiene eliminación en dos fases que:

1. ✅ Previene pérdida accidental con soft-delete
2. ✅ Permite recuperación fácil (`restoreCompany()`)
3. ✅ Requiere confirmación doble (nombre exacto) para eliminación permanente
4. ✅ Crea backup completo automáticamente antes de eliminar
5. ✅ Registra auditoría completa de todas las operaciones
6. ✅ Protege empresa por defecto del sistema
7. ✅ Solo superadmin puede eliminar empresas

**Nivel de seguridad:** 🛡️🛡️🛡️🛡️🛡️ (5/5) - Excelente

**Recomendación:** Implementar UI para mostrar empresas eliminadas y permitir restauración desde panel de administración.

---

## 📝 Resumen de Funciones

```typescript
// Importar
import {
  deleteCompany,           // Soft-delete
  restoreCompany,          // Restaurar
  getDeletedCompanies,     // Listar eliminadas
  permanentlyDeleteCompany // Eliminación permanente
} from '@/app/actions/companies'

// Usar:

// 1. Soft-delete
const result = await deleteCompany(companyId)

// 2. Restaurar
const result = await restoreCompany(companyId)

// 3. Listar eliminadas
const result = await getDeletedCompanies()

// 4. Eliminar permanentemente (PELIGROSO)
const result = await permanentlyDeleteCompany(companyId, "Nombre Exacto Empresa")
```
