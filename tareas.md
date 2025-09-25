# Tareas - MÓDULO: Auth

## MÓDULO ACTIVO: Auth
**Tareas Activas:** 0/5

## BACKLOG
### Críticas (obligatorias para completar módulo):
1. **Configuración Supabase Auth** - 1 día
   - Helpers de autenticación con Supabase
   - Manejo de sesiones y refresh tokens
   - Funciones getUser(), signIn(), signOut()

2. **Sistema de Login** - 1 día
   - Página /login con formulario
   - Validación credenciales
   - Redirect según rol después login

3. **Middleware protección rutas** - 1 día
   - middleware.ts para proteger rutas privadas
   - Verificación de sesión y rol
   - Redirect a /login si no autenticado

4. **Manejo de roles** - 1 día
   - HOC o hook para verificar rol en componentes
   - Restricciones UI según permisos
   - User switching para superadmin

5. **Logout y sesión** - 0.5 días
   - Botón logout en header
   - Limpieza de sesión
   - Redirect a /login

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
- [ ] Login funcional con validación
- [ ] Middleware protegiendo rutas privadas
- [ ] Redirect automático según rol
- [ ] Logout limpiando sesión
- [ ] User switching para superadmin
- [ ] Tests de autenticación funcionando

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