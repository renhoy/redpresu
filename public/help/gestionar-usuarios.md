---
id: gestionar-usuarios
title: Gestionar usuarios de tu empresa
category: Configuración
visible: admin
---

El sistema permite que múltiples usuarios de tu empresa accedan a la aplicación con diferentes niveles de permisos.

## Roles disponibles

### Superadmin

- **Permisos**: Acceso total al sistema
- **Puede**: Gestionar usuarios, tarifas, presupuestos, configuración global
- **Ideal para**: Propietario o administrador principal

### Admin

- **Permisos**: Gestión de tarifas, presupuestos y usuarios de su empresa
- **Puede**: Todo excepto modificar configuración global del sistema
- **Ideal para**: Gerentes o responsables de departamento

### Vendedor

- **Permisos**: Solo puede crear y gestionar presupuestos
- **No puede**: Crear/editar tarifas ni gestionar usuarios
- **Ideal para**: Personal comercial

## Acceder a la gestión de usuarios

1. Desde el menú principal, haz clic en **"Usuarios"**
2. Solo los usuarios con rol **Admin** o **Superadmin** pueden acceder

## Crear un nuevo usuario

### Paso 1: Iniciar creación

Haz clic en el botón **"Nuevo Usuario"** en la esquina superior derecha.

### Paso 2: Completar datos

Introduce la siguiente información:

**Datos de acceso:**

- **Email**: Correo electrónico del usuario (será su nombre de usuario)
- **Contraseña**: Contraseña inicial (el usuario debería cambiarla después)

**Datos personales:**

- **Nombre completo**
- **Rol**: Selecciona Admin o Vendedor

### Paso 3: Guardar

El nuevo usuario recibirá un email con sus credenciales de acceso (si el servicio de email está configurado).

## Editar un usuario existente

1. En el listado de usuarios, haz clic en el botón **"Editar"** (icono de lápiz)
2. Modifica los campos necesarios
3. Guarda los cambios

**Campos editables:**

- Nombre
- Email
- Rol
- Contraseña (si necesitas resetearla)

## Desactivar/Activar usuario

En lugar de eliminar usuarios, el sistema permite desactivarlos temporalmente:

1. Haz clic en el botón **"Activar/Desactivar"**
2. Un usuario desactivado no podrá iniciar sesión
3. Puedes reactivarlo en cualquier momento

**Ventajas de desactivar vs eliminar:**

- Se mantiene el historial de actividad del usuario
- Las tarifas y presupuestos creados por ese usuario siguen asociados a él
- Puedes reactivar el usuario si vuelve a la empresa

## Cambiar contraseña

### Como administrador (cambiar contraseña de otro usuario):

1. Edita el usuario
2. Introduce la nueva contraseña
3. Guarda los cambios
4. Informa al usuario de su nueva contraseña

### Como usuario (cambiar tu propia contraseña):

1. Ve a tu **Perfil** (icono de usuario en el header)
2. Haz clic en **"Cambiar contraseña"**
3. Introduce tu contraseña actual
4. Introduce la nueva contraseña (dos veces)
5. Guarda los cambios

## Buenas prácticas de seguridad

### Contraseñas seguras

- Mínimo 8 caracteres
- Combina mayúsculas, minúsculas, números y símbolos
- No uses palabras del diccionario
- No compartas contraseñas entre usuarios

### Gestión de accesos

- **Principio del mínimo privilegio**: Asigna solo los permisos necesarios
- **Revisa periódicamente**: Desactiva usuarios que ya no trabajen en la empresa
- **Audita actividad**: Revisa los logs de creación de tarifas y presupuestos

### Recuperación de contraseña

Si un usuario olvida su contraseña:

1. Puede usar la opción **"¿Olvidaste tu contraseña?"** en el login
2. Recibirá un email con un enlace para resetearla
3. Alternativamente, un admin puede resetear la contraseña manualmente

## Límites según el plan

Los límites de usuarios dependen de tu plan de suscripción:

- **Plan Free**: 1 usuario
- **Plan Pro**: Hasta 5 usuarios
- **Plan Enterprise**: Usuarios ilimitados

Si alcanzas el límite de tu plan, deberás actualizar la suscripción para añadir más usuarios.

## Ver actividad de usuarios

Cada tarifa y presupuesto muestra:

- **Creado por**: Nombre del usuario que lo creó
- **Fecha de creación**
- **Última modificación**

Esto permite llevar un seguimiento de quién ha trabajado en cada documento.

## Preguntas frecuentes

**¿Puedo tener varios Superadmins?**
Sí, puedes asignar el rol de Superadmin a varios usuarios.

**¿Qué pasa si elimino un usuario por error?**
Por eso recomendamos **desactivar** en lugar de eliminar. Si eliminaste un usuario, no se puede recuperar, aunque sus tarifas y presupuestos sí se mantienen.

**¿Los usuarios vendedores pueden ver todas las tarifas?**
Sí, todos los usuarios pueden ver todas las tarifas de la empresa. Los permisos aplican a la **creación y edición**, no a la visualización.

**¿Puedo cambiar mi propio rol?**
No, solo otro admin o superadmin puede cambiar roles. Esto previene errores de seguridad.

---

¿Tienes más dudas? Consulta el [Centro de Ayuda](/help) o contacta con soporte.
