# BLOQUE 11: MÓDULO DE SUSCRIPCIONES CON STRIPE

## RESUMEN EJECUTIVO

Sistema modular de suscripciones con Stripe:

- **Activable/Desactivable** vía feature flag
- **Planes:** Free, Pro, Enterprise
- **Límites automáticos** según plan
- **Webhooks Stripe** para sincronización
- **Zero dependencias externas** (implementación custom)

---

## NUEVA TAREA: BLOQUE 11 - SUSCRIPCIONES

**Prioridad:** BAJA (Post Fase 2)  
**Duración:** 5-6 días  
**Complejidad:** MEDIA-ALTA

---

## TAREAS SUBDIVIDIDAS

### 11.1 Setup Stripe + Feature Flag

**Duración:** 0.5 días | **Complejidad:** BAJA

**Tareas:**

- ✅ Instalar `stripe` SDK
- ✅ Crear cuenta Stripe (test mode)
- ✅ Añadir env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ Crear config `subscriptions_enabled` (default: false)
- ✅ Añadir planes en config:

```json
{
  "subscriptions_enabled": false,
  "stripe_plans": {
    "free": {
      "name": "Free",
      "price_id": null,
      "price": 0,
      "limits": {
        "max_tariffs": 5,
        "max_budgets": 20,
        "max_users": 1
      }
    },
    "pro": {
      "name": "Pro",
      "price_id": "price_xxx",
      "price": 29,
      "currency": "EUR",
      "interval": "month",
      "limits": {
        "max_tariffs": 50,
        "max_budgets": 500,
        "max_users": 5
      }
    },
    "enterprise": {
      "name": "Enterprise",
      "price_id": "price_yyy",
      "price": 99,
      "currency": "EUR",
      "interval": "month",
      "limits": {
        "max_tariffs": -1,
        "max_budgets": -1,
        "max_users": -1
      }
    }
  }
}
```

**Archivos nuevos:**

- `src/lib/stripe.ts` (cliente Stripe)

**Archivos modificados:**

- `.env.local`
- Tabla `config` (SQL insert)

**Criterio completado:**

- ✅ SDK instalado
- ✅ Config creada en BD
- ✅ Cliente Stripe funcional

---

### 11.2 Migración Base de Datos

**Duración:** 1 día | **Complejidad:** MEDIA

**Tareas:**

- ✅ Crear tabla `subscriptions`
- ✅ Añadir columna `plan` a `empresas`
- ✅ Trigger para verificar límites
- ✅ Función helper `checkPlanLimit()`

**Migración:**

```sql
-- migrations/031_subscriptions.sql

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscriptions_empresa ON subscriptions(empresa_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Añadir plan a empresas (default: free)
ALTER TABLE empresas
  ADD COLUMN plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise'));

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select"
ON subscriptions FOR SELECT
USING (empresa_id = (SELECT empresa_id FROM users WHERE id = auth.uid()));

-- Solo superadmin puede modificar
CREATE POLICY "subscriptions_admin_all"
ON subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Función verificar límites
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_empresa_id INTEGER,
  p_resource TEXT,
  p_current_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_config JSONB;
BEGIN
  -- Obtener plan de la empresa
  SELECT plan INTO v_plan FROM empresas WHERE id = p_empresa_id;

  -- Obtener límites desde config
  SELECT config_value INTO v_config
  FROM config
  WHERE config_key = 'stripe_plans';

  v_limit := (v_config -> v_plan -> 'limits' ->> p_resource)::INTEGER;

  -- -1 significa ilimitado
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN p_current_count < v_limit;
END;
$$ LANGUAGE plpgsql;
```

**Criterio completado:**

- ✅ Tabla subscriptions creada
- ✅ Columna plan en empresas
- ✅ RLS policies aplicadas
- ✅ Función límites funcional

---

### 11.3 Server Actions Suscripciones

**Duración:** 1.5 días | **Complejidad:** MEDIA

**Tareas:**

- ✅ `createCheckoutSession()` - Crear sesión Stripe
- ✅ `getSubscription()` - Obtener suscripción actual
- ✅ `cancelSubscription()` - Cancelar suscripción
- ✅ `checkResourceLimit()` - Verificar límite antes de crear recurso

**Archivos nuevos:**

- `src/app/actions/subscriptions.ts`

**Implementación:**

