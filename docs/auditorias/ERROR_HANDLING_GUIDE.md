# 📘 Guía de Manejo de Errores - jeyca-presu

**Fecha:** 2025-01-20
**Vulnerabilidad:** VULN-013 - Ocultar stack traces en producción
**Estado:** ✅ IMPLEMENTADA

---

## 📋 Resumen

Sistema de sanitización de errores que previene la exposición de información sensible en producción mientras mantiene logs detallados para debugging en servidor.

**Ubicación:** `/src/lib/helpers/error-helpers.ts`

---

## 🎯 Objetivos

1. **Producción**: Mensajes genéricos sin detalles internos
2. **Desarrollo**: Mensajes completos con stack trace para debugging
3. **Servidor**: Logs detallados siempre (ambos entornos)
4. **Categorización**: Errores clasificados por tipo

---

## 🛠️ Funciones Disponibles

### 1. `sanitizeError(error, options)`

Función principal para sanitizar errores.

**Parámetros:**
```typescript
interface SanitizeErrorOptions {
  context?: string              // Nombre de la función (ej: 'saveBudget')
  category?: ErrorCategory      // Tipo de error
  metadata?: Record<string, unknown>  // Datos adicionales (solo para logs)
  forceGeneric?: boolean        // Forzar mensaje genérico incluso en dev
}
```

**Categorías disponibles:**
- `authentication` - Errores de login/sesión
- `authorization` - Sin permisos
- `validation` - Datos inválidos
- `notFound` - Recurso no existe
- `database` - Errores de BD
- `network` - Problemas de conexión/API
- `timeout` - Operación tardó demasiado
- `rateLimit` - Demasiadas requests
- `unknown` - Error general

**Ejemplo básico:**
```typescript
import { sanitizeError } from '@/lib/helpers/error-helpers'

export async function saveBudget(budgetId: string, data: any) {
  try {
    const result = await supabase.from('budgets').update(data).eq('id', budgetId)
    if (result.error) throw result.error
    return { success: true }
  } catch (error) {
    // SECURITY (VULN-013): Sanitizar error para producción
    const sanitized = sanitizeError(error, {
      context: 'saveBudget',
      category: 'database',
      metadata: { budgetId }  // Solo para logs servidor
    })
    return { success: false, error: sanitized.userMessage }
  }
}
```

**Resultado en producción:**
```json
{
  "success": false,
  "error": "Error al procesar la solicitud. Inténtalo de nuevo más tarde."
}
```

**Resultado en desarrollo:**
```json
{
  "success": false,
  "error": "duplicate key value violates unique constraint \"budgets_pkey\""
}
```

**Logs en servidor (ambos entornos):**
```json
{
  "level": "error",
  "context": "saveBudget",
  "category": "database",
  "metadata": { "budgetId": "123" },
  "error": {
    "name": "PostgresError",
    "message": "duplicate key value violates unique constraint \"budgets_pkey\"",
    "stack": "Error: ...\n    at processTicksAndRejections..."
  }
}
```

---

### 2. `categorizeError(error)`

Determina automáticamente la categoría del error.

**Ejemplo:**
```typescript
import { categorizeError } from '@/lib/helpers/error-helpers'

const error = new Error('Invalid login credentials')
const category = categorizeError(error)  // Retorna: 'authentication'
```

---

### 3. `sanitizeErrorAuto(error, context, metadata?)`

Sanitiza con categorización automática.

**Ejemplo:**
```typescript
import { sanitizeErrorAuto } from '@/lib/helpers/error-helpers'

export async function deleteUser(userId: string) {
  try {
    await supabase.from('users').delete().eq('id', userId)
    return { success: true }
  } catch (error) {
    const sanitized = sanitizeErrorAuto(error, 'deleteUser', { userId })
    return { success: false, error: sanitized.userMessage }
  }
}
```

---

### 4. `tryCatch(fn, context, metadata?)`

Wrapper para evitar bloques try-catch manuales.

**Ejemplo:**
```typescript
import { tryCatch } from '@/lib/helpers/error-helpers'

export async function createBudget(data: BudgetData) {
  const result = await tryCatch(
    async () => {
      const { data: budget } = await supabase
        .from('budgets')
        .insert(data)
        .select()
        .single()

      return budget
    },
    'createBudget',
    { clientName: data.client_name }
  )

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data }
}
```

---

## 📊 Mensajes de Error por Categoría

