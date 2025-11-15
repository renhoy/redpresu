# 📘 Guía del Sistema de Reglas de Negocio - Redpresu

## 🎯 ¿Qué es el Sistema de Reglas de Negocio?

El Sistema de Reglas de Negocio permite a los **superadmins** definir reglas automáticas que se evalúan cuando los usuarios realizan acciones críticas (crear tarifas, presupuestos, usuarios, etc.). Estas reglas pueden:

- ✅ **Permitir o bloquear** acciones según condiciones
- 📧 **Enviar emails automáticos** usando templates
- 📉 **Cambiar planes** automáticamente (downgrade/upgrade)
- 🚫 **Bloquear funcionalidades** específicas
- ⏰ **Programar acciones futuras**

---

## 🔐 Acceso al Sistema

1. **Login** como superadmin
2. Ir a **Settings** (`/settings`)
3. Click en botón **"Reglas de Negocio"**
4. Se abrirá `/settings/business-rules`

**Nota:** Solo los superadmins pueden acceder a esta funcionalidad.

---

## 🏢 Alcance de las Reglas

El sistema permite dos tipos de reglas según su alcance:

### 🌍 Reglas Globales (por defecto)

- **Aplican a TODAS las empresas** del sistema
- Útiles para políticas generales del negocio
- Ejemplos:
  - "Ningún plan FREE puede tener más de 3 usuarios"
  - "Todos los trials expiran a los 30 días"
  - "Enviar email cuando una empresa llega a 90% de su límite"

**Selección:** En el radio button, selecciona "Todas las empresas"

### 🎯 Reglas Específicas

- **Aplican solo a una empresa** en particular
- Útiles para casos especiales o clientes con condiciones personalizadas
- Ejemplos:
  - "Acme Corp puede tener hasta 100 usuarios en plan PRO"
  - "Tech Solutions: enviar alerta a sales@ cuando crean 20+ presupuestos"

**Selección:**
1. En el radio button, selecciona "Empresa específica"
2. Se mostrará una tabla con todas las empresas
3. Busca la empresa usando el buscador (filtra por nombre, NIF, dirección, localidad, provincia o teléfono)
4. Click en la fila de la empresa (se marcará con fondo verde lima)

### ⚡ Prioridad de Evaluación

Cuando se evalúan reglas para una empresa:
1. **Primero** se evalúan las reglas **específicas** de esa empresa
2. **Luego** se evalúan las reglas **globales**

Esto permite que las reglas específicas sobreescriban comportamientos globales.

---

## ✏️ Crear/Editar Reglas

### Tab "Editor"

1. Selecciona una empresa en la tabla
2. Se cargará el JSON de reglas actuales (si existen)
3. Edita el JSON manualmente
4. Click en **"Validar"** para probar sintaxis (opcional pero recomendado)
5. Click en **"Guardar"** para aplicar los cambios

### Estructura del JSON

```json
{
  "version": 1,
  "updated_at": "2025-11-14T22:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "unique-rule-id",
      "name": "Nombre descriptivo de la regla",
      "description": "Explicación opcional",
      "active": true,
      "priority": 10,
      "condition": {
        ">=": [{ "var": "tariffs_count" }, 50]
      },
      "action": {
        "allow": false,
        "message": "Plan PRO: máximo 50 tarifas"
      }
    }
  ]
}
```

### Campos del JSON

#### Nivel Raíz
- `version` (number): Versión de las reglas (se incrementa automáticamente)
- `updated_at` (string): Fecha ISO de última actualización
- `updated_by` (string): Email de quien actualizó
- `rules` (array): Lista de reglas

#### Cada Regla
- `id` (string): Identificador único de la regla
- `name` (string): Nombre descriptivo
- `description` (string, opcional): Explicación adicional
- `active` (boolean): Si la regla está activa (true/false)
- `priority` (number): Menor número = mayor prioridad (se evalúa primero)
- `condition` (object): Condición JsonLogic
- `action` (object): Acción a ejecutar si la condición coincide

---

## 🧩 Condiciones (JsonLogic)

Las condiciones usan **JsonLogic**, una sintaxis JSON para expresar lógica.

### Variables Disponibles

En cada evaluación, el sistema provee estas variables:

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `plan` | string | Plan de la empresa: "FREE", "PRO", "ENTERPRISE" |
| `users_count` | number | Número de usuarios de la empresa |
| `tariffs_count` | number | Número de tarifas (incluyendo la que se intenta crear) |
| `budgets_count` | number | Número de presupuestos |
| `days_since_payment` | number | Días desde último pago |
| `days_since_signup` | number | Días desde registro |
| `is_trial` | boolean | Si la empresa está en trial |
| `features_used` | array | Lista de features usadas |
| `action` | string | Acción que se intenta: "create_tariff", "create_budget", etc. |

### Operadores Comunes

#### Comparación
```json
{ "==": [{ "var": "plan" }, "PRO"] }          // plan es PRO
{ "!=": [{ "var": "plan" }, "FREE"] }         // plan no es FREE
{ ">=": [{ "var": "tariffs_count" }, 50] }    // 50 o más tarifas
{ "<": [{ "var": "users_count" }, 5] }        // menos de 5 usuarios
```

#### Lógica
```json
{
  "and": [
    { "==": [{ "var": "plan" }, "PRO"] },
    { ">=": [{ "var": "tariffs_count" }, 50] }
  ]
}
```

```json
{
  "or": [
    { "==": [{ "var": "plan" }, "ENTERPRISE"] },
    { "<": [{ "var": "tariffs_count" }, 10] }
  ]
}
```

```json
{
  "!": { "var": "is_trial" }   // No está en trial
}
```

#### Matemáticas
```json
{ "+": [{ "var": "users_count" }, 1] }        // Sumar 1
{ "-": [100, { "var": "tariffs_count" }] }    // Restar
{ "*": [{ "var": "price" }, 1.21] }           // Multiplicar
```

---

## ⚡ Acciones

### `allow` (boolean)
Define si se permite la acción.

```json
{
  "allow": false,
  "message": "Plan FREE: máximo 3 tarifas"
}
```

### `max_limit` (number)
Establece un límite máximo.

```json
{
  "max_limit": 50,
  "message": "Límite de 50 elementos"
}
```

### `send_email` (string)
Envía email usando template.

```json
{
  "send_email": "trial_expired",
  "message": "Se envió email de notificación"
}
```

**Templates disponibles:**
- `trial_expired` - Trial expirado
- `payment_overdue_30d` - Pago vencido 30+ días
- `downgrade_notice` - Cambio de plan

### `downgrade_to` (string)
Cambia el plan automáticamente.

```json
{
  "downgrade_to": "FREE",
  "send_email": "downgrade_notice",
  "message": "Tu plan ha sido degradado a FREE"
}
```

Valores: `"FREE"`, `"PRO"`, `"ENTERPRISE"`

### `block_feature` (string)
Bloquea una funcionalidad.

```json
{
  "block_feature": "export_pdf",
  "message": "Exportación PDF no disponible en plan FREE"
}
```

### `schedule_action` (object)
Programa una acción futura.

```json
{
  "schedule_action": {
    "days": 7,
    "action": "suspend_account"
  },
  "message": "Se suspenderá la cuenta en 7 días"
}
```

### `message` (string)
Mensaje que se muestra al usuario cuando la regla aplica.

---

## 📋 Ejemplos de Reglas Reales

### 1. Límite de Tarifas Plan PRO

```json
{
  "id": "limit-tariffs-pro",
  "name": "Límite de tarifas plan PRO",
  "description": "Plan PRO permite máximo 50 tarifas",
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
    "message": "Plan PRO: máximo 50 tarifas. Actualiza a ENTERPRISE para tarifas ilimitadas."
  }
}
```

### 2. Trial Expirado - Downgrade Automático

```json
{
  "id": "trial-expired-downgrade",
  "name": "Trial expirado - Downgrade a FREE",
  "active": true,
  "priority": 5,
  "condition": {
    "and": [
      { "var": "is_trial" },
      { ">": [{ "var": "days_since_signup" }, 14] }
    ]
  },
  "action": {
    "downgrade_to": "FREE",
    "send_email": "trial_expired",
    "message": "Tu período de prueba ha expirado. Plan cambiado a FREE."
  }
}
```

### 3. Pago Vencido - Email + Scheduled Action

```json
{
  "id": "payment-overdue-30d",
  "name": "Pago vencido 30 días",
  "active": true,
  "priority": 1,
  "condition": {
    ">=": [{ "var": "days_since_payment" }, 30]
  },
  "action": {
    "send_email": "payment_overdue_30d",
    "downgrade_to": "FREE",
    "schedule_action": {
      "days": 7,
      "action": "suspend_account"
    },
    "message": "Pago vencido. Cuenta degradada y se suspenderá en 7 días."
  }
}
```

### 4. Límite de Usuarios Plan FREE

