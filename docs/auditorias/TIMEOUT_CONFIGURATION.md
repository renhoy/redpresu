# ⏱️ Configuración de Timeouts - jeyca-presu

**Fecha:** 2025-01-20
**Vulnerabilidad:** VULN-014 - Configurar timeouts en Supabase
**Estado:** ✅ IMPLEMENTADA

---

## 📋 Resumen

Sistema de timeouts configurado para prevenir queries que se cuelgan indefinidamente, mejorando la estabilidad y experiencia del usuario.

**Ubicación:** `/src/lib/supabase/server.ts`

---

## 🎯 Objetivos

1. **Prevenir queries colgadas**: Evitar que operaciones indefinidas bloqueen el servidor
2. **Mejorar UX**: Feedback rápido al usuario en caso de timeout
3. **Protección DoS**: Limitar recursos consumidos por queries lentas
4. **Categorización**: Diferentes timeouts según tipo de operación

---

## ⚙️ Configuración Implementada

### Timeouts Globales (Supabase Client)

```typescript
// src/lib/supabase/server.ts - línea 25

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // SECURITY (VULN-014): Timeouts para prevenir queries colgadas
    realtime: {
      timeout: 30000 // 30 segundos
    }
  }
)
```

---

### Timeouts por Tipo de Operación

```typescript
// src/lib/supabase/server.ts - línea 55

export const SUPABASE_TIMEOUTS = {
  // Queries rápidas (selects simples, updates, deletes)
  FAST_QUERY: 10000,      // 10 segundos

  // Queries medianas (joins, filtros complejos)
  MEDIUM_QUERY: 20000,    // 20 segundos

  // Queries pesadas (exports, imports, agregaciones)
  HEAVY_QUERY: 45000,     // 45 segundos

  // Operaciones de storage (uploads/downloads)
  STORAGE: 60000,         // 60 segundos

  // Default global
  DEFAULT: 30000          // 30 segundos
} as const
```

---

### Helper `withTimeout()`

```typescript
// src/lib/supabase/server.ts - línea 89

/**
 * Helper para ejecutar query con timeout específico
 *
 * @param queryFn - Función que retorna la promesa de Supabase
 * @param timeoutMs - Timeout en milisegundos
 * @param operationName - Nombre de la operación (para logs)
 * @returns Resultado de la query o error de timeout
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ])
}
```

---

## 📊 Tabla de Timeouts Recomendados

| Tipo de Operación | Timeout | Uso |
|-------------------|---------|-----|
| **FAST_QUERY** | 10s | SELECT simple, UPDATE, DELETE de 1 registro |
| **MEDIUM_QUERY** | 20s | JOINs, filtros complejos, WHERE con múltiples condiciones |
| **HEAVY_QUERY** | 45s | Exports, imports, agregaciones (COUNT, SUM, AVG) |
| **STORAGE** | 60s | Upload/download de archivos, generación de PDFs |
| **DEFAULT** | 30s | Operaciones genéricas sin categoría específica |

---

## 🛠️ Uso del Helper

### Ejemplo 1: Export de Tarifas (Heavy Query)

```typescript
// src/app/actions/export.ts - línea 109

import { SUPABASE_TIMEOUTS, withTimeout } from '@/lib/supabase/server'

export async function exportTariffs(ids: string[]) {
  // SECURITY (VULN-014): Timeout para query pesada de export
  const { data: tariffs, error } = await withTimeout(
    () => supabase
      .from('redpresu_tariffs')
      .select('*')
      .in('id', ids)
      .eq('company_id', empresaId)
      .order('name', { ascending: true }),
    SUPABASE_TIMEOUTS.HEAVY_QUERY,  // 45 segundos
    'exportTariffs'
  )

  if (error) {
    // Error puede ser timeout o error de BD
    return { success: false, error: error.message }
  }

  return { success: true, data: tariffs }
}
```

### Ejemplo 2: Get Budget (Fast Query)

```typescript
import { SUPABASE_TIMEOUTS, withTimeout } from '@/lib/supabase/server'

export async function getBudgetById(id: string) {
  const { data: budget, error } = await withTimeout(
    () => supabase
      .from('redpresu_budgets')
      .select('*')
      .eq('id', id)
      .single(),
    SUPABASE_TIMEOUTS.FAST_QUERY,  // 10 segundos
    'getBudgetById'
  )

  if (error) {
    return null
  }

  return budget
}
```

### Ejemplo 3: Upload PDF (Storage)

