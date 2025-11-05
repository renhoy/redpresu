# Comparación y Sincronización de Configuraciones

## 📊 Situación Actual

- **Desarrollo (local)**: 19 rows en `redpresu_config`
- **Producción (Supabase)**: 6 rows en `redpresu_config`
- **Problema**: Faltan 13+ configuraciones en producción

---

## 🎯 Objetivo

Sincronizar la tabla `redpresu_config` de producción con todas las configuraciones necesarias para que la aplicación funcione correctamente.

---

## 📋 Paso 1: Comparar Ambas Bases de Datos

### Opción A: Comparación Rápida (solo config)

1. **En Desarrollo (local)**:
   ```bash
   # Conectar a tu base de datos local y ejecutar:
   psql -d tu_base_datos -f migrations/UTIL_compare_config.sql > config_dev.txt
   ```

2. **En Producción (Supabase)**:
   - Abre Supabase Dashboard → SQL Editor
   - Copia y pega el contenido de `migrations/UTIL_compare_config.sql`
   - Ejecuta (RUN)
   - Copia el resultado y pégalo en `config_prod.txt`

3. **Comparar**:
   ```bash
   # Usa VSCode, meld, o cualquier diff tool:
   code --diff config_dev.txt config_prod.txt
   # O en terminal:
   diff config_dev.txt config_prod.txt
   ```

### Opción B: Comparación Completa (todo el schema)

Si quieres comparar también estructura de tablas, columnas, índices, RLS:

1. Ejecuta `migrations/UTIL_compare_schema.sql` en ambas bases de datos
2. Guarda resultados como `schema_dev.txt` y `schema_prod.txt`
3. Compara con diff tool

---

## 🚀 Paso 2: Ejecutar Migración Completa en Producción

### ⚠️ IMPORTANTE: Hacer Backup Primero

Antes de ejecutar cualquier migración en producción:

1. **Supabase Dashboard** → Database → Backups
2. Crear backup manual: "Backup antes migración 039"
3. Esperar confirmación de backup completo

### Ejecutar Migración

1. **Abre Supabase Dashboard** → SQL Editor

2. **Copia y pega** el contenido completo de:
   ```
   migrations/EJECUTAR_039_complete_config_setup.sql
   ```

3. **Revisa** el script antes de ejecutar (son solo INSERT con ON CONFLICT, es seguro)

4. **Ejecuta** (botón RUN o Ctrl+Enter)

5. **Verifica el resultado**:
   - Debe mostrar: `✅ Migración completada exitosamente`
   - Debe mostrar: `Total configuraciones: X rows` (mínimo 17)
   - Debe mostrar una tabla con todas las categorías: general, pdf, subscriptions, tariffs, testing

### ¿Qué hace esta migración?

- **Es idempotente**: Usa `ON CONFLICT (key) DO NOTHING`, se puede ejecutar múltiples veces sin duplicar datos
- **Solo inserta**: No modifica ni elimina configuraciones existentes
- **Añade 17 configuraciones** esenciales:

#### General (10 claves):
- `app_mode`: Modo desarrollo/producción
- `app_name`: Nombre de la app
- `multiempresa`: Modo mono/multi empresa
- `default_empresa_id`: Empresa por defecto
- `public_registration_enabled`: Registro público
- `contact_notification_emails`: Emails notificaciones
- `forms_legal_notice`: Info legal formularios
- `legal_page_content`: Contenido página /legal
- `invitation_email_template`: Plantilla email invitación
- `invitation_token_expiration_days`: Expiración token

#### PDF (2 claves):
- `pdf_templates`: Plantillas disponibles
- `rapid_pdf_mode`: Modo generación PDF

#### Suscripciones (2 claves):
- `subscriptions_enabled`: Módulo activado/desactivado
- `subscription_plans`: Planes Free/Pro/Enterprise

#### Tarifas (2 claves):
- `default_tariff`: Valores por defecto
- `iva_re_equivalences`: Equivalencias IVA-RE

