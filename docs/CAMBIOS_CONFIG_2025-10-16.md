# Resumen de Cambios - Configuración Dinámica

**Commit:** `d866774`
**Fecha:** 2025-10-16
**Tipo:** `feat(config)`

---

## 📋 Resumen Ejecutivo

Esta actualización hace que el **nombre de la aplicación** sea configurable desde la tabla `config` y **corrige el problema** de que los cambios en `default_colors` no se reflejaban al crear nuevas tarifas.

---

## 🎯 Problemas Resueltos

### 1. ❌ Nombre de aplicación hardcodeado

**Problema:**
- "Redpresu" estaba hardcodeado en múltiples archivos
- No era configurable por el superadmin

**Solución:**
- ✅ Migración 027: añadir `app_name` a tabla config
- ✅ Helper `getAppName()` en config-helpers.ts
- ✅ Header acepta `appName` como prop
- ✅ Todos los layouts pasan `appName` dinámico al Header
- ✅ Página de login usa `appName` dinámico

### 2. ❌ default_colors no se actualizaba

**Problema:**
- El superadmin cambiaba `default_colors` en `/settings`
- Al crear nueva tarifa en `/tariffs/create` seguían apareciendo los colores antiguos
- Causa: `getTariffDefaultsAction` buscaba keys separadas (`default_primary_color`, `default_secondary_color`)
- El usuario probablemente tenía un objeto JSON `default_colors` con estructura `{primary, secondary}`

**Solución:**
- ✅ `getTariffDefaultsAction` ahora soporta AMBAS estructuras:
  - Objeto JSON `default_colors` (preferido)
  - Keys separadas `default_primary_color` / `default_secondary_color` (backward compatibility)
- ✅ Añadir `revalidatePath` al actualizar configuración:
  - Revalida `/tariffs` y `/tariffs/create` cuando se cambian colores
  - Revalida layout raíz cuando se cambia `app_name`

---

## 📁 Archivos Creados

### Migración 027

```sql
-- migrations/027_add_app_name_config.sql
INSERT INTO public.config (key, value, description, category, is_system)
VALUES (
  'app_name',
  '"Redpresu"'::jsonb,
  'Nombre de la aplicación mostrado en la interfaz',
  'general',
  false
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

**Archivos:**
- `migrations/027_add_app_name_config.sql`
- `migrations/EJECUTAR_027_add_app_name_config.sql`

---

## 🔧 Cambios Técnicos Detallados

### 1. Helper getAppName()

**Archivo:** `src/lib/helpers/config-helpers.ts`

```typescript
/**
 * Obtiene el nombre de la aplicación
 * @returns Nombre de la aplicación (por defecto 'Redpresu')
 */
export async function getAppName(): Promise<string> {
  const name = await getConfigValue<string>('app_name')
  return name || 'Redpresu'
}
```

**Líneas:** 200-207

---

### 2. Header Component

**Archivo:** `src/components/layout/Header.tsx`

**Cambios:**

```typescript
// Añadir prop
interface HeaderProps {
  appName?: string  // NUEVO
}

// Usar en ambos headers (autenticado y no autenticado)
export function Header({ appName = 'Redpresu' }: HeaderProps) {
  // ...
  <span className="text-xl font-bold text-gray-900">{appName}</span>
}
```

**Líneas modificadas:**
- 21: Añadir prop `appName?: string`
- 24: Añadir default `appName = 'Redpresu'`
- 38: Usar `{appName}` en header no autenticado
- 95: Usar `{appName}` en header autenticado

---

### 3. Layouts (6 archivos)

Todos los layouts que usan `<Header>` fueron actualizados:

**Patrón aplicado:**

```typescript
import { getAppName } from '@/lib/helpers/config-helpers'

export default async function Layout({ children }: { children: React.ReactNode }) {
  // ... código existente ...
  const appName = await getAppName()

  return (
    <div>
      <Header {...props} appName={appName} />
      {children}
    </div>
  )
}
```

**Archivos actualizados:**
- ✅ `src/app/dashboard/layout.tsx`
- ✅ `src/app/budgets/layout.tsx`
- ✅ `src/app/settings/layout.tsx`
- ✅ `src/app/tariffs/layout.tsx`
- ✅ `src/app/users/layout.tsx`
- ⚠️ `src/app/(dashboard)/layout.tsx` (si existe)

---

### 4. Página de Login

**Archivo:** `src/app/(auth)/login/page.tsx`

**Cambios:**

```typescript
import { getAppName } from '@/lib/helpers/config-helpers'