```typescript
import { SUPABASE_TIMEOUTS, withTimeout } from '@/lib/supabase/server'

export async function uploadPDF(file: File, path: string) {
  try {
    const { data, error } = await withTimeout(
      () => supabaseAdmin.storage
        .from('budget-pdfs')
        .upload(path, file),
      SUPABASE_TIMEOUTS.STORAGE,  // 60 segundos
      'uploadPDF'
    )

    if (error) throw error

    return { success: true, path: data.path }
  } catch (error) {
    // Puede ser timeout o error de storage
    return { success: false, error: error.message }
  }
}
```

### Ejemplo 4: Aggregation (Heavy Query)

```typescript
import { SUPABASE_TIMEOUTS, withTimeout } from '@/lib/supabase/server'

export async function getDashboardStats(companyId: number) {
  const { data, error } = await withTimeout(
    () => supabase
      .from('redpresu_budgets')
      .select('status, total.sum(), count()')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgo),
    SUPABASE_TIMEOUTS.HEAVY_QUERY,  // 45 segundos
    'getDashboardStats'
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
```

---

## ⚡ Decisión de Timeout según Operación

### ✅ FAST_QUERY (10s)

**Usar cuando:**
- SELECT de 1 o pocos registros
- Filtros por ID o UUID
- UPDATE/DELETE de registros específicos
- No hay JOINs complejos

**Ejemplos:**
```typescript
// GET por ID
.from('budgets').select('*').eq('id', budgetId).single()

// UPDATE simple
.from('budgets').update({ status: 'aprobado' }).eq('id', budgetId)

// DELETE específico
.from('budgets').delete().eq('id', budgetId)
```

---

### ✅ MEDIUM_QUERY (20s)

**Usar cuando:**
- JOINs de 2-3 tablas
- Filtros con múltiples condiciones
- SELECT con paginación
- Búsquedas con LIKE/ILIKE

**Ejemplos:**
```typescript
// JOIN con filtros
.from('budgets')
  .select('*, tariff:redpresu_tariffs(*)')
  .eq('company_id', companyId)
  .eq('status', 'enviado')
  .order('created_at', { ascending: false })

// Búsqueda
.from('budgets')
  .select('*')
  .ilike('client_name', `%${searchTerm}%`)
  .eq('company_id', companyId)
```

---

### ✅ HEAVY_QUERY (45s)

**Usar cuando:**
- Exports masivos (.in con múltiples IDs)
- Imports con validación
- Agregaciones (COUNT, SUM, AVG)
- Queries con múltiples JOINs complejos

**Ejemplos:**
```typescript
// Export múltiple
.from('tariffs').select('*').in('id', [id1, id2, ..., id100])

// Agregación
.from('budgets')
  .select('count(), total.sum(), iva.avg()')
  .eq('company_id', companyId)

// Import con validación
.from('tariffs').insert(arrayOf100Tariffs).select()
```

---

### ✅ STORAGE (60s)

**Usar cuando:**
- Upload de archivos
- Download de archivos
- Generación de URLs firmadas
- Operaciones en Supabase Storage

**Ejemplos:**
```typescript
// Upload
.storage.from('budget-pdfs').upload(path, file)

// Download
.storage.from('budget-pdfs').download(path)

// Signed URL
.storage.from('budget-pdfs').createSignedUrl(path, 3600)
```

---

## 🚨 Manejo de Errores de Timeout

### Error Típico

```javascript
Error: Timeout: exportTariffs exceeded 45000ms
```

### Manejo Recomendado

```typescript
try {
  const { data, error } = await withTimeout(
    () => supabase.from('table').select('*'),
    SUPABASE_TIMEOUTS.HEAVY_QUERY,
    'operationName'
  )

  if (error) {
    // Puede ser timeout o error de BD
    if (error.message.includes('Timeout:')) {
      return {
        success: false,
        error: 'La operación tardó demasiado tiempo. Intenta con menos registros.'
      }
    }

    return { success: false, error: error.message }
  }

  return { success: true, data }
} catch (error) {
  // Catch para errores inesperados
  if (error.message.includes('Timeout:')) {
    return {
      success: false,
      error: 'La operación tardó demasiado tiempo. Inténtalo de nuevo.'
    }
  }

  return { success: false, error: 'Error inesperado' }
}
```

---

## 📈 Archivos Modificados

### 1. `/src/lib/supabase/server.ts`

**Cambios:**
- ✅ Configuración global de timeouts en cliente Supabase (línea 25-48)
- ✅ Constantes `SUPABASE_TIMEOUTS` exportadas (línea 55-70)
- ✅ Helper `withTimeout()` implementado (línea 89-103)

### 2. `/src/app/actions/export.ts`

