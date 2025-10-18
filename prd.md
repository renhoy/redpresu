# Fase 2 - Requisitos y Funcionalidades

## Estado del Proyecto

**Fase Actual:** Fase 2 (Post-MVP)
**MVP Completado:** 100% ✅
**Objetivo Fase 2:** Evolución funcional, preparación multi-tenant, mejoras UX

---

## Priorización de Implementación

Las tareas están ordenadas por:

1. **Impacto en funcionalidad crítica** (usuarios, seguridad)
2. **Dependencias técnicas** (base para otras features)
3. **Complejidad de cambios** (menor cambio = mayor prioridad)
4. **Valor para usuario final**

---

## BLOQUE 1: Usuarios y Seguridad (CRÍTICO)

### 1.1 Sistema de Registro y Autenticación Completo

**Prioridad:** CRÍTICA
**Estado:** Parcialmente implementado (falta registro y recuperación)
**Impacto:** Base para multi-tenant

**Funcionalidades:**

- ✅ Login existente (mantener)
- ⏳ Registro de usuarios nuevos
- ⏳ Recuperación de contraseña (email)
- ⏳ Cambio de contraseña desde perfil
- ⏳ Verificación email (opcional Fase 3)

**Flujo de Registro:**

```
1. Usuario accede a /register
2. Completa formulario:
   - Email
   - Contraseña (+ confirmar)
   - Tipo emisor: [Empresa | Autónomo]
   - Nombre comercial
   - NIF/CIF
   - Datos fiscales:
     * Si Autónomo: % IRPF (default 15%)
     * Dirección fiscal
     * Contacto (teléfono, web)
3. Sistema crea:
   - Usuario en auth.users
   - Registro en public.users (role: admin por defecto)
   - Registro en public.emisores
4. Redirect a /dashboard
```

**Server Actions nuevas:**

- `registerUser(data)` - Crear usuario + emisor
- `requestPasswordReset(email)` - Enviar email recuperación
- `resetPassword(token, newPassword)` - Cambiar contraseña
- `updateUserProfile(userId, data)` - Actualizar perfil

**Cambios en BD:**

```sql
-- Nueva tabla emisores
CREATE TABLE public.emisores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id INTEGER DEFAULT 1,
  tipo TEXT CHECK (tipo IN ('empresa', 'autónomo')),
  nombre_comercial TEXT NOT NULL,
  nif TEXT NOT NULL UNIQUE,
  direccion_fiscal TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  web TEXT,
  irpf_percentage DECIMAL(5,2), -- solo si tipo = 'autónomo'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_emisores_user_id ON emisores(user_id);
CREATE INDEX idx_emisores_empresa_id ON emisores(empresa_id);
```

**UI Componentes:**

- `/app/(auth)/register/page.tsx` - Página registro
- `/components/auth/RegisterForm.tsx` - Formulario registro
- `/components/auth/PasswordResetForm.tsx` - Recuperación contraseña
- `/app/profile/page.tsx` - Página perfil usuario

---

### 1.2 CRUD de Usuarios (Admin/Superadmin)

**Prioridad:** ALTA
**Dependencias:** 1.1 completado
**Impacto:** Gestión multi-usuario por empresa

**Funcionalidades:**

- Listar usuarios de la empresa
- Crear usuario nuevo (solo admin/superadmin)
- Editar usuario existente
- Cambiar rol (vendedor ↔ admin)
- Desactivar/activar usuario (no eliminar)
- Ver historial actividad (opcional)

**Server Actions:**

- `getCompanyUsers(empresaId)` - Listar usuarios empresa
- `createUser(data)` - Crear usuario (admin invita)
- `updateUser(userId, data)` - Editar usuario
- `toggleUserStatus(userId)` - Activar/desactivar
- `changeUserRole(userId, newRole)` - Cambiar rol

**Cambios en BD:**

```sql
ALTER TABLE public.users
  ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ADD COLUMN invited_by UUID REFERENCES auth.users(id),
  ADD COLUMN last_login TIMESTAMPTZ;
```

**UI:**

- `/app/users/page.tsx` - Listado usuarios
- `/app/users/create/page.tsx` - Crear usuario
- `/app/users/[id]/edit/page.tsx` - Editar usuario
- `/components/users/UserTable.tsx` - Tabla usuarios
- `/components/users/UserForm.tsx` - Formulario usuario

**RLS Policies:**

```sql
-- Solo admin/superadmin pueden ver usuarios de su empresa
CREATE POLICY "users_select_admin"
ON public.users FOR SELECT
USING (
  empresa_id = (SELECT empresa_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);
```

---

## BLOQUE 2: Mejoras Incrementales en Tarifas

### 2.1 Campo user_id en Tarifas

**Prioridad:** ALTA
**Complejidad:** BAJA (cambio simple)
**Impacto:** Trazabilidad, permisos

**Cambios:**

```sql
ALTER TABLE tariffs
  ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Migrar datos existentes (asignar al primer admin)
UPDATE tariffs
SET user_id = (
  SELECT id FROM users
  WHERE role = 'admin'
  LIMIT 1
)
WHERE user_id IS NULL;

-- Hacer obligatorio después de migración
ALTER TABLE tariffs
  ALTER COLUMN user_id SET NOT NULL;
```

**Server Actions modificadas:**

- `createTariff()` - añadir `user_id = auth.uid()`
- `getTariffs()` - incluir join con users para mostrar creador

**UI cambios:**

- Columna "Creado por" en listado tarifas
- Filtro por usuario (admin/superadmin)

---

### 2.2 Detección Automática de IVAs en CSV

**Prioridad:** ALTA
**Complejidad:** BAJA
**Impacto:** Mejora UX, preparación para IRPF/RE

**Implementación:**

```typescript
// src/lib/validators/csv-converter.ts

export function detectIVAsPresentes(jsonData: BudgetItem[]): number[] {
  const ivasSet = new Set<number>();

  jsonData.forEach((item) => {
    if (item.level === "item" && item.iva_percentage) {
      const iva = parseFloat(item.iva_percentage);
      if (!isNaN(iva)) {
        ivasSet.add(iva);
      }
    }
  });

  return Array.from(ivasSet).sort((a, b) => b - a); // desc: 21, 10, 4
}
```

**Modificar Server Action:**

```typescript
// src/app/actions/tariffs.ts

export async function createTariff(formData) {
  // ... validación CSV existente

  const jsonData = await converter.convertCSVToJSON(csvContent);

  // NUEVO: detectar IVAs
  const ivasPresentes = detectIVAsPresentes(jsonData.data);

  const tariffData = {
    ...formData,
    json_tariff_data: jsonData.data,
    ivas_presentes: ivasPresentes, // NUEVO campo
  };

  // ... guardar en BD
}
```

**Cambios en BD:**

```sql
ALTER TABLE tariffs
  ADD COLUMN ivas_presentes DECIMAL(5,2)[] DEFAULT '{}';

-- Ejemplo de dato guardado: {21.00, 10.00, 4.00}
```

**Sin cambios UI** - campo invisible, usado internamente para RE.

---

### 2.3 Tarifa por Defecto (Plantilla)

**Prioridad:** MEDIA
**Complejidad:** BAJA
**Impacto:** Ahorra tiempo en creación tarifas

**Funcionalidades:**

- Checkbox "Usar como plantilla" en listado tarifas
- Solo 1 tarifa activa puede ser plantilla (toggle automático)
- Al crear tarifa nueva, pre-cargar datos de plantilla excepto CSV

**Cambios en BD:**

```sql
ALTER TABLE tariffs
  ADD COLUMN is_template BOOLEAN DEFAULT FALSE;

-- Trigger para asegurar solo 1 plantilla por empresa
CREATE OR REPLACE FUNCTION ensure_single_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_template = TRUE THEN
    UPDATE tariffs
    SET is_template = FALSE
    WHERE empresa_id = NEW.empresa_id
      AND id != NEW.id
      AND is_template = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tariff_template_trigger
  BEFORE INSERT OR UPDATE ON tariffs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_template();
```

**Server Actions:**

```typescript
export async function setTariffAsTemplate(tariffId: string) {
  // Marca tarifa como plantilla
  // Automáticamente desmarca otras via trigger
}

export async function getTemplateTariff(empresaId: number) {
  // Retorna tarifa marcada como plantilla
  return await supabase
    .from("tariffs")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("is_template", true)
    .single();
}

export async function createTariffFromTemplate() {
  const template = await getTemplateTariff(empresaId);

  return {
    title: "",
    description: "",
    // Pre-cargar de plantilla:
    name: template.name,
    nif: template.nif,
    address: template.address,
    contact: template.contact,
    primary_color: template.primary_color,
    secondary_color: template.secondary_color,
    validity: template.validity,
    summary_note: template.summary_note,
    conditions_note: template.conditions_note,
    legal_note: template.legal_note,
    template: template.template,
    logo_url: template.logo_url,
    // NO pre-cargar: json_tariff_data (CSV siempre nuevo)
  };
}
```

**UI:**

- Columna "Plantilla" en listado (checkbox)
- Al crear tarifa, detectar si hay plantilla y pre-cargar

---

## BLOQUE 3: Tabla de Configuración

### 3.1 Tabla Config (Valores del Sistema)

