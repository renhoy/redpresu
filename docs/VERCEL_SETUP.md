# Configuración de Entornos en Vercel

Esta guía explica cómo configurar las variables de entorno en Vercel para tener diferentes modos según el entorno.

## 🎯 Objetivo

- **Development** (local): Modo TEST
- **Preview** (ramas): Modo TEST
- **Production** (main): Modo LIVE (o TEST hasta que estés listo)

## 📋 Configuración en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**

### 1. Variables comunes (TODOS los entornos)

Marca: ☑️ Development, ☑️ Preview, ☑️ Production

| Variable | Valor | Notas |
|----------|-------|-------|
| `NEXTAUTH_SECRET` | `vcNT1XTil91INuWZgAfJH81j4DkgMR/F39JrOL2YFdg=` | Mismo en todos |
| `NEXT_PUBLIC_STRIPE_ENABLED` | `true` | Mismo en todos |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://proyecto.supabase.co` | Mismo en todos* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `tu-anon-key` | Mismo en todos* |
| `SUPABASE_SERVICE_ROLE_KEY` | `tu-service-role-key` | Mismo en todos* |
| `DATABASE_URL` | `postgresql://...` | Mismo en todos* |

\* O usa proyectos separados de Supabase si prefieres.

### 2. Stripe para Development + Preview (SOLO modo TEST)

Marca: ☑️ Development, ☑️ Preview, ☐ Production

| Variable | Valor | Dónde encontrarlo |
|----------|-------|-------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_51J...abc123` | Stripe Dashboard (Test mode) → Developers → API keys |
| `STRIPE_SECRET_KEY` | `sk_test_51J...xyz789` | Stripe Dashboard (Test mode) → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_test_abc123...` | Stripe Dashboard (Test mode) → Developers → Webhooks |

### 3. Stripe para Production (modo LIVE)

Marca: ☐ Development, ☐ Preview, ☑️ Production

| Variable | Valor | Dónde encontrarlo |
|----------|-------|-------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_51M...real567` | Stripe Dashboard (Live mode) → Developers → API keys |
| `STRIPE_SECRET_KEY` | `sk_live_51M...real890` | Stripe Dashboard (Live mode) → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_ghi789...` | Stripe Dashboard (Live mode) → Developers → Webhooks |

> ⚠️ **Importante:** Puedes configurar Production con valores de **TEST** al principio y cambiarlos a **LIVE** cuando estés listo para cobrar de verdad.

## 📊 Resumen visual

```
┌─────────────────┬──────────────┬─────────┬────────────┐
│ Variable        │ Development  │ Preview │ Production │
├─────────────────┼──────────────┼─────────┼────────────┤
│ NEXTAUTH_SECRET │ mismo        │ mismo   │ mismo      │
│ SUPABASE_*      │ mismo        │ mismo   │ mismo      │
│ STRIPE_*        │ pk_test_...  │ pk_test │ pk_live... │
│                 │ sk_test_...  │ sk_test │ sk_live... │
└─────────────────┴──────────────┴─────────┴────────────┘
```

## 🚀 Despliegue

### Development (local)
```bash
vercel dev
```
→ Usa Stripe TEST automáticamente

### Preview (ramas)
```bash
git push origin tu-rama
```
→ Vercel despliega automáticamente
→ URL: `proyecto-git-tu-rama.vercel.app`
→ Usa Stripe TEST automáticamente

### Production (main)
```bash
git push origin main
```
→ Vercel despliega automáticamente
→ URL: tu dominio principal
→ Usa Stripe LIVE (o TEST si configuraste test)

## 🔄 Cambiar de TEST a LIVE en Production

Cuando estés listo para pagos reales:

1. **Ve a Stripe Dashboard (LIVE mode)**
   - Copia tus keys de LIVE: `pk_live_...`, `sk_live_...`

2. **Ve a Vercel** → Settings → Environment Variables

3. **Actualiza las 3 variables de Stripe** (solo en Production):
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → cambia a `pk_live_...`
   - `STRIPE_SECRET_KEY` → cambia a `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → cambia a `whsec_live_...`

4. **Redespliega**:
   ```bash
   git commit --allow-empty -m "chore: enable stripe live mode"
   git push origin main
   ```

¡Listo! Ahora Production usa pagos reales.

## 🎨 Alternativa con CLI de Vercel

Si prefieres terminal:

```bash
# Variables de test (Development + Preview)
vercel env add NEXT_PUBLIC_STRIPE_ENABLED --env=development,preview,production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --env=development,preview
vercel env add STRIPE_SECRET_KEY --env=development,preview
vercel env add STRIPE_WEBHOOK_SECRET --env=development,preview

# Variables live (solo Production)
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --env=production
vercel env add STRIPE_SECRET_KEY --env=production
vercel env add STRIPE_WEBHOOK_SECRET --env=production
```

## 🧪 Probar pagos en modo TEST

Usa estas tarjetas de prueba de Stripe:

- **Pago exitoso:** `4242 4242 4242 4242`
- **Pago rechazado:** `4000 0000 0000 0002`
- **Requiere autenticación:** `4000 0025 0000 3155`

**Cualquier CVV** (ej: 123)
**Cualquier fecha futura** (ej: 12/25)
**Cualquier código postal**

## 🔐 Seguridad

- ✅ Las keys `NEXT_PUBLIC_*` son seguras para el navegador (están diseñadas para ello)
- ✅ Las keys sin `NEXT_PUBLIC_` son secretas (nunca se exponen al cliente)
- ✅ Usa diferentes secrets para Development/Production
- ✅ Rota el NEXTAUTH_SECRET si se filtra
- ✅ Nunca subas archivos `.env` al repositorio
- ✅ Revisa los logs de Stripe regularmente

## 📚 Referencias

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stripe Test Mode](https://stripe.com/docs/testing)
- [NextAuth Configuration](https://next-auth.js.org/configuration/options)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