```typescript
// src/app/actions/subscriptions.ts
"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/auth/server";
import stripe from "@/lib/stripe";
import { getConfigValue } from "@/lib/helpers/config-helpers";

export async function createCheckoutSession(planId: "pro" | "enterprise") {
  try {
    const user = await getServerUser();
    if (!user) return { success: false, error: "No autenticado" };

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    // Obtener/crear customer
    let subscription = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("empresa_id", user.empresa_id)
      .single();

    let customerId = subscription.data?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { empresa_id: user.empresa_id.toString() },
      });
      customerId = customer.id;
    }

    // Obtener price_id del plan
    const plans = await getConfigValue<any>("stripe_plans");
    const priceId = plans[planId].price_id;

    // Crear checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_URL}/settings/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings/subscription?canceled=true`,
      metadata: { empresa_id: user.empresa_id.toString() },
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error("[createCheckoutSession] Error:", error);
    return { success: false, error: "Error al crear sesión" };
  }
}

export async function getSubscription() {
  try {
    const user = await getServerUser();
    if (!user) return { success: false, error: "No autenticado" };

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("empresa_id", user.empresa_id)
      .single();

    // Si no hay suscripción, retornar plan free
    if (!data) {
      return {
        success: true,
        data: {
          plan: "free",
          status: "active",
          current_period_end: null,
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[getSubscription] Error:", error);
    return { success: false, error: "Error al obtener suscripción" };
  }
}

export async function cancelSubscription() {
  try {
    const user = await getServerUser();
    if (!user || user.role !== "admin") {
      return { success: false, error: "Sin permisos" };
    }

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("empresa_id", user.empresa_id)
      .single();

    if (!sub?.stripe_subscription_id) {
      return { success: false, error: "Sin suscripción activa" };
    }

    // Cancelar al final del periodo
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return { success: true };
  } catch (error) {
    console.error("[cancelSubscription] Error:", error);
    return { success: false, error: "Error al cancelar" };
  }
}

export async function checkResourceLimit(
  resource: "tariffs" | "budgets" | "users"
): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    // Contar recursos actuales
    const tables = {
      tariffs: "tariffs",
      budgets: "budgets",
      users: "users",
    };

    const { count } = await supabase
      .from(tables[resource])
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", user.empresa_id);

    // Verificar límite
    const { data } = await supabase.rpc("check_plan_limit", {
      p_empresa_id: user.empresa_id,
      p_resource: `max_${resource}`,
      p_current_count: count || 0,
    });

    return data as boolean;
  } catch (error) {
    console.error("[checkResourceLimit] Error:", error);
    return false;
  }
}
```

**Criterio completado:**

- ✅ Checkout session funcional
- ✅ Obtención suscripción correcta
- ✅ Cancelación al final de periodo
- ✅ Verificación límites operativa

---

### 11.4 Webhook Handler Stripe

**Duración:** 1 día | **Complejidad:** MEDIA-ALTA

**Tareas:**

- ✅ Crear API route `/api/webhooks/stripe`
- ✅ Verificar signature Stripe
- ✅ Manejar eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- ✅ Actualizar BD según eventos

**Archivos nuevos:**

- `src/app/api/webhooks/stripe/route.ts`

**Implementación:**

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Webhook] Error verificando signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[Webhook] Evento recibido:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const empresaId = parseInt(session.metadata!.empresa_id);

        // Obtener suscripción
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Crear/actualizar registro
        await supabaseAdmin.from("subscriptions").upsert({
          empresa_id: empresaId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan: getPlanFromPriceId(subscription.items.data[0].price.id),
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date(),
        });

        // Actualizar plan en empresas
        await supabaseAdmin
          .from("empresas")
          .update({
            plan: getPlanFromPriceId(subscription.items.data[0].price.id),
          })
          .eq("id", empresaId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const empresaId = parseInt(subscription.metadata.empresa_id);

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: getPlanFromPriceId(subscription.items.data[0].price.id),
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date(),
          })
          .eq("stripe_subscription_id", subscription.id);

        await supabaseAdmin
          .from("empresas")
          .update({
            plan: getPlanFromPriceId(subscription.items.data[0].price.id),
          })
          .eq("id", empresaId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const empresaId = parseInt(subscription.metadata.empresa_id);

        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date() })
          .eq("stripe_subscription_id", subscription.id);

        // Volver a plan free
        await supabaseAdmin
          .from("empresas")
          .update({ plan: "free" })
          .eq("id", empresaId);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error procesando evento:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

function getPlanFromPriceId(priceId: string): string {
  // Mapear price_id a plan (hardcoded o desde config)
  const priceMap: Record<string, string> = {
    price_xxx: "pro",
    price_yyy: "enterprise",
  };
  return priceMap[priceId] || "free";
}
```

**Criterio completado:**

- ✅ Webhook verifica signature
- ✅ Eventos procesados correctamente
- ✅ BD sincronizada con Stripe
- ✅ Plan actualizado en empresas

---

### 11.5 UI Suscripciones

**Duración:** 1.5 días | **Complejidad:** MEDIA

**Tareas:**

- ✅ Página `/settings/subscription`
- ✅ Componente `SubscriptionPlans.tsx` (cards planes)
- ✅ Componente `CurrentSubscription.tsx` (plan actual)
- ✅ Badge plan en Header
- ✅ Bloqueo UI cuando límite alcanzado

**Archivos nuevos:**

- `src/app/settings/subscription/page.tsx`
- `src/components/subscriptions/SubscriptionPlans.tsx`
- `src/components/subscriptions/CurrentSubscription.tsx`
- `src/components/subscriptions/PlanBadge.tsx`
- `src/components/subscriptions/LimitWarning.tsx`

**Implementación:**

```typescript
// src/components/subscriptions/SubscriptionPlans.tsx
"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { createCheckoutSession } from "@/app/actions/subscriptions";
import { toast } from "sonner";

export function SubscriptionPlans({ currentPlan }: { currentPlan: string }) {
  async function handleUpgrade(plan: "pro" | "enterprise") {
    const result = await createCheckoutSession(plan);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast.error(result.error);
    }
  }

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      features: ["5 tarifas", "20 presupuestos", "1 usuario"],
    },
    {
      id: "pro",
      name: "Pro",
      price: 29,
      features: [
        "50 tarifas",
        "500 presupuestos",
        "5 usuarios",
        "Soporte prioritario",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 99,
      features: [
        "Tarifas ilimitadas",
        "Presupuestos ilimitados",
        "Usuarios ilimitados",
        "Soporte dedicado",
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={currentPlan === plan.id ? "border-primary" : ""}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>{plan.name}</CardTitle>
              {currentPlan === plan.id && <Badge>Actual</Badge>}
            </div>
            <CardDescription>
              <span className="text-3xl font-bold">{plan.price}€</span>
              {plan.price > 0 && (
                <span className="text-muted-foreground">/mes</span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            {plan.id === "free" ? (
              <Button variant="outline" disabled className="w-full">
                Plan Gratuito
              </Button>
            ) : currentPlan === plan.id ? (
              <Button variant="outline" disabled className="w-full">
                Plan Activo
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgrade(plan.id as "pro" | "enterprise")}
                className="w-full"
              >
                Actualizar
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

**Criterio completado:**

- ✅ UI muestra planes disponibles
- ✅ Plan actual resaltado
- ✅ Checkout funcional
- ✅ Badge en header visible
- ✅ Bloqueo al alcanzar límite

---

### 11.6 Integración con Recursos Existentes

**Duración:** 0.5 días | **Complejidad:** BAJA

**Tareas:**

- ✅ Modificar `createTariff()` - verificar límite
- ✅ Modificar `createBudget()` - verificar límite
- ✅ Modificar `createUser()` - verificar límite
- ✅ Toast informativo cuando límite alcanzado

**Archivos modificados:**

- `src/app/actions/tariffs.ts`
- `src/app/actions/budgets.ts`
- `src/app/actions/users.ts`

**Implementación:**

```typescript
// src/app/actions/tariffs.ts (ejemplo)
export async function createTariff(formData: FormData) {
  // Verificar límite ANTES de crear
  const withinLimit = await checkResourceLimit("tariffs");

  if (!withinLimit) {
    return {
      success: false,
      error:
        "Has alcanzado el límite de tarifas de tu plan. Actualiza para continuar.",
    };
  }

  // ... lógica existente
}
```

**Criterio completado:**

- ✅ Límites verificados en creación
- ✅ Mensajes informativos
- ✅ Enlaces a upgrade en error
- ✅ No rompe funcionalidad existente

---

## CAMBIOS EN DOCUMENTACIÓN

### tareas.md

```markdown
## BLOQUE 11: SUSCRIPCIONES STRIPE ⏳

**Estado:** ⏳ Pendiente (Post Fase 2)

### Tareas Críticas:

#### 11.1 Setup Stripe + Feature Flag

**Prioridad:** ALTA | **Estimación:** 0.5 días | **Estado:** ⏳

- [ ] Instalar stripe SDK
- [ ] Configurar env vars
- [ ] Crear config planes en BD

#### 11.2 Migración Base de Datos

**Prioridad:** ALTA | **Estimación:** 1 día | **Estado:** ⏳

- [ ] Tabla subscriptions
- [ ] Columna plan en empresas
- [ ] Función check_plan_limit

#### 11.3 Server Actions

**Prioridad:** ALTA | **Estimación:** 1.5 días | **Estado:** ⏳

- [ ] createCheckoutSession
- [ ] getSubscription
- [ ] cancelSubscription
- [ ] checkResourceLimit

#### 11.4 Webhook Handler

**Prioridad:** CRÍTICA | **Estimación:** 1 día | **Estado:** ⏳

- [ ] API route /api/webhooks/stripe
- [ ] Verificación signature
- [ ] Manejo eventos Stripe

#### 11.5 UI Suscripciones

**Prioridad:** MEDIA | **Estimación:** 1.5 días | **Estado:** ⏳

- [ ] Página subscription
- [ ] Componente SubscriptionPlans
- [ ] Badge plan en Header

#### 11.6 Integración Recursos

**Prioridad:** ALTA | **Estimación:** 0.5 días | **Estado:** ⏳

- [ ] Verificar límites en createTariff
- [ ] Verificar límites en createBudget
- [ ] Verificar límites en createUser

**Duración total:** 5-6 días
```

### planificacion.md

```markdown
## SEMANA 14-15: Suscripciones Stripe ⏳

**Objetivo:** Sistema completo de monetización

**Bloque 11: Suscripciones**

| Día | Tarea                    | Responsable | Estado |
| --- | ------------------------ | ----------- | ------ |
| 1   | Setup + Migración        | Backend     | ⏳     |
| 2-3 | Server Actions + Webhook | Backend     | ⏳     |
| 4-5 | UI Suscripciones         | Frontend    | ⏳     |
| 6   | Integración + Testing    | Full-stack  | ⏳     |

**Entregables:**

- ⏳ Sistema de planes (Free/Pro/Enterprise)
- ⏳ Checkout Stripe funcional
- ⏳ Webhooks sincronizados
- ⏳ Límites automáticos por plan
- ⏳ Feature flag para activar/desactivar
```

### prd.md

````markdown
## BLOQUE 11: Suscripciones (FASE 3)

**Prioridad:** BAJA
**Complejidad:** MEDIA-ALTA
**Impacto:** Monetización, SaaS completo

**Funcionalidades:**

- Sistema de planes (Free, Pro, Enterprise)
- Checkout Stripe integrado
- Webhooks para sincronización automática
- Límites por plan (tarifas, presupuestos, usuarios)
- Portal del cliente Stripe (gestión tarjetas, facturas)
- Feature flag para activar/desactivar módulo

**Planes:**

| Feature      | Free | Pro     | Enterprise |
| ------------ | ---- | ------- | ---------- |
| Tarifas      | 5    | 50      | Ilimitadas |
| Presupuestos | 20   | 500     | Ilimitados |
| Usuarios     | 1    | 5       | Ilimitados |
| Precio       | 0€   | 29€/mes | 99€/mes    |

**Flujo de usuario:**

1. Usuario en plan Free alcanza límite
2. Toast muestra "Límite alcanzado. Actualizar plan"
3. Click lleva a `/settings/subscription`
4. Selecciona plan Pro/Enterprise
5. Stripe Checkout (pago con tarjeta)
6. Webhook actualiza BD automáticamente
7. Límites ampliados inmediatamente

**Feature Flag:**

```typescript
// Activar/desactivar en config
const enabled = await getConfigValue("subscriptions_enabled");

if (!enabled) {
  // Plan siempre 'free', sin límites
  return true;
}

// Si habilitado, verificar límites
return checkResourceLimit(resource);
```
````

````

### claude.md

```markdown
## ✅ ARCHIVOS PERMITIDOS - BLOQUE 11

### Suscripciones Stripe

**Status:** ⏳ Pendiente (Post Fase 2)

````

✅ migrations/031_subscriptions.sql (NUEVO)
✅ src/lib/stripe.ts (NUEVO - cliente Stripe)
✅ src/app/api/webhooks/stripe/route.ts (NUEVO - webhook handler)
✅ src/app/actions/subscriptions.ts (NUEVO - Server Actions)
✅ src/app/settings/subscription/ (NUEVO - página suscripciones)
✅ src/components/subscriptions/ (NUEVO - componentes UI)
⚠️ src/app/actions/tariffs.ts (MODIFICAR - añadir checkResourceLimit)
⚠️ src/app/actions/budgets.ts (MODIFICAR - añadir checkResourceLimit)
⚠️ src/app/actions/users.ts (MODIFICAR - añadir checkResourceLimit)
⚠️ src/components/layout/Header.tsx (MODIFICAR - añadir PlanBadge)
⚠️ .env.local (AÑADIR: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)
⚠️ package.json (AÑADIR: stripe)

```

## BLOQUE 11: Suscripciones ⏳

### Funcionalidades:

20. ⏳ Planes Free/Pro/Enterprise
21. ⏳ Checkout Stripe
22. ⏳ Webhooks sincronización
23. ⏳ Límites automáticos
24. ⏳ Feature flag modular
```

---

## CONFIGURACIÓN STRIPE

### Dashboard Stripe (test mode):

1. **Crear productos:**

   - Pro: 29€/mes
   - Enterprise: 99€/mes

2. **Obtener price_ids:**

   - Copiar IDs → actualizar config BD

3. **Crear webhook:**

   - URL: `https://tudominio.com/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copiar secret → `.env.local`

4. **Obtener API keys:**
   - Publishable key → `.env.local`
   - Secret key → `.env.local`

---

## TESTING

### Casos de prueba:

**11.3 - Server Actions:**

- ✅ Crear checkout session exitoso
- ✅ Obtener suscripción actual
- ✅ Verificar límites (dentro/fuera)
- ✅ Cancelar suscripción

**11.4 - Webhook:**

- ✅ Signature válida → evento procesado
- ✅ Signature inválida → error 400
- ✅ Evento checkout.session.completed → BD actualizada
- ✅ Evento subscription.deleted → plan = free

**11.6 - Integración:**

- ✅ createTariff con límite alcanzado → error
- ✅ createBudget dentro límite → éxito
- ✅ Plan upgrade → límites ampliados inmediatamente

---

## CRITERIOS DE COMPLETADO

**Funcional:**

- ✅ Checkout Stripe funcional (test mode)
- ✅ Webhooks sincronizados correctamente
- ✅ Límites verificados antes de crear recursos
- ✅ Feature flag activa/desactiva módulo
- ✅ Cancelación de suscripción operativa

**Calidad:**

- ✅ 0 errores en webhook logs
- ✅ BD siempre sincronizada con Stripe
- ✅ Manejo correcto de errores de pago
- ✅ Tests unitarios > 70% coverage
- ✅ Webhook verifica signature correctamente

**UX:**

- ✅ UI planes clara y atractiva
- ✅ Mensajes informativos al alcanzar límite
- ✅ Proceso checkout fluido (< 3 clics)
- ✅ Badge plan visible en header
- ✅ Portal cliente accesible (facturas, tarjetas)

**Seguridad:**

- ✅ Webhook signature siempre verificada
- ✅ Secret keys en variables de entorno
- ✅ RLS policies protegen tabla subscriptions
- ✅ Solo admin puede gestionar suscripciones

---

## ROLLOUT Y ACTIVACIÓN

### Paso 1: Deploy sin activar

```sql
-- Feature flag desactivado por defecto
UPDATE config
SET config_value = jsonb_set(config_value, '{subscriptions_enabled}', 'false')
WHERE config_key = 'stripe_plans';
```

**Estado:** Código desplegado, módulo inactivo, sin impacto usuarios

### Paso 2: Testing en producción

```sql
-- Activar solo para empresa de prueba
UPDATE empresas
SET plan = 'pro'
WHERE id = 999; -- empresa test
```

**Validar:**

- Límites se aplican correctamente
- Webhook recibe eventos
- BD se sincroniza

### Paso 3: Activación gradual

```sql
-- Activar módulo globalmente
UPDATE config
SET config_value = jsonb_set(config_value, '{subscriptions_enabled}', 'true')
WHERE config_key = 'stripe_plans';
```

**Comunicar:** Email a usuarios existentes explicando cambios

### Paso 4: Migración usuarios existentes

**Opción A - Grandfathering (recomendado):**

```sql
-- Usuarios existentes → plan Pro gratis por 3 meses
UPDATE empresas
SET plan = 'pro',
    grandfathered_until = NOW() + INTERVAL '3 months'
WHERE created_at < '2025-XX-XX'; -- fecha activación
```

**Opción B - Plan Free estricto:**

```sql
-- Todos inician en Free
UPDATE empresas SET plan = 'free';
```

---

## MONITOREO POST-ACTIVACIÓN

### Métricas clave:

**Dashboard Stripe:**

- Suscripciones activas
- Tasa conversión Free → Pro
- MRR (Monthly Recurring Revenue)
- Churn rate

**Logs aplicación:**

```typescript
// Añadir logging en puntos críticos
console.log("[Subscription] Límite alcanzado:", {
  empresaId,
  resource,
  currentCount,
  limit,
});

console.log("[Webhook] Evento procesado:", {
  type: event.type,
  empresaId,
  newPlan,
});
```

**Queries analíticas:**

```sql
-- Empresas por plan
SELECT plan, COUNT(*)
FROM empresas
GROUP BY plan;

-- Límites más alcanzados
SELECT
  e.plan,
  COUNT(CASE WHEN tariffs_count >= limits.max_tariffs THEN 1 END) as tariffs_maxed,
  COUNT(CASE WHEN budgets_count >= limits.max_budgets THEN 1 END) as budgets_maxed
FROM empresas e
JOIN (SELECT empresa_id, COUNT(*) as tariffs_count FROM tariffs GROUP BY empresa_id) t ON e.id = t.empresa_id
-- ... resto de joins
```

---

## MEJORAS FUTURAS (FASE 4)

### 11.7 Portal del Cliente Stripe

**Duración:** 1 día | **Complejidad:** BAJA

**Funcionalidad:**

- Botón "Gestionar suscripción" → Portal Stripe
- Usuario puede:
  - Actualizar tarjeta de pago
  - Ver historial de facturas
  - Cambiar plan
  - Cancelar suscripción

**Implementación:**

```typescript
export async function createPortalSession() {
  const user = await getServerUser();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("empresa_id", user.empresa_id)
    .single();

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_URL}/settings/subscription`,
  });

  return { success: true, url: session.url };
}
```

---

### 11.8 Soft Limits (Avisos)

**Duración:** 0.5 días | **Complejidad:** BAJA

**Funcionalidad:**

- Avisar al llegar al 80% del límite
- Banner persistente: "Has usado 4/5 tarifas. Actualiza tu plan"
- Toast al crear recurso cerca del límite

**Implementación:**

```typescript
export async function getResourceUsage() {
  const user = await getServerUser();
  const plans = await getConfigValue("stripe_plans");
  const limits = plans[user.plan].limits;

  const counts = {
    tariffs: await countResources("tariffs"),
    budgets: await countResources("budgets"),
    users: await countResources("users"),
  };

  return {
    tariffs: {
      current: counts.tariffs,
      limit: limits.max_tariffs,
      percentage: (counts.tariffs / limits.max_tariffs) * 100,
    },
    // ... resto
  };
}
```

**UI:**

```typescript
// Componente banner warning
{
  usage.tariffs.percentage >= 80 && (
    <Alert variant="warning">
      <AlertTitle>Límite próximo</AlertTitle>
      <AlertDescription>
        Has usado {usage.tariffs.current}/{usage.tariffs.limit} tarifas.
        <Button variant="link">Actualizar plan</Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

### 11.9 Período de Prueba (Trial)

**Duración:** 1 día | **Complejidad:** MEDIA

**Funcionalidad:**

- Nuevos usuarios: 14 días trial del plan Pro
- Después → downgrade a Free o pagar
- Notificaciones por email (día 7, día 13, expiración)

**Implementación:**

```typescript
// Al crear empresa nueva
const trialEnd = new Date()
trialEnd.setDate(trialEnd.getDate() + 14)

await supabase.from('subscriptions').insert({
  empresa_id: newEmpresaId,
  plan: 'pro',
  status: 'trialing',
  trial_end: trialEnd
})

// Cron job diario verificar trials expirados
export async function checkExpiredTrials() {
  const { data: expired } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'trialing')
    .lt('trial_end', new Date())

  for (const sub of expired) {
    // Downgrade a free
    await supabase
      .from('empresas')
      .update({ plan: 'free' })
      .eq('id', sub.empresa_id)

    // Enviar email
    await sendEmail({
      to: sub.email,
      template: 'trial-expired',
      data: { ... }
    })
  }
}
```

---

### 11.10 Analytics Dashboard

**Duración:** 2 días | **Complejidad:** MEDIA

**Funcionalidad:**

- Página `/admin/analytics` (solo superadmin)
- Métricas:
  - MRR total
  - Distribución por plan
  - Gráfica conversiones
  - Churn mensual
  - LTV (Lifetime Value)

**Implementación:**

```typescript
// Server Action
export async function getSubscriptionAnalytics() {
  const user = await getServerUser();
  if (user.role !== "superadmin") {
    return { success: false, error: "Sin permisos" };
  }

  const [plans, mrr, churn] = await Promise.all([
    getDistributionByPlan(),
    calculateMRR(),
    calculateChurnRate(),
  ]);

  return {
    success: true,
    data: {
      totalSubscriptions: plans.reduce((a, b) => a + b.count, 0),
      mrr,
      churn,
      planDistribution: plans,
      growthRate: calculateGrowth(),
    },
  };
}
```

---

## TROUBLESHOOTING

### Problema: Webhook no recibe eventos

**Diagnóstico:**

```bash
# Verificar endpoint accesible
curl https://tudominio.com/api/webhooks/stripe

