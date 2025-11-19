# ✅ Checklist: Configurar redpresu.com

## Paso 1: Vercel Dashboard
- [ ] Ir a [Vercel Dashboard](https://vercel.com/dashboard) → Proyecto redpresu
- [ ] Settings → Domains → Add Domain
- [ ] Añadir `redpresu.com`
- [ ] Añadir `www.redpresu.com` (redirigir a redpresu.com)
- [ ] Copiar configuración DNS que te muestra Vercel

## Paso 2: Configurar DNS en tu Registrador
- [ ] Ir al panel de tu registrador de dominio
- [ ] Eliminar registros A/CNAME existentes para @ y www
- [ ] Añadir registro A:
  ```
  Type: A
  Name: @
  Value: 76.76.21.21
  ```
- [ ] Añadir registro CNAME:
  ```
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  ```
- [ ] Guardar cambios
- [ ] Esperar 5-30 minutos (verificar con https://dnschecker.org)

## Paso 3: Variables de Entorno en Vercel
- [ ] Vercel → Settings → Environment Variables
- [ ] Actualizar `NEXT_PUBLIC_APP_URL`:
  - Production: `https://redpresu.com`
- [ ] Actualizar `NEXTAUTH_URL`:
  - Production: `https://redpresu.com`
- [ ] Verificar que estén configuradas:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_SCHEMA`
  - `NEXTAUTH_SECRET`
  - Variables de Stripe (si aplica)

## Paso 4: Redesplegar
- [ ] Vercel → Deployments → Latest → Redeploy
- [ ] O hacer commit vacío: `git commit --allow-empty -m "chore: redeploy for domain"`

## Paso 5: Configurar Supabase
- [ ] Ir a [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Authentication → URL Configuration
- [ ] Añadir en Redirect URLs:
  - `https://redpresu.com/*`
  - `https://redpresu.com/auth/callback`
  - `https://www.redpresu.com/*`
- [ ] Actualizar Site URL a: `https://redpresu.com`

## Paso 6: Stripe (Si aplica)
- [ ] Ir a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
- [ ] Actualizar webhook URL a: `https://redpresu.com/api/webhooks/stripe`
- [ ] Copiar nuevo webhook secret
- [ ] Actualizar `STRIPE_WEBHOOK_SECRET` en Vercel

## Paso 7: Verificación
- [ ] Verificar DNS: `dig redpresu.com`
- [ ] Acceder a https://redpresu.com
- [ ] Verificar SSL (candado verde)
- [ ] Probar login/registro
- [ ] Crear un presupuesto de prueba
- [ ] Verificar que emails tengan URLs correctas

## 🎉 ¡Completado!
Tu aplicación está disponible en: **https://redpresu.com**

---

**📖 Documentación completa**: Ver `DOMAIN_SETUP.md`
