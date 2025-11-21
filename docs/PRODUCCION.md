# 🚀 Guía de Deployment a Producción - public.com

**Versión:** 2.0 - **100% GRATUITO** ✨
**Fecha:** Noviembre 2025
**Proyecto:** Redpresu - Sistema de Presupuestos SaaS

---

## 📋 Tabla de Contenidos

- [Resumen Ejecutivo](#-resumen-ejecutivo)
- [🆓 OPCIÓN A: Deployment GRATUITO (Recomendado)](#-opción-a-deployment-gratuito-recomendado)
  - [Stack Gratuito](#stack-gratuito)
  - [Paso 1: Crear Proyecto en Supabase](#paso-1-crear-proyecto-en-supabase)
  - [Paso 2: Configurar Base de Datos](#paso-2-configurar-base-de-datos)
  - [Paso 3: Deployment en Vercel](#paso-3-deployment-en-vercel)
  - [Paso 4: Configurar Dominio](#paso-4-configurar-dominio-personalizado)
  - [Paso 5: Configurar Stripe](#paso-5-configurar-stripe-opcional)
  - [Actualizaciones](#actualizaciones-automáticas)
- [💰 OPCIÓN B: VPS Self-Hosted](#-opción-b-vps-self-hosted-más-control)
- [📊 Comparación de Opciones](#-comparación-de-opciones)
- [🔒 Checklist de Seguridad](#-checklist-de-seguridad)
- [🆘 Solución de Problemas](#-solución-de-problemas)

---

## 🎯 Resumen Ejecutivo

### Objetivo
Desplegar **public.com** en producción **sin costos** (excepto dominio) con máxima seguridad y facilidad de actualización.

### Stack GRATUITO Recomendado
- **Hosting:** Vercel (Next.js nativo) - **$0/mes**
- **Base de datos:** Supabase Cloud - **$0/mes**
- **DNS/SSL:** Cloudflare - **$0/mes**
- **CI/CD:** GitHub Actions (incluido)
- **Dominio:** public.com (ya comprado)

### Tiempo de Setup
- ⏱️ **Primera instalación:** 30-45 minutos
- ⏱️ **Actualizaciones:** 2 minutos (automático con `git push`)

---

## 🆓 OPCIÓN A: Deployment GRATUITO (Recomendado)

### ✨ Stack Gratuito

```
Internet
    ↓
┌─────────────────────────────────────────────┐
│  Cloudflare (DNS + SSL + DDoS) - GRATIS    │
│  ✅ Protección DDoS                         │
│  ✅ SSL automático                          │
│  ✅ CDN global                              │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Vercel (Next.js Hosting) - GRATIS          │
│  ✅ Deploy automático con git push          │
│  ✅ Serverless Functions                    │
│  ✅ Edge Network global                     │
│  ✅ Preview deployments                     │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Supabase Cloud - GRATIS                    │
│  ✅ PostgreSQL 500MB                        │
│  ✅ Auth integrado                          │
│  ✅ Storage 1GB                             │
│  ✅ Realtime                                │
└─────────────────────────────────────────────┘
```

### 💰 Costos Totales

| Servicio | Plan | Costo Mensual | Límites |
|----------|------|---------------|---------|
| **Vercel** | Hobby | $0 | 100GB bandwidth, 1M invocaciones |
| **Supabase** | Free | $0 | 500MB DB, 1GB storage, 2GB bandwidth |
| **Cloudflare** | Free | $0 | DNS ilimitado, DDoS protection |
| **GitHub** | Public repo | $0 | Ilimitado |
| **TOTAL** | | **$0/mes** 🎉 | Suficiente para 10k-50k usuarios |

**Nota:** Estos límites son más que suficientes para una startup en fase inicial. Cuando crezcas, puedes escalar pagando solo lo que necesites.

---

## 📋 Paso 1: Crear Proyecto en Supabase

### 1.1 Crear Cuenta en Supabase

1. Ir a [supabase.com](https://supabase.com)
2. Click en **"Start your project"**
3. Registrarse con GitHub (recomendado para CI/CD)

### 1.2 Crear Nuevo Proyecto

```
New Project:
- Organization: Personal (gratis)
- Name: redpresu-production
- Database Password: [Generar contraseña segura]
- Region: West EU (Germany) o más cercana a España
- Plan: Free (seleccionar)
```

**Guardar credenciales:**
```bash
Project URL: https://xxxxx.supabase.co
API Key (anon): eyJhbGc...
API Key (service_role): eyJhbGc... (mantener secreto)
Database Password: [tu contraseña]
```

### 1.3 Esperar a que el Proyecto se Cree
- ⏱️ Tarda ~2 minutos
- Recibirás email de confirmación

---

## 📊 Paso 2: Configurar Base de Datos

### 2.1 Acceder al SQL Editor

1. En Supabase Dashboard → **SQL Editor**
2. Click en **"New query"**

### 2.2 Insertar Datos Iniciales

```sql
-- Ejecutar en SQL Editor de Supabase
-- Contenido de deployment/seed_initial_data.sql

-- Verificar que se crearon las configs
SELECT * FROM public.config ORDER BY category, key;

-- Verificar empresas
SELECT * FROM public.companies;
```

### 2.3 Configurar Row Level Security (RLS)

Supabase requiere RLS para seguridad. Verifica que las políticas estén activas:

```sql
-- Verificar RLS en tablas principales
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Si alguna tabla tiene rowsecurity = false, activarlo:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- etc.
```

### 2.4 Crear Usuario Superadmin Inicial

```sql
-- IMPORTANTE: Cambiar email y password
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    role,
    aud
) VALUES (
    gen_random_uuid(),
    'admin@redpresu.com',  -- CAMBIAR
    crypt('TU_PASSWORD_SEGURO_AQUI', gen_salt('bf')),  -- CAMBIAR
    NOW(),
    NOW(),
    NOW(),
    '{"role": "superadmin"}'::jsonb,
    'authenticated',
    'authenticated'
);

-- Crear entrada en public.users
INSERT INTO public.users (
    id,
    email,
    name,
    role,
    company_id,
    status
)
SELECT
    id,
    email,
    'Administrador',
    'superadmin',
    (SELECT id FROM public.companies LIMIT 1),
    'active'
FROM auth.users
WHERE email = 'admin@redpresu.com';
```

---

## 🚀 Paso 3: Deployment en Vercel

### 3.1 Preparar Repositorio

**En tu Mac local:**

```bash
# Asegurarte de estar en main
git checkout main
git pull origin main

# Verificar que todo esté commiteado
git status

# Si hay cambios pendientes
git add .
git commit -m "feat: preparar para deployment en Vercel"
git push origin main
```

### 3.2 Conectar con Vercel

1. Ir a [vercel.com](https://vercel.com)
2. **"Sign up"** con GitHub
3. Click en **"Add New..."** → **"Project"**
4. **Import Git Repository:**
   - Seleccionar `renhoy/redpresu`
   - Si no aparece, click en **"Adjust GitHub App Permissions"**

### 3.3 Configurar Proyecto en Vercel

**Configure Project:**

```
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

**Environment Variables** (agregar todas):

```bash
# ===================================
# SUPABASE
# ===================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# ===================================
# APP
# ===================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://public.com

# ===================================
# AUTH
# ===================================
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET=TU_SECRET_AQUI_DE_32_CHARS
NEXTAUTH_URL=https://public.com

# ===================================
# STRIPE (si lo usas)
# ===================================
NEXT_PUBLIC_STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ===================================
# EMAIL (Resend - Free tier)
# ===================================
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@public.com
```

**⚠️ IMPORTANTE:** Copiar valores EXACTOS de Supabase Dashboard → Settings → API

### 3.4 Deploy

1. Click en **"Deploy"**
2. Esperar 2-3 minutos
3. Vercel te dará una URL: `https://public.vercel.app`

### 3.5 Verificar Deployment

```bash
# Desde tu navegador
https://public.vercel.app

# Debe cargar la página de login
# Probar login con el usuario superadmin que creaste
```

---

## 🌐 Paso 4: Configurar Dominio Personalizado

### 4.1 Agregar Dominio en Vercel

1. En Vercel Dashboard → Tu proyecto **"redpresu"**
2. **Settings** → **Domains**
3. Click **"Add"**
4. Escribir: `public.com`
5. Click **"Add"**
6. Vercel te mostrará los registros DNS necesarios

### 4.2 Configurar DNS en Cloudflare

**Ir a Cloudflare Dashboard → DNS → Records:**

**Opción A: CNAME (Recomendado)**

| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| CNAME | @ | cname.vercel-dns.com | DNS only (🔴) | Auto |
| CNAME | www | cname.vercel-dns.com | DNS only (🔴) | Auto |

**⚠️ IMPORTANTE:**
- Proxy Status debe estar en **"DNS only"** (nube gris)
- Si está en "Proxied" (nube naranja), Vercel no podrá verificar el dominio

**Opción B: A Record (alternativa)**

Si CNAME no funciona, usar A records que Vercel te proporcione:

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | @ | 76.76.21.21 | DNS only | Auto |
| A | www | 76.76.21.98 | DNS only | Auto |

### 4.3 Verificar Dominio en Vercel

1. Esperar 1-5 minutos (propagación DNS)
2. En Vercel → Domains, click **"Refresh"**
3. Debe aparecer ✅ **"Valid Configuration"**

### 4.4 Configurar SSL en Cloudflare

**Cloudflare Dashboard → SSL/TLS:**

```
SSL/TLS encryption mode: Full (strict)
Always Use HTTPS: On
Automatic HTTPS Rewrites: On
Minimum TLS Version: 1.2
```

### 4.5 Verificar Funcionamiento

```bash
# Esperar 5 minutos para propagación DNS
# Verificar SSL
curl -I https://public.com

# Debe devolver: HTTP/2 200
# Debe mostrar certificado válido

# Abrir en navegador
https://public.com
```

---

## 💳 Paso 5: Configurar Stripe (Opcional)

### 5.1 Crear Cuenta Stripe

1. Ir a [stripe.com](https://stripe.com)
2. Crear cuenta
3. Activar modo **Production** (después de configurar empresa)

### 5.2 Obtener API Keys

**Stripe Dashboard → Developers → API Keys:**

```
Publishable key: pk_live_xxxxx
Secret key: sk_live_xxxxx
```

### 5.3 Configurar Webhook en Stripe

**Stripe Dashboard → Developers → Webhooks → Add endpoint:**

```
Endpoint URL: https://public.com/api/webhooks/stripe

Events to send:
✅ checkout.session.completed
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
✅ invoice.payment_succeeded
```

**Copiar Webhook Secret:**
```
whsec_xxxxx
```

### 5.4 Actualizar Variables en Vercel

**Vercel Dashboard → Settings → Environment Variables:**

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**Redeploy:**
```bash
# En Vercel Dashboard → Deployments → tres puntos → Redeploy
```

### 5.5 Crear Productos en Stripe

**Stripe Dashboard → Products → Add product:**

**Producto 1: Plan Pro**
```
Name: Plan Pro - Redpresu
Description: Plan profesional para negocios
Price: €29/mes
Recurring: Monthly
```

**Copiar Price ID:** `price_xxxxx`

**Producto 2: Plan Enterprise**
```
Name: Plan Enterprise - Redpresu
Description: Plan empresarial sin límites
Price: €99/mes
Recurring: Monthly
```

**Copiar Price ID:** `price_yyyyy`

### 5.6 Actualizar Configuración en Supabase

```sql
-- Actualizar subscription_plans en BD
UPDATE public.config
SET value = jsonb_set(
    jsonb_set(
        value,
        '{pro,priceId}',
        '"price_xxxxx"'
    ),
    '{enterprise,priceId}',
    '"price_yyyyy"'
)
WHERE key = 'subscription_plans';

-- Activar suscripciones
UPDATE public.config
SET value = 'true'::jsonb
WHERE key = 'subscriptions_enabled';
```

### 5.7 Configurar Email con Resend (Gratis)

**Para enviar emails transaccionales:**

1. Ir a [resend.com](https://resend.com)
2. Sign up (Free: 3000 emails/mes)
3. **API Keys** → Create API Key
4. **Domains** → Add Domain → `public.com`
5. Agregar registros DNS en Cloudflare (Resend te los muestra)

**Actualizar en Vercel:**
```bash
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@public.com
```

---

## 🔄 Actualizaciones Automáticas

### Cómo Actualizar la Aplicación

**Es AUTOMÁTICO con Vercel:**

```bash
# En tu Mac local
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# Vercel detecta el push y:
# 1. Hace build automáticamente
# 2. Corre tests (si existen)
# 3. Deploya a producción
# 4. Te notifica por email

# Tiempo total: 2-3 minutos
```

### Preview Deployments (Gratis)

Cada branch tiene su propia URL de preview:

```bash
# Crear branch
git checkout -b feature/nueva-funcionalidad

# Hacer cambios y push
git push origin feature/nueva-funcionalidad

# Vercel crea automáticamente:
# https://redpresu-git-feature-nueva-funcionalidad.vercel.app

# Cuando esté listo:
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
# → Deploy automático a producción
```

---

## 💰 OPCIÓN B: VPS Self-Hosted (Más Control)

Si prefieres tener control total y no depender de límites gratuitos, puedes usar un VPS.

### Stack VPS
- **Servidor:** Ubuntu 22.04 (4GB RAM) - €5-12/mes
- **Supabase:** Self-hosted con Docker
- **Next.js:** PM2
- **Nginx:** Proxy + SSL
- **Backups:** Automáticos

**Costo mensual:** €5-20/mes (según proveedor)

**Ventajas VPS:**
- ✅ Sin límites de DB/bandwidth
- ✅ Control total
- ✅ Backups locales
- ✅ No pausas por inactividad

**Desventajas VPS:**
- ❌ Requiere mantenimiento
- ❌ Requiere conocimientos de Linux
- ❌ Costos mensuales
- ❌ Setup más complejo (4-6 horas)

**📖 Guía completa VPS:** Ver archivo `PRODUCCION_VPS.md` (opcional)

---

## 📊 Comparación de Opciones

| Característica | OPCIÓN A (Vercel + Supabase) | OPCIÓN B (VPS) |
|----------------|------------------------------|----------------|
| **Costo mensual** | **$0** ✅ | €5-20 |
| **Setup inicial** | 30-45 min ✅ | 4-6 horas |
| **Actualizaciones** | Automáticas ✅ | Manuales |
| **Escalabilidad** | Automática ✅ | Manual |
| **Mantenimiento** | Cero ✅ | Requiere tiempo |
| **SSL** | Automático ✅ | Manual (Let's Encrypt) |
| **Backups** | Automáticos ✅ | Debes configurar |
| **Límites DB** | 500MB (suficiente para empezar) | Ilimitado |
| **Límites Bandwidth** | 100GB/mes | Ilimitado |
| **Control total** | No | Sí ✅ |
| **Ideal para** | **Startup/Validación** ✅ | Empresa consolidada |

**Recomendación:** Empieza con **OPCIÓN A (Gratis)**. Cuando llegues a los límites (~10k-50k usuarios), migra a VPS o paga por tiers superiores en Vercel/Supabase.

---

## 🔒 Checklist de Seguridad

### Pre-Producción

- [ ] Variables de entorno configuradas (no hay secrets en código)
- [ ] `NEXTAUTH_SECRET` generado de forma segura
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en variables de entorno (nunca en frontend)
- [ ] RLS (Row Level Security) activado en todas las tablas de Supabase
- [ ] Usuario superadmin creado con password seguro
- [ ] SSL/HTTPS activo (Cloudflare + Vercel)
- [ ] CORS configurado correctamente en Supabase
- [ ] Rate limiting en API routes (Next.js middleware)
- [ ] Validación de inputs en todos los formularios
- [ ] No hay `console.log()` con información sensible

### Post-Producción (verificar mensualmente)

- [ ] Revisar logs de errores en Vercel Dashboard
- [ ] Verificar uso de recursos en Supabase Dashboard
- [ ] Actualizar dependencias npm (`npm audit`)
- [ ] Revisar usuarios activos y eliminar inactivos
- [ ] Backup manual de BD (Supabase → Database → Backup)
- [ ] Verificar que webhooks de Stripe funcionen
- [ ] Revisar métricas en Vercel Analytics (si está activado)

---

## 🆘 Solución de Problemas

### Problema: "Error 500" en Vercel

**Causa:** Error en server-side rendering o API route

**Solución:**
1. Ver logs en **Vercel Dashboard → Deployments → Log file**
2. Buscar el error específico
3. Verificar variables de entorno
4. Si es error de Supabase, verificar credenciales

### Problema: "Cannot connect to database"

**Causa:** Supabase pausado por inactividad (free tier)

**Solución:**
```bash
# Ir a Supabase Dashboard → Settings → General
# Click en "Restore project"
# Esperar 1-2 minutos

# Redeploy en Vercel
```

**Prevenir pausa:**
- Configurar health check cada 5 minutos (UptimeRobot gratuito)

### Problema: Dominio no resuelve después de 24h

**Causa:** DNS mal configurado

**Solución:**
1. Verificar en Cloudflare que CNAME apunte a `cname.vercel-dns.com`
2. Verificar que Proxy Status esté en "DNS only" (nube gris)
3. Usar `dig public.com` para ver propagación DNS
4. Limpiar cache de Cloudflare: **Caching → Configuration → Purge Everything**

### Problema: "Rate limit exceeded" en Vercel

**Causa:** Has excedido el límite gratuito de invocaciones (1M/mes)

**Solución:**
1. Revisar Analytics en Vercel para ver qué routes consumen más
2. Implementar caching en Next.js:
   ```typescript
   export const revalidate = 3600; // Cache 1 hora
   ```
3. Considerar upgrade a Vercel Pro ($20/mes) si es recurrente

### Problema: Supabase "Out of space" (500MB)

**Causa:** Base de datos llena

**Solución:**
```sql
-- Ver tamaño de tablas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Limpiar datos antiguos (ejemplo: auditoría)
DELETE FROM public.rules_audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuumar tabla
VACUUM FULL public.rules_audit_log;
```

**O upgrade a Supabase Pro ($25/mes) para 8GB**

---

## 📞 Recursos y Soporte

### Documentación Oficial

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Cloudflare Docs](https://developers.cloudflare.com/)

### Monitoreo Gratuito

- **UptimeRobot:** [uptimerobot.com](https://uptimerobot.com) (50 monitores gratis)
- **Vercel Analytics:** Incluido en plan gratuito

### Testing de Seguridad

```bash
# Security Headers
https://securityheaders.com/?q=public.com

# SSL Test
https://www.ssllabs.com/ssltest/analyze.html?d=public.com

# Performance
https://pagespeed.web.dev/

# Lighthouse
https://web.dev/measure/
```

---

## ✅ Resumen Final

### Con la OPCIÓN A (Gratuita) obtienes:

✅ **Hosting profesional** con Vercel
✅ **Base de datos PostgreSQL** con Supabase
✅ **SSL/HTTPS** automático
✅ **CDN global** para velocidad
✅ **Deployments automáticos** con git push
✅ **Escalabilidad** automática
✅ **Zero mantenimiento**
✅ **$0 de costo mensual** 🎉

**Límites suficientes para:**
- 10k-50k usuarios registrados
- 1M requests/mes
- 100GB bandwidth/mes

**Cuando crezcas, puedes:**
1. Upgradar a Vercel Pro ($20/mes) + Supabase Pro ($25/mes) = $45/mes
2. O migrar a VPS cuando llegues a 100k+ usuarios

---

## 🎉 ¡Listo para Producción!

Ahora tienes:
- ✅ Aplicación desplegada en `public.com`
- ✅ SSL/HTTPS automático
- ✅ Base de datos configurada
- ✅ Actualizaciones automáticas con git push
- ✅ $0 de costo mensual

**Próximos pasos recomendados:**
1. Configurar monitoreo con UptimeRobot
2. Agregar Google Analytics o Plausible
3. Configurar Stripe para pagos (si lo usas)
4. Invitar usuarios beta para testing
5. ¡Lanzar! 🚀

---

**Mantenido por:** Claude Code & Equipo Redpresu
**Última actualización:** Noviembre 2025
**Versión:** 2.0
