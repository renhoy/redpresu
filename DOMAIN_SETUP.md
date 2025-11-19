# Configuración de Dominio Personalizado: redpresu.com

Esta guía explica paso a paso cómo configurar el dominio personalizado `redpresu.com` para la aplicación RedPresu en Vercel.

## 📋 Requisitos Previos

- [ ] Proyecto desplegado en Vercel
- [ ] Dominio `redpresu.com` registrado y con acceso al panel de DNS
- [ ] Acceso al dashboard de Vercel
- [ ] Acceso al dashboard de Supabase

---

## 1️⃣ Configurar Dominio en Vercel

### 1.1 Añadir el Dominio

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto **redpresu**
3. Ve a **Settings** → **Domains**
4. Haz clic en **Add Domain**
5. Introduce: `redpresu.com`
6. Haz clic en **Add**

### 1.2 Configurar www (Opcional pero Recomendado)

1. En la misma sección de Domains, añade también: `www.redpresu.com`
2. Vercel te preguntará si quieres redirigir `www` → `redpresu.com` o viceversa
3. **Recomendación**: Redirigir `www.redpresu.com` → `redpresu.com`

### 1.3 Obtener Configuración DNS

Vercel te mostrará los registros DNS que necesitas configurar. Típicamente:

**Para el dominio principal (`redpresu.com`):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Para www (`www.redpresu.com`):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## 2️⃣ Configurar DNS en tu Registrador de Dominio

### Pasos Generales (Adaptados a tu Proveedor)

1. Inicia sesión en el panel de tu registrador de dominio (GoDaddy, Namecheap, Cloudflare, etc.)
2. Busca la sección de **DNS Management** o **DNS Settings**
3. Localiza los registros DNS del dominio `redpresu.com`

### Añadir Registros DNS

#### Registro A (Dominio Principal)

```
Type: A
Name: @ (o déjalo en blanco si tu proveedor lo requiere)
Value: 76.76.21.21
TTL: Automatic (o 3600)
```

#### Registro CNAME (Subdominio www)

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Automatic (o 3600)
```

### ⚠️ Importante

- **Elimina registros conflictivos**: Si ya existen registros A o CNAME para `@` o `www`, elimínalos primero
- **Propagación DNS**: Los cambios pueden tardar hasta 48 horas, pero normalmente se propagan en 5-30 minutos
- **Verifica con**: `dig redpresu.com` o usa [dnschecker.org](https://dnschecker.org)

---

## 3️⃣ Configurar Variables de Entorno en Vercel

### 3.1 Actualizar NEXT_PUBLIC_APP_URL

1. En Vercel Dashboard → **Settings** → **Environment Variables**
2. Busca o crea la variable `NEXT_PUBLIC_APP_URL`
3. Configura los valores según el entorno:

**Production:**
```
Key: NEXT_PUBLIC_APP_URL
Value: https://redpresu.com
Environment: Production
```

**Preview (Opcional):**
```
Key: NEXT_PUBLIC_APP_URL
Value: https://preview.redpresu.com
Environment: Preview
```

**Development:**
```
Key: NEXT_PUBLIC_APP_URL
Value: http://localhost:3000
Environment: Development
```

### 3.2 Verificar Otras Variables

Asegúrate de que estas variables estén configuradas en **Production**:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_SCHEMA` (normalmente `redpresu` o `public`)
- ✅ `NEXTAUTH_URL` → Cambiar a `https://redpresu.com`
- ✅ `NEXTAUTH_SECRET` (debe estar configurado)
- ✅ `NEXT_PUBLIC_STRIPE_ENABLED`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`

### 3.3 Redesplegar

Después de actualizar las variables de entorno:

```bash
# Opción 1: Desde el dashboard de Vercel
# Ve a Deployments → Latest → Redeploy

# Opción 2: Forzar nuevo despliegue con push
git commit --allow-empty -m "chore: trigger redeployment for domain config"
git push
```

---

## 4️⃣ Configurar Supabase para el Nuevo Dominio

### 4.1 Añadir URL a Lista Blanca de Autenticación

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. En **Redirect URLs**, añade:
   - `https://redpresu.com/*`
   - `https://redpresu.com/auth/callback`
   - `https://www.redpresu.com/*` (si usas www)

5. En **Site URL**, actualiza a:
   - `https://redpresu.com`

### 4.2 Verificar CORS

1. Ve a **Settings** → **API**
2. En **API Settings** → **CORS Settings**
3. Verifica que permita:
   - `https://redpresu.com`
   - `https://www.redpresu.com`