# Revisar logs Stripe Dashboard
# Dashboard > Developers > Webhooks > [tu webhook] > Events
```

**Solución:**

1. Verificar URL correcta en Stripe Dashboard
2. Verificar webhook secret en `.env.local`
3. Verificar CORS (Stripe envía POST)
4. Revisar logs Vercel/servidor

---

### Problema: Signature inválida

**Diagnóstico:**

```typescript
console.log("Raw body:", body.substring(0, 100));
console.log("Signature:", signature);
console.log("Secret:", process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10));
```

**Solución:**

1. Verificar `STRIPE_WEBHOOK_SECRET` correcto
2. NO parsear body antes de verificar (usar `req.text()`)
3. Verificar Stripe webhook en test mode → usar test secret

---

### Problema: BD no se actualiza tras pago

**Diagnóstico:**

```typescript
// Añadir logs en webhook handler
console.log("[Webhook] Procesando:", event.type);
console.log("[Webhook] Metadata:", session.metadata);
console.log("[Webhook] Empresa ID:", empresaId);
```

**Solución:**

1. Verificar `empresa_id` en metadata del checkout session
2. Verificar RLS policies permiten INSERT/UPDATE
3. Usar `supabaseAdmin` (service role) en webhooks
4. Revisar logs Supabase Dashboard

---

### Problema: Límites no se aplican

**Diagnóstico:**

```sql
-- Verificar plan empresa
SELECT id, plan FROM empresas WHERE id = X;

-- Verificar función check_plan_limit
SELECT check_plan_limit(1, 'max_tariffs', 10);

-- Verificar config planes
SELECT config_value FROM config WHERE config_key = 'stripe_plans';
```

**Solución:**

1. Verificar plan actualizado en tabla `empresas`
2. Verificar config `stripe_plans` tiene límites correctos
3. Verificar función SQL `check_plan_limit` ejecuta sin errores
4. Verificar `checkResourceLimit()` se llama ANTES de insert

---

## SEGURIDAD Y BEST PRACTICES

### ✅ Hacer:

1. **Siempre verificar signature** en webhooks
2. **Usar Supabase Admin** (service role) en webhooks (bypass RLS)
3. **Logs detallados** de eventos Stripe (auditoría)
4. **Idempotencia** en webhooks (eventos pueden duplicarse)
5. **Metadata** empresa_id en todos los objetos Stripe
6. **Test mode primero** → Production después
7. **Backup BD** antes de activar módulo
8. **Rate limiting** en API routes (prevenir spam)

### ❌ NO Hacer:

1. **NO exponer secret keys** en cliente
2. **NO confiar en datos cliente** (siempre validar servidor)
3. **NO omitir verificación signature** (crítico seguridad)
4. **NO hardcodear price_ids** en código (usar config BD)
5. **NO aplicar límites sin feature flag** (permitir desactivar)
6. **NO eliminar suscripciones** de BD (soft delete → status canceled)
7. **NO ignorar eventos webhook** duplicados (idempotencia)

---

## COMUNICACIÓN A USUARIOS

### Email: Activación de Suscripciones

**Asunto:** Nuevos planes para potenciar tu negocio

**Cuerpo:**

```
Hola [Nombre],

Nos complace anunciarte la llegada de nuestros nuevos planes de suscripción.

**¿Qué cambia?**
- Plan Free: 5 tarifas, 20 presupuestos (sin cambios)
- Plan Pro (nuevo): 50 tarifas, 500 presupuestos, 5 usuarios - 29€/mes
- Plan Enterprise (nuevo): Recursos ilimitados - 99€/mes

**¿Afecta a mi cuenta actual?**
Como usuario existente, disfrutarás del Plan Pro GRATIS durante 3 meses.

**¿Qué necesito hacer?**
Nada. Tu cuenta ya está actualizada. Después de 3 meses, puedes:
- Continuar con Plan Pro (29€/mes)
- Volver a Plan Free (sin coste)

[Ver detalles de planes]

Gracias por confiar en nosotros.
El equipo de [App]
```

---

## ROADMAP MÓDULO SUSCRIPCIONES

### Fase 1 - MVP (Bloque 11.1-11.6) ✅

- Setup Stripe + Feature flag
- Tabla subscriptions
- Checkout y webhooks
- UI básica
- Límites aplicados

**Duración:** 5-6 días

### Fase 2 - Mejoras UX (Bloque 11.7-11.8)

- Portal del cliente
- Soft limits (avisos 80%)
- Mejoras UI (comparativa planes)

**Duración:** 2 días

### Fase 3 - Adquisición (Bloque 11.9)

- Período de prueba 14 días
- Emails automáticos trial
- Onboarding mejorado

**Duración:** 1-2 días

### Fase 4 - Analytics (Bloque 11.10)

- Dashboard métricas
- Reportes MRR/Churn
- Predicciones ML (opcional)

**Duración:** 2-3 días

---

## DEPENDENCIES

### NPM Packages:

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  }
}
```

