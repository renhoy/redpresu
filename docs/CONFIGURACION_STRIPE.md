# Configuración de Stripe para Suscripciones

## Estado del Bloque 11

**✅ COMPLETADO:** El sistema de suscripciones con Stripe está completamente implementado.

**Progreso:** 100% (todas las funcionalidades core implementadas)

---

## 🎯 Componentes Implementados

### ✅ Backend (100%)
- **stripe.ts**: Cliente Stripe singleton con planes configurados (Free, Pro, Enterprise)
- **subscriptions.ts**: Server Actions completos
  - `getCurrentSubscription()` - Obtener suscripción actual
  - `createCheckoutSession()` - Crear sesión de checkout
  - `createPortalSession()` - Abrir portal de cliente
  - `checkPlanLimit()` - Verificar límites del plan
  - `isSubscriptionExpired()` - Verificar expiración
- **webhook/stripe/route.ts**: Webhook handler completo con:
  - Verificación de signature
  - Rate limiting (10 req/10s)
  - Event handlers (checkout.session.completed, customer.subscription.updated, deleted, invoice.payment_failed)
  - Validaciones de seguridad (VULN-011)

### ✅ UI (100%)
- **SubscriptionsClient.tsx**: Página completa de suscripciones
  - Muestra plan actual con badge de status
  - Cards de planes disponibles
  - Botones de upgrade/downgrade
  - Botón "Gestionar Suscripción" (portal de Stripe)
- **UserMenu.tsx**: Badge del plan en menú de usuario
  - Función `getPlanBadge()` con colores por plan
  - Sección "Plan Actual" visible cuando `showSubscriptions=true`

### ✅ Integración de Límites (100%)
- **createTariff()** - Verifica límite antes de crear tarifa
- **createDraftBudget()** - Verifica límite antes de crear presupuesto
- **createUser()** - Verifica límite antes de crear usuario
- **subscription-helpers.ts** - Helpers completos:
  - `canCreateTariff()`
  - `canCreateBudget()`
  - `canCreateUser()`
  - `getSubscriptionState()` - Estado de suscripción para alertas
  - Verificación de expiración con grace period

### ✅ Migraciones (100%)
- **025_subscriptions.sql**: Tabla `redpresu_subscriptions` con RLS policies

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Crear o editar el archivo `.env.local` con las siguientes variables:

```bash
# ============================================
# STRIPE CONFIGURATION
# ============================================

# Feature Flag: Habilitar suscripciones
NEXT_PUBLIC_STRIPE_ENABLED=true

# Stripe API Keys (obtener desde https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX

# Webhook Secret (obtener desde https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Configurar Productos y Precios en Stripe

#### Opción A: Modo Test (Recomendado para desarrollo)

1. Ir a https://dashboard.stripe.com/test/products
2. Crear 2 productos:

**Producto 1: Plan Pro**
- Nombre: `Redpresu Pro`
- Descripción: `Plan profesional para negocios`
- Precio: 29 EUR/mes (recurrente mensual)
- Copiar el **Price ID** (ej: `price_1ABC123...`)

**Producto 2: Plan Enterprise**
- Nombre: `Redpresu Enterprise`
- Descripción: `Plan empresarial sin límites`
- Precio: 99 EUR/mes (recurrente mensual)
- Copiar el **Price ID** (ej: `price_1DEF456...`)

3. Actualizar `src/lib/stripe.ts` con los Price IDs reales:

```typescript
export const STRIPE_PLANS: Record<PlanType, StripePlan> = {
  // ... free plan sin cambios ...

  pro: {
    // ...
    priceId: "price_1ABC123...", // ← Reemplazar con Price ID real
    // ...
  },

  enterprise: {
    // ...
    priceId: "price_1DEF456...", // ← Reemplazar con Price ID real
    // ...
  },
};
```

#### Opción B: Modo Producción

1. Ir a https://dashboard.stripe.com/products (sin `/test`)
2. Repetir los pasos de la Opción A
3. Actualizar `.env.local` con claves de producción (`sk_live_...` y `pk_live_...`)

### 3. Configurar Webhook en Stripe

#### Desarrollo Local (con Stripe CLI)

```bash
# Instalar Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Windows/Linux
# Descargar desde https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward events al webhook local
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Copiar el webhook secret que aparece (whsec_...)
# y agregarlo a .env.local como STRIPE_WEBHOOK_SECRET
```

#### Producción

1. Ir a https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://tu-dominio.com/api/webhooks/stripe`
4. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copiar el **Webhook signing secret** y agregarlo a variables de entorno

### 4. Configuración en Base de Datos

Ejecutar las siguientes configuraciones en Supabase:

```sql
-- Habilitar suscripciones en config
INSERT INTO public.config (config_key, config_value, description)
VALUES (
  'subscriptions_enabled',
  'true',
  'Habilitar sistema de suscripciones con Stripe'
)
ON CONFLICT (company_id, config_key)
DO UPDATE SET config_value = EXCLUDED.config_value;

-- Configurar grace period (días después de expiración antes de bloquear)
INSERT INTO public.config (config_key, config_value, description)
VALUES (
  'subscription_grace_period_days',
  '3',
  'Días de gracia después de expiración de suscripción'
)
ON CONFLICT (company_id, config_key)
DO UPDATE SET config_value = EXCLUDED.config_value;
```

### 5. Verificar Modo Multiempresa

El sistema de suscripciones **solo funciona en modo multiempresa**:

