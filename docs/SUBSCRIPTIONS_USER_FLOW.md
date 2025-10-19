# Flujo de Usuario - Suscripciones

## 📍 Acceso a la Página de Suscripciones

### URL
```
http://localhost:3000/subscriptions
```

### Requisitos
- ✅ Usuario autenticado
- ✅ Rol: `admin` o `superadmin` (vendedores NO tienen acceso)
- ✅ Feature flag activado: `NEXT_PUBLIC_STRIPE_ENABLED=true`

### Navegación
1. **Login** como admin/superadmin
2. En el **header**, click en el enlace **"Suscripciones"** (icono de tarjeta de crédito 💳)
3. Se abre la página de gestión de suscripciones

> **Nota:** Si `NEXT_PUBLIC_STRIPE_ENABLED=false`, el enlace NO aparecerá en el menú.

---

## 🎯 Estado Actual del Sistema

### Plan por Defecto
Todos los usuarios nuevos tienen el **Plan FREE**:
- ✅ 3 tarifas máximo
- ✅ 10 presupuestos máximo
- ✅ 1 usuario
- ✅ 100 MB almacenamiento

---

## 🔄 Flujo Completo de Suscripción

### 1️⃣ Ver Plan Actual

Al acceder a `/subscriptions`:

```
┌─────────────────────────────────────────┐
│         PLAN ACTUAL                     │
│                                         │
│  Plan: FREE                             │
│  Estado: ● active                       │
├─────────────────────────────────────────┤
│         PLANES DISPONIBLES              │
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────────┐     │
│  │ FREE │  │ PRO  │  │ENTERPRISE│     │
│  │ ✓    │  │ ⚡   │  │ 👑       │     │
│  │Gratis│  │29€/mes│  │ 99€/mes  │     │
│  └──────┘  └──────┘  └──────────┘     │
└─────────────────────────────────────────┘
```

### 2️⃣ Cambiar a Plan Pro

**Paso 1:** Click en botón **"Cambiar a Pro"**

**Paso 2:** Sistema crea sesión de Stripe Checkout
```javascript
createCheckoutSession({
  planId: 'pro',
  successUrl: '/subscriptions?success=true',
  cancelUrl: '/subscriptions?canceled=true'
})
```

**Paso 3:** Redirige a Stripe Checkout (página de Stripe)

**Paso 4:** Completar pago con tarjeta
```
Tarjetas de prueba (Test Mode):
✅ Éxito:          4242 4242 4242 4242
⚠️  Auth requerida: 4000 0025 0000 3155
❌ Fallo:          4000 0000 0000 9995

CVC: Cualquier 3 dígitos (ej: 123)
Fecha: Cualquier fecha futura (ej: 12/25)
```

**Paso 5:** Stripe procesa el pago

**Paso 6:** Webhook `checkout.session.completed` actualiza BD
```sql
UPDATE redpresu_subscriptions
SET plan = 'pro',
    status = 'active',
    stripe_subscription_id = 'sub_...',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month'
WHERE company_id = 1;
```

**Paso 7:** Redirección a `/subscriptions?success=true`

**Paso 8:** Ver nuevo plan activo ✅

---

### 3️⃣ Gestionar Suscripción Activa

Si tienes un plan de pago (Pro o Enterprise):

**Botón "Gestionar Suscripción"** → Abre Stripe Customer Portal

En el portal puedes:
- 💳 Cambiar método de pago
- 📄 Ver historial de facturas
- ⬆️ Upgrade/downgrade de plan
- ❌ Cancelar suscripción
- 📧 Actualizar email de facturación

**Al salir del portal:** Vuelve a `/subscriptions`

---

### 4️⃣ Cancelación de Suscripción

**Desde el Customer Portal:**

1. Click en **"Cancel subscription"**
2. Confirmar cancelación
3. Opciones:
   - **Inmediata:** Vuelve a Free ahora
   - **Al final del periodo:** Sigue con Pro hasta fin de mes, luego Free

**Webhook `customer.subscription.deleted`:**
```sql
UPDATE redpresu_subscriptions
SET plan = 'free',
    status = 'canceled'
WHERE company_id = 1;
```

**Resultado:** Plan Free reactivado

---

## 🚫 Límites Automáticos en Acción

### Escenario 1: Plan FREE

```
Usuario intenta crear 4ta tarifa
   ↓
canCreateTariff() verifica límite
   ↓
Plan: FREE → límite = 3 tarifas
Current count: 3
   ↓
❌ ERROR: "Has alcanzado el límite de 3 tarifas del plan Free.
          Actualiza tu plan para crear más."
```