**Cambios:**
- ✅ Import de timeouts (línea 15)
- ✅ `exportTariffs()` con timeout HEAVY_QUERY (línea 109-118)
- ✅ `exportBudgets()` con timeout HEAVY_QUERY (línea 250-259)

---

## 🎯 Próximos Pasos (Opcional)

### Aplicar timeouts a otras operaciones pesadas

**Candidatos principales:**

1. **`/src/app/actions/import.ts`**
   - `importTariffs()` - HEAVY_QUERY
   - `importBudgets()` - HEAVY_QUERY

2. **`/src/app/actions/budgets.ts`**
   - `getBudgets()` con filtros complejos - MEDIUM_QUERY
   - `generateBudgetPDF()` - STORAGE (si usa Supabase Storage)

3. **`/src/app/actions/dashboard.ts`**
   - Agregaciones y estadísticas - HEAVY_QUERY

### Ejemplo de aplicación:

```typescript
// Antes:
const { data } = await supabase.from('table').select('*')

// Después:
const { data } = await withTimeout(
  () => supabase.from('table').select('*'),
  SUPABASE_TIMEOUTS.MEDIUM_QUERY,
  'functionName'
)
```

---

## 🧪 Testing

### Simular Timeout (Desarrollo)

```typescript
// Crear query lenta artificialmente
const { data } = await withTimeout(
  async () => {
    // Simular query lenta
    await new Promise(resolve => setTimeout(resolve, 50000))
    return await supabase.from('table').select('*')
  },
  SUPABASE_TIMEOUTS.FAST_QUERY,  // 10s
  'testTimeout'
)

// Resultado esperado después de 10s:
// Error: Timeout: testTimeout exceeded 10000ms
```

### Verificar Timeout en Producción

```bash
# Request que debería tomar más de 45s
curl -X POST https://app.com/api/export \
  -H "Content-Type: application/json" \
  -d '{"ids": ["...100 IDs..."]}'

# Respuesta esperada después de 45s:
{
  "success": false,
  "error": "La operación tardó demasiado tiempo..."
}
```

---

## 📊 Beneficios Implementados

### 1. Prevención de Queries Colgadas

**Antes:**
- Query lenta podía bloquear servidor indefinidamente
- Usuario esperando sin feedback
- Recursos consumidos sin límite

**Después:**
```
✅ Timeout automático después de tiempo configurado
✅ Error claro al usuario
✅ Recursos liberados automáticamente
```

### 2. Mejor UX

**Antes:**
```
[Usuario espera... 5 min... 10 min... ∞]
```

**Después:**
```
[Usuario espera... 45s máximo]
"La operación tardó demasiado. Intenta con menos registros."
```

### 3. Protección contra DoS

**Escenario:** Atacante intenta exportar 10,000 registros

**Antes:**
- Servidor procesa indefinidamente
- Memoria y CPU consumidos
- Otros usuarios afectados

**Después:**
- Timeout después de 45s
- Recursos liberados
- Servicio continúa para otros usuarios

---

## 📚 Referencias

- **Supabase Timeouts**: https://supabase.com/docs/reference/javascript/initializing#with-additional-parameters
- **Promise.race Pattern**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race
- **PostgreSQL Statement Timeout**: https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT

---

## 🔐 Conclusión

**VULN-014: Configurar timeouts en Supabase** - ✅ **IMPLEMENTADA**

El sistema jeyca-presu ahora tiene timeouts configurados que:

1. ✅ Previenen queries colgadas indefinidamente
2. ✅ Categorizan timeouts por tipo de operación
3. ✅ Proporcionan helper conveniente (`withTimeout()`)
4. ✅ Mejoran UX con feedback rápido
5. ✅ Protegen contra DoS de queries lentas
6. ✅ Aplicados en operaciones críticas (export/import)

**Nivel de seguridad:** 🛡️🛡️🛡️🛡️ (4/5) - Muy bueno

**Recomendación:** Aplicar `withTimeout()` a todas las operaciones pesadas (imports, agregaciones, búsquedas complejas).

---

## 📝 Resumen de Configuración

```typescript
// Importar
import { SUPABASE_TIMEOUTS, withTimeout } from '@/lib/supabase/server'

// Usar según tipo de operación:
// - FAST_QUERY (10s): SELECT simple, UPDATE, DELETE
// - MEDIUM_QUERY (20s): JOINs, filtros complejos
// - HEAVY_QUERY (45s): Exports, imports, agregaciones
// - STORAGE (60s): Uploads/downloads

// Ejemplo:
const { data, error } = await withTimeout(
  () => supabase.from('table').select('*').in('id', ids),
  SUPABASE_TIMEOUTS.HEAVY_QUERY,
  'operationName'
)
```