| Categoría | Mensaje en Producción |
|-----------|----------------------|
| `authentication` | Error de autenticación. Por favor, inicia sesión nuevamente. |
| `authorization` | No tienes permisos para realizar esta acción. |
| `validation` | Los datos proporcionados no son válidos. |
| `notFound` | El recurso solicitado no existe. |
| `database` | Error al procesar la solicitud. Inténtalo de nuevo más tarde. |
| `network` | Error de conexión. Verifica tu conexión a internet. |
| `timeout` | La operación tardó demasiado tiempo. Inténtalo de nuevo. |
| `rateLimit` | Demasiadas solicitudes. Por favor, espera un momento. |
| `unknown` | Ocurrió un error inesperado. Inténtalo de nuevo más tarde. |

---

## 🎯 Patrones de Uso Recomendados

### ✅ Patrón 1: Server Action con validación explícita

```typescript
'use server'
import { sanitizeError } from '@/lib/helpers/error-helpers'

export async function updateBudget(id: string, data: any) {
  try {
    // Validación
    if (!id) {
      return { success: false, error: 'ID requerido' }
    }

    // Operación
    const result = await supabase.from('budgets').update(data).eq('id', id)
    if (result.error) throw result.error

    return { success: true, data: result.data }
  } catch (error) {
    const sanitized = sanitizeError(error, {
      context: 'updateBudget',
      category: 'database',
      metadata: { id }
    })
    return { success: false, error: sanitized.userMessage }
  }
}
```

### ✅ Patrón 2: Categorización automática

```typescript
'use server'
import { sanitizeErrorAuto } from '@/lib/helpers/error-helpers'

export async function generatePDF(budgetId: string) {
  try {
    const response = await fetch(`${API_URL}/generate-pdf`, {
      method: 'POST',
      body: JSON.stringify({ budgetId })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    return { success: true, url: response.url }
  } catch (error) {
    // Auto-detecta 'network' por el mensaje de error
    const sanitized = sanitizeErrorAuto(error, 'generatePDF', { budgetId })
    return { success: false, error: sanitized.userMessage }
  }
}
```

### ✅ Patrón 3: Wrapper tryCatch

```typescript
'use server'
import { tryCatch } from '@/lib/helpers/error-helpers'

export async function importTariffs(file: File) {
  return await tryCatch(
    async () => {
      const content = await file.text()
      const tariffs = JSON.parse(content)

      const { data } = await supabase
        .from('tariffs')
        .insert(tariffs)
        .select()

      return { count: data.length }
    },
    'importTariffs',
    { fileName: file.name }
  )
}
```

---

## ❌ Anti-patrones (NO hacer)

### ❌ Exponer error.message en producción

```typescript
// MAL - Expone detalles internos
catch (error) {
  return {
    success: false,
    error: error.message  // ⚠️ Puede exponer SQL, paths, etc.
  }
}
```

### ❌ Logs sin contexto

```typescript
// MAL - Log sin contexto útil
catch (error) {
  console.error(error)  // ⚠️ Difícil de rastrear
}
```

### ❌ Categoría incorrecta

```typescript
// MAL - Categoría incorrecta confunde al usuario
catch (error) {
  const sanitized = sanitizeError(error, {
    context: 'saveBudget',
    category: 'authentication'  // ⚠️ Es un error de BD, no de auth
  })
}
```

---

## 🔍 Detección de NODE_ENV

El helper detecta automáticamente el entorno:

```typescript
// En desarrollo: npm run dev
process.env.NODE_ENV === 'development'  // true

// En producción: npm run build && npm start
process.env.NODE_ENV === 'production'   // true
```

**Cambiar comportamiento en desarrollo:**

```typescript
// Forzar mensaje genérico incluso en desarrollo
const sanitized = sanitizeError(error, {
  context: 'testFunction',
  category: 'database',
  forceGeneric: true  // ← Simula comportamiento producción
})
```

---

## 📝 Archivos Modificados (Ejemplos)

### `/src/app/actions/budgets.ts`

```typescript
// Línea 4: Import del helper
import { sanitizeError } from '@/lib/helpers/error-helpers'

// Línea 664-670: Uso en saveBudget
} catch (error) {
  const sanitized = sanitizeError(error, {
    context: 'saveBudget',
    category: 'database',
    metadata: { budgetId }
  })
  return { success: false, error: sanitized.userMessage }
}

// Línea 1551-1557: Uso en deleteBudget
} catch (error) {
  const sanitized = sanitizeError(error, {
    context: 'deleteBudget',
    category: 'database',
    metadata: { budgetId }
  })
  return { success: false, error: sanitized.userMessage }
}
```