### Escenario 2: Después de Upgrade a PRO

```
Usuario intenta crear 4ta tarifa
   ↓
canCreateTariff() verifica límite
   ↓
Plan: PRO → límite = 50 tarifas
Current count: 3
   ↓
✅ OK: Tarifa creada exitosamente
```

---

## 📊 Límites por Plan

| Recurso      | FREE | PRO    | ENTERPRISE |
|-------------|------|--------|------------|
| Tarifas     | 3    | 50     | ∞ (9999)   |
| Presupuestos| 10   | 500    | ∞ (9999)   |
| Usuarios    | 1    | 5      | 50         |
| Storage     | 100MB| 5 GB   | 50 GB      |

---

## 🔔 Notificaciones y Estados

### Estados de Suscripción

| Estado      | Descripción                    | Badge Color |
|-------------|--------------------------------|-------------|
| `active`    | Suscripción activa             | 🟢 Verde    |
| `trialing`  | En periodo de prueba           | 🔵 Azul     |
| `past_due`  | Pago pendiente                 | 🟡 Amarillo |
| `canceled`  | Cancelada                      | 🔴 Rojo     |

### Webhook: Pago Fallido

Si un pago falla (`invoice.payment_failed`):

```
1. Estado → past_due
2. Banner en /subscriptions:
   ⚠️ "Tu pago falló. Actualiza tu método de pago para
       mantener tu suscripción activa."
3. Botón: "Gestionar Suscripción" (ir a portal)
```

---

## 🛠️ Testing en Desarrollo

### Activar Suscripciones Localmente

**1. Configurar `.env.local`:**
```bash
NEXT_PUBLIC_STRIPE_ENABLED=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**2. Ejecutar migraciones:**
```bash
psql -d TU_DB -f migrations/025_subscriptions.sql
psql -d TU_DB -f migrations/026_stripe_plans_config.sql
psql -d TU_DB -f migrations/027_rename_empresa_id_to_company_id.sql
```

**3. Iniciar Stripe CLI (webhooks locales):**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**4. Reiniciar servidor Next.js:**
```bash
npm run dev
```

**5. Login como admin y acceder a `/subscriptions` ✅**

---

## 🧪 Test Flow Completo

### Flujo Happy Path

```
1. Login como admin → /dashboard
2. Click "Suscripciones" en header → /subscriptions
3. Ver plan FREE activo
4. Click "Cambiar a Pro"
5. Stripe Checkout → Tarjeta 4242 4242 4242 4242
6. Completar pago
7. Redirect → /subscriptions?success=true
8. ✅ Ver plan PRO activo con badge verde
9. Intentar crear 10 tarifas → ✅ OK (límite 50)
10. Click "Gestionar Suscripción"
11. Stripe Portal → Cancelar suscripción
12. Volver a app → Plan FREE reactivado
13. Intentar crear 4ta tarifa → ❌ ERROR (límite 3)
```

---

## ⚠️ Casos Edge

### Caso 1: Vendedor intenta acceder
```
GET /subscriptions (role=vendedor)
   ↓
Middleware verifica rol
   ↓
❌ Redirect a /dashboard
```

### Caso 2: Feature flag deshabilitado
```
GET /subscriptions (STRIPE_ENABLED=false)
   ↓
Página muestra:
"Las suscripciones están deshabilitadas en este momento.
 Contacta con soporte para activar esta funcionalidad."
```

### Caso 3: Webhook falla
```
Pago exitoso en Stripe
   ↓
Webhook error → BD NO actualizada
   ↓
Usuario ve plan FREE aunque pagó
   ↓
Solución: Revisar logs webhook, re-disparar evento
```

---

## 📞 Soporte

### Problemas Comunes

**"No veo el enlace Suscripciones"**
- ✅ Verificar: `NEXT_PUBLIC_STRIPE_ENABLED=true`
- ✅ Verificar: Rol = admin o superadmin
- ✅ Reiniciar servidor Next.js

**"Error al crear sesión de pago"**
- ✅ Verificar claves Stripe en `.env.local`
- ✅ Verificar Price IDs actualizados en `src/lib/stripe.ts`

**"Los límites no funcionan"**
- ✅ Verificar función SQL existe: `SELECT proname FROM pg_proc WHERE proname = 'check_plan_limit';`
- ✅ Verificar migraciones ejecutadas

---

**Última actualización:** 2025-01-18
**Versión:** 1.0