#### Testing (1 clave):
- `mock_time`: Tiempo simulado (opcional)

---

## ✅ Paso 3: Verificar en la Aplicación

1. **Accede a tu app** en producción

2. **Login como superadmin**

3. **Ve a** `/settings`

4. **Verifica que aparecen todas las secciones**:
   - ✅ **General** (10 claves)
   - ✅ **PDF** (2 claves)
   - ✅ **Suscripciones** (2 claves)
   - ✅ **Tarifas** (2 claves)

5. **Si falta algo**:
   - Revisa la consola del navegador (F12)
   - Revisa logs de Supabase
   - Ejecuta de nuevo `UTIL_compare_config.sql` en producción
   - Compara con desarrollo

---

## 🔍 Troubleshooting

### Error: "table redpresu_config does not exist"

**Solución**: La tabla se llama diferente en tu base de datos.

Ejecuta esto para verificar:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%config%';
```

Si se llama `config` en lugar de `redpresu_config`, edita los scripts SQL y reemplaza `redpresu_config` por `config`.

### Error: "duplicate key value violates unique constraint"

**Solución**: Algunas claves ya existen. Esto es normal y esperado.

La migración usa `ON CONFLICT (key) DO NOTHING`, así que simplemente ignora las claves existentes. **No es un error crítico**.

### Error: La página /settings sigue mostrando pocas claves

**Posibles causas**:

1. **Cache del navegador**:
   - Ctrl+Shift+R (hard refresh)
   - Abre en ventana privada/incógnito

2. **La aplicación lee de otra tabla**:
   - Revisa el código en `src/lib/helpers/config-helpers.ts`
   - Verifica que la tabla sea `redpresu_config`

3. **RLS bloqueando queries**:
   ```sql
   -- Ejecuta esto en Supabase:
   SELECT * FROM public.redpresu_config;
   ```
   Si esto NO funciona, hay problema de permisos RLS.

   **Solución temporal** (solo para diagnóstico):
   ```sql
   ALTER TABLE public.redpresu_config DISABLE ROW LEVEL SECURITY;
   ```

### Las configuraciones se muestran pero no se pueden editar

**Verifica permisos**:
```sql
-- Ver políticas RLS de la tabla:
SELECT * FROM pg_policies WHERE tablename = 'redpresu_config';
```

**Debe tener policies para**:
- SELECT (todos los autenticados)
- INSERT/UPDATE/DELETE (solo superadmin)

---

## 📊 Archivos Creados

```
migrations/
├── 039_complete_config_setup.sql          # Migración completa (documentada)
├── EJECUTAR_039_complete_config_setup.sql # Para copiar/pegar en Supabase
├── UTIL_compare_schema.sql                # Comparar todo el schema
├── UTIL_compare_config.sql                # Comparar solo redpresu_config
└── README_COMPARAR_CONFIGS.md            # Este archivo (instrucciones)
```

---

## 🎯 Checklist Final

Antes de dar por completado:

- [ ] Backup de producción creado
- [ ] Migración 039 ejecutada sin errores
- [ ] Total configuraciones >= 17 rows
- [ ] Página `/settings` muestra 4 categorías (General, PDF, Suscripciones, Tarifas)
- [ ] Puedo editar configuraciones con is_system=false
- [ ] No puedo editar configuraciones con is_system=true (protegidas)
- [ ] La app funciona sin errores de "config not found"

---

## 📞 Soporte

Si después de seguir estos pasos sigues teniendo problemas:

1. **Verifica versión de migraciones**:
   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;
   ```

2. **Exporta configuración actual**:
   ```sql
   SELECT key, value, category, is_system
   FROM public.redpresu_config
   ORDER BY category, key;
   ```

3. **Comparte**:
   - Resultado de la query anterior
   - Screenshot de `/settings`
   - Logs de consola del navegador (F12)

---

**Última actualización**: 2025-01-30
**Versión**: 1.0
