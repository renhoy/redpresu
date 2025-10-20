# 📊 Progreso Remediación Vulnerabilidades
**Última actualización:** 2025-01-20
**Sesión actual:** Vulnerabilidades HIGH (VULN-006 a VULN-014)

---

## ✅ Completadas

### 🔴 CRÍTICAS
- ✅ **VULN-001**: Proteger SUPABASE_SERVICE_ROLE_KEY (Sesión anterior)
- ✅ **VULN-002**: Validar entrada en Server Actions (Sesión anterior)
- ✅ **VULN-003**: Sanitizar datos antes de PDF (Sesión anterior)
- ✅ **VULN-004**: Migrar PDFs a storage privado (Sesión anterior)
- ✅ **VULN-005**: Eliminar logs sensibles (Sesión anterior)

### 🟠 ALTAS
- ✅ **VULN-006**: Validar company_id en Server Actions **(COMPLETADA HOY)**
  - ✅ `budget-notes.ts` - Añadida validación en getBudgetNotes y addBudgetNote
  - ✅ `budget-versions.ts` - Añadida validación en createBudgetVersion y getBudgetVersions
  - ✅ `export.ts` - Añadida validación en exportTariffs y exportBudgets
  - ✅ `import.ts` - Añadida validación en importTariffs e importBudgets
  - ✅ Commits: 4 commits (2ebf4d3, f61117a, 95a8913, 73aa004)

- ✅ **VULN-008**: Validar JSON imports con Zod **(YA IMPLEMENTADA)**
  - ✅ `import.ts` ya tiene validación robusta con Zod schemas
  - ✅ Sanitización contra prototype pollution
  - ✅ Validación de tamaño de archivo (max 5MB)

- ✅ **VULN-011**: Validar metadata de Stripe **(COMPLETADA SESIÓN ANTERIOR)**
  - ✅ `src/lib/helpers/stripe-validation.ts` creado
  - ✅ Validación de company_id, plan_id, metadata
  - ✅ Rate limiting implementado en webhook
  - ✅ Commit: 7a6aa2f

---

## ⏳ En Progreso

### 🔴 CRÍTICAS
Ninguna (todas completadas)

### 🟠 ALTAS
Ninguna (trabajando en siguiente)

---

## 📋 Pendientes

### 🟠 ALTAS (Prioridad siguiente)

- [ ] **VULN-007**: Implementar soft-delete para empresas (4h)
  - **Archivo**: `src/app/actions/companies.ts`
  - **Tareas**:
    - [ ] Añadir campo `deleted_at` a tabla `redpresu_companies`
    - [ ] Modificar función `deleteCompany()` para soft-delete
    - [ ] Crear función `permanentlyDeleteCompany()` (solo superadmin)
    - [ ] Añadir confirmación doble en UI
    - [ ] Implementar backup automático antes de borrar

- [ ] **VULN-009**: Verificar sanitización Tiptap (1h)
  - **Archivo**: `src/components/budgets/BudgetForm.tsx`
  - **Tareas**:
    - [ ] Verificar que Tiptap usa DOMPurify o similar
    - [ ] Revisar si usa `dangerouslySetInnerHTML`
    - [ ] Añadir sanitización explícita si falta
    - [ ] Testear con payloads XSS

- [ ] **VULN-010**: Añadir validación de ownership (2h)
  - **Archivo**: `src/app/actions/budgets.ts`
  - **Función**: `updateBudget()`
  - **Tareas**:
    - [ ] Verificar que budget.company_id === user.company_id
    - [ ] Verificar permisos de rol (vendedor solo sus budgets)
    - [ ] Añadir logs de seguridad

- [ ] **VULN-012**: Verificar CSRF protection (1h)
  - **Archivos**: Múltiples Server Actions
  - **Tareas**:
    - [ ] Verificar que Next.js 14+ tiene protección automática
    - [ ] Revisar headers `origin` y `referer`
    - [ ] Documentar mecanismo de protección

