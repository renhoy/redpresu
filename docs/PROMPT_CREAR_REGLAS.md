# 🤖 Prompt para Crear Reglas de Negocio con Claude

Este documento sirve como guía para pedirle a Claude (o cualquier LLM) que genere reglas de negocio en el formato correcto para el Sistema de Reglas de Negocio de Redpresu.

---

## 📋 Prompt Template

Copia y pega este prompt, reemplazando `[TU_REQUISITO]` con tu necesidad específica:

```
Eres un asistente experto en crear reglas de negocio para el sistema Redpresu.

CONTEXTO DEL SISTEMA:
- Aplicación SaaS de gestión de presupuestos y tarifas
- Tiene 3 planes: FREE, PRO, ENTERPRISE
- Las reglas se evalúan cuando los usuarios realizan acciones (crear tarifas, presupuestos, usuarios)
- Las reglas usan JsonLogic para las condiciones

FORMATO REQUERIDO:
Genera un JSON válido con esta estructura exacta:

{
  "version": 1,
  "updated_at": "[timestamp ISO actual]",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "unique-rule-id",
      "name": "Nombre descriptivo",
      "description": "Explicación opcional",
      "active": true,
      "priority": 10,
      "condition": { /* JsonLogic */ },
      "action": {
        "allow": true/false,
        "message": "Mensaje al usuario"
      }
    }
  ]
}

VARIABLES DISPONIBLES EN CONDICIONES:
- plan: string ("FREE" | "PRO" | "ENTERPRISE")
- users_count: number
- tariffs_count: number
- budgets_count: number
- days_since_payment: number
- days_since_signup: number
- is_trial: boolean
- features_used: string[]
- action: string ("create_tariff", "create_budget", etc.)

OPERADORES JSONLOGIC COMUNES:
- Comparación: ==, !=, <, <=, >, >=
- Lógica: and, or, !
- Variables: { "var": "nombre_variable" }

REQUISITO:
[TU_REQUISITO]

IMPORTANTE:
- El "id" debe ser único y descriptivo (kebab-case)
- La "priority" menor = mayor prioridad (se evalúa primero)
- Si "allow" es false, bloquea la acción
- El "message" se muestra al usuario cuando la regla coincide
- Usa timestamp ISO actual en "updated_at"

Genera SOLO el JSON, sin explicaciones adicionales.
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Límite de Tarifas por Plan

**Prompt del usuario:**
```
Necesito una regla que limite a 2 tarifas para plan FREE y 50 para plan PRO
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "limit-tariffs-free-plan",
      "name": "Límite de tarifas para plan FREE",
      "description": "Plan FREE permite máximo 2 tarifas",
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
        "message": "Plan FREE: máximo 2 tarifas. Actualiza a PRO para crear hasta 50 tarifas."
      }
    },
    {
      "id": "limit-tariffs-pro-plan",
      "name": "Límite de tarifas para plan PRO",
      "description": "Plan PRO permite máximo 50 tarifas",
      "active": true,
      "priority": 11,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "PRO"] },
          { ">=": [{ "var": "tariffs_count" }, 51] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan PRO: máximo 50 tarifas. Contacta con ventas para plan ENTERPRISE."
      }
    }
  ]
}
```

---

### Ejemplo 2: Límite de Usuarios

**Prompt del usuario:**
```
Los planes FREE no pueden tener más de 3 usuarios
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "limit-users-free-plan",
      "name": "Límite de usuarios en plan FREE",
      "description": "Plan FREE permite máximo 3 usuarios",
      "active": true,
      "priority": 5,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "FREE"] },
          { ">": [{ "var": "users_count" }, 3] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan FREE: máximo 3 usuarios. Actualiza a PRO para usuarios ilimitados."
      }
    }
  ]
}
```

---

### Ejemplo 3: Bloqueo de Trial Expirado

**Prompt del usuario:**
```
Bloquear creación de tarifas si el trial lleva más de 30 días
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "block-expired-trial",
      "name": "Bloquear trials expirados",
      "description": "Los trials expiran a los 30 días",
      "active": true,
      "priority": 1,
      "condition": {
        "and": [
          { "==": [{ "var": "is_trial" }, true] },
          { ">": [{ "var": "days_since_signup" }, 30] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Tu período de prueba de 30 días ha expirado. Por favor, actualiza tu plan para continuar."
      }
    }
  ]
}
```

---

### Ejemplo 4: Advertencia de Pago Pendiente

**Prompt del usuario:**
```
Si una empresa no ha pagado en más de 60 días, bloquear nuevas tarifas
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "block-overdue-payment",
      "name": "Bloquear por pago vencido",
      "description": "Bloquea creación si el pago tiene más de 60 días de atraso",
      "active": true,
      "priority": 1,
      "condition": {
        ">": [{ "var": "days_since_payment" }, 60]
      },
      "action": {
        "allow": false,
        "message": "Tu cuenta tiene pagos pendientes. Por favor, actualiza tu información de pago para continuar usando el servicio."
      }
    }
  ]
}
```

---

### Ejemplo 5: Regla con Múltiples Condiciones OR

**Prompt del usuario:**
```
Bloquear si el plan es FREE y tiene más de 2 tarifas O más de 3 usuarios
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "free-plan-combined-limits",
      "name": "Límites combinados para plan FREE",
      "description": "Plan FREE limitado a 2 tarifas o 3 usuarios",
      "active": true,
      "priority": 10,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "FREE"] },
          {
            "or": [
              { ">=": [{ "var": "tariffs_count" }, 3] },
              { ">": [{ "var": "users_count" }, 3] }
            ]
          }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan FREE: máximo 2 tarifas y 3 usuarios. Actualiza a PRO para eliminar estas limitaciones."
      }
    }
  ]
}
```

---

### Ejemplo 6: Regla Específica para una Empresa

**Prompt del usuario:**
```
La empresa Acme Corp (cliente especial) puede tener hasta 100 tarifas en plan PRO
```

**Respuesta de Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:00:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "acme-corp-special-limit",
      "name": "Límite especial para Acme Corp",
      "description": "Cliente especial: 100 tarifas en plan PRO",
      "active": true,
      "priority": 5,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "PRO"] },
          { ">=": [{ "var": "tariffs_count" }, 101] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Has alcanzado el límite especial de 100 tarifas. Contacta con tu gestor de cuenta para más información."
      }
    }
  ]
}
```

---

## 🎯 Casos de Uso Comunes

### Límites por Plan

**Prompts sugeridos:**
- "Limitar [recurso] a [número] para plan [plan]"
- "Plan FREE máximo [número] [recurso]"
- "Bloquear [acción] si plan [plan] tiene más de [número] [recurso]"

**Variables relevantes:**
- `plan` (FREE/PRO/ENTERPRISE)
- `tariffs_count`, `users_count`, `budgets_count`

---

### Gestión de Trials

**Prompts sugeridos:**
- "Bloquear si trial expirado (más de [días] días)"
- "Advertir cuando quedan [días] días de trial"
- "Limitar [recurso] en trial a [número]"

**Variables relevantes:**
- `is_trial` (boolean)
- `days_since_signup` (number)

---

### Control de Pagos

**Prompts sugeridos:**
- "Bloquear si no ha pagado en [días] días"
- "Advertir cuando el pago lleva [días] días pendiente"

**Variables relevantes:**
- `days_since_payment` (number)

---

### Reglas Basadas en Uso

**Prompts sugeridos:**
- "Bloquear cuando use más de [número] [feature]"
- "Permitir solo si ha usado [feature]"

**Variables relevantes:**
- `features_used` (array)
- Usar operador `in` de JsonLogic

---

## 📚 Referencia de Operadores JsonLogic

### Comparación Numérica
```json
{ "==": [{ "var": "tariffs_count" }, 5] }     // Igual a 5
{ "!=": [{ "var": "tariffs_count" }, 5] }     // Diferente de 5
{ "<": [{ "var": "tariffs_count" }, 5] }      // Menor que 5
{ "<=": [{ "var": "tariffs_count" }, 5] }     // Menor o igual a 5
{ ">": [{ "var": "tariffs_count" }, 5] }      // Mayor que 5
{ ">=": [{ "var": "tariffs_count" }, 5] }     // Mayor o igual a 5
```

### Comparación de Strings
```json
{ "==": [{ "var": "plan" }, "FREE"] }         // Plan es FREE
{ "!=": [{ "var": "plan" }, "FREE"] }         // Plan NO es FREE
```

### Operadores Lógicos
```json
{
  "and": [                                     // Todas las condiciones deben cumplirse
    { "==": [{ "var": "plan" }, "FREE"] },
    { ">": [{ "var": "tariffs_count" }, 2] }
  ]
}

{
  "or": [                                      // Al menos una condición debe cumplirse
    { "==": [{ "var": "plan" }, "FREE"] },
    { "==": [{ "var": "is_trial" }, true] }
  ]
}

{ "!": { "==": [{ "var": "plan" }, "FREE"] } } // Negación (NOT)
```

### Operador IN (Arrays)
```json
{
  "in": [
    "reports",
    { "var": "features_used" }
  ]
}
// Verifica si "reports" está en el array features_used
```

### Condicional IF
```json
{
  "if": [
    { "==": [{ "var": "plan" }, "FREE"] },     // Condición
    true,                                       // Valor si true
    false                                       // Valor si false
  ]
}
```

---

## ⚠️ Errores Comunes a Evitar

### ❌ Error 1: ID No Único
```json
{
  "id": "rule1",  // ❌ Demasiado genérico
  "name": "Regla 1"
}
```

**✅ Correcto:**
```json
{
  "id": "limit-tariffs-free-plan",  // ✅ Descriptivo y único
  "name": "Límite de tarifas para plan FREE"
}
```

---

### ❌ Error 2: Timestamp Incorrecto
```json
{
  "updated_at": "2025-11-15"  // ❌ Falta formato ISO completo
}
```

**✅ Correcto:**
```json
{
  "updated_at": "2025-11-15T20:00:00Z"  // ✅ ISO 8601 con timezone
}
```

---

### ❌ Error 3: Condición con >= en Lugar de >
```json
{
  "condition": {
    ">=": [{ "var": "tariffs_count" }, 3]  // ❌ Si tariffs_count es 3, bloquea
  }
}
```

**Explicación:** Si quieres permitir 2 tarifas, la condición debe ser:
- `tariffs_count >= 3` bloquea cuando intenta crear la 3ra (total sería 3)
- Esto es CORRECTO si el límite es 2

---

### ❌ Error 4: Email Inválido
```json
{
  "updated_by": "admin"  // ❌ No es un email válido
}
```

**✅ Correcto:**
```json
{
  "updated_by": "admin@example.com"  // ✅ Email válido
}
```

---

### ❌ Error 5: Prioridad Confusa
```json
{
  "priority": 100,  // ❌ Número alto = baja prioridad (se evalúa al final)
  "name": "Regla crítica"
}
```

**✅ Correcto:**
```json
{
  "priority": 1,  // ✅ Número bajo = alta prioridad (se evalúa primero)
  "name": "Regla crítica"
}
```

---

## 🎓 Flujo de Trabajo Recomendado

### 1. Definir Requisito
**Ejemplo:** "Plan FREE máximo 2 tarifas"

### 2. Usar el Prompt Template
Copia el prompt completo y reemplaza `[TU_REQUISITO]` con tu texto.

### 3. Pedir a Claude
Envía el prompt completo a Claude.

### 4. Validar JSON
- Copia el JSON generado
- Ve a `/settings/business-rules` en Redpresu
- Pégalo en el editor
- Click en **"Validar"**

### 5. Ajustar si es Necesario
Si hay errores, dile a Claude:
```
El JSON tiene este error: [mensaje de error]
Por favor corrige el JSON
```

### 6. Guardar
Una vez validado, click en **"Guardar"**.

---

## 🔍 Testing de la Regla

Después de guardar una regla, **SIEMPRE** pruébala:

### Opción 1: Usar la Guía de Testing
Consulta `docs/TESTING_BUSINESS_RULES.md` para casos de prueba específicos.

### Opción 2: Testing Manual Rápido

1. **Identifica el trigger** (ej: "crear tarifa")
2. **Crea el escenario** (ej: empresa con plan FREE y 2 tarifas existentes)
3. **Ejecuta la acción** (ej: intenta crear 3ra tarifa)
4. **Verifica resultado** (debe bloquearse con mensaje correcto)

---

## 📞 Ejemplo Completo de Conversación

**Usuario:**
```
Usando el prompt template para reglas de negocio, genera una regla que:
- Bloquee la creación de presupuestos si el plan es FREE y tiene más de 5 presupuestos
- El mensaje debe decir que actualice a PRO para presupuestos ilimitados
```

**Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:30:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "limit-budgets-free-plan",
      "name": "Límite de presupuestos para plan FREE",
      "description": "Plan FREE permite máximo 5 presupuestos",
      "active": true,
      "priority": 10,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "FREE"] },
          { ">=": [{ "var": "budgets_count" }, 6] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan FREE: máximo 5 presupuestos. Actualiza a PRO para presupuestos ilimitados."
      }
    }
  ]
}
```

**Usuario:**
```
Perfecto, ahora agrega otra regla al mismo JSON para plan PRO con límite de 100 presupuestos
```

**Claude:**
```json
{
  "version": 1,
  "updated_at": "2025-11-15T20:30:00Z",
  "updated_by": "admin@example.com",
  "rules": [
    {
      "id": "limit-budgets-free-plan",
      "name": "Límite de presupuestos para plan FREE",
      "description": "Plan FREE permite máximo 5 presupuestos",
      "active": true,
      "priority": 10,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "FREE"] },
          { ">=": [{ "var": "budgets_count" }, 6] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan FREE: máximo 5 presupuestos. Actualiza a PRO para presupuestos ilimitados."
      }
    },
    {
      "id": "limit-budgets-pro-plan",
      "name": "Límite de presupuestos para plan PRO",
      "description": "Plan PRO permite máximo 100 presupuestos",
      "active": true,
      "priority": 11,
      "condition": {
        "and": [
          { "==": [{ "var": "plan" }, "PRO"] },
          { ">=": [{ "var": "budgets_count" }, 101] }
        ]
      },
      "action": {
        "allow": false,
        "message": "Plan PRO: máximo 100 presupuestos. Contacta con ventas para plan ENTERPRISE con presupuestos ilimitados."
      }
    }
  ]
}
```

---

## 🎯 Tips Finales

### 1. Sé Específico en el Prompt
❌ "Crea una regla de límites"
✅ "Crea una regla que limite plan FREE a 2 tarifas y muestre mensaje de upgrade"

### 2. Valida SIEMPRE
Nunca guardes una regla sin validarla primero en el sistema.

### 3. Prueba en Desarrollo
Prueba las reglas en un entorno de desarrollo antes de aplicarlas en producción.

### 4. Documenta el Propósito
Usa el campo `description` para explicar POR QUÉ existe la regla.

### 5. Usa Prioridades Claras
- 1-10: Reglas críticas (bloqueos por pago, seguridad)
- 11-50: Reglas de límites de plan
- 51-100: Advertencias y sugerencias

---

## 📖 Recursos Adicionales

- **Guía de Usuario**: `docs/GUIA_REGLAS_NEGOCIO.md`
- **Guía de Testing**: `docs/TESTING_BUSINESS_RULES.md`
- **Changelog**: `docs/CHANGELOG_BUSINESS_RULES.md`
- **JsonLogic Docs**: https://jsonlogic.com/

---

**Última actualización:** 2025-11-15
**Versión:** 1.0
**Autor:** Claude (Anthropic)