**Prioridad:** ALTA
**Complejidad:** MEDIA
**Impacto:** Desacoplar valores hardcoded, preparar IRPF/RE

**Estructura:**

```sql
CREATE TABLE public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id INTEGER DEFAULT 1, -- preparar multi-tenant
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, config_key)
);

-- Índices
CREATE INDEX idx_config_empresa_key ON config(empresa_id, config_key);

-- Datos iniciales
INSERT INTO config (config_key, config_value, description) VALUES
('iva_re_equivalences',
 '{"21": 5.2, "10": 1.4, "4": 0.5}',
 'Equivalencias entre % IVA y % Recargo Equivalencia'),

('pdf_templates',
 '[
   {"id": "41200-00001", "name": "Clásico", "preview": "/templates/clasico.png"},
   {"id": "41200-00002", "name": "Moderno", "preview": "/templates/moderno.png"},
   {"id": "41200-00003", "name": "Minimalista", "preview": "/templates/minimalista.png"}
 ]',
 'Catálogo de plantillas PDF disponibles'),

('default_tariff_config',
 '{"primary_color": "#3b82f6", "secondary_color": "#1e40af", "validity_days": 30}',
 'Configuración por defecto al crear tarifa'),

('irpf_defaults',
 '{"autonomo": 15, "empresa": 0}',
 'Porcentajes IRPF por defecto según tipo emisor');
```

**Helper functions:**

```typescript
// src/lib/helpers/config-helpers.ts

export async function getConfigValue<T = any>(
  key: string,
  empresaId: number = 1
): Promise<T | null> {
  const { data } = await supabase
    .from("config")
    .select("config_value")
    .eq("empresa_id", empresaId)
    .eq("config_key", key)
    .single();

  return data?.config_value as T;
}

export async function setConfigValue(
  key: string,
  value: any,
  empresaId: number = 1
) {
  return await supabase.from("config").upsert(
    {
      empresa_id: empresaId,
      config_key: key,
      config_value: value,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "empresa_id,config_key",
    }
  );
}

// Helpers específicos
export async function getIVAtoREEquivalences(): Promise<
  Record<number, number>
> {
  return (await getConfigValue("iva_re_equivalences")) || {};
}

export async function getPDFTemplates(): Promise<PDFTemplate[]> {
  return (await getConfigValue("pdf_templates")) || [];
}
```

**Server Actions:**

```typescript
// src/app/actions/config.ts
"use server";

export async function getSystemConfig(keys?: string[]) {
  // Obtener configuración del sistema
}

export async function updateSystemConfig(key: string, value: any) {
  // Solo superadmin puede actualizar
  const user = await getServerUser();
  if (user.role !== "superadmin") {
    return { success: false, error: "Sin permisos" };
  }

  return setConfigValue(key, value);
}
```

**UI:**

- `/app/settings/page.tsx` - Página configuración (solo superadmin)
- Formularios para editar cada config_key
- Vista previa de cambios antes de guardar

---

### 3.2 Selector de Plantillas PDF

**Prioridad:** MEDIA
**Dependencias:** 3.1 completado
**Complejidad:** BAJA

**Cambios en formulario tarifa:**

```typescript
// src/components/tariffs/TariffForm.tsx

const [templates, setTemplates] = useState<PDFTemplate[]>([]);
const [selectedTemplate, setSelectedTemplate] = useState<string>("");
const [previewVisible, setPreviewVisible] = useState(false);

useEffect(() => {
  async function loadTemplates() {
    const data = await getPDFTemplates();
    setTemplates(data);
    setSelectedTemplate(data[0]?.id || "");
  }
  loadTemplates();
}, []);

// En el JSX
<Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
  {templates.map((t) => (
    <SelectItem
      key={t.id}
      value={t.id}
      onMouseEnter={() => setPreviewVisible(true)}
      onMouseLeave={() => setPreviewVisible(false)}
    >
      {t.name}
      {previewVisible && (
        <Image src={t.preview} alt={t.name} className="absolute z-50 ..." />
      )}
    </SelectItem>
  ))}
</Select>;
```

**Estructura directorio:**

```
public/
  templates/
    clasico.png
    moderno.png
    minimalista.png
```

---

## BLOQUE 4: IRPF y Recargo de Equivalencia

### 4.1 Implementación IRPF

**Prioridad:** ALTA
**Dependencias:** Bloque 1 completado (emisores)
**Complejidad:** MEDIA
**Estado:** ✅ Completado

**Cambios en tabla emisores:**

```sql
-- Ya incluido en Bloque 1.1
ALTER TABLE emisores
  ADD COLUMN irpf_percentage DECIMAL(5,2) DEFAULT 15.00;
```

**Lógica de aplicación:**

```typescript
// src/lib/helpers/fiscal-calculations.ts

export function shouldApplyIRPF(emisor: Emisor, cliente: Cliente): boolean {
  return (
    emisor.tipo === "autónomo" &&
    (cliente.tipo === "empresa" || cliente.tipo === "autónomo")
  );
}

export function calculateIRPF(
  baseImponible: number,
  irpfPercentage: number
): number {
  return baseImponible * (irpfPercentage / 100);
}
```

**Server Actions modificadas:**

```typescript
// src/app/actions/budgets.ts

export async function saveBudget(budgetData) {
  // Obtener emisor
  const emisor = await getEmisorByUserId(auth.uid());

  // Calcular IRPF si aplica
  const aplicaIRPF = shouldApplyIRPF(emisor, budgetData.cliente);
  const irpfAmount = aplicaIRPF
    ? calculateIRPF(budgetData.totales.baseImponible, emisor.irpf_percentage)
    : 0;

  // Guardar en budgets
  const totales = {
    ...budgetData.totales,
    irpf: irpfAmount,
    totalPagar: budgetData.totales.totalConIVA - irpfAmount,
  };

  // ...
}
```

**Cambios en BD:**

```sql
-- Añadir a budgets (ya tiene json_budget_data)
-- Los totales se guardan dentro del JSON:
{
  "totales": {
    "subtotal": 5193.00,
    "base": 4922.50,
    "ivas": {"21": 270.50},
    "irpf": 738.38,  // NUEVO
    "re": {},
    "totalPagar": 4454.62  // NUEVO
  }
}
```

**UI cambios:**

- Mostrar IRPF en resumen totales (si aplica)
- Tooltip explicativo: "IRPF aplicado por ser autónomo"

---

### 4.2 Implementación Recargo de Equivalencia

**Prioridad:** ALTA
**Dependencias:** 3.1 (tabla config), 2.2 (detección IVAs)
**Complejidad:** MEDIA-ALTA
**Estado:** ✅ Completado

**Cambios en formulario cliente:**

```typescript
// src/components/budgets/BudgetForm.tsx (Paso 1)

const [aplicaRecargo, setAplicaRecargo] = useState(false);
const [recargos, setRecargos] = useState<Record<number, number>>({});

useEffect(() => {
  if (clienteData.tipo === "autónomo" && aplicaRecargo) {
    // Cargar valores por defecto desde config
    const defaults = await getIVAtoREEquivalences();

    // Solo para IVAs presentes en la tarifa
    const recargosInicial = {};
    tariff.ivas_presentes.forEach((iva) => {
      recargosInicial[iva] = defaults[iva] || 0;
    });

    setRecargos(recargosInicial);
  }
}, [clienteData.tipo, aplicaRecargo]);

// En el JSX
{
  clienteData.tipo === "autónomo" && (
    <>
      <Checkbox checked={aplicaRecargo} onCheckedChange={setAplicaRecargo}>
        Aplicar recargo de equivalencia
      </Checkbox>

      {aplicaRecargo && (
        <div className="border rounded p-4 mt-2">
          <h4>Recargos por IVA</h4>
          {tariff.ivas_presentes.map((iva) => (
            <div key={iva} className="flex items-center gap-4">
              <Label>{iva}% IVA</Label>
              <Input
                type="number"
                step="0.1"
                value={recargos[iva]}
                onChange={(e) =>
                  setRecargos({
                    ...recargos,
                    [iva]: parseFloat(e.target.value),
                  })
                }
              />
              <span>% RE</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

**Lógica de cálculo:**

```typescript
// src/lib/helpers/fiscal-calculations.ts

export function calculateRecargo(
  items: BudgetItem[],
  recargos: Record<number, number>
): Record<number, number> {
  const reByIVA: Record<number, number> = {};

  items.forEach((item) => {
    if (item.level !== "item") return;

    const iva = parseFloat(item.iva_percentage);
    const re = recargos[iva] || 0;

    if (re > 0) {
      const pvp = parseFloat(item.pvp);
      const cantidad = parseFloat(item.quantity || "0");

      // Base sin IVA ni RE
      const base = (pvp * cantidad) / (1 + iva / 100 + re / 100);
      const importeRE = base * (re / 100);

      reByIVA[iva] = (reByIVA[iva] || 0) + importeRE;
    }
  });

  return reByIVA;
}
```

**Cambios en BD:**

```sql
-- Añadir columnas para persistencia (Migration 024)
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS re_aplica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS re_total DECIMAL(10,2) DEFAULT 0.00;