```json
{
  "id": "limit-users-free",
  "name": "Límite de usuarios plan FREE",
  "active": true,
  "priority": 10,
  "condition": {
    "and": [
      { "==": [{ "var": "plan" }, "FREE"] },
      { ">=": [{ "var": "users_count" }, 1] },
      { "==": [{ "var": "action" }, "create_user"] }
    ]
  },
  "action": {
    "allow": false,
    "message": "Plan FREE: solo 1 usuario permitido. Actualiza a PRO para más usuarios."
  }
}
```

---

## 🔄 Validar Reglas

### Botón "Validar"

1. Edita el JSON de reglas
2. Click en **"Validar"**
3. El sistema:
   - Verifica sintaxis JSON
   - Valida estructura con Zod
   - Prueba las reglas con contexto de ejemplo
   - Muestra qué regla coincidiría (si aplica)

**Estados:**
- ✅ Verde: JSON válido
- ❌ Rojo: JSON inválido o error de sintaxis
- Toast: Resultado detallado de validación

---

## 💾 Guardar Cambios

1. Click en **"Guardar"**
2. El sistema:
   - Desactiva la versión anterior
   - Crea nueva versión (v+1)
   - Guarda backup en `previous_version`
   - Registra cambio en audit log
   - Invalida caché
3. Muestra toast con número de versión guardada

**Nota:** Solo se puede tener 1 versión activa por empresa.

---

## ⏪ Rollback

Si necesitas revertir cambios:

1. Click en **"Rollback"**
2. Confirmar en el diálogo
3. El sistema:
   - Restaura el contenido de `previous_version`
   - Crea nueva versión (v+1) con contenido anterior
   - Registra acción en audit log
   - Invalida caché

**Limitación:** Solo puedes hacer rollback una vez (a la versión inmediatamente anterior).

---

## 📜 Historial de Auditoría

### Tab "Historial"

Muestra todos los cambios realizados en las reglas de la empresa seleccionada.

**Columnas:**
- **Fecha**: Cuándo se hizo el cambio
- **Acción**: created, updated, rollback, activated, deactivated
- **Usuario**: Email de quien hizo el cambio
- **Versión**: v1 → v2 (antes y después)
- **IP**: Dirección IP desde donde se hizo el cambio

**Paginación:**
- 20 registros por página
- Botones "Anterior" / "Siguiente"
- Contador: "Mostrando X-Y de Z registros"

---

## 🎨 Badges de Acción

Los badges en el historial usan colores:

- 🟢 **created**: Verde
- 🔵 **updated**: Azul
- 🟠 **rollback**: Naranja
- 🟢 **activated**: Esmeralda
- ⚪ **deactivated**: Gris

---

## ⚠️ Notas Importantes

### Prioridad
Las reglas se evalúan en orden de prioridad (menor número primero). Si una regla con `priority: 1` coincide, no se evalúan las demás.

### Fail-Open
Si hay un error al evaluar las reglas (por ejemplo, falla la conexión a BD), el sistema **permite la acción** por defecto para no bloquear la aplicación.

### Caché
Las reglas se cachean en memoria por 5 minutos. Cuando guardas o haces rollback, el caché se invalida automáticamente.

### Testing
Siempre usa el botón **"Validar"** antes de guardar para asegurarte de que las reglas funcionan correctamente.

---

## 🆘 Solución de Problemas

### "No aparecen empresas"
- Verifica que eres superadmin
- Recarga la página
- Verifica que existen empresas en `/api/companies`

### "Error al guardar reglas"
- Verifica sintaxis JSON (usa un validador online)
- Asegúrate de que la estructura coincide con el schema
- Revisa console del navegador para ver error detallado

### "Regla no se aplica"
- Verifica que `active: true`
- Revisa la prioridad (menor = primero)
- Verifica que la condición coincide con el contexto
- Usa "Validar" con contexto de prueba

### "Rollback no disponible"
- Solo puedes hacer rollback si existe `previous_version`
- Solo puedes revertir a la versión inmediatamente anterior

---

## 📞 Soporte

Si tienes problemas con el sistema de reglas de negocio:

1. **Revisa los logs** en browser console
2. **Verifica el audit log** para ver qué cambió
3. **Haz rollback** si algo salió mal
4. **Contacta al equipo técnico** si persiste el problema

---

## 🔗 Enlaces Útiles

- **JsonLogic Playground**: http://jsonlogic.com/play.html
- **Sintaxis JsonLogic**: http://jsonlogic.com/operations.html
- **Documentación técnica**: `docs/business-rules-system.md`

---

**Última actualización**: 14-Nov-2025
**Versión del sistema**: 1.0.0
