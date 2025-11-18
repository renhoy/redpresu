# Configuración de Entornos en Vercel

Esta guía explica cómo configurar las variables de entorno en Vercel para tener diferentes modos según el entorno.

## 🎯 Objetivo

- **Development** (local): Modo TEST
- **Preview** (ramas): Modo TEST
- **Production** (main): Modo TEST por defecto, activar LIVE cuando estés listo

## 📋 Paso 1: Configurar variables en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables

### Variables que aplican a TODOS los entornos

Marca: ☑️ Development, ☑️ Preview, ☑️ Production

```
NEXTAUTH_SECRET=vcNT1XTil91INuWZgAfJH81j4DkgMR/F39JrOL2YFdg=
```

### Variables de Supabase

**Opción A: Misma base de datos para todos** (recomendado al inicio)

Marca: ☑️ Development, ☑️ Preview, ☑️ Production

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
DATABASE_URL=postgresql://postgres:password@db.proyecto.supabase.co:5432/postgres
```

**Opción B: Diferentes bases de datos**

Para Development (local):
```
NEXT_PUBLIC_SUPABASE_URL=https://proyecto-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=key-de-dev
```

Para Preview y Production:
```
NEXT_PUBLIC_SUPABASE_URL=https://proyecto-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=key-de-prod
```

### Variables de Stripe - MODO TEST

Marca: ☑️ Development, ☑️ Preview, ☑️ Production

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
```

> ⚠️ **Importante**: Usa las keys de TEST de Stripe. Las encuentras en:
> Dashboard de Stripe → Developers → API keys → (modo Test activado)

### Variables de Stripe - MODO LIVE

Marca: ☑️ Production solamente

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx
```

> 🔐 **Solo añade estas cuando estés listo para pagos reales**

### Variable de Control

Marca: ☑️ Production solamente

```
ENABLE_LIVE_MODE=false
```

> 🎚️ **Cambia a `true` cuando quieras activar pagos reales en producción**

### URL de la aplicación

Vercel configura esto automáticamente, pero si necesitas un override:

Para Production:
```
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

Para Preview y Development puedes omitirla (Vercel usa VERCEL_URL)

## 📊 Resumen de configuración

| Variable | Development | Preview | Production (Test) | Production (Live) |
|----------|-------------|---------|-------------------|-------------------|
| NEXTAUTH_SECRET | ✅ | ✅ | ✅ | ✅ |
| SUPABASE_* | ✅ | ✅ | ✅ | ✅ |
| STRIPE_*_TEST | ✅ | ✅ | ✅ | ✅ |
| STRIPE_*_LIVE | ❌ | ❌ | ✅ | ✅ |
| ENABLE_LIVE_MODE | ❌ | ❌ | `false` | `true` |

## 🚀 Paso 2: Desplegar

### Para Development (local)
```bash
vercel dev
```
→ Usa Stripe TEST, Supabase según configuración

### Para Preview (ramas)
```bash
git push origin tu-rama
```
→ Vercel despliega automáticamente
→ URL: `proyecto-git-tu-rama.vercel.app`
→ Usa Stripe TEST

### Para Production (main)
```bash
git push origin main
```
→ Vercel despliega automáticamente
→ URL: tu dominio principal
→ Usa Stripe TEST (hasta que cambies ENABLE_LIVE_MODE)

## 🎚️ Paso 3: Activar modo LIVE (cuando estés listo)

1. **Asegúrate de tener configuradas las keys de Stripe LIVE** en Production
2. **Ve a Vercel** → Settings → Environment Variables
3. **Busca** `ENABLE_LIVE_MODE`
4. **Cambia el valor** de `false` a `true` (solo en Production)
5. **Redespliega** el proyecto:
   ```bash
   git commit --allow-empty -m "chore: enable live mode"
   git push origin main
   ```

¡Listo! Ahora Production usa pagos reales de Stripe.

## 🔍 Verificar el modo actual

Puedes verificar qué modo está activo mirando los logs del servidor o añadiendo esto temporalmente en una página:

```typescript
import { getEnvironment, getMode } from '@/lib/env-config'

export default function StatusPage() {
  const env = getEnvironment()
  const mode = getMode()

  return (
    <div>
      <p>Environment: {env}</p>
      <p>Mode: {mode}</p>
    </div>
  )
}
```

## 🔐 Seguridad

- ✅ Nunca subas archivos `.env` al repositorio
- ✅ Usa diferentes secrets para Development/Production
- ✅ Rota el NEXTAUTH_SECRET si se filtra
- ✅ No compartas las keys LIVE de Stripe públicamente
- ✅ Revisa los logs de Stripe regularmente

## 📚 Referencias

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stripe Test Mode](https://stripe.com/docs/testing)
- [NextAuth Configuration](https://next-auth.js.org/configuration/options)