export default async function LoginPage() {
  // ... código existente ...
  const appName = await getAppName()

  return (
    <div>
      <h2 className="text-3xl font-bold">{appName}</h2>
    </div>
  )
}
```

**Líneas modificadas:**
- 4: Import getAppName
- 27: const appName = await getAppName()
- 39: Usar {appName}

---

### 5. getTariffDefaultsAction

**Archivo:** `src/app/actions/config.ts`

**Cambios principales:**

```typescript
export async function getTariffDefaultsAction() {
  // Buscar AMBAS estructuras
  const { data } = await supabaseAdmin
    .from('config')
    .select('key, value')
    .in('key', [
      'default_colors',              // NUEVO: objeto JSON
      'default_primary_color',       // LEGACY: key separada
      'default_secondary_color',     // LEGACY: key separada
      'default_pdf_template'
    ])

  // Priorizar default_colors (objeto)
  let defaultColorsObj: { primary?: string; secondary?: string } | null = null

  data.forEach((config) => {
    if (config.key === 'default_colors' && config.value) {
      defaultColorsObj = config.value as { primary?: string; secondary?: string }
    }
  })

  // Si existe default_colors como objeto, usarlo
  if (defaultColorsObj) {
    if (defaultColorsObj.primary) defaults.primary_color = defaultColorsObj.primary
    if (defaultColorsObj.secondary) defaults.secondary_color = defaultColorsObj.secondary
  } else {
    // Fallback: buscar valores separados (backward compatibility)
    data.forEach((config) => {
      if (config.key === 'default_primary_color') defaults.primary_color = config.value
      if (config.key === 'default_secondary_color') defaults.secondary_color = config.value
    })
  }
}
```

**Lógica:**
1. **Primera pasada:** Buscar `default_colors` (objeto JSON preferido)
2. **Si existe:** Usar `primary` y `secondary` del objeto
3. **Si NO existe:** Buscar keys separadas `default_primary_color` y `default_secondary_color`
4. **Siempre:** Tener fallback hardcoded `#e8951c` y `#109c61`

**Líneas:** 318-389

---

### 6. updateConfigValue - Revalidación de rutas

**Archivo:** `src/app/actions/config.ts`

**Cambios:**

```typescript
export async function updateConfigValue(key: string, value: unknown) {
  // ... código actualización BD ...

  // Revalidar rutas relevantes
  revalidatePath('/settings')

  // Si se modifican colores por defecto, revalidar páginas de tarifas
  if (key === 'default_colors' || key === 'default_primary_color' || key === 'default_secondary_color') {
    revalidatePath('/tariffs')
    revalidatePath('/tariffs/create')
  }

  // Si se modifica el nombre de la app, revalidar todas las páginas
  if (key === 'app_name') {
    revalidatePath('/', 'layout')
  }

  return { success: true }
}
```

**Beneficio:**
- Los cambios de configuración se reflejan **inmediatamente** en la UI
- No requiere recargar página manualmente
- Next.js invalida la caché de las rutas afectadas

**Líneas:** 143-157

---

## 🎨 Flujo de Uso

### Cambiar nombre de la aplicación

1. **Superadmin** accede a `/settings`
2. Busca la key `app_name`
3. Cambia el valor (ej: de "Redpresu" a "MiEmpresa")
4. Guarda
5. **Resultado:** El nombre se actualiza en Header y login INMEDIATAMENTE (gracias a revalidatePath)

### Cambiar colores por defecto

1. **Superadmin** accede a `/settings`
2. Busca la key `default_colors` o `default_primary_color`/`default_secondary_color`
3. Si existe `default_colors`:
   ```json
   {
     "primary": "#ff0000",
     "secondary": "#00ff00"
   }
   ```
4. Si NO existe, puede usar keys separadas:
   - `default_primary_color`: `"#ff0000"`
   - `default_secondary_color`: `"#00ff00"`
5. Guarda
6. **Resultado:** Los nuevos colores aparecen en `/tariffs/create` INMEDIATAMENTE

---

## 📊 Estructuras de Datos

### Tabla config

