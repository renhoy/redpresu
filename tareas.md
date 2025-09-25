# Tareas - MÓDULO: Auth

## MÓDULO ACTIVO: Auth
**Tareas Activas:** 5/5

## BACKLOG
### Críticas (obligatorias para completar módulo):
1. **[x] Configuración Supabase Auth** - 1 día ✅
   - [x] Helpers de autenticación con Supabase
   - [x] Manejo de sesiones y refresh tokens
   - [x] Funciones getUser(), signIn(), signOut()

2. **[x] Sistema de Login** - 1 día ✅
   - [x] Página /login con formulario
   - [x] Validación credenciales
   - [x] Redirect según rol después login

3. **[x] Middleware protección rutas** - 1 día ✅
   - [x] middleware.ts para proteger rutas privadas
   - [x] Verificación de sesión y rol
   - [x] Redirect a /login si no autenticado

4. **[x] Manejo de roles** - 1 día ✅
   - [x] HOC o hook para verificar rol en componentes
   - [x] Restricciones UI según permisos
   - [x] User switching para superadmin

5. **[x] Logout y sesión** - 0.5 días ✅
   - [x] Botón logout en header
   - [x] Limpieza de sesión
   - [x] Redirect a /login

### Alta (importantes pero no críticas):
1. **Recuperación password** - 0.5 días
   - Página forgot-password
   - Envío email recuperación
   - Reset password workflow

2. **Cambio password** - 0.5 días
   - Formulario cambio password
   - Validación password actual
   - Confirmación password nueva

## ARCHIVOS DE ESTE MÓDULO:
- src/lib/auth/supabase-auth.ts
- src/lib/auth/session.ts
- src/components/auth/LoginForm.tsx
- src/app/(auth)/login/page.tsx
- src/middleware.ts
- auth.config.ts

## CRITERIOS COMPLETADO AUTH:
- [x] Login funcional con validación
- [x] Middleware protegiendo rutas privadas
- [x] Redirect automático según rol
- [x] Logout limpiando sesión
- [x] User switching para superadmin
- [x] Tests de autenticación funcionando

✅ **MÓDULO COMPLETADO - Ready for READ-ONLY**

## NOTAS TÉCNICAS:
- **Roles**: superadmin (acceso total), admin (su empresa), vendedor (sus presupuestos)
- **Sesiones**: Persistencia con refresh automático de tokens
- **Middleware**: Protección a nivel Next.js con matcher patterns
- **Redirects**: /login → /dashboard según rol, /dashboard → /login si no auth
- **User switching**: Solo superadmin puede impersonar otros usuarios

## TESTING MÍNIMO:
- Login exitoso con credenciales válidas
- Redirect correcto según rol después login
- Middleware bloqueando rutas no autenticadas
- Logout limpiando sesión correctamente
- User switching funcionando para superadmin