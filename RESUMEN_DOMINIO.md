# 🌐 Configuración de Dominio: redpresu.com

## Estado Actual del Código ✅

Tu aplicación **ya está preparada** para usar un dominio personalizado:

- ✅ Usa `NEXT_PUBLIC_APP_URL` para todas las URLs absolutas
- ✅ No hay URLs hardcodeadas en el código
- ✅ Los helpers de URL (`url-helpers.ts`, `url-helpers-server.ts`) están correctamente implementados
- ✅ Solo usa `localhost:3000` como fallback de desarrollo

## Archivos Creados

He creado 2 documentos para ayudarte:

1. **`DOMAIN_SETUP.md`** - Guía completa paso a paso (todos los detalles)
2. **`DOMAIN_CHECKLIST.md`** - Checklist rápido para ir marcando tareas

## Pasos Principales (Resumen)

### 1. Configurar en Vercel (5 minutos)
```
1. Dashboard → Domains → Add "redpresu.com"
2. Copiar configuración DNS que te muestra
```

### 2. Configurar DNS (10 minutos + propagación)
```
En tu registrador de dominio:

Registro A:
  Name: @
  Value: 76.76.21.21

Registro CNAME:
  Name: www
  Value: cname.vercel-dns.com
```

### 3. Variables de Entorno en Vercel (2 minutos)
```
Settings → Environment Variables → Production:

NEXT_PUBLIC_APP_URL=https://redpresu.com
NEXTAUTH_URL=https://redpresu.com
```

### 4. Redesplegar (1 minuto)
```bash
# Opción 1: Desde Vercel Dashboard
Deployments → Latest → Redeploy

# Opción 2: Desde git
git commit --allow-empty -m "chore: redeploy for domain"
git push
```

### 5. Configurar Supabase (3 minutos)
```
Authentication → URL Configuration:

Redirect URLs:
- https://redpresu.com/*
- https://redpresu.com/auth/callback

Site URL:
- https://redpresu.com
```

### 6. Verificar (5 minutos)
```
✓ Acceder a https://redpresu.com
✓ Verificar SSL (candado verde)
✓ Probar login
```

## ⏱️ Tiempo Total Estimado

- **Configuración activa**: ~25 minutos
- **Propagación DNS**: 5-30 minutos (automático)
- **Emisión SSL**: 5-10 minutos (automático por Vercel)

## 🎯 Próximo Paso Inmediato

**Empieza por aquí**:

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto "redpresu"
3. Settings → Domains → Add Domain
4. Introduce: `redpresu.com`
5. Sigue las instrucciones que te muestre Vercel

Luego, continúa con el checklist en `DOMAIN_CHECKLIST.md`.

## 📞 Si Tienes Problemas

Revisa la sección **Troubleshooting** en `DOMAIN_SETUP.md` que incluye soluciones a:
- DNS que no resuelve
- Errores de SSL
- Problemas de autenticación
- Webhooks que fallan

---

**¿Tienes el dominio redpresu.com ya registrado?**
- ✅ **Sí** → Sigue los pasos del checklist
- ❌ **No** → Primero regístralo en un registrador (GoDaddy, Namecheap, Google Domains, etc.)