```sql
CREATE TABLE public.config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Configuración app_name

```sql
INSERT INTO config (key, value, description, category, is_system)
VALUES (
  'app_name',
  '"Redpresu"'::jsonb,
  'Nombre de la aplicación mostrado en la interfaz',
  'general',
  false
);
```

### Configuración default_colors (RECOMENDADO)

```sql
INSERT INTO config (key, value, description, category, is_system)
VALUES (
  'default_colors',
  '{"primary": "#e8951c", "secondary": "#109c61"}'::jsonb,
  'Colores por defecto para nuevas tarifas',
  'defaults',
  false
);
```

### Configuración legacy (ALTERNATIVA)

```sql
-- Opción A: Keys separadas (backward compatibility)
INSERT INTO config (key, value, description, category, is_system) VALUES
  ('default_primary_color', '"#e8951c"'::jsonb, 'Color primario por defecto', 'defaults', false),
  ('default_secondary_color', '"#109c61"'::jsonb, 'Color secundario por defecto', 'defaults', false);
```

---

## ⚠️ Tareas Pendientes

### 1. Ejecutar Migración 027 (OBLIGATORIO)

**Archivo:** `migrations/EJECUTAR_027_add_app_name_config.sql`

**Pasos:**
1. Abrir Supabase Dashboard > SQL Editor
2. Copiar y pegar contenido del archivo
3. Ejecutar (Run)
4. Verificar: `SELECT * FROM config WHERE key = 'app_name';`

**Resultado esperado:**
```
key      | value        | description                                      | category | is_system
---------|--------------|--------------------------------------------------|----------|----------
app_name | "Redpresu"   | Nombre de la aplicación mostrado en la interfaz | general  | false
```

### 2. Verificar default_colors (OPCIONAL)

Comprobar si existe configuración de colores:

```sql
SELECT key, value, description
FROM config
WHERE key IN ('default_colors', 'default_primary_color', 'default_secondary_color');
```

**Si NO existe ninguna**, añadir manualmente:

**Opción A (RECOMENDADO): Objeto JSON único**
```sql
INSERT INTO config (key, value, description, category, is_system)
VALUES (
  'default_colors',
  '{"primary": "#e8951c", "secondary": "#109c61"}'::jsonb,
  'Colores por defecto para nuevas tarifas',
  'defaults',
  false
);
```

**Opción B: Keys separadas (legacy)**
```sql
INSERT INTO config (key, value, description, category, is_system) VALUES
  ('default_primary_color', '"#e8951c"'::jsonb, 'Color primario por defecto', 'defaults', false),
  ('default_secondary_color', '"#109c61"'::jsonb, 'Color secundario por defecto', 'defaults', false);