### Environment Variables:

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Production
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Supabase:

```sql
-- Service Role Key necesaria para webhooks
-- Dashboard > Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## ESTIMACIÓN COMPLETA

| Tarea               | Días          | Complejidad    |
| ------------------- | ------------- | -------------- |
| 11.1 Setup          | 0.5           | Baja           |
| 11.2 Migración      | 1.0           | Media          |
| 11.3 Server Actions | 1.5           | Media          |
| 11.4 Webhook        | 1.0           | Media-Alta     |
| 11.5 UI             | 1.5           | Media          |
| 11.6 Integración    | 0.5           | Baja           |
| **Total MVP**       | **6 días**    | **Media**      |
| 11.7 Portal         | 1.0           | Baja           |
| 11.8 Soft limits    | 0.5           | Baja           |
| 11.9 Trial          | 1.0           | Media          |
| 11.10 Analytics     | 2.0           | Media          |
| **Total Completo**  | **10.5 días** | **Media-Alta** |

---

## RIESGOS IDENTIFICADOS

### Riesgo 1: Webhooks pierden eventos

**Probabilidad:** Media | **Impacto:** Alto  
**Mitigación:**

- Idempotencia en handler (guardar `stripe_event_id`)
- Logs detallados de todos los eventos
- Cron job reconciliación diaria con Stripe API

### Riesgo 2: Usuarios bloqueados incorrectamente

**Probabilidad:** Baja | **Impacto:** Crítico  
**Mitigación:**

- Testing exhaustivo límites
- Feature flag permite desactivar módulo
- Logs detallados de verificaciones límite
- Override manual por superadmin

### Riesgo 3: Sincronización BD-Stripe desalineada

**Probabilidad:** Media | **Impacto:** Alto  
**Mitigación:**

- Webhook como fuente de verdad
- Cron job verificar estado cada 24h
- Dashboard admin mostrar discrepancias
- Script reconciliación manual

### Riesgo 4: Migración usuarios existentes problemática

**Probabilidad:** Alta | **Impacto:** Medio  
**Mitigación:**

- Grandfathering (3 meses Pro gratis)
- Comunicación clara por email
- Soporte dedicado primera semana
- Rollback plan si falla

---

## CHECKLIST PRE-ACTIVACIÓN

### Configuración:

- [ ] Stripe account verificada (test + production)
- [ ] Productos creados en Stripe Dashboard
- [ ] Webhook endpoint configurado
- [ ] API keys en variables de entorno
- [ ] Config planes en BD actualizada

### Código:

- [ ] Todos los tests pasando
- [ ] Webhook verifica signature
- [ ] Límites aplicados correctamente
- [ ] UI responsive mobile/desktop
- [ ] Feature flag funcional

### Base de Datos:

- [ ] Migración 031 ejecutada
- [ ] RLS policies aplicadas
- [ ] Función check_plan_limit operativa
- [ ] Backup BD realizado

### Testing:

- [ ] Checkout funcional (test mode)
- [ ] Webhook recibe eventos
- [ ] BD sincronizada tras pago
- [ ] Límites bloquean creación
- [ ] Cancelación funciona

### Documentación:

- [ ] Usuarios informados por email
- [ ] Soporte preparado para dudas
- [ ] FAQ actualizada
- [ ] Roadmap comunicado

### Monitoreo:

- [ ] Logs webhook configurados
- [ ] Alertas errores activas
- [ ] Dashboard métricas preparado
- [ ] Proceso rollback documentado

---

## CONCLUSIÓN

El módulo de suscripciones es **viable y recomendado** para implementar custom en tu arquitectura actual.

**Ventajas sobre boilerplates:**

- ✅ Control total del código
- ✅ Integración nativa con tu stack
- ✅ Feature flag para activar gradualmente
- ✅ Sin dependencias externas pesadas
- ✅ Mantenible a largo plazo

**Complejidad real:** Media (no es tan difícil como parece)

**ROI:** Alto (monetización directa del SaaS)

**Recomendación:** Implementar después de Bloque 9 (Responsive) o Bloque 10 (Sistema Ayuda), cuando la app esté madura y tenga usuarios activos.

---

**Documento:** Bloque 11 - Suscripciones Stripe  
**Versión:** 1.0  
**Fecha:** 2025-01-18  
**Estado:** Planificado (Post Fase 2)  
**Prioridad:** MEDIA-BAJA  
**Siguiente revisión:** Fin Fase 2
