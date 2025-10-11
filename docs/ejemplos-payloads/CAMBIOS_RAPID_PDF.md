# Cambios en Rapid-PDF para IRPF y Recargo de Equivalencia

## Resumen

Este documento detalla los cambios necesarios en el componente `ContentTotals` de Rapid-PDF para soportar los nuevos campos fiscales: **IRPF** y **Recargo de Equivalencia (RE)**.

## Archivos Modificados

### 1. `contentTotals.js` (JavaScript)
**Ubicación:** `template/41200-00001/js/component/contentTotals.js`

#### Cambios Principales:

1. **Nuevas propiedades opcionales:**
   - `subtotal` - Aparece cuando hay IRPF o RE
   - `irpf` - Retención IRPF (cantidad negativa)
   - `re` - Array de recargos de equivalencia

2. **Lógica de renderizado adaptativa:**
   ```javascript
   const hasSubtotal = !!this.element.subtotal;
   const hasIRPF = !!this.element.irpf;
   const hasRE = re.length > 0;
   ```

3. **Orden de renderizado:**
   ```
   Subtotal (opcional)
   ↓
   Base Imponible
   ↓
   IVAs (array)
   ↓
   IRPF (opcional)
   ↓
   Recargos RE (opcional array)
   ↓
   Total a Pagar
   ```

#### Método `create()` actualizado:

```javascript
static async create(budgetData, structureData, section = null) {
  const totalsData = budgetData[section].totals;

  const elementData = {
    base: totalsData.base,
    ivas: totalsData.ivas,
    total: totalsData.total,
    base_name: totalsData.base.name,
    base_amount: totalsData.base.amount,
    total_name: totalsData.total.name,
    total_amount: totalsData.total.amount
  };

  // Subtotal (casos con IRPF o RE)
  if (totalsData.subtotal) {
    elementData.subtotal = totalsData.subtotal;
    elementData.subtotal_name = totalsData.subtotal.name;
    elementData.subtotal_amount = totalsData.subtotal.amount;
  }

  // IRPF (autónomo → empresa/autónomo)
  if (totalsData.irpf) {
    elementData.irpf = totalsData.irpf;
    elementData.irpf_name = totalsData.irpf.name;
    elementData.irpf_amount = totalsData.irpf.amount;
  }

  // RE (cliente autónomo con RE)
  if (totalsData.re && Array.isArray(totalsData.re)) {
    elementData.re = totalsData.re;
  }

  return new ContentTotals(elementData);
}
```

---

### 2. `contentTotals.css` (Estilos)
**Ubicación:** `template/41200-00001/css/contentTotals.css`

#### Nuevos Estilos:

1. **`.subtotal`** - Fondo gris claro (#f8f9fa)
2. **`.irpf`** - Fondo amarillo claro (#fff3cd), borde amarillo (#ffc107)
3. **`.irpf-negative`** - Color rosa (#d63384) para la cantidad negativa
4. **`.recargos`** - Fondo azul claro (#d1ecf1), borde azul

#### Diseño Visual:

```
┌────────────────────────────────┐
│ Subtotal (IVA incl)  5.193,00 €│  ← Gris claro (opcional)
├────────────────────────────────┤
│ Base Imponible       4.922,50 €│
├────────────────────────────────┤
│ │ 5,00% IVA            237,50 €│  ← Borde izquierdo gris
│ │ 21,00% IVA            33,00 €│
├────────────────────────────────┤
│ ║ 15,00% IRPF         -738,38 €│  ← Fondo amarillo (opcional)
├────────────────────────────────┤
│ ┊ 0,50% RE (IVA 5%)    23,79 €│  ← Fondo azul (opcional)
│ ┊ 5,20% RE (IVA 21%)    8,51 €│
├────────────────────────────────┤
│ Total a Pagar        4.454,62 €│  ← Verde (#109c61)
└────────────────────────────────┘
```

---

## Estructura de Datos del Payload

### Caso 1: Sin IRPF, Sin RE (base)
```json
"totals": {
  "base": {"name": "Base Imponible", "amount": "4.922,50 €"},
  "ivas": [
    {"name": "5,00% IVA", "amount": "237,50 €"},
    {"name": "21,00% IVA", "amount": "33,00 €"}
  ],
  "total": {"name": "Total a Pagar", "amount": "5.193,00 €"}
}
```

### Caso 2: Con IRPF, Sin RE
```json
"totals": {
  "subtotal": {"name": "Total (IVA incluido)", "amount": "5.193,00 €"},
  "base": {"name": "Base Imponible", "amount": "4.922,50 €"},
  "ivas": [
    {"name": "5,00% IVA", "amount": "237,50 €"},
    {"name": "21,00% IVA", "amount": "33,00 €"}
  ],
  "irpf": {"name": "15,00% IRPF", "amount": "-738,38 €"},
  "total": {"name": "Total a Pagar", "amount": "4.454,62 €"}
}
```

### Caso 3: Sin IRPF, Con RE
```json
"totals": {
  "subtotal": {"name": "Total (IVA incluido)", "amount": "5.193,00 €"},
  "base": {"name": "Base Imponible", "amount": "4.922,50 €"},
  "ivas": [
    {"name": "5,00% IVA", "amount": "237,50 €"},
    {"name": "21,00% IVA", "amount": "33,00 €"}
  ],
  "re": [
    {"name": "0,50% RE (IVA 5%)", "amount": "23,79 €"},
    {"name": "5,20% RE (IVA 21%)", "amount": "8,51 €"}
  ],
  "total": {"name": "Total a Pagar", "amount": "5.225,30 €"}
}
```

### Caso 4: Con IRPF y Con RE
```json
"totals": {
  "subtotal": {"name": "Total (IVA incluido)", "amount": "5.193,00 €"},
  "base": {"name": "Base Imponible", "amount": "4.922,50 €"},
  "ivas": [
    {"name": "5,00% IVA", "amount": "237,50 €"},
    {"name": "21,00% IVA", "amount": "33,00 €"}
  ],
  "irpf": {"name": "15,00% IRPF", "amount": "-738,38 €"},
  "re": [
    {"name": "0,50% RE (IVA 5%)", "amount": "23,79 €"},
    {"name": "5,20% RE (IVA 21%)", "amount": "8,51 €"}
  ],
  "total": {"name": "Total a Pagar", "amount": "4.486,92 €"}
}
```

---

## Validación y Testing

### Test Case 1: Sin IRPF, Sin RE
- ✅ Renderiza: base, ivas[], total
- ✅ NO renderiza: subtotal, irpf, re[]

### Test Case 2: Con IRPF, Sin RE
- ✅ Renderiza: subtotal, base, ivas[], irpf, total
- ✅ IRPF con clase `.irpf-negative`
- ✅ NO renderiza: re[]

### Test Case 3: Sin IRPF, Con RE
- ✅ Renderiza: subtotal, base, ivas[], re[], total
- ✅ Array RE con múltiples recargos
- ✅ NO renderiza: irpf

### Test Case 4: Con IRPF y Con RE
- ✅ Renderiza: subtotal, base, ivas[], irpf, re[], total
- ✅ Orden correcto de elementos
- ✅ Estilos diferenciados para IRPF y RE

---

## Compatibilidad Hacia Atrás

El código es **100% compatible** con payloads antiguos:
- Si no existe `subtotal`, no se renderiza
- Si no existe `irpf`, no se renderiza
- Si no existe `re` o está vacío, no se renderiza
- Los campos obligatorios (`base`, `ivas`, `total`) siguen funcionando igual

---

## Notas Importantes

1. **IRPF siempre es negativo** en el campo `amount` (ej: "-738,38 €")
2. **RE siempre es positivo** en el campo `amount` (ej: "23,79 €")
3. **Subtotal solo aparece** cuando hay IRPF o RE
4. **Array RE puede estar vacío** si el cliente no tiene recargo de equivalencia
5. **Formato español** para cantidades: "1.234,56 €"

---

## Deploy en Rapid-PDF

### Pasos:

1. Backup de archivos actuales:
   ```bash
   cp contentTotals.js contentTotals.js.backup
   cp contentTotals.css contentTotals.css.backup
   ```

2. Reemplazar archivos:
   ```bash
   # Copiar nuevos archivos a template/41200-00001/
   cp contentTotals.js template/41200-00001/js/component/
   cp contentTotals.css template/41200-00001/css/
   ```

3. Testing con payloads de ejemplo:
   ```bash
   # Probar los 4 casos
   node generatePDF.js payload-caso1-sin-irpf-sin-re.json
   node generatePDF.js payload-caso2-con-irpf-sin-re.json
   node generatePDF.js payload-caso3-sin-irpf-con-re.json
   node generatePDF.js payload-caso4-con-irpf-con-re.json
   ```

4. Validar PDFs generados:
   - Verificar orden de elementos
   - Verificar estilos (colores, fuentes)
   - Verificar cálculos de totales
   - Verificar responsive

---

## Soporte

Para dudas o problemas con la integración, contactar:
- **Equipo:** jeyca-presu-dev
- **Documentación:** `/docs/ejemplos-payloads/`
- **Payloads de prueba:** 4 archivos JSON de ejemplo incluidos

---

**Última actualización:** 2025-01-10
**Autor:** Claude Code
**Versión:** 1.0
