# Refactoring Completo: Nombres de Tablas y Campos de Español a Inglés

## Resumen Ejecutivo

Se ha completado un refactoring completo del código TypeScript/TSX para actualizar todos los nombres de tablas y campos de la base de datos de español a inglés.

## Cambios Realizados

### 1. Tablas Renombradas

| Nombre Anterior | Nombre Nuevo |
|----------------|--------------|
| `tariffs` | `redpresu_tariffs` |
| `budgets` | `redpresu_budgets` |
| `users` | `redpresu_users` |
| `issuers` | `redpresu_issuers` |
| `empresas` | `redpresu_companies` |
| `config` | `redpresu_config` |
| `budget_versions` | `redpresu_budget_versions` |
| `budget_notes` | `redpresu_budget_notes` |

### 2. Campos Renombrados

| Nombre Anterior | Nombre Nuevo | Tablas Afectadas |
|----------------|--------------|------------------|
| `empresa_id` | `company_id` | budgets, tariffs, users, issuers |
| `total_pagar` | `total_pay` | budgets, budget_versions |
| `re_aplica` | `re_apply` | budgets |

### 3. Archivos Modificados

#### Actions (10 archivos):
- ✅ `src/app/actions/tariffs.ts`
- ✅ `src/app/actions/budgets.ts`
- ✅ `src/app/actions/auth.ts`
- ✅ `src/app/actions/config.ts`
- ✅ `src/app/actions/dashboard.ts`
- ✅ `src/app/actions/users.ts`
- ✅ `src/app/actions/budget-versions.ts`
- ✅ `src/app/actions/budget-notes.ts`
- ✅ `src/app/actions/import.ts`
- ✅ `src/app/actions/export.ts`

#### Library (4 archivos):
- ✅ `src/lib/auth/server.ts`
- ✅ `src/lib/auth/supabase-auth.ts`
- ✅ `src/lib/types/database.ts`
- ✅ `src/lib/helpers/export-helpers.ts`

#### Componentes y Páginas (78 archivos):
- ✅ 24 archivos `.tsx` en `src/app/`
- ✅ 54 archivos `.tsx` en `src/components/`

**Total: 92 archivos modificados**

## Cambios Detallados por Archivo Clave

### tariffs.ts
- Reemplazos `.from('tariffs')` → `.from('redpresu_tariffs')`: Todas las queries
- Reemplazos `.from('users')` → `.from('redpresu_users')`: Para joins de usuarios
- Reemplazos `.from('budgets')` → `.from('redpresu_budgets')`: Para verificaciones
- Reemplazos `.from('issuers')` → `.from('redpresu_issuers')`: Para getUserIssuerData
- Campo `empresa_id` → `company_id`: Todas las ocurrencias

### budgets.ts  
- Reemplazos `.from('budgets')` → `.from('redpresu_budgets')`: Todas las queries
- Reemplazos `.from('tariffs')` → `.from('redpresu_tariffs')`: Para joins
- Reemplazos `.from('users')` → `.from('redpresu_users')`: Para joins
- Campo `empresa_id` → `company_id`: Todas las ocurrencias
- Campo `total_pagar` → `total_pay`: Todas las ocurrencias
- Campo `re_aplica` → `re_apply`: Todas las ocurrencias
- Join `tariff:tariffs` → `tariff:redpresu_tariffs`: En queries con joins

### auth.ts
- Reemplazos `.from('users')` → `.from('redpresu_users')`: Todas las queries
- Reemplazos `.from('empresas')` → `.from('redpresu_companies')`: Para registro
- Reemplazos `.from('issuers')` → `.from('redpresu_issuers')`: Para registro
- Campo `empresa_id` → `company_id`: En interfaces y queries

### config.ts
- Reemplazos `.from('config')` → `.from('redpresu_config')`: Todas las queries
- Reemplazos `.from('tariffs')` → `.from('redpresu_tariffs')`: Para defaults
- Reemplazos `.from('issuers')` → `.from('redpresu_issuers')`: Para issuer data
- Campo `empresa_id` → `company_id`: Todas las ocurrencias
- Actualizado `getDefaultEmpresaId()` para usar `'default_company_id'`

### database.ts (tipos)
- Interface `User`: Campo `company_id`
- Interface `Tariff`: Campo `company_id`
- Interface `Budget`: Campos `company_id` y `total_pay`
- Interface `BudgetVersion`: Campo `total_pay`

## Método Utilizado

Se utilizó `sed` (stream editor) para hacer reemplazos masivos y seguros:

```bash
# Ejemplo de comandos ejecutados:
sed -i '' "s/\.from('tariffs')/\.from('redpresu_tariffs')/g" archivo.ts
sed -i '' "s/empresa_id/company_id/g" archivo.ts
sed -i '' "s/total_pagar/total_pay/g" archivo.ts
sed -i '' "s/re_aplica/re_apply/g" archivo.ts
```

## Verificaciones Necesarias

### ⚠️ PASOS SIGUIENTES CRÍTICOS:

1. **Migraciones SQL**: Ejecutar ALTER TABLE en la base de datos para renombrar tablas y columnas:
   ```sql
   -- Ejemplo:
   ALTER TABLE tariffs RENAME TO redpresu_tariffs;
   ALTER TABLE budgets RENAME COLUMN empresa_id TO company_id;
   ALTER TABLE budgets RENAME COLUMN total_pagar TO total_pay;
   ALTER TABLE budgets RENAME COLUMN re_aplica TO re_apply;
   ```

2. **Funciones SQL**: Actualizar funciones SQL que referencien tablas/campos antiguos:
   - `get_user_empresa_id()` → `get_user_company_id()`
   - Cualquier otra función custom

3. **Políticas RLS**: Verificar y actualizar políticas de Row Level Security que referencien los campos antiguos

4. **Triggers**: Actualizar triggers que referencien tablas/campos antiguos

5. **Testing Exhaustivo**:
   - [ ] Login y autenticación
   - [ ] CRUD de tarifas
   - [ ] CRUD de presupuestos
   - [ ] Generación de PDFs
   - [ ] Import/Export
   - [ ] Versionado de presupuestos
   - [ ] Notas en presupuestos
   - [ ] Dashboard y reportes
   - [ ] Gestión de usuarios

## Lo Que NO Se Modificó

- ❌ Archivos de migración SQL históricos (mantienen nombres originales para registro)
- ❌ Variables locales de TypeScript que no representan campos de BD
- ❌ Comentarios en el código (pueden requerir actualización manual)
- ❌ Archivos de documentación (excepto este resumen)

## Estado del Refactoring

✅ **COMPLETADO** - Todos los archivos TypeScript/TSX han sido actualizados

⚠️ **PENDIENTE** - Migraciones SQL en la base de datos

## Notas Adicionales

- Se utilizó el patrón de búsqueda específico `.from('nombre')` para evitar reemplazar strings en otros contextos
- Los campos se reemplazaron globalmente ya que representan exclusivamente nombres de columnas de BD
- Se verificó que no se rompieran interfaces TypeScript ni imports
- El refactoring es reversible ejecutando comandos `sed` inversos si fuera necesario

---

**Fecha de Refactoring**: 2025-10-17
**Herramienta Utilizada**: Claude Code + sed
**Archivos Procesados**: 92
**Líneas de Código Impactadas**: ~5000+ (estimado)
