# Configuración de Stripe - jeyca-presu

## 📋 Resumen

Este documento describe cómo configurar Stripe para el módulo de suscripciones.

## ✅ Estado Actual

- ✅ SDK instalado (`stripe` package)
- ✅ Migraciones SQL creadas (025, 026)
- ✅ Server Actions implementadas
- ✅ Webhook endpoint creado
- ✅ Página de suscripciones lista
- ✅ Límites integrados en creación de recursos
- ⏳ **Pendiente:** Configurar claves de Stripe y Price IDs

---

## 🔧 Configuración Inicial

### 1. Crear Cuenta en Stripe

1. Ir a [https://stripe.com](https://stripe.com)
2. Crear cuenta o iniciar sesión
3. Activar "Test Mode" para desarrollo

### 2. Obtener Claves API

En Dashboard de Stripe → **Developers** → **API Keys**:

- **Publishable key** (comienza con `pk_test_...`)
- **Secret key** (comienza con `sk_test_...`)

### 3. Configurar Variables de Entorno

Actualizar `.env.local`:

```bash
# Stripe - REEMPLAZAR con tus claves reales
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_AQUI
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
STRIPE_WEBHOOK_SECRET=whsec_TU_SECRET_AQUI  # Ver paso 4

# Feature Flag - Cambiar a true para activar
NEXT_PUBLIC_STRIPE_ENABLED=false
```

### 4. Crear Productos y Precios en Stripe

#### 4.1. Crear Productos

En Stripe Dashboard → **Products** → **Add product**:

**Plan Pro:**
- Name: `Pro`
- Description: `Plan profesional para negocios`
- Price: `29 EUR` / month
- Recurring: Monthly
- **Copiar el Price ID** (ej: `price_1ABC123...`)

**Plan Enterprise:**
- Name: `Enterprise`
- Description: `Plan empresarial sin límites`
- Price: `99 EUR` / month
- Recurring: Monthly
- **Copiar el Price ID**

#### 4.2. Actualizar Price IDs en Código

Editar `src/lib/stripe.ts` líneas 66 y 90:

```typescript
pro: {
  // ...
  priceId: 'price_TU_PRICE_ID_PRO', // <-- Actualizar aquí
},

enterprise: {
  // ...
  priceId: 'price_TU_PRICE_ID_ENTERPRISE', // <-- Actualizar aquí
}
```

### 5. Configurar Webhook

#### 5.1. Desarrollo Local (con Stripe CLI)

1. Instalar Stripe CLI:
   ```bash
   brew install stripe/stripe-brew/stripe  # macOS
   # o descargar desde https://stripe.com/docs/stripe-cli
   ```

2. Autenticar:
   ```bash
   stripe login
   ```

3. Forward webhooks a localhost:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copiar el **webhook signing secret** que aparece (comienza con `whsec_...`)

5. Actualizar `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_EL_SECRET_QUE_TE_DIO_STRIPE_CLI
   ```

#### 5.2. Producción (Vercel/Deploy)

1. En Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**

2. Endpoint URL:
   ```
   https://TU_DOMINIO.vercel.app/api/webhooks/stripe
   ```

3. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

4. Copiar el **Signing secret** (comienza con `whsec_...`)

5. Añadir a variables de entorno de Vercel:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 6. Ejecutar Migraciones SQL

```bash
# Conectar a base de datos
psql -d TU_DATABASE_URL

# Ejecutar migraciones
\i migrations/025_subscriptions.sql
\i migrations/026_stripe_plans_config.sql
```

Verificar:
```sql
SELECT * FROM redpresu_subscriptions;
SELECT * FROM redpresu_config WHERE config_key = 'stripe_plans';
```

### 7. Activar Feature Flag

Una vez todo configurado, activar suscripciones:

```bash
# .env.local
NEXT_PUBLIC_STRIPE_ENABLED=true
```

---

## 🧪 Testing

### Test Mode

1. Asegurarse de usar claves `pk_test_` y `sk_test_`
2. Usar tarjetas de prueba de Stripe:
   - **Éxito:** `4242 4242 4242 4242`
   - **Requiere autenticación:** `4000 0025 0000 3155`
   - **Pago fallido:** `4000 0000 0000 9995`
   - CVC: Cualquier 3 dígitos
   - Fecha: Cualquier fecha futura

### Flujo Completo

1. Ir a `/subscriptions`
2. Seleccionar plan "Pro"
3. Completar checkout con tarjeta de prueba
4. Verificar redirección a success
5. Verificar en BD que subscription se creó:
   ```sql
   SELECT * FROM redpresu_subscriptions WHERE plan = 'pro';
   ```

### Verificar Límites

1. Con plan Free (por defecto):
   ```
   - Crear 3 tarifas → OK
   - Intentar crear 4ta tarifa → ERROR (límite alcanzado)
   ```

2. Cambiar a Pro:
   ```
   - Crear hasta 50 tarifas → OK
   ```

### Test Webhooks

```bash
# Escuchar webhooks localmente
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# En otra terminal, disparar evento de prueba
stripe trigger checkout.session.completed
```

Verificar logs en consola para confirmar que el webhook se procesó.

---

## 📊 Estructura de Datos

### Tabla `redpresu_subscriptions`

```sql
id                      UUID PRIMARY KEY
empresa_id              INTEGER (FK a empresas)
plan                    TEXT ('free' | 'pro' | 'enterprise')
stripe_customer_id      TEXT UNIQUE
stripe_subscription_id  TEXT UNIQUE
status                  TEXT ('active' | 'canceled' | 'past_due' | 'trialing')
current_period_start    TIMESTAMPTZ
current_period_end      TIMESTAMPTZ
cancel_at_period_end    BOOLEAN
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### Función SQL `check_plan_limit()`

```sql
check_plan_limit(p_empresa_id INTEGER, p_resource_type TEXT) RETURNS BOOLEAN
```

Valida si la empresa puede crear más recursos según su plan.

---

## 🔄 Flujos de Negocio

### Suscripción Exitosa

```
1. Usuario hace clic en "Cambiar a Pro"
   → createCheckoutSession()

2. Redirige a Stripe Checkout
   → Usuario completa pago

3. Webhook: checkout.session.completed
   → Actualiza redpresu_subscriptions
   → plan = 'pro', status = 'active'

4. Redirige a /subscriptions?success=true
   → Muestra mensaje éxito
```

### Cancelación

```
1. Usuario hace clic en "Gestionar Suscripción"
   → createPortalSession()

2. Redirige a Stripe Customer Portal
   → Usuario cancela suscripción

3. Webhook: customer.subscription.deleted
   → Actualiza redpresu_subscriptions
   → plan = 'free', status = 'canceled'

4. Redirige a /subscriptions
   → Muestra plan Free
```

### Pago Fallido

```
1. Stripe intenta cobrar y falla
   → Webhook: invoice.payment_failed

2. Actualiza redpresu_subscriptions
   → status = 'past_due'

3. Usuario ve banner en /subscriptions
   → "Actualiza tu método de pago"
```

---

## 🚨 Troubleshooting

### Error: "Stripe not configured"

**Causa:** Variables de entorno no definidas

**Solución:**
```bash
# Verificar .env.local
echo $STRIPE_SECRET_KEY
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Reiniciar servidor Next.js
npm run dev
```

### Error: "Webhook signature verification failed"

**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto

**Solución:**
1. Verificar que el secret coincide con Stripe CLI o Dashboard
2. No añadir espacios extras al copiar
3. Reiniciar servidor

### Error: "Plan no tiene Price ID configurado"

**Causa:** Price IDs no actualizados en `src/lib/stripe.ts`

**Solución:**
1. Crear productos en Stripe Dashboard
2. Copiar Price IDs
3. Actualizar código
4. Rebuild (`npm run build`)

### Los límites no funcionan

**Causa 1:** Feature flag deshabilitado

**Solución:**
```bash
NEXT_PUBLIC_STRIPE_ENABLED=true
```

**Causa 2:** Función SQL no existe

**Solución:**
```sql
-- Verificar
SELECT proname FROM pg_proc WHERE proname = 'check_plan_limit';

-- Si no existe, ejecutar
\i migrations/025_subscriptions.sql
```

---

## 📝 Checklist Pre-Producción

- [ ] Claves de PRODUCCIÓN configuradas (`pk_live_`, `sk_live_`)
- [ ] Price IDs de producción actualizados
- [ ] Webhook configurado en Stripe Dashboard (URL producción)
- [ ] `STRIPE_WEBHOOK_SECRET` de producción en Vercel
- [ ] Migraciones ejecutadas en BD producción
- [ ] `NEXT_PUBLIC_STRIPE_ENABLED=true`
- [ ] Testeado flujo completo en staging
- [ ] Documentar Price IDs en notion/wiki del equipo

---

## 📚 Recursos

- [Stripe Docs](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Cards](https://stripe.com/docs/testing)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

---

**Última actualización:** 2025-01-18
**Versión:** 1.0
**Autor:** Claude Code