-- Datos detallados en json_budget_data:
{
  "items": [...],
  "recargo": {
    "aplica": true,
    "recargos": {"21": 5.2, "10": 1.4},
    "reByIVA": {"21": 52.00, "10": 14.00},
    "totalRE": 66.00
  }
}
```

**Estrategia de persistencia implementada:**

1. **Columnas `re_aplica` y `re_total`** para queries rápidas y cálculos
2. **JSON `json_budget_data.recargo`** para datos detallados (recargos por IVA, montos parciales)
3. **Restauración automática** al editar: lee JSON y restaura estado checkbox + tabla

**Archivos implementados:**

- ✅ `migrations/024_budgets_re_fields.sql` - Columnas RE + inicialización
- ✅ `src/app/actions/budgets.ts` - Guardado doble (columnas + JSON)
- ✅ `src/components/budgets/BudgetForm.tsx` - Restauración desde JSON

---

### 4.3 Modificación Payload PDF

**Prioridad:** ALTA
**Dependencias:** 4.1, 4.2 completados
**Complejidad:** BAJA

**Cambios en payload builder:**

```typescript
// src/lib/helpers/pdf-payload-builder.ts

export function buildPDFPayload(budget: Budget, tariff: Tariff) {
  // ... código existente

  const totals = {
    subtotal: {
      name: 'Total (IVA incluido)',
      amount: formatCurrency(budget.totales.subtotal)
    },
    base: {
      name: 'Base Imponible',
      amount: formatCurrency(budget.totales.base)
    },
    ivas: Object.entries(budget.totales.ivas).map(([iva, amount]) => ({
      name: `${iva}% IVA`,
      amount: formatCurrency(amount)
    })),
    // NUEVO: IRPF
    ...(budget.totales.irpf > 0 && {
      irpf: {
        name: `${budget.emisor.irpf_percentage}% IRPF`,
        amount: `-${formatCurrency(budget.totales.irpf)}` // negativo
      }
    }),
    // NUEVO: RE
    ...(Object.keys(budget.totales.re).length > 0 && {
      re: Object.entries(budget.totales.re).map(([iva, amount]) => ({
        name: `${budget.cliente.recargos[iva]}% RE (IVA ${iva}%)`,
        amount: formatCurrency(amount)
      }))
    }),
    total: {
      name: 'Total a Pagar',
      amount: formatCurrency(budget.totales.totalPagar)
    }
  };

  return {
    company: {...},
    client: {...},
    budget: {...},
    summary: {...},
    totals // estructura modificada
  };
}
```

**Cambios en Rapid-PDF:**

- Renderizar `irpf` (opcional, negativo)
- Renderizar `re` (opcional, array)
- Cambiar título "Total Presupuesto" → "Total a Pagar"

---

## BLOQUE 5: Sistema de Versiones y Notas

### 5.1 Versiones de Presupuestos

**Prioridad:** MEDIA
**Complejidad:** MEDIA-ALTA
**Impacto:** Trazabilidad, auditoría

**Nuevas tablas:**

```sql
CREATE TABLE budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  json_budget_data JSONB NOT NULL,
  json_client_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT, -- nota de versión opcional
  UNIQUE(budget_id, version_number)
);

CREATE INDEX idx_versions_budget ON budget_versions(budget_id, version_number DESC);

-- Modificar budgets
ALTER TABLE budgets
  ADD COLUMN json_client_data JSONB,
  ADD COLUMN current_version INT DEFAULT 1;

-- Migrar datos existentes de cliente a json_client_data
UPDATE budgets SET json_client_data = jsonb_build_object(
  'tipo', client_type,
  'nombre', client_name,
  'nif', client_nif_nie,
  'telefono', client_phone,
  'email', client_email,
  'web', client_web,
  'direccion', client_address,
  'cp', client_postal_code,
  'localidad', client_locality,
  'provincia', client_province,
  'aceptacion', client_acceptance
);
```

**Server Actions:**

```typescript
// src/app/actions/budget-versions.ts
"use server";

export async function createBudgetVersion(budgetId: string, notes?: string) {
  const budget = await getBudgetById(budgetId);
  const nextVersion = budget.current_version + 1;

  // Guardar snapshot
  await supabase.from("budget_versions").insert({
    budget_id: budgetId,
    version_number: nextVersion,
    json_budget_data: budget.json_budget_data,
    json_client_data: budget.json_client_data,
    created_by: auth.uid(),
    notes,
  });

  // Actualizar versión actual
  await supabase
    .from("budgets")
    .update({ current_version: nextVersion })
    .eq("id", budgetId);

  return { success: true, version: nextVersion };
}

export async function getBudgetVersions(budgetId: string) {
  return await supabase
    .from("budget_versions")
    .select("*, created_by:users(name)")
    .eq("budget_id", budgetId)
    .order("version_number", { ascending: false });
}

export async function restoreBudgetVersion(
  budgetId: string,
  versionNumber: number
) {
  const version = await supabase
    .from("budget_versions")
    .select("*")
    .eq("budget_id", budgetId)
    .eq("version_number", versionNumber)
    .single();

  // Crear nueva versión con datos antiguos
  const nextVersion = (await getCurrentVersion(budgetId)) + 1;

  await supabase.from("budget_versions").insert({
    budget_id: budgetId,
    version_number: nextVersion,
    json_budget_data: version.json_budget_data,
    json_client_data: version.json_client_data,
    created_by: auth.uid(),
    notes: `Restaurado desde versión ${versionNumber}`,
  });

  // Actualizar presupuesto actual
  await supabase
    .from("budgets")
    .update({
      json_budget_data: version.json_budget_data,
      json_client_data: version.json_client_data,
      current_version: nextVersion,
    })
    .eq("id", budgetId);

  return { success: true };
}
```

**UI:**

- `/app/budgets/[id]/versions/page.tsx` - Timeline de versiones
- Botón "Guardar versión" en formulario edición
- Botón "Restaurar" en cada versión del timeline
- Confirmar restauración (AlertDialog)

---

### 5.2 Sistema de Notas/Bitácora

**Prioridad:** MEDIA
**Complejidad:** BAJA
**Impacto:** Seguimiento comercial
**Estado:** ✅ Completado

**Nueva tabla:**

```sql
CREATE TABLE budget_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,  -- Cambio: 'content' en lugar de 'note_text'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_budget ON budget_notes(budget_id, created_at DESC);
```

**Server Actions:**

```typescript
// src/app/actions/budget-notes.ts
"use server";

export async function addBudgetNote(budgetId: string, content: string) {
  return await supabase.from("budget_notes").insert({
    budget_id: budgetId,
    user_id: auth.uid(),
    content: content,
  });
}

export async function getBudgetNotes(budgetId: string) {
  // IMPORTANTE: usar 'nombre' en lugar de 'name'
  return await supabase
    .from("budget_notes")
    .select("*, users(nombre, email)")  // cambio crítico
    .eq("budget_id", budgetId)
    .order("created_at", { ascending: false });
}