```sql
-- Verificar que multiempresa esté activado
SELECT config_value FROM config WHERE config_key = 'multiempresa';
-- Debe retornar: true

-- Si está en false, activar:
UPDATE config SET config_value = 'true' WHERE config_key = 'multiempresa';
```

---

## 🧪 Testing

### 1. Testing Local

```bash
# Terminal 1: Ejecutar app
npm run dev

# Terminal 2: Stripe CLI listening
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test event (opcional)
stripe trigger checkout.session.completed
```

### 2. Testing del Flujo Completo

1. **Login** como admin o superadmin
2. Ir a `/subscriptions`
3. Ver plan actual (debe ser "Free" por defecto)
4. Click en "Cambiar a Pro"
5. Se abre Stripe Checkout
6. Usar tarjeta de test: `4242 4242 4242 4242`
   - Fecha: cualquier fecha futura
   - CVC: cualquier 3 dígitos
   - ZIP: cualquier 5 dígitos
7. Completar pago
8. Verificar redirección a `/subscriptions?success=true`
9. Verificar que el plan ahora es "Pro"

### 3. Testing de Límites

**Plan Free (3 tarifas):**
1. Intentar crear 4ta tarifa
2. Debe mostrar error: "Has alcanzado el límite de 3 tarifas del plan Free"

**Plan Pro (50 tarifas):**
1. Upgrade a Pro
2. Ahora se pueden crear hasta 50 tarifas

### 4. Testing de Webhook

```bash
# Listar webhooks recibidos
stripe events list

# Ver detalles de un evento
stripe events retrieve evt_XXXXXXXXX

# Reenviar evento (si falló)
stripe events resend evt_XXXXXXXXX
```

---

## 📊 Tarjetas de Prueba Stripe

### Tarjetas Exitosas
- **Visa:** `4242 4242 4242 4242`
- **Mastercard:** `5555 5555 5555 4444`
- **American Express:** `3782 822463 10005`

### Tarjetas que Fallan
- **Pago declinado:** `4000 0000 0000 0002`
- **Fondos insuficientes:** `4000 0000 0000 9995`
- **Tarjeta expirada:** `4000 0000 0000 0069`

**Siempre usar:**
- Fecha: Cualquier fecha futura
- CVC: Cualquier 3 dígitos
- ZIP: Cualquier 5 dígitos

---

## 🔒 Seguridad Implementada

### VULN-011: Prevención de Ataques

El webhook handler incluye múltiples capas de seguridad:

1. **Rate Limiting:**
   - 10 requests por 10 segundos por IP
   - Limpieza automática del store cada minuto

2. **Signature Verification:**
   - Verifica firma Stripe en cada request
   - Previene webhooks falsos

3. **Metadata Validation:**
   - Valida `company_id` y `plan_id` en metadata
   - Previene inyección SQL

4. **Ownership Validation:**
   - Verifica que la suscripción pertenece a la empresa
   - Previene manipulación cross-company

5. **Company Existence:**
   - Verifica que la empresa existe en BD
   - Previene referencias a empresas inexistentes

---

## 🚀 Despliegue a Producción

### Checklist Pre-Producción

- [ ] Cambiar a claves de Stripe de producción (`sk_live_...`, `pk_live_...`)
- [ ] Configurar webhook en producción con URL real
- [ ] Actualizar Price IDs con productos de producción
- [ ] Configurar `NEXT_PUBLIC_STRIPE_ENABLED=true`
- [ ] Configurar `multiempresa=true` en BD
- [ ] Configurar `subscriptions_enabled=true` en BD
- [ ] Testing completo en staging
- [ ] Verificar logs de webhook en Stripe Dashboard
- [ ] Configurar alertas de webhooks fallidos

### Variables de Entorno en Vercel

1. Ir a Project Settings > Environment Variables
2. Agregar las siguientes variables con alcance "Production":
   ```
   NEXT_PUBLIC_STRIPE_ENABLED=true
   STRIPE_SECRET_KEY=sk_live_XXXXXXXXX
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXX
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXX
   ```
3. Redeploy

---

## 📝 Notas Adicionales

### Grace Period

- Por defecto: **3 días** después de expiración
- Durante el grace period, los usuarios pueden seguir creando recursos
- Después del grace period, se bloquea la creación (lectura aún permitida)
- Configurable vía `subscription_grace_period_days` en config

### Downgrade Automático

- Si una suscripción expira (no se renueva), automáticamente se revierte a **Plan Free**
- El webhook `customer.subscription.deleted` maneja este caso
- Los recursos existentes NO se eliminan, solo se previene crear nuevos

### Portal de Cliente

- Botón "Gestionar Suscripción" en `/subscriptions`
- Permite al usuario:
  - Cambiar método de pago
  - Ver historial de facturas
  - Descargar facturas en PDF
  - Cancelar suscripción
- Gestionado completamente por Stripe (no requiere UI custom)

### Metadata Requerida

Al crear checkout session, siempre incluir:
```typescript
metadata: {
  company_id: string,
  plan_id: 'pro' | 'enterprise'
}
```

---

## 📞 Soporte

- **Documentación Stripe:** https://stripe.com/docs
- **Dashboard Stripe:** https://dashboard.stripe.com
- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Webhook Testing:** https://stripe.com/docs/webhooks/test

---

**Documento creado:** 2025-11-17
**Última actualización:** 2025-11-17
**Estado:** Bloque 11 completado ✅