---

## 5️⃣ Configurar Webhooks de Stripe (Si Aplica)

Si estás usando Stripe con webhooks, necesitas actualizar la URL:

### 5.1 Actualizar Webhook URL

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Localiza el webhook existente (o crea uno nuevo)
3. Actualiza el **Endpoint URL** a:
   ```
   https://redpresu.com/api/webhooks/stripe
   ```

### 5.2 Actualizar Variable de Entorno

Si cambias el webhook, actualiza en Vercel:

```
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_nuevo_secreto_del_webhook
Environment: Production
```

---

## 6️⃣ Verificación y Testing

### 6.1 Verificar Propagación DNS

```bash
# Verificar registro A
dig redpresu.com

# Verificar registro CNAME para www
dig www.redpresu.com

# O usa herramienta online
# https://dnschecker.org
```

### 6.2 Verificar SSL/HTTPS

1. Vercel configura SSL automáticamente con Let's Encrypt
2. Accede a `https://redpresu.com`
3. Verifica que el candado verde aparezca en el navegador
4. **Nota**: El certificado puede tardar unos minutos en emitirse

### 6.3 Probar Funcionalidades Clave

- [ ] Inicio de sesión / registro
- [ ] Creación de presupuestos
- [ ] Subida de archivos (logos, PDFs)
- [ ] Envío de emails (invitaciones)
- [ ] Webhooks de Stripe (si aplica)

### 6.4 Verificar URLs en la Aplicación

1. Revisa que los links de invitación usen `https://redpresu.com`
2. Verifica que los emails tengan las URLs correctas
3. Comprueba que las redirecciones después de login funcionen

---

## 7️⃣ Configuraciones Opcionales

### 7.1 Configurar Email Personalizado (Futuro)

Si quieres usar emails desde `@redpresu.com`:

1. **Resend**:
   - Ve a [Resend Dashboard](https://resend.com/domains)
   - Añade dominio `redpresu.com`
   - Configura registros DNS (SPF, DKIM, DMARC)
   - Actualiza variable `EMAIL_FROM=noreply@redpresu.com`

2. **SendGrid** (alternativa):
   - Similar proceso en [SendGrid](https://sendgrid.com)

### 7.2 Configurar Subdominio para Staging (Opcional)

Si quieres un entorno de staging:

```
staging.redpresu.com → Deployment en rama "staging"
```

1. Añade `staging.redpresu.com` en Vercel Domains
2. Conecta a la rama `staging` (o `develop`)
3. Configura variables de entorno separadas

---

## 🔍 Troubleshooting

### Problema: "Domain not found" o DNS no resuelve

**Solución:**
1. Verifica que los registros DNS estén correctos
2. Espera 5-30 minutos para propagación
3. Limpia caché DNS: `sudo dscacheutil -flushcache` (Mac) o `ipconfig /flushdns` (Windows)

### Problema: "Invalid Host Header"

**Solución:**
1. Verifica que el dominio esté añadido en Vercel Domains
2. Redespliega la aplicación
3. Verifica que no haya typos en el dominio

### Problema: Redirect URI mismatch en Supabase

**Solución:**
1. Añade `https://redpresu.com/auth/callback` en Supabase → Authentication → URL Configuration
2. Verifica que `NEXT_PUBLIC_APP_URL` esté correctamente configurado

### Problema: SSL Certificate Pending

**Solución:**
1. Espera 5-10 minutos (Vercel emite automáticamente)
2. Si tarda más de 1 hora, verifica que los DNS apunten correctamente
3. Contacta soporte de Vercel si persiste

---

## 📚 Recursos Adicionales

- [Vercel Custom Domains Guide](https://vercel.com/docs/concepts/projects/domains)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [DNS Checker Tool](https://dnschecker.org)

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] Dominio configurado en Vercel
- [ ] Registros DNS configurados y propagados
- [ ] `NEXT_PUBLIC_APP_URL=https://redpresu.com` en Production
- [ ] `NEXTAUTH_URL=https://redpresu.com` en Production
- [ ] URLs añadidas en Supabase Authentication
- [ ] SSL/HTTPS funcionando correctamente
- [ ] Login y registro funcionan
- [ ] Webhooks de Stripe actualizados (si aplica)
- [ ] Emails con URLs correctas
- [ ] Redirecciones funcionando

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu aplicación estará disponible en:

**🌐 https://redpresu.com**

Si tienes problemas, revisa la sección de Troubleshooting o contacta al equipo de soporte de Vercel.