export async function updateBudgetNote(noteId: string, content: string) {
  return await supabase
    .from("budget_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId);
}

export async function deleteBudgetNote(noteId: string) {
  // Solo el creador o admin puede eliminar
  return await supabase.from("budget_notes").delete().eq("id", noteId);
}
```

**UI implementada:**

- ✅ **BudgetNotesIcon** - Botón con badge contador en listado presupuestos
- ✅ **Popover preview** - Muestra últimas 3 notas al hacer hover
- ✅ **BudgetNotesDialog** - Modal completo para gestión de notas
- ✅ **Funcionalidades**: Añadir, editar, eliminar notas
- ✅ **Timeline** cronológico con formato relativo
- ✅ **Permisos**: Solo creador y admin pueden eliminar

**Correcciones críticas implementadas:**

1. **Fix Radix UI Triggers** (Migration 024):
   - Problema: Popover no abría debido a conflicto Tooltip + Popover
   - Solución: Reestructurada jerarquía de componentes
   - Antes: `Popover > PopoverTrigger > Tooltip > TooltipTrigger > Button`
   - Después: `Tooltip > Popover > (TooltipTrigger + PopoverTrigger) > Button`

2. **Campo 'nombre' vs 'name'**:
   - Todas las queries SELECT usan `users.nombre` (no `name`)
   - Corregido `getServerUser()` para no sobreescribir con auth metadata
   - Actualizado interface `BudgetNote` con `users?: { nombre: string }`

**Archivos implementados:**

- ✅ `migrations/019_budget_notes.sql`
- ✅ `src/app/actions/budget-notes.ts`
- ✅ `src/components/budgets/BudgetNotesIcon.tsx`
- ✅ `src/components/budgets/BudgetNotesDialog.tsx`

---

## BLOQUE 6: Navegación y Jerarquía Unificada

### 6.1 Algoritmo Único de Navegación Jerárquica

**Prioridad:** ALTA
**Complejidad:** MEDIA-ALTA
**Impacto:** Consistencia UX, mantenibilidad

**Problema actual:**

- Tariff preview usa un sistema
- Budget form usa otro sistema
- Diferentes estilos visuales

**Solución: Componente compartido**

```typescript
// src/components/shared/HierarchicalNavigator.tsx

interface HierarchicalItem {
  id: string;
  level: "chapter" | "subchapter" | "section" | "item";
  name: string;
  amount?: string;
  children?: HierarchicalItem[];
  [key: string]: any; // campos adicionales según contexto
}

interface HierarchicalNavigatorProps {
  data: HierarchicalItem[];
  mode: "preview" | "edit"; // preview: solo lectura, edit: interactivo
  renderItem?: (item: HierarchicalItem) => ReactNode; // personalizable
  onItemClick?: (item: HierarchicalItem) => void;
  expandedIds?: string[]; // control externo
  onExpandedChange?: (ids: string[]) => void;
}

export function HierarchicalNavigator({
  data,
  mode = "preview",
  renderItem,
  onItemClick,
  expandedIds = [],
  onExpandedChange,
}: HierarchicalNavigatorProps) {
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(
    new Set(expandedIds)
  );

  const expanded = onExpandedChange ? new Set(expandedIds) : localExpanded;

  const handleToggle = (itemId: string, ancestors: string[]) => {
    const newExpanded = new Set(expanded);

    if (expanded.has(itemId)) {
      // Cerrar: remover item y sus descendientes
      removeDescendants(itemId, newExpanded);
    } else {
      // Abrir: cerrar hermanos, mantener ancestros
      closeSiblings(itemId, ancestors, newExpanded);
      newExpanded.add(itemId);
      // Asegurar ancestros abiertos
      ancestors.forEach((id) => newExpanded.add(id));
    }

    if (onExpandedChange) {
      onExpandedChange(Array.from(newExpanded));
    } else {
      setLocalExpanded(newExpanded);
    }
  };

  function closeSiblings(
    itemId: string,
    ancestors: string[],
    expanded: Set<string>
  ) {
    // Cerrar todos los items al mismo nivel
    const parent = ancestors[ancestors.length - 1];
    const siblings = getSiblings(itemId, parent, data);

    siblings.forEach((sibling) => {
      if (sibling.id !== itemId) {
        removeDescendants(sibling.id, expanded);
      }
    });
  }

  function removeDescendants(itemId: string, expanded: Set<string>) {
    expanded.delete(itemId);
    const item = findItem(itemId, data);
    if (item?.children) {
      item.children.forEach((child) => {
        removeDescendants(child.id, expanded);
      });
    }
  }

  function renderTree(
    items: HierarchicalItem[],
    ancestors: string[] = [],
    depth: number = 0
  ) {
    return items.map((item) => {
      const isExpanded = expanded.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const currentAncestors = [...ancestors, item.id];

      return (
        <div key={item.id} className="relative">
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded cursor-pointer",
              "hover:bg-accent transition-colors",
              getLevelStyles(item.level),
              isExpanded && "bg-accent"
            )}
            style={{ paddingLeft: `${depth * 1.5}rem` }}
            onClick={() => {
              handleToggle(item.id, ancestors);
              onItemClick?.(item);
            }}
          >
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
            )}

            {renderItem ? (
              renderItem(item)
            ) : (
              <DefaultItemRender item={item} mode={mode} />
            )}
          </div>

          {hasChildren && isExpanded && (
            <div>{renderTree(item.children!, currentAncestors, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  return <div className="space-y-1">{renderTree(data)}</div>;
}

function DefaultItemRender({
  item,
  mode,
}: {
  item: HierarchicalItem;
  mode: "preview" | "edit";
}) {
  return (
    <div className="flex-1 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{item.id}</span>
        <span className="font-medium">{item.name}</span>
      </div>

      {item.amount && (
        <span className="text-sm text-muted-foreground">{item.amount}</span>
      )}
    </div>
  );
}

function getLevelStyles(level: string) {
  const styles = {
    chapter: "font-bold text-lg",
    subchapter: "font-semibold text-base",
    section: "font-medium text-sm",
    item: "text-sm",
  };
  return styles[level as keyof typeof styles] || "";
}
```

**Uso en Tariff Preview:**

```typescript
// src/components/tariffs/HierarchyPreview.tsx

export function HierarchyPreview({ data }: { data: BudgetItem[] }) {
  return (
    <HierarchicalNavigator
      data={convertToHierarchy(data)}
      mode="preview"
      renderItem={(item) => (
        <div className="flex-1 flex justify-between">
          <span>{item.name}</span>
          {item.level === "item" && (
            <Badge variant="outline">
              {item.pvp} €/{item.unit}
            </Badge>
          )}
        </div>
      )}
    />
  );
}
```

**Uso en Budget Form:**

```typescript
// src/components/budgets/BudgetHierarchyForm.tsx

export function BudgetHierarchyForm({ tariff, onUpdate }: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  return (
    <HierarchicalNavigator
      data={tariff.json_tariff_data}
      mode="edit"
      expandedIds={expandedIds}
      onExpandedChange={setExpandedIds}
      renderItem={(item) => (
        <BudgetItemEditor
          item={item}
          quantity={quantities[item.id] || 0}
          onQuantityChange={(qty) => {
            setQuantities({ ...quantities, [item.id]: qty });
            onUpdate(item.id, qty);
          }}
        />
      )}
    />
  );
}
```

---

## ✅ BLOQUE 7: Editor de Texto Enriquecido - COMPLETADO

### 7.1 Rich Text Editor para Notas

**Prioridad:** MEDIA
**Complejidad:** MEDIA
**Impacto:** UX profesional
**Estado:** ✅ COMPLETADO (2025-01-13)

**Librería recomendada:** Tiptap (ligera, extensible)

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

**Componente:**

```typescript
// src/components/shared/RichTextEditor.tsx

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded">
      <div className="flex gap-1 p-2 border-b bg-muted">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm p-4 min-h-[150px]"
      />
    </div>
  );
}
```

**Uso en formulario tarifa:**

```typescript
// src/components/tariffs/TariffForm.tsx

<FormField label="Texto Resumen" description="Aparecerá en el PDF">
  <RichTextEditor
    value={formData.summary_note}
    onChange={(html) => setFormData({ ...formData, summary_note: html })}
    placeholder="Condiciones de aceptación, formas de pago..."
  />
</FormField>
```

**Implementación Realizada:**

✅ **Componentes creados:**
- `src/components/shared/RichTextEditor.tsx` - Editor Tiptap con toolbar
- `src/components/shared/RichTextEditorDialog.tsx` - Modal para edición cómoda

✅ **Funcionalidades:**
- Editor con formato básico (negrita, cursiva, listas)
- Sistema completo de enlaces:
  - Añadir enlace con botón toolbar
  - Tooltip hover (500ms) con botón "Editar"
  - Botón "Probar enlace" para abrir en nueva pestaña
  - Sistema de edición: borra → edita → restaura si cancela
- Dialog responsive (90% viewport)
- Preview HTML en campos de solo lectura
- Botones "Editar" junto a labels (estilo cyan-600)

✅ **Integración:**
- Reemplazados 3 campos Textarea en `TariffFormFields.tsx`:
  - `summary_note` - Texto resumen PDF
  - `conditions_note` - Condiciones PDF
  - `legal_note` - Notas legales formulario

✅ **HTML Soportado:**
- `<p>` - Párrafos
- `<strong>` - Negrita
- `<em>` - Cursiva
- `<ul>` + `<li>` - Listas con viñetas
- `<ol>` + `<li>` - Listas numeradas
- `<a href="..." target="_blank">` - Enlaces

✅ **Documentación:**
- Creado `docs/CAMBIOS_RAPID_PDF.md` con especificaciones HTML
- Actualizado payload ejemplo con HTML rico

**Cambios para Rapid-PDF:**

- Parsear HTML básico: `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<a>`
- Convertir a formato PDF (negrita, cursiva, listas, enlaces)
- Ver `docs/CAMBIOS_RAPID_PDF.md` para detalles completos

---

## BLOQUE 8: Import/Export y Backups

### 8.1 Exportar Tarifas/Presupuestos

**Prioridad:** MEDIA
**Complejidad:** BAJA-MEDIA

**Formatos soportados:**

- JSON (completo, con metadata)
- CSV (solo items, para Excel)

**Server Actions:**

```typescript
// src/app/actions/export.ts
"use server";

export async function exportTariffs(
  tariffIds: string[],
  format: "json" | "csv"
) {
  const tariffs = await supabase
    .from("tariffs")
    .select("*")
    .in("id", tariffIds);

  if (format === "json") {
    return {
      success: true,
      data: JSON.stringify(tariffs.data, null, 2),
      filename: `tarifas_${new Date().toISOString()}.json`,
    };
  }

  if (format === "csv") {
    // Convertir a CSV
    const csv = convertTariffsToCSV(tariffs.data);
    return {
      success: true,
      data: csv,
      filename: `tarifas_${new Date().toISOString()}.csv`,
    };
  }
}

export async function exportBudgets(
  budgetIds: string[],
  format: "json" | "csv"
) {
  // Similar a exportTariffs
}
```

**UI:**

```typescript
// src/components/tariffs/TariffList.tsx

const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);

async function handleExport(format: "json" | "csv") {
  const result = await exportTariffs(selectedTariffs, format);

  // Descargar archivo
  const blob = new Blob([result.data], {
    type: format === "json" ? "application/json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.click();
}

// En el JSX
<div className="flex gap-2">
  <Checkbox /> {/* selección múltiple */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button disabled={selectedTariffs.length === 0}>
        <Download className="w-4 h-4 mr-2" />
        Exportar ({selectedTariffs.length})
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => handleExport("json")}>
        Exportar JSON
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleExport("csv")}>
        Exportar CSV
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>;
```

---

### 8.2 Importar Tarifas/Presupuestos

**Prioridad:** MEDIA
**Complejidad:** MEDIA

**Server Actions:**

```typescript
// src/app/actions/import.ts
"use server";

export async function importTariffs(fileContent: string, format: "json") {
  try {
    const data = JSON.parse(fileContent);

    // Validar estructura
    if (!Array.isArray(data)) {
      return { success: false, error: "Formato inválido" };
    }

    // Limpiar IDs (generar nuevos)
    const tariffsToImport = data.map((t) => ({
      ...t,
      id: undefined, // generar nuevo UUID
      empresa_id: getCurrentEmpresaId(),
      user_id: auth.uid(),
      created_at: new Date().toISOString(),
    }));

    // Insertar en BD
    const result = await supabase.from("tariffs").insert(tariffsToImport);

    return {
      success: true,
      imported: tariffsToImport.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error al procesar archivo",
    };
  }
}
```

**UI:**

```typescript
// src/app/tariffs/import/page.tsx

export default function ImportTariffsPage() {
  const [file, setFile] = useState<File | null>(null);

  async function handleImport() {
    if (!file) return;

    const content = await file.text();
    const result = await importTariffs(content, "json");

    if (result.success) {
      toast.success(`${result.imported} tarifas importadas`);
      router.push("/tariffs");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div>
      <h1>Importar Tarifas</h1>

      <Input
        type="file"
        accept=".json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <Button onClick={handleImport} disabled={!file}>
        Importar
      </Button>
    </div>
  );
}
```

---

## BLOQUE 9: Responsive y Mobile-First

### 9.1 Diseño Responsive Completo

**Prioridad:** ALTA
**Complejidad:** ALTA
**Impacto:** Usabilidad tablet/móvil

**Estrategia:**

1. Mobile-first (< 640px)
2. Tablet (640px - 1024px)
3. Desktop (> 1024px)

**Cambios en listados:**

```typescript
// src/components/tariffs/TariffList.tsx

export function TariffList({ tariffs }: { tariffs: Tariff[] }) {
  return (
    <>
      {/* Desktop: tabla */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarifa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tariffs.map((t) => (
              <TariffRow key={t.id} tariff={t} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-4">
        {tariffs.map((t) => (
          <TariffCard key={t.id} tariff={t} />
        ))}
      </div>
    </>
  );
}

function TariffCard({ tariff }: { tariff: Tariff }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{tariff.title}</CardTitle>
            <CardDescription>{tariff.description}</CardDescription>
          </div>
          <Badge variant={tariff.status === "Activa" ? "default" : "secondary"}>
            {tariff.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Empresa:</span>
            <span className="font-medium">{tariff.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Creado:</span>
            <span>{formatDate(tariff.created_at)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tariffs/${tariff.id}/edit`}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/budgets/create?tariff_id=${tariff.id}`}>
            <Receipt className="w-4 h-4 mr-2" />
            Presupuesto
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleDelete(tariff.id)}>
              <Trash className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
```

**Similar para presupuestos:**

- Desktop: tabla completa
- Mobile: cards con información resumida

---

### 9.2 Formulario Presupuesto Mobile

**Prioridad:** ALTA
**Complejidad:** ALTA

**Problema:** Acordeones son difíciles en móvil

**Solución:** Navegación por niveles (breadcrumb style)

```typescript
// src/components/budgets/BudgetFormMobile.tsx

export function BudgetFormMobile({ tariff, onUpdate }: Props) {
  const [navigationStack, setNavigationStack] = useState<HierarchicalItem[]>(
    []
  );
  const [currentLevel, setCurrentLevel] = useState<HierarchicalItem[]>(
    tariff.json_tariff_data
  );

  function handleNavigate(item: HierarchicalItem) {
    if (item.children && item.children.length > 0) {
      // Navegar a nivel inferior
      setNavigationStack([...navigationStack, item]);
      setCurrentLevel(item.children);
    } else {
      // Es una partida (item final)
      // Mostrar modal para editar cantidad
    }
  }

  function handleBack() {
    const newStack = [...navigationStack];
    const parent = newStack.pop();
    setNavigationStack(newStack);

    if (newStack.length === 0) {
      setCurrentLevel(tariff.json_tariff_data);
    } else {
      setCurrentLevel(newStack[newStack.length - 1].children!);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted">
        {navigationStack.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </Button>
        )}

        <div className="flex items-center gap-2 text-sm overflow-x-auto">
          <span>Inicio</span>
          {navigationStack.map((item, i) => (
            <React.Fragment key={item.id}>
              <ChevronRight className="w-4 h-4" />
              <span className="whitespace-nowrap">{item.name}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Lista actual */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {currentLevel.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleNavigate(item)}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.description && (
                    <CardDescription className="text-xs">
                      {item.description}
                    </CardDescription>
                  )}
                </div>

                {item.children && item.children.length > 0 ? (
                  <Badge variant="outline">{item.children.length} items</Badge>
                ) : (
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {item.pvp} €/{item.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cantidad: {item.quantity || 0}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Resumen sticky */}
      <div className="border-t p-4 bg-background">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total:</span>
          <span className="text-xl font-bold">
            {formatCurrency(calculateTotal())}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Uso condicional:**

```typescript
// src/components/budgets/BudgetHierarchyForm.tsx

export function BudgetHierarchyForm({ tariff, onUpdate }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return <BudgetFormMobile tariff={tariff} onUpdate={onUpdate} />;
  }

  return <BudgetFormDesktop tariff={tariff} onUpdate={onUpdate} />;
}
```

---

## FASE 3 (Largo Plazo)

### Funcionalidades postponedas:

1. **Sistema de Suscripciones**

   - Planes: Free, Pro, Enterprise
   - Integración Stripe/PayPal
   - Límites por plan (tarifas, presupuestos, usuarios)

2. **Paletas de Colores y Modo Oscuro**

   - 5-6 paletas predefinidas
   - Selector de tema en configuración
   - Dark mode completo

3. **Multi-tenant completo**

   - Registro público sin restricciones
   - Dashboard de administración multi-empresa
   - Facturación por empresa

4. **Análisis y Reportes Avanzados**

   - Gráficas de conversión
   - Análisis por comercial
   - Exportar reportes PDF

5. **Notificaciones**

   - Email automático al cambiar estado
   - Recordatorios caducidad
   - Alertas configurables

6. **Integraciones**
   - CRM (HubSpot, Salesforce)
   - Contabilidad (Holded, A3)
   - Calendar sync

---

## Resumen de Prioridades

### ✅ INMEDIATO (Semanas 1-2): COMPLETADO

1. ✅ Sistema registro y autenticación completo
2. ✅ Campo user_id en tarifas
3. ✅ Detección automática IVAs

### ✅ CORTO PLAZO (Semanas 3-4): COMPLETADO

4. ✅ CRUD usuarios
5. ✅ Tabla config
6. ✅ Tarifa por defecto
7. ✅ Selector plantillas PDF

### ✅ MEDIO PLAZO (Semanas 5-8): COMPLETADO

8. ✅ IRPF completo
9. ✅ Recargo de Equivalencia (con persistencia mejorada)
10. ✅ Sistema versiones
11. ✅ Sistema notas (con correcciones UX críticas)

### ⏳ LARGO PLAZO (Semanas 9-12): PENDIENTE

12. ⏳ Navegación unificada
13. ✅ Rich text editor
14. ✅ Import/Export
15. ⏳ Responsive completo
16. ⏳ Mobile-first
17. ⏳ Sistema de ayuda con tours interactivos

---

## BLOQUE 10: Sistema de Ayuda

**Prioridad:** MEDIA
**Complejidad:** MEDIA
**Impacto:** UX, reducción tickets soporte, onboarding

### Descripción

Sistema de documentación integrado con tours interactivos que permite a los usuarios:
- Leer artículos de ayuda en Markdown sin rebuild de la aplicación
- Seguir tours guiados con Driver.js para aprender funcionalidades
- Buscar y navegar por categorías de ayuda
- Actualizar contenido fácilmente (usuarios no técnicos)

### Funcionalidades

#### 10.1 Lector de Markdown Dinámico
- Lectura de archivos .md desde `/public/help/`
- Parsing de frontmatter (metadata del artículo)
- Conversión Markdown → HTML con marked
- Renderizado con estilos Tailwind Typography (prose)
- Manejo de errores (archivo no encontrado)

#### 10.2 Tours Interactivos con Driver.js
- Configuración en `/public/help/tours.json`
- Botón "Iniciar Tour" en artículos de ayuda
- SessionStorage para persistir tour pendiente
- Redirección automática a página correspondiente
- Auto-inicio del tour al llegar a destino
- Indicadores visuales de progreso
- Tours paso a paso con highlights de elementos

#### 10.3 Índice Categorizado
- Listado de artículos agrupados por categoría
- Cards clicables con preview
- Badge indicando si tour disponible
- Búsqueda simple por título (opcional)
- Responsive (grid adaptativo)

#### 10.4 Mantenimiento Sin Rebuild
- Archivos .md editables directamente en `/public/help/`
- Cambios visibles inmediatamente (sin deploy)
- Formato Markdown estándar
- Frontmatter simple (YAML)

### Estructura de Archivos

```
/public/help/
├── tours.json              # Configuración Driver.js
├── README.md               # Instrucciones para autores
├── crear-tarifa.md         # Ejemplo: Crear tarifa
├── editar-usuario.md       # Ejemplo: Editar usuario
└── generar-presupuesto.md  # Ejemplo: Generar presupuesto
```

**Frontmatter ejemplo:**
```markdown
---
id: crear-tarifa
title: Cómo crear una tarifa
category: Primeros pasos
tourId: crear-tarifa
---

# Cómo crear una tarifa

Descripción del flujo...
```

**tours.json ejemplo:**
```json
{
  "crear-tarifa": {
    "steps": [
      {
        "element": "#btn-nueva-tarifa",
        "popover": {
          "title": "Paso 1: Nueva tarifa",
          "description": "Haz clic en el botón 'Nueva Tarifa'"
        }
      },
      {
        "element": "#campo-nombre",
        "popover": {
          "title": "Paso 2: Nombre",
          "description": "Introduce el nombre de la tarifa"
        }
      }
    ]
  }
}
```

### Flujo de Usuario

1. Usuario accede a `/help`
2. Ve índice categorizado de artículos
3. Hace clic en artículo que le interesa
4. Lee contenido Markdown renderizado
5. (Opcional) Hace clic en "Iniciar Tour Interactivo"
6. Sistema guarda tourId en sessionStorage
7. Redirige a página correspondiente (ej: `/tariffs/create`)
8. Al llegar, hook detecta tour pendiente
9. Driver.js se lanza automáticamente
10. Usuario sigue pasos del tour

### Flujo de Mantenimiento

1. Usuario no técnico crea/edita archivo .md en `/public/help/`
2. Guarda cambios (commit + push si en Git)
3. Cambios visibles inmediatamente en `/help/[slug]`
4. Si crea nuevo tour: actualiza `tours.json`
5. Documenta mapeo de rutas en README.md

### Dependencias Técnicas

**NPM Packages:**
- `driverjs` - Tours interactivos (open source, ligero)
- `gray-matter` - Parsing frontmatter Markdown
- `marked` - Conversión Markdown → HTML

**Archivos Nuevos:**
- `src/components/help/MarkdownReader.tsx`
- `src/components/help/TourButton.tsx`
- `src/components/help/HelpIndex.tsx`
- `src/components/help/HelpCard.tsx`
- `src/lib/helpers/markdown-helpers.ts`
- `src/lib/helpers/tour-helpers.ts`
- `src/app/help/page.tsx`
- `src/app/help/[slug]/page.tsx`

**Archivos Modificados:**
- `src/components/layout/Header.tsx` (enlace "Ayuda")
- `src/app/(dashboard)/layout.tsx` (hook detectar tour)

### Criterios de Aceptación

#### Funcionales:
- ✅ Markdown se parsea correctamente desde `/public/help/`
- ✅ HTML renderizado con estilos coherentes
- ✅ Frontmatter extraído y utilizado
- ✅ Tours Driver.js funcionan sin errores
- ✅ SessionStorage persiste tour entre páginas
- ✅ Redirección y auto-inicio funcionan
- ✅ Índice muestra artículos agrupados por categoría
- ✅ Badge "Tour disponible" visible cuando aplica
- ✅ Actualizaciones de .md visibles sin rebuild

#### No Funcionales:
- ✅ Tiempo de carga < 1s por artículo
- ✅ Responsive en móvil/tablet
- ✅ Accesibilidad básica (ARIA labels)
- ✅ Manejo de errores (archivo no encontrado)
- ✅ UX intuitiva para usuarios no técnicos

#### Testing:
- ✅ Unit tests: parsing Markdown
- ✅ Integration tests: tours Driver.js
- ✅ E2E tests: flujo completo ayuda → tour → completar tarea

### Limitaciones Conocidas

- **Solo HTML básico:** Markdown renderiza HTML estándar (no componentes React)
- **Sin búsqueda avanzada:** Búsqueda simple por título (no full-text)
- **Sin versionado:** Cambios en .md no tienen historial (usar Git)
- **Tours manuales:** Configuración tours.json requiere conocer selectores CSS
- **Sin analytics:** No trackea qué artículos/tours se usan más

### Beneficios

- **Reducción tickets soporte:** Usuarios auto-resuelven dudas
- **Onboarding mejorado:** Tours guiados para nuevos usuarios
- **Mantenimiento simple:** Usuarios no técnicos actualizan contenido
- **Sin rebuild:** Cambios visibles inmediatamente
- **Open source:** Driver.js sin coste de licencia
- **Ligero:** < 100KB JavaScript adicional

---

## BLOQUE 11: Suscripciones con Stripe (Post Fase 2 - Opcional)

**Prioridad:** MEDIA-BAJA (Post Fase 2)
**Complejidad:** ALTA
**Impacto:** Monetización, preparación SaaS
**Estado:** ⏳ Pendiente
**Duración estimada:** 6 días

### Descripción

Sistema modular de suscripciones con Stripe que permite monetizar la aplicación de forma gradual. Se implementa con feature flag para activar/desactivar el módulo sin romper funcionalidad existente. Incluye planes Free, Pro y Enterprise con límites automáticos de recursos.

**Características principales:**
- Checkout Stripe para suscripciones mensuales/anuales
- Webhooks para sincronizar estado BD ↔ Stripe
- Límites automáticos por plan (tarifas, presupuestos, usuarios)
- Feature flag `subscriptions_enabled` (default: false)
- Portal del cliente (opcional) para gestionar suscripción
- Cero dependencias externas (implementación custom sin SaaS helpers)

### Funcionalidades

#### 11.1 Setup Stripe + Feature Flag

**Prioridad:** ALTA
**Estimación:** 0.5 días

**Instalación SDK:**
```bash
npm install stripe
```

**Variables de entorno (.env.local):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Crear cuenta Stripe:**
1. Registrarse en https://stripe.com
2. Activar modo test
3. Crear productos (Free, Pro, Enterprise)
4. Obtener API keys
5. Configurar webhook endpoint

**Config en BD:**
```sql
-- Insertar configuración inicial
INSERT INTO public.config (config_key, config_value, description) VALUES
('subscriptions_enabled', 'false', 'Feature flag para activar/desactivar módulo de suscripciones'),
('stripe_plans', '{
  "free": {
    "name": "Free",
    "price": 0,
    "interval": "month",
    "limits": {
      "tariffs": 5,
      "budgets": 20,
      "users": 1
    }
  },
  "pro": {
    "name": "Pro",
    "price": 2900,
    "interval": "month",
    "stripe_price_id": "price_...",
    "limits": {
      "tariffs": 50,
      "budgets": 500,
      "users": 5
    }
  },
  "enterprise": {
    "name": "Enterprise",
    "price": 9900,
    "interval": "month",
    "stripe_price_id": "price_...",
    "limits": {
      "tariffs": 999999,
      "budgets": 999999,
      "users": 999999
    }
  }
}', 'Configuración de planes de suscripción');
```

**Archivo helpers:**
```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function getStripePlans() {
  const config = await getConfigValue('stripe_plans');
  return config || {};
}

export async function isSubscriptionsEnabled(): Promise<boolean> {
  const enabled = await getConfigValue('subscriptions_enabled');
  return enabled === 'true';
}
```

**Archivos modificados:**
- `.env.local` (añadir vars)
- Tabla `config` (SQL insert)

**Archivos nuevos:**
- `src/lib/stripe.ts`

---

#### 11.2 Migración BD: Tabla Suscripciones

**Prioridad:** ALTA
**Estimación:** 0.5 días

**Schema SQL:**
```sql
-- migrations/025_subscriptions.sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_subscriptions_empresa ON subscriptions(empresa_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own_empresa"
ON subscriptions FOR SELECT
USING (empresa_id = get_user_empresa_id());

CREATE POLICY "subscriptions_insert_own_empresa"
ON subscriptions FOR INSERT
WITH CHECK (empresa_id = get_user_empresa_id());

CREATE POLICY "subscriptions_update_own_empresa"
ON subscriptions FOR UPDATE
USING (empresa_id = get_user_empresa_id());

-- Datos iniciales: todas las empresas empiezan en plan Free
INSERT INTO subscriptions (empresa_id, plan, status)
SELECT id, 'free', 'active'
FROM empresas
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.empresa_id = empresas.id
);
```

**Función helper para verificar límites:**
```sql
-- Función para verificar si empresa puede crear recurso
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_empresa_id INTEGER,
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_limits JSONB;
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  -- Obtener plan actual
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE empresa_id = p_empresa_id AND status = 'active';

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Obtener límites del plan
  SELECT config_value->v_plan->'limits' INTO v_limits
  FROM config
  WHERE config_key = 'stripe_plans';

  -- Obtener límite del recurso
  v_max_limit := (v_limits->>p_resource_type)::INTEGER;

  -- Contar recursos actuales
  IF p_resource_type = 'tariffs' THEN
    SELECT COUNT(*) INTO v_current_count FROM tariffs WHERE empresa_id = p_empresa_id;
  ELSIF p_resource_type = 'budgets' THEN
    SELECT COUNT(*) INTO v_current_count FROM budgets WHERE empresa_id = p_empresa_id;
  ELSIF p_resource_type = 'users' THEN
    SELECT COUNT(*) INTO v_current_count FROM users WHERE empresa_id = p_empresa_id;
  ELSE
    RETURN true; -- recurso no limitado
  END IF;

  -- Verificar si puede crear más
  RETURN v_current_count < v_max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Archivos nuevos:**
- `migrations/025_subscriptions.sql`

---

#### 11.3 Server Actions: Checkout y Gestión

**Prioridad:** ALTA
**Estimación:** 1.5 días

**Crear sesión de Checkout:**
```typescript
// src/app/actions/subscriptions.ts
"use server";

import { stripe } from '@/lib/stripe';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';

export async function createCheckoutSession(plan: 'pro' | 'enterprise') {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener configuración de planes
    const plans = await getStripePlans();
    const selectedPlan = plans[plan];

    if (!selectedPlan || !selectedPlan.stripe_price_id) {
      return { success: false, error: 'Plan no válido' };
    }

    // Obtener o crear customer en Stripe
    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('empresa_id', user.empresa_id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Crear nuevo customer en Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          empresa_id: user.empresa_id.toString(),
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Guardar customer_id en BD
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('empresa_id', user.empresa_id);
    }

    // Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscriptions?checkout=canceled`,
      metadata: {
        empresa_id: user.empresa_id.toString(),
        plan,
      },
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error('[createCheckoutSession] Error:', error);
    return { success: false, error: 'Error al crear sesión de pago' };
  }
}
```

**Cancelar suscripción:**
```typescript
export async function cancelSubscription() {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('empresa_id', user.empresa_id)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return { success: false, error: 'Sin suscripción activa' };
    }

    // Cancelar al final del período
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Actualizar BD
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('empresa_id', user.empresa_id);

    return { success: true };
  } catch (error) {
    console.error('[cancelSubscription] Error:', error);
    return { success: false, error: 'Error al cancelar suscripción' };
  }
}
```

**Obtener estado suscripción:**
```typescript
export async function getSubscriptionStatus() {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .single();

    const plans = await getStripePlans();
    const currentPlan = plans[subscription?.plan || 'free'];

    return {
      success: true,
      data: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        limits: currentPlan?.limits || plans.free.limits,
        current_period_end: subscription?.current_period_end,
        cancel_at_period_end: subscription?.cancel_at_period_end || false,
      },
    };
  } catch (error) {
    console.error('[getSubscriptionStatus] Error:', error);
    return { success: false, error: 'Error al obtener estado' };
  }
}
```

**Verificar límites antes de crear:**
```typescript
export async function canCreateResource(resourceType: 'tariffs' | 'budgets' | 'users'): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;

    const cookieStore = await cookies();
    const supabase = createServerActionClient({ cookies: () => cookieStore });

    const { data, error } = await supabase
      .rpc('check_plan_limit', {
        p_empresa_id: user.empresa_id,
        p_resource_type: resourceType,
      });

    return data === true;
  } catch (error) {
    console.error('[canCreateResource] Error:', error);
    return false;
  }
}
```

**Archivos nuevos:**
- `src/app/actions/subscriptions.ts`

**Archivos modificados:**
- `src/app/actions/tariffs.ts` (añadir verificación límites)
- `src/app/actions/budgets.ts` (añadir verificación límites)
- `src/app/actions/users.ts` (añadir verificación límites)

---

#### 11.4 Webhook Handler: Sincronizar Stripe → BD

**Prioridad:** CRÍTICA
**Estimación:** 1.5 días

**Endpoint API:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Usar service_role para bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('[Webhook] Error verificando firma:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[Webhook] Evento recibido:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log('[Webhook] Evento no manejado:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error procesando evento:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const empresaId = parseInt(session.metadata?.empresa_id || '0');
  const plan = session.metadata?.plan || 'free';

  if (!empresaId || !plan) {
    console.error('[Webhook] Metadata faltante en checkout.session');
    return;
  }

  // Obtener suscripción de Stripe
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Actualizar BD
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId);

  if (error) {
    console.error('[Webhook] Error actualizando BD:', error);
  } else {
    console.log(`[Webhook] Suscripción actualizada: empresa ${empresaId} → plan ${plan}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const empresaId = parseInt(subscription.metadata?.empresa_id || '0');

  if (!empresaId) {
    console.error('[Webhook] empresa_id no encontrado en metadata');
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Webhook] Error actualizando suscripción:', error);
  } else {
    console.log(`[Webhook] Suscripción actualizada: ${subscription.id} → ${subscription.status}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Revertir a plan Free
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('[Webhook] Error cancelando suscripción:', error);
  } else {
    console.log(`[Webhook] Suscripción cancelada: ${subscription.id} → plan free`);
  }
}
```

**Configuración webhook en Stripe Dashboard:**
1. Ir a Developers > Webhooks
2. Añadir endpoint: `https://tu-dominio.com/api/webhooks/stripe`
3. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiar `Signing secret` → `.env.local` (STRIPE_WEBHOOK_SECRET)

**Testing local webhooks:**
```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Reenviar eventos a localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Archivos nuevos:**
- `src/app/api/webhooks/stripe/route.ts`

---

#### 11.5 UI: Página Suscripciones

**Prioridad:** ALTA
**Estimación:** 1.5 días

**Página principal:**
```typescript
// src/app/subscriptions/page.tsx
import { getServerUser } from '@/lib/auth/server';
import { getSubscriptionStatus } from '@/app/actions/subscriptions';
import { SubscriptionPlans } from '@/components/subscriptions/SubscriptionPlans';
import { CurrentPlan } from '@/components/subscriptions/CurrentPlan';
import { redirect } from 'next/navigation';

export default async function SubscriptionsPage() {
  const user = await getServerUser();
  if (!user) redirect('/login');

  // Verificar si módulo está habilitado
  const enabled = await isSubscriptionsEnabled();
  if (!enabled) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <p className="text-muted-foreground mt-2">
          Módulo de suscripciones no disponible actualmente.
        </p>
      </div>
    );
  }

  const { data: status } = await getSubscriptionStatus();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Gestión de Suscripción</h1>
      <p className="text-muted-foreground mb-8">
        Administra tu plan y límites de uso
      </p>

      <CurrentPlan status={status} />

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Planes Disponibles</h2>
        <SubscriptionPlans currentPlan={status?.plan || 'free'} />
      </div>
    </div>
  );
}
```

**Componente CurrentPlan:**
```typescript
// src/components/subscriptions/CurrentPlan.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/helpers/format';
import { cancelSubscription } from '@/app/actions/subscriptions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CurrentPlanProps {
  status: {
    plan: string;
    status: string;
    limits: {
      tariffs: number;
      budgets: number;
      users: number;
    };
    current_period_end?: string;
    cancel_at_period_end: boolean;
  };
}

export function CurrentPlan({ status }: CurrentPlanProps) {
  const router = useRouter();

  async function handleCancel() {
    const confirmed = confirm('¿Estás seguro de cancelar tu suscripción? Continuarás teniendo acceso hasta el final del período actual.');
    if (!confirmed) return;

    const result = await cancelSubscription();
    if (result.success) {
      toast.success('Suscripción cancelada. Tendrás acceso hasta el final del período.');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Plan Actual</CardTitle>
            <CardDescription>
              {status.cancel_at_period_end
                ? 'Cancelado (acceso hasta ' + formatDate(status.current_period_end!) + ')'
                : 'Activo'}
            </CardDescription>
          </div>
          <Badge variant={status.plan === 'free' ? 'secondary' : 'default'} className="text-lg">
            {status.plan.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tarifas</p>
              <p className="text-2xl font-bold">{status.limits.tariffs}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Presupuestos</p>
              <p className="text-2xl font-bold">{status.limits.budgets}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuarios</p>
              <p className="text-2xl font-bold">{status.limits.users}</p>
            </div>
          </div>

          {status.plan !== 'free' && status.current_period_end && !status.cancel_at_period_end && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Próxima renovación: {formatDate(status.current_period_end)}
              </p>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar Suscripción
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Componente SubscriptionPlans:**
```typescript
// src/components/subscriptions/SubscriptionPlans.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { createCheckoutSession } from '@/app/actions/subscriptions';
import { toast } from 'sonner';
import { useState } from 'react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0€',
    interval: '/mes',
    features: [
      '5 tarifas',
      '20 presupuestos',
      '1 usuario',
      'Soporte comunidad',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '29€',
    interval: '/mes',
    features: [
      '50 tarifas',
      '500 presupuestos',
      '5 usuarios',
      'Soporte email 24h',
      'Exportación avanzada',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '99€',
    interval: '/mes',
    features: [
      'Tarifas ilimitadas',
      'Presupuestos ilimitados',
      'Usuarios ilimitados',
      'Soporte prioritario',
      'Integraciones API',
      'Manager dedicado',
    ],
  },
];

interface SubscriptionPlansProps {
  currentPlan: string;
}

export function SubscriptionPlans({ currentPlan }: SubscriptionPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planId: 'pro' | 'enterprise') {
    setLoading(planId);

    const result = await createCheckoutSession(planId);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast.error(result.error);
      setLoading(null);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlan;
        const isDowngrade = (currentPlan === 'enterprise' && plan.id !== 'enterprise') ||
                           (currentPlan === 'pro' && plan.id === 'free');

        return (
          <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.interval}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Plan Actual
                </Button>
              ) : isDowngrade ? (
                <Button variant="ghost" disabled className="w-full">
                  Contactar soporte para downgrade
                </Button>
              ) : plan.id === 'free' ? (
                <Button variant="outline" disabled className="w-full">
                  Plan Gratuito
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.id as 'pro' | 'enterprise')}
                  disabled={loading === plan.id}
                  className="w-full"
                >
                  {loading === plan.id ? 'Procesando...' : 'Actualizar Plan'}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
```

**Archivos nuevos:**
- `src/app/subscriptions/page.tsx`
- `src/components/subscriptions/CurrentPlan.tsx`
- `src/components/subscriptions/SubscriptionPlans.tsx`

---

#### 11.6 Integración: Verificar Límites en Server Actions

**Prioridad:** ALTA
**Estimación:** 0.5 días

**Modificar createTariff:**
```typescript
// src/app/actions/tariffs.ts

export async function createTariff(formData: TariffFormData) {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // NUEVO: Verificar límites antes de crear
    const canCreate = await canCreateResource('tariffs');
    if (!canCreate) {
      return {
        success: false,
        error: 'Has alcanzado el límite de tarifas de tu plan. Actualiza tu suscripción para continuar.',
      };
    }

    // ... resto del código existente
  } catch (error) {
    // ...
  }
}
```

**Modificar saveBudget:**
```typescript
// src/app/actions/budgets.ts

export async function saveBudget(budgetData: BudgetData) {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // NUEVO: Verificar límites antes de crear
    const canCreate = await canCreateResource('budgets');
    if (!canCreate) {
      return {
        success: false,
        error: 'Has alcanzado el límite de presupuestos de tu plan. Actualiza tu suscripción para continuar.',
      };
    }

    // ... resto del código existente
  } catch (error) {
    // ...
  }
}
```

**Modificar createUser:**
```typescript
// src/app/actions/users.ts

export async function createUser(userData: UserFormData) {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar permisos
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return { success: false, error: 'Sin permisos' };
    }

    // NUEVO: Verificar límites antes de crear
    const canCreate = await canCreateResource('users');
    if (!canCreate) {
      return {
        success: false,
        error: 'Has alcanzado el límite de usuarios de tu plan. Actualiza tu suscripción para continuar.',
      };
    }

    // ... resto del código existente
  } catch (error) {
    // ...
  }
}
```

**Archivos modificados:**
- `src/app/actions/tariffs.ts`
- `src/app/actions/budgets.ts`
- `src/app/actions/users.ts`

---

### Criterios de Aceptación

#### Funcionales:
- ✅ Checkout Stripe redirige correctamente
- ✅ Webhooks sincronizan BD automáticamente
- ✅ Límites de plan se verifican antes de crear recursos
- ✅ Mensajes de error claros cuando se alcanza límite
- ✅ Cancelación funciona (mantiene acceso hasta fin de período)
- ✅ Plan Free se activa automáticamente al cancelar
- ✅ Feature flag activa/desactiva módulo sin errores

#### No Funcionales:
- ✅ Webhooks procesan eventos < 5s
- ✅ Idempotencia de webhooks (eventos duplicados manejados)
- ✅ UI responsive en móvil/tablet
- ✅ Mensajes de error user-friendly
- ✅ Logs detallados para debugging

#### Testing:
- ✅ Test mode Stripe funciona correctamente
- ✅ Webhooks locales con Stripe CLI
- ✅ Casos edge: cancelar y reactivar, downgrade, upgrade
- ✅ Verificar RLS policies no permiten bypass de límites

### Dependencias Técnicas

**NPM Packages:**
- `stripe` (SDK oficial)

**Variables de entorno:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (para webhooks)

**Migraciones SQL:**
- `migrations/025_subscriptions.sql`

**Configuración externa:**
- Cuenta Stripe (modo test)
- Productos y precios creados en Stripe Dashboard
- Webhook endpoint configurado

### Limitaciones Conocidas

- **Solo tarjeta de crédito:** No soporta otros métodos de pago (transferencia, PayPal, etc.)
- **Sin proration:** Cambios de plan no calculan prorrateo automático
- **Sin trials:** No hay período de prueba gratuito (implementar en Fase 3)
- **Downgrade manual:** Requiere contactar soporte (evitar abuso)
- **Sin analytics suscripciones:** No trackea churn, MRR, LTV (Fase 3)
- **Webhooks críticos:** App depende de webhooks Stripe (si caen, desincronización)

### Beneficios

- **Monetización inmediata:** Comienza a generar ingresos sin cambios arquitectónicos masivos
- **Feature flag seguro:** Desactivar módulo sin afectar funcionalidad core
- **Escalabilidad:** Preparado para multi-tenant completo en Fase 3
- **UX transparente:** Usuarios ven límites claramente antes de alcanzarlos
- **Seguridad:** RLS + verificación servidor previene bypass de límites
- **Mantenimiento bajo:** Stripe maneja compliance, PCI, facturación

### Testing Guidelines

**Unit tests:**
```typescript
// src/app/actions/__tests__/subscriptions.test.ts
describe('canCreateResource', () => {
  it('should return false when limit reached', async () => {
    // Mock: empresa en plan Free con 5 tarifas
    const result = await canCreateResource('tariffs');
    expect(result).toBe(false);
  });

  it('should return true when limit not reached', async () => {
    // Mock: empresa en plan Pro con 10 tarifas
    const result = await canCreateResource('tariffs');
    expect(result).toBe(true);
  });
});
```

**Integration tests:**
```typescript
// Testar webhook handler con eventos mock
describe('POST /api/webhooks/stripe', () => {
  it('should update subscription on checkout.session.completed', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: { object: mockSession },
    };

    const response = await POST(mockRequest);
    expect(response.status).toBe(200);

    // Verificar BD actualizada
    const subscription = await getSubscription(empresaId);
    expect(subscription.plan).toBe('pro');
  });
});
```

**E2E tests (Playwright):**
```typescript
test('upgrade plan flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await login(page, testUser);

  // 2. Ir a suscripciones
  await page.goto('/subscriptions');

  // 3. Seleccionar plan Pro
  await page.click('text=Actualizar Plan >> nth=1');

  // 4. Completar checkout Stripe (test mode)
  // ...

  // 5. Verificar redirección success
  await expect(page).toHaveURL('/dashboard?checkout=success');

  // 6. Verificar plan actualizado
  await page.goto('/subscriptions');
  await expect(page.locator('text=PRO')).toBeVisible();
});
```

### Troubleshooting

**Problema: Webhook no recibe eventos**
```bash
# Verificar endpoint configurado en Stripe Dashboard
# Verificar STRIPE_WEBHOOK_SECRET correcto
# Testear localmente con Stripe CLI:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Problema: Límites no se verifican**
```sql
-- Verificar función SQL
SELECT check_plan_limit(1, 'tariffs');

-- Verificar plan actual
SELECT * FROM subscriptions WHERE empresa_id = 1;

-- Verificar config planes
SELECT config_value FROM config WHERE config_key = 'stripe_plans';
```

**Problema: Checkout falla**
```typescript
// Verificar logs detallados
console.log('[createCheckoutSession] Customer ID:', customerId);
console.log('[createCheckoutSession] Price ID:', selectedPlan.stripe_price_id);

// Verificar precio existe en Stripe Dashboard
// Verificar URL success/cancel correctas
```

---

## MEJORAS ADICIONALES IMPLEMENTADAS (2025-01-10)

### Correcciones Críticas UX

#### 1. Fix: Botón Notas - Radix UI Triggers
**Problema:** Popover no abría por conflicto Tooltip + Popover
**Solución:** Reestructurada jerarquía de triggers en BudgetNotesIcon.tsx
**Impacto:** Funcionalidad notas ahora completamente operativa

#### 2. Persistencia Recargo de Equivalencia
**Problema:** Datos RE no se guardaban, se perdían al editar
**Solución:** Estrategia dual storage (columnas + JSON)
- Migration 024: campos `re_aplica` y `re_total`
- Restauración automática desde `json_budget_data.recargo`
**Impacto:** RE completamente persistente y editable

#### 3. Visualización Campo 'nombre' Usuarios
**Problema:** Nombre de usuario incorrecto (mostraba metadata auth)
**Solución:** Corregido `getServerUser()` + todos los layouts
- 6 layouts actualizados
- BudgetsTable corregido
- budget-notes.ts: todas las queries usan 'nombre'
**Impacto:** Nombre correcto visible en toda la app

#### 4. Pre-carga Datos Issuer en Nueva Tarifa
**Problema:** Al crear tarifa sin plantilla, campos vacíos
**Solución:** Función `getUserIssuerData()` pre-llena datos emisor
- Nombre, NIF, dirección completa, contacto
- Fusión con valores config (colores, plantilla)
**Impacto:** UX mejorada, menos trabajo manual

**Migraciones:** 024 (budgets_re_fields)
**Archivos críticos modificados:** 15+
**Funcionalidades corregidas:** 4

---

**Documento:** Fase 2 - Requisitos y Funcionalidades
**Versión:** 1.3
**Fecha:** 2025-01-18
**Estado:** Aprobado
**Última actualización:** Bloque 11 Suscripciones Stripe añadido (Post Fase 2 - Opcional)