### `/src/app/actions/auth.ts`

```typescript
// Línea 3: Import del helper
import { sanitizeError } from '@/lib/helpers/error-helpers'

// Línea 78-88: Uso en signInAction
} catch (error) {
  if (error && typeof error === 'object' && 'digest' in error) {
    throw error  // Next.js redirect
  }

  const sanitized = sanitizeError(error, {
    context: 'signInAction',
    category: 'authentication',
    metadata: { email }
  })

  return { success: false, error: sanitized.userMessage }
}
```

---

## 🧪 Testing

### Modo Desarrollo

```bash
# Terminal 1: Iniciar servidor en desarrollo
npm run dev

# Terminal 2: Ejecutar acción que falle
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Respuesta esperada (mensaje completo):
{
  "success": false,
  "error": "null value in column \"user_id\" violates not-null constraint"
}
```

### Modo Producción

```bash
# Terminal 1: Build y start en producción
npm run build
npm start

# Terminal 2: Misma request
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Respuesta esperada (mensaje genérico):
{
  "success": false,
  "error": "Error al procesar la solicitud. Inténtalo de nuevo más tarde."
}

# Logs servidor (ambos entornos tienen el stack trace completo)
[error] [saveBudget] Error capturado
  context: "saveBudget"
  error: {
    name: "PostgrestError",
    message: "null value in column \"user_id\" violates not-null constraint",
    stack: "Error: ..."
  }
```

---

## 📊 Resumen de Implementación

### Archivos Creados

1. **`/src/lib/helpers/error-helpers.ts`** - Helper principal (250+ líneas)
2. **`/docs/auditorias/ERROR_HANDLING_GUIDE.md`** - Esta guía

### Server Actions Modificados

1. **`/src/app/actions/budgets.ts`** - 3 funciones sanitizadas
   - `saveBudget()` - línea 664
   - `deleteBudget()` - línea 1551
   - `generateBudgetPDF()` - línea 1346

2. **`/src/app/actions/auth.ts`** - 1 función sanitizada
   - `signInAction()` - línea 78

### Funciones Disponibles

- ✅ `sanitizeError()` - Sanitización completa
- ✅ `categorizeError()` - Categorización automática
- ✅ `sanitizeErrorAuto()` - Sanitización + categorización
- ✅ `tryCatch()` - Wrapper conveniente
- ✅ `getErrorMessage()` - Extracción segura de mensaje
- ✅ `isDevelopment()` - Detección de entorno

---

## 🎯 Próximos Pasos

### Aplicar a todos los Server Actions

**Pendientes de sanitizar (opcional):**

1. `/src/app/actions/tariffs.ts`
2. `/src/app/actions/users.ts`
3. `/src/app/actions/config.ts`
4. `/src/app/actions/export.ts`
5. `/src/app/actions/import.ts`
6. `/src/app/actions/budget-versions.ts`
7. `/src/app/actions/budget-notes.ts`
8. `/src/app/actions/subscriptions.ts`

**Patrón a seguir:**

```typescript
// Antes:
} catch (error) {
  log.error('[functionName] Error:', error)
  return { success: false, error: 'Error genérico' }
}

// Después:
} catch (error) {
  const sanitized = sanitizeError(error, {
    context: 'functionName',
    category: 'database',  // o la categoría apropiada
    metadata: { relevantId }
  })
  return { success: false, error: sanitized.userMessage }
}
```

---

## 📚 Referencias

- **OWASP - Error Handling**: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- **Node.js Error Handling Best Practices**: https://nodejs.org/en/docs/guides/error-handling
- **Next.js Environment Variables**: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

---

## 🔐 Conclusión

**VULN-013: Ocultar stack traces en producción** - ✅ **IMPLEMENTADA**

El sistema jeyca-presu ahora tiene un manejo robusto de errores que:

1. ✅ Oculta detalles internos en producción
2. ✅ Muestra errores completos en desarrollo (útil para debugging)
3. ✅ Mantiene logs detallados en servidor siempre
4. ✅ Categoriza errores automáticamente
5. ✅ Proporciona mensajes user-friendly

**Nivel de seguridad:** 🛡️🛡️🛡️🛡️ (4/5) - Muy bueno

**Recomendación:** Aplicar `sanitizeError()` a todos los Server Actions restantes cuando sea posible.
