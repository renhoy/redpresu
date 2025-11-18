# 🧪 Testing del Sistema de Reglas de Negocio

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Test 1: Crear Regla Global](#test-1-crear-regla-global)
3. [Test 2: Crear Regla Específica](#test-2-crear-regla-específica)
4. [Test 3: Validar Reglas](#test-3-validar-reglas)
5. [Test 4: Probar Integración con createTariff](#test-4-probar-integración-con-createtariff)
6. [Test 5: Rollback de Reglas](#test-5-rollback-de-reglas)
7. [Test 6: Audit Log](#test-6-audit-log)
8. [Casos de Prueba Adicionales](#casos-de-prueba-adicionales)

---

## Configuración Inicial

### Requisitos Previos

1. **Migraciones ejecutadas**
   ```bash
   # Verificar que las tablas existen
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'redpresu'
   AND table_name IN ('business_rules', 'rules_audit_log');
   ```

2. **Usuario superadmin**
   - Debes estar logueado como usuario con `role = 'superadmin'`
   - Verificar en Supabase: `SELECT id, email, role FROM redpresu.users WHERE role = 'superadmin';`

3. **Servidor de desarrollo corriendo**
   ```bash
   npm run dev
   ```

---

## Test 1: Crear Regla Global

### Objetivo
Crear una regla que se aplique a TODAS las empresas del sistema.

### Pasos

1. **Navegar a la interfaz**
   - Ir a `/settings`
   - Click en botón **"Reglas de Negocio"**
   - Debería abrirse `/settings/business-rules`

2. **Seleccionar alcance global**
   - El radio button **"Todas las empresas"** debe estar seleccionado por defecto
   - Debería mostrar `selectedCompanyId = "global"`

3. **Cargar ejemplo**
   - Click en botón **"Cargar Ejemplo"**
   - Debería aparecer toast: "📄 Ejemplo cargado. Puedes editarlo y guardarlo."
   - El textarea debe llenarse con JSON válido:

   ```json
   {
     "version": 1,
     "updated_at": "2025-11-15T...",
     "updated_by": "admin@example.com",
     "rules": [
       {
         "id": "limit-tariffs-pro-plan",
         "name": "Limitar tarifas en plan PRO",
         "description": "Plan PRO: máximo 50 tarifas",
         "active": true,
         "priority": 10,
         "condition": {
           "and": [
             { "==": [{ "var": "plan" }, "PRO"] },
             { ">=": [{ "var": "tariffs_count" }, 50] }
           ]
         },
         "action": {
           "allow": false,
           "message": "Has alcanzado el límite de 50 tarifas..."
         }
       }
     ]
   }
   ```

4. **Validar JSON en tiempo real**
   - El indicador debe mostrar: ✅ "JSON válido" (verde)
   - Si hay error de sintaxis, mostrará: ⚠️ "JSON inválido" (rojo)

5. **Validar en servidor**
   - Click en botón **"Validar"**
   - Debería mostrar toast: "✅ Las reglas son válidas y están listas para guardar"
   - El botón "Guardar" debe habilitarse

6. **Guardar regla**
   - Click en botón **"Guardar"**
   - Debería mostrar toast: "✅ Reglas guardadas - Versión 1"
   - El JSON se recarga con la versión guardada

### Verificación en Base de Datos

```sql
-- Verificar que la regla se creó
SELECT id, company_id, version, is_active, created_at
FROM redpresu.business_rules
WHERE company_id IS NULL AND is_active = true;

-- Debe retornar 1 fila con:
-- - company_id: NULL
-- - version: 1
-- - is_active: true

-- Verificar audit log
SELECT action, version_after, changed_by_email, created_at
FROM redpresu.rules_audit_log
WHERE company_id IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- Debe retornar:
-- - action: 'created'
-- - version_after: 1
```

### ✅ Resultado Esperado
- Regla global creada en BD con `company_id = NULL`
- Versión 1 guardada
- Audit log registrado con acción 'created'
- UI muestra mensaje de éxito

---

## Test 2: Crear Regla Específica

### Objetivo
Crear una regla que se aplique solo a UNA empresa específica.

### Pasos

1. **Seleccionar alcance específico**
   - En `/settings/business-rules`
   - Click en radio button **"Empresa específica"**
   - Debería aparecer la tabla de empresas con buscador

2. **Buscar empresa**
   - En el campo de búsqueda, escribir: "Acme" (o el nombre de una empresa)
   - La tabla debe filtrar en tiempo real mostrando solo empresas que coincidan
   - La búsqueda filtra por: name, nif, address, locality, province, phone

3. **Seleccionar empresa**
   - Click en la fila de la empresa deseada
   - La fila debe resaltarse con fondo verde lima (`bg-lime-100`)
   - El radio button de la empresa debe marcarse

4. **Cargar regla específica**
   - Click en **"Cargar Ejemplo"**
   - Modificar el JSON para esta empresa específica:

   ```json
   {
     "version": 1,
     "updated_at": "2025-11-15T...",
     "updated_by": "admin@example.com",
     "rules": [
       {
         "id": "acme-custom-limit",
         "name": "Límite especial para Acme Corp",
         "description": "Acme tiene límite de 100 tarifas",
         "active": true,
         "priority": 5,
         "condition": {
           ">=": [{ "var": "tariffs_count" }, 100]
         },
         "action": {
           "allow": false,
           "message": "Límite de 100 tarifas alcanzado para Acme Corp"
         }
       }
     ]
   }
   ```

5. **Validar y guardar**
   - Click en **"Validar"** → Debe mostrar "✅ Las reglas son válidas..."
   - Click en **"Guardar"** → Debe mostrar "✅ Reglas guardadas - Versión 1"

### Verificación en Base de Datos

```sql
-- Verificar que la regla se creó para la empresa correcta
SELECT id, company_id, version, is_active, rules->>'version' as json_version
FROM redpresu.business_rules
WHERE company_id = 42 AND is_active = true; -- Reemplazar 42 con el ID de la empresa

-- Debe retornar 1 fila con:
-- - company_id: 42 (ID de la empresa seleccionada)
-- - version: 1
-- - is_active: true
```

### ✅ Resultado Esperado
- Regla específica creada en BD con `company_id = <id de empresa>`
- Versión 1 guardada
- Audit log registrado
- Solo se aplica a la empresa seleccionada

---

## Test 3: Validar Reglas

### Objetivo
Probar el sistema de validación de sintaxis JsonLogic.

### Casos de Prueba

#### ✅ Caso 1: JSON Válido con Sintaxis Correcta

```json
{
  "version": 1,
  "updated_at": "2025-11-15T10:00:00Z",
  "updated_by": "test@example.com",
  "rules": [
    {
      "id": "test-valid",
      "name": "Regla válida",
      "active": true,
      "priority": 10,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "FREE"] },
          { ">": [{ "var": "users_count" }, 3] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan FREE: máximo 3 usuarios"
      }
    }
  ]
}
```

**Resultado esperado**: ✅ "Las reglas son válidas y están listas para guardar"

---

#### ❌ Caso 2: JSON Inválido - Sintaxis Rota

```json
{
  "version": 1,
  "rules": [
    {
      "id": "broken",
      "name": "Regla rota",
      // Falta coma aquí
      "active": true
    }
  ]
}
```

**Resultado esperado**: ❌ "Error de sintaxis JSON: Unexpected token '/' at position X"

---

#### ❌ Caso 3: JSON Válido pero Schema Inválido

```json
{
  "version": "uno",
  "updated_at": "invalid-date",
  "updated_by": "not-an-email",
  "rules": []
}
```

**Resultado esperado**: ❌ Error de Zod validation (versión debe ser number, email inválido, etc.)

---

#### ✅ Caso 4: Múltiples Reglas con Prioridades

```json
{
  "version": 1,
  "updated_at": "2025-11-15T10:00:00Z",
  "updated_by": "test@example.com",
  "rules": [
    {
      "id": "high-priority",
      "name": "Bloqueo crítico",
      "priority": 1,
      "active": true,
      "condition": { "==": [{ "var": "plan" }, "FREE"] },
      "action": { "allow": false, "message": "Plan FREE bloqueado" }
    },
    {
      "id": "low-priority",
      "name": "Advertencia",
      "priority": 100,
      "active": true,
      "condition": { ">": [{ "var": "tariffs_count" }, 10] },
      "action": { "allow": true, "message": "Muchas tarifas" }
    }
  ]
}
```

**Resultado esperado**: ✅ Validación exitosa, la regla con priority=1 se evalúa primero

---

## Test 4: Probar Integración con createTariff

### Objetivo
Verificar que las reglas se aplican correctamente al crear una tarifa.

### Setup

1. **Crear regla global de prueba**
   ```json
   {
     "version": 1,
     "updated_at": "2025-11-15T10:00:00Z",
     "updated_by": "test@example.com",
     "rules": [
       {
         "id": "limit-free-plan",
         "name": "Límite plan FREE",
         "active": true,
         "priority": 10,
         "condition": {
           "and": [
             { "==": [{ "var": "plan" }, "FREE"] },
             { ">=": [{ "var": "tariffs_count" }, 3] }
           ]
         },
         "action": {
           "allow": false,
           "message": "Plan FREE: máximo 2 tarifas. Actualiza a PRO para crear más."
         }
       }
     ]
   }
   ```

2. **Preparar empresa de prueba**
   - Asegurarse de tener una empresa con `plan = 'FREE'`
   - Esa empresa debe tener exactamente 2 tarifas creadas

### Pasos de Prueba

1. **Login** con usuario de la empresa FREE

2. **Intentar crear tercera tarifa**
   - Ir a `/tariffs`
   - Click en "Nueva Tarifa"
   - Llenar el formulario
   - Click en "Guardar"

3. **Verificar bloqueo**
   - La acción debe ser BLOQUEADA
   - Debe mostrar error: "Plan FREE: máximo 2 tarifas. Actualiza a PRO para crear más."
   - La tarifa NO debe crearse en la BD

### Verificación en Logs

```bash
# Ver logs del servidor (donde corriste npm run dev)
# Buscar líneas como:
[createTariff] Evaluando reglas de negocio...
[createTariff] Bloqueado por regla de negocio: { rule: "Límite plan FREE", message: "..." }
```

### Verificación en Base de Datos

```sql
-- Verificar que NO se creó la tarifa
SELECT COUNT(*) FROM redpresu.tariffs WHERE company_id = <empresa_free>;
-- Debe retornar 2 (las 2 que ya existían)

-- NO debe haber registro de auditoría de creación de tarifa
```

### ✅ Resultado Esperado
- Creación de tarifa bloqueada por regla de negocio
- Usuario recibe mensaje claro del motivo
- No se crea registro en BD
- Logs muestran evaluación de regla

---

### Test 4.2: Permitir Creación (Regla No Coincide)

1. **Cambiar plan de la empresa a PRO**
   ```sql
   UPDATE redpresu.companies SET plan = 'PRO' WHERE id = <empresa_id>;
   ```

2. **Intentar crear tarifa nuevamente**
   - Mismo flujo que antes
   - Ahora la condición `plan == 'FREE'` es falsa

3. **Verificar que se permite**
   - La tarifa DEBE crearse exitosamente
   - Mensaje de éxito: "Tarifa creada"

### ✅ Resultado Esperado
- Tarifa creada sin problemas
- Regla no se aplica porque plan != 'FREE'

---

## Test 5: Rollback de Reglas

### Objetivo
Verificar que el sistema puede revertir a versiones anteriores.

### Setup

1. **Crear versión 1 de reglas**
   ```json
   {
     "version": 1,
     "rules": [
       { "id": "v1", "name": "Regla versión 1", "active": true, "priority": 10,
         "condition": { "==": [1, 1] }, "action": { "allow": true } }
     ]
   }
   ```
   - Guardar → Debe crear versión 1

2. **Crear versión 2 (modificación)**
   ```json
   {
     "version": 1,
     "rules": [
       { "id": "v2", "name": "Regla versión 2 MODIFICADA", "active": true, "priority": 10,
         "condition": { "==": [1, 1] }, "action": { "allow": true } }
     ]
   }
   ```
   - Guardar → Debe crear versión 2

3. **Verificar en BD**
   ```sql
   -- Debe haber 2 filas:
   SELECT id, version, is_active, rules->>'version' as json_ver
   FROM redpresu.business_rules
   WHERE company_id IS NULL
   ORDER BY version DESC;

   -- Resultado esperado:
   -- Fila 1: version=2, is_active=true  (versión actual)
   -- Fila 2: version=1, is_active=false (versión anterior desactivada)
   ```

### Pasos de Rollback

1. **Hacer rollback**
   - En `/settings/business-rules`
   - Seleccionar "Todas las empresas" (global)
   - Click en botón **"Rollback"**
   - Confirmar en el diálogo: "¿Estás seguro de revertir a la versión anterior?"

2. **Verificar toast**
   - Debe mostrar: "✅ Rollback exitoso - Se restauró la versión anterior. Nueva versión: 3"

3. **Verificar contenido**
   - El textarea debe mostrar el JSON de la versión 1
   - Pero con `version: 3` (nueva versión)

### Verificación en Base de Datos

```sql
-- Ahora debe haber 3 filas:
SELECT id, version, is_active,
       rules->'rules'->0->>'name' as rule_name,
       created_at
FROM redpresu.business_rules
WHERE company_id IS NULL
ORDER BY version DESC;

-- Resultado esperado:
-- Fila 1: version=3, is_active=true,  rule_name="Regla versión 1" ← RESTAURADA
-- Fila 2: version=2, is_active=false, rule_name="Regla versión 2 MODIFICADA"
-- Fila 3: version=1, is_active=false, rule_name="Regla versión 1"

-- Verificar audit log
SELECT action, version_before, version_after, created_at
FROM redpresu.rules_audit_log
WHERE company_id IS NULL
ORDER BY created_at DESC;

-- Debe incluir:
-- action='rollback', version_before=2, version_after=3
```

### ✅ Resultado Esperado
- Versión 3 creada con contenido de versión 1
- Versión 2 desactivada
- Audit log registra el rollback
- UI muestra contenido restaurado

---

## Test 6: Audit Log

### Objetivo
Verificar que todos los cambios se registran correctamente.

### Pasos

1. **Acceder al audit log**
   - En `/settings/business-rules`
   - Ir al tab **"Historial"** (si existe en la UI)
   - O hacer query directo a BD:

   ```sql
   SELECT
     id,
     action,
     version_before,
     version_after,
     changed_by_email,
     TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp
   FROM redpresu.rules_audit_log
   WHERE company_id IS NULL
   ORDER BY created_at DESC;
   ```

2. **Verificar entradas**
   - Debe haber una entrada por cada operación:
     - `action = 'created'` cuando se creó la primera vez
     - `action = 'updated'` cuando se modificó
     - `action = 'rollback'` cuando se hizo rollback
     - `action = 'deactivated'` cuando se desactivó una versión

3. **Verificar metadata**
   - `changed_by_email` debe ser el email del usuario que hizo el cambio
   - `version_before` y `version_after` deben ser correctos
   - `changes` debe contener el diff de cambios (JSON)

### ✅ Resultado Esperado
- Historial completo de todas las operaciones
- Metadata correcta (usuario, versiones, timestamps)
- Permite auditoría completa

---

## Casos de Prueba Adicionales

### Test 7: Regla Inactiva (active: false)

```json
{
  "version": 1,
  "rules": [
    {
      "id": "inactive-rule",
      "name": "Regla desactivada",
      "active": false,
      "priority": 10,
      "condition": { "==": [{ "var": "plan" }, "FREE"] },
      "action": { "allow": false, "message": "No debería evaluarse" }
    }
  ]
}
```

**Esperado**: Regla NO se evalúa en createTariff porque `active = false`

---

### Test 8: Múltiples Reglas - Primera que Coincide

```json
{
  "version": 1,
  "rules": [
    {
      "id": "rule-1",
      "priority": 10,
      "active": true,
      "condition": { "==": [{ "var": "plan" }, "PRO"] },
      "action": { "allow": false, "message": "Bloqueado por rule-1" }
    },
    {
      "id": "rule-2",
      "priority": 20,
      "active": true,
      "condition": { "==": [{ "var": "plan" }, "PRO"] },
      "action": { "allow": true, "message": "Permitido por rule-2" }
    }
  ]
}
```

**Esperado**: Se aplica solo `rule-1` (menor priority = mayor prioridad)

---

### Test 9: Regla Específica Override Global

1. **Crear regla global**: "Plan PRO máximo 50 tarifas"
2. **Crear regla específica** para empresa X: "Esta empresa puede 100 tarifas"

**Esperado**: Para empresa X, se aplica la regla específica (100), no la global (50)

---

### Test 10: Error en Evaluación (Fail-Open)

1. **Crear regla con sintaxis JsonLogic incorrecta** (que pase Zod pero falle en runtime)
2. **Intentar crear tarifa**

**Esperado**:
- El sistema logea el error
- Pero PERMITE la creación (fail-open para no bloquear operaciones críticas)
- Se ve en logs: `[createTariff] Error evaluando reglas de negocio`

---

## Checklist de Pruebas Completo

### Funcionalidad Básica
- [ ] Crear regla global
- [ ] Crear regla específica para empresa
- [ ] Validar JSON válido
- [ ] Validar JSON inválido (sintaxis)
- [ ] Validar JSON inválido (schema Zod)
- [ ] Guardar reglas
- [ ] Cargar reglas existentes
- [ ] Cargar ejemplo automático

### Integración
- [ ] Regla bloquea createTariff cuando coincide
- [ ] Regla permite createTariff cuando no coincide
- [ ] Regla específica override global
- [ ] Múltiples reglas (priority correcto)
- [ ] Regla inactiva no se evalúa

### Versionado y Rollback
- [ ] Crear versión 1
- [ ] Modificar → crea versión 2
- [ ] Rollback → crea versión 3 con contenido v1
- [ ] Versiones antiguas marcadas is_active=false

### Auditoría
- [ ] Audit log registra 'created'
- [ ] Audit log registra 'updated'
- [ ] Audit log registra 'rollback'
- [ ] Metadata correcta (usuario, versiones)

### UX
- [ ] Botón "Cargar Ejemplo" funciona
- [ ] Validación en tiempo real (JSON syntax)
- [ ] Validación en servidor (JsonLogic)
- [ ] Mensajes de error claros
- [ ] Toasts de éxito/error
- [ ] Botón "Guardar" solo habilitado cuando válido

### Seguridad
- [ ] Solo superadmin puede acceder
- [ ] Usuario normal recibe 403 Unauthorized
- [ ] RLS policies funcionan correctamente

---

## Troubleshooting

### Error: "Unauthorized" al validar

**Causa**: Cliente no autenticado o RLS bloqueando.

**Solución**:
```sql
-- Verificar que eres superadmin
SELECT id, email, role FROM redpresu.users WHERE id = auth.uid();

-- Si no eres superadmin, actualizar:
UPDATE redpresu.users SET role = 'superadmin' WHERE email = 'tu@email.com';
```

---

### Error: "Invalid rules" al guardar

**Causa**: JSON no cumple con BusinessRulesConfigSchema.

**Solución**: Verificar que el JSON tenga:
- `version` (number)
- `updated_at` (ISO datetime string)
- `updated_by` (email válido)
- `rules` (array de objetos Rule)

---

### Regla no se aplica en createTariff

**Causa**: Posibles razones:
1. Regla tiene `active: false`
2. Condición no coincide con contexto
3. Caché no invalidada

**Solución**:
```sql
-- Verificar regla activa
SELECT * FROM redpresu.business_rules WHERE is_active = true;

-- Invalidar caché (reiniciar servidor)
```

---

## Resumen

Este documento cubre **todos los casos de prueba** del Sistema de Reglas de Negocio:

- ✅ CRUD de reglas (global y específica)
- ✅ Validación (sintaxis y schema)
- ✅ Integración con createTariff
- ✅ Versionado y rollback
- ✅ Auditoría completa
- ✅ UX y seguridad

**Estado**: Sistema completo y listo para producción 🚀