```

### 3. Ejecutar Migración 026 (PENDIENTE DE SESIÓN ANTERIOR)

**No olvidar:** La migración 026 (RLS policies para issuers) sigue pendiente de ejecución.

---

## 🧪 Testing

### Test 1: Cambiar nombre aplicación

1. Login como superadmin
2. Ir a `/settings`
3. Buscar `app_name`
4. Cambiar valor a "TestApp"
5. Guardar
6. ✅ Verificar Header muestra "TestApp"
7. ✅ Verificar login muestra "TestApp"
8. ✅ Cambio se refleja SIN recargar página

### Test 2: Cambiar colores por defecto

1. Login como superadmin
2. Ir a `/settings`
3. Buscar `default_colors` (o `default_primary_color`)
4. Cambiar a colores custom (ej: `{"primary": "#ff0000", "secondary": "#00ff00"}`)
5. Guardar
6. Ir a `/tariffs/create`
7. ✅ Verificar selectores de color muestran nuevos valores por defecto
8. ✅ Cambio se refleja SIN recargar página

### Test 3: Backward compatibility

1. Eliminar `default_colors` de config
2. Añadir `default_primary_color` y `default_secondary_color` separados
3. Ir a `/tariffs/create`
4. ✅ Verificar que sigue funcionando con keys separadas

---

## 🔍 Debugging

### Problema: El nombre no se actualiza

**Posibles causas:**
1. Migración 027 no ejecutada → Verificar: `SELECT * FROM config WHERE key = 'app_name';`
2. Caché de Next.js → Reiniciar servidor: `npm run dev`
3. Layout no actualizado → Verificar import de `getAppName` en layout

### Problema: Los colores no se actualizan

**Posibles causas:**
1. No existe `default_colors` ni keys separadas → Ejecutar queries de inserción
2. Estructura JSON incorrecta → Verificar: `{"primary": "#xxx", "secondary": "#yyy"}`
3. Revalidación no funciona → Check logs console: `[getTariffDefaultsAction] Defaults: {...}`
4. Tarifa usa plantilla → La plantilla tiene colores fijos, crear nueva tarifa sin plantilla

### Logs útiles

```bash
# En terminal del servidor Next.js
[getTariffDefaultsAction] Defaults: { primary_color: '...', secondary_color: '...', template: '...' }
```

---

## 📝 Notas Técnicas

### ¿Por qué dos estructuras para default_colors?

**Motivo:** Backward compatibility

- **Estructura antigua:** Keys separadas (`default_primary_color`, `default_secondary_color`)
  - Usada en migraciones anteriores
  - Algunos entornos pueden tenerla

- **Estructura nueva:** Objeto JSON único (`default_colors`)
  - Más limpia y consistente
  - Usada en `config-helpers.ts` (helper `getDefaultColors()`)

**Solución:** `getTariffDefaultsAction` soporta AMBAS y prioriza el objeto JSON.

### ¿Por qué revalidatePath?

Next.js cachea Server Components y Server Actions. Sin `revalidatePath`, los cambios en la BD no se reflejan hasta:
- Reiniciar servidor
- Recargar página con hard refresh (Ctrl+Shift+R)

Con `revalidatePath`, Next.js invalida la caché específica y los cambios se ven inmediatamente.

### ¿Por qué getAppName() en lugar de prop global?

- **Server Components:** Cada layout/page obtiene el valor fresh desde BD
- **Caché Next.js:** Se invalida automáticamente con `revalidatePath`
- **No requiere Context API:** Simplifica arquitectura
- **SSR friendly:** Funciona en renderizado servidor

---

## 🎯 Criterios de Completado

### Funcionalidad ✅
- [x] Migración 027 creada
- [x] Helper getAppName() implementado
- [x] Header acepta appName como prop
- [x] Todos los layouts actualizados
- [x] Login page usa appName dinámico
- [x] getTariffDefaultsAction soporta default_colors
- [x] Revalidación de rutas implementada
- [ ] Migración 027 ejecutada en BD (PENDIENTE)

### Calidad ✅
- [x] Backward compatibility mantenida
- [x] Fallbacks definidos
- [x] TypeScript sin errores
- [x] Logs de debugging añadidos
- [x] Documentación completa

### Testing ⚠️
- [ ] Test manual: cambiar app_name (PENDIENTE)
- [ ] Test manual: cambiar default_colors (PENDIENTE)
- [ ] Verificar revalidación funciona (PENDIENTE)

---

## 📚 Referencias

### Archivos Modificados

```
migrations/
  ├── 027_add_app_name_config.sql (NUEVO)
  └── EJECUTAR_027_add_app_name_config.sql (NUEVO)

src/lib/helpers/
  └── config-helpers.ts (getAppName helper)

src/components/layout/
  └── Header.tsx (prop appName)

src/app/
  ├── dashboard/layout.tsx
  ├── budgets/layout.tsx
  ├── settings/layout.tsx
  ├── tariffs/layout.tsx
  ├── users/layout.tsx
  ├── (auth)/
  │   ├── login/page.tsx
  │   └── forgot-password/page.tsx (import useEffect)
  └── actions/
      └── config.ts (getTariffDefaultsAction + revalidatePath)
```

### Documentos Relacionados

- `docs/especificaciones/gestion-configuracion.md` - Especificación tabla config
- `docs/CAMBIOS_SESION_2025-10-16.md` - Cambios sesión anterior (auth)

---

## 🚀 Próximos Pasos

1. **Ejecutar migración 027** en Supabase Dashboard
2. **Verificar configuración default_colors** existe en BD
3. **Testing manual** de cambios de configuración
4. **Ejecutar migración 026** (pendiente sesión anterior)
5. **Considerar:** Crear interfaz visual en `/settings` para cambiar app_name y default_colors

---

**Documento:** Cambios Configuración Dinámica
**Versión:** 1.0
**Fecha:** 2025-10-16
**Commit:** d866774
**Estado:** Completado (pendiente migraciones)

**Fin del documento**