- [ ] **VULN-013**: Ocultar stack traces en producción (1h)
  - **Archivos**: Todos los Server Actions
  - **Tareas**:
    - [ ] Crear helper `sanitizeError(error, isDev)`
    - [ ] Reemplazar `error.message` por mensajes genéricos en producción
    - [ ] Mantener logs detallados en servidor
    - [ ] Configurar `NODE_ENV=production`

- [ ] **VULN-014**: Configurar timeouts en Supabase (1h)
  - **Archivos**: Configuración Supabase client
  - **Tareas**:
    - [ ] Añadir timeout global (30s default)
    - [ ] Timeout específico para queries pesadas
    - [ ] Manejo de errores de timeout
    - [ ] Testing con queries lentas

### 🟡 MEDIAS (Backlog)

- [ ] **VULN-015**: Validar file size en uploads (1h)
- [ ] **VULN-016**: Mejorar generación de passwords (1h)
- [ ] **VULN-017**: Añadir security headers (2h)
- [ ] **VULN-018**: Usar crypto.randomUUID() (0.5h)
- [ ] **VULN-019**: Validar emails en cliente (1h)

---

## 📈 Métricas de Progreso

| Prioridad | Total | Completadas | Pendientes | % Completado |
|-----------|-------|-------------|------------|--------------|
| 🔴 CRÍTICAS | 5 | 5 | 0 | **100%** ✅ |
| 🟠 ALTAS | 9 | 3 | 6 | **33%** ⏳ |
| 🟡 MEDIAS | 5 | 0 | 5 | **0%** 📋 |
| **TOTAL** | **19** | **8** | **11** | **42%** |

**Tiempo invertido:** ~6 horas (estimado)
**Tiempo restante:** ~19.5 horas (estimado)

---

## 🎯 Próximos Pasos Recomendados

### Opción A: Continuar con ALTAS (recomendado)
1. **VULN-007** - Soft-delete empresas (4h) - **Impacto alto en producción**
2. **VULN-010** - Validación ownership updateBudget (2h)
3. **VULN-009** - Verificar XSS Tiptap (1h)
4. **VULN-012** - CSRF protection (1h)
5. **VULN-013** - Stack traces (1h)
6. **VULN-014** - Timeouts (1h)

### Opción B: Quick Wins
1. **VULN-012** - CSRF protection (1h) - Solo verificación
2. **VULN-013** - Stack traces (1h) - Helper global
3. **VULN-014** - Timeouts (1h) - Config change
4. **VULN-009** - XSS Tiptap (1h) - Solo verificación
5. **VULN-010** - Ownership validation (2h)
6. **VULN-007** - Soft-delete (4h) - Más complejo

---

## 📝 Archivos de Referencia

- **Auditoría completa**: `docs/auditorias/auditoria-seguridad.md`
- **Plan detallado**: `docs/auditorias/plan-remediacion.md`
- **Este archivo**: `docs/auditorias/PROGRESO_SEGURIDAD.md` (tracking actual)

---

## 🔍 Commits Relevantes (Sesión Actual)

```bash
# VULN-006 - Validación company_id
73aa004 security(VULN-006): validar company_id en import.ts
95a8913 security(VULN-006): validar company_id en export.ts
f61117a security(VULN-006): validar company_id en budget-versions.ts
2ebf4d3 security(VULN-006): validar company_id en budget-notes.ts

# UI Fixes
5fe13c8 fix(layout): corregir nombre de usuario y mejorar diseño dropdown

# VULN-011 (sesión anterior)
7a6aa2f security(VULN-011): validar metadata de Stripe webhook
```

---

**Notas:**
- Las vulnerabilidades CRÍTICAS están 100% completadas ✅
- Enfoque actual: Vulnerabilidades ALTAS (33% completado)
- Siguiente objetivo: VULN-007 (Soft-delete) o Quick Wins (VULN-012 a VULN-014)
