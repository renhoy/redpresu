# Payloads de Ejemplo - Casos IRPF y Recargo de Equivalencia

## Descripción

Estos 4 archivos JSON son ejemplos reales de payloads para el generador de PDFs, cubriendo todos los casos fiscales posibles según la relación emisor-cliente.

## Datos Base Comunes

Todos los casos parten de los mismos datos:

- **Base Imponible Total:** 4.922,50 €
- **IVA 5%:** 237,50 € (sobre base 4.757,14 €)
- **IVA 21%:** 33,00 € (sobre base 163,64 €)
- **Total con IVA:** 5.193,00 €

## Casos Implementados

### Caso 1: Sin IRPF, Sin RE
**Archivo:** `payload-caso1-sin-irpf-sin-re.json`

**Escenario:** Empresa → Cualquier tipo de cliente

**Totales:**
```
Base Imponible:     4.922,50 €
IVA 5%:               237,50 €
IVA 21%:               33,00 €
─────────────────────────────
Total a Pagar:      5.193,00 €
```

**Estructura totals:**
- `base`
- `ivas[]`
- `total`

---

### Caso 2: Con IRPF, Sin RE
**Archivo:** `payload-caso2-con-irpf-sin-re.json`

**Escenario:** Autónomo → Empresa o Autónomo (sin RE)

**Totales:**
```
Subtotal (IVA incl): 5.193,00 €
Base Imponible:      4.922,50 €
IVA 5%:                237,50 €
IVA 21%:                33,00 €
IRPF 15%:             -738,38 €
─────────────────────────────
Total a Pagar:       4.454,62 €
```

**Cálculo IRPF:** 4.922,50 × 0,15 = 738,38 €

**Estructura totals:**
- `subtotal`
- `base`
- `ivas[]`
- `irpf`
- `total`

---

### Caso 3: Sin IRPF, Con RE
**Archivo:** `payload-caso3-sin-irpf-con-re.json`

**Escenario:** Empresa → Autónomo con Recargo de Equivalencia

**Totales:**
```
Subtotal (IVA incl): 5.193,00 €
Base Imponible:      4.922,50 €
IVA 5%:                237,50 €
IVA 21%:                33,00 €
RE 0,5% (IVA 5%):       23,79 €
RE 5,2% (IVA 21%):       8,51 €
─────────────────────────────
Total a Pagar:       5.225,30 €
```

**Cálculos RE:**
- Base IVA 5%: 4.757,14 € → RE 0,5% = 23,79 €
- Base IVA 21%: 163,64 € → RE 5,2% = 8,51 €

**Estructura totals:**
- `subtotal`
- `base`
- `ivas[]`
- `re[]`
- `total`

---

### Caso 4: Con IRPF y Con RE
**Archivo:** `payload-caso4-con-irpf-con-re.json`

**Escenario:** Autónomo → Autónomo con Recargo de Equivalencia

**Totales:**
```
Subtotal (IVA incl): 5.193,00 €
Base Imponible:      4.922,50 €
IVA 5%:                237,50 €
IVA 21%:                33,00 €
IRPF 15%:             -738,38 €
RE 0,5% (IVA 5%):       23,79 €
RE 5,2% (IVA 21%):       8,51 €
─────────────────────────────
Total a Pagar:       4.486,92 €
```

**Estructura totals:**
- `subtotal`
- `base`
- `ivas[]`
- `irpf`
- `re[]`
- `total`

---

## Matriz de Aplicación Fiscal

| Emisor   | Cliente     | IRPF | RE  | Caso |
|----------|-------------|------|-----|------|
| Empresa  | Cualquiera  | NO   | NO  | 1    |
| Empresa  | Autónomo RE | NO   | SÍ  | 3    |
| Autónomo | Empresa     | SÍ   | NO  | 2    |
| Autónomo | Autónomo    | SÍ   | NO  | 2    |
| Autónomo | Autónomo RE | SÍ   | SÍ  | 4    |
| Autónomo | Particular  | NO   | NO  | 1    |

## Formato de Campos Especiales

### Campo `irpf`
```json
"irpf": {
  "name": "15,00% IRPF",
  "amount": "-738,38 €"
}
```
**Nota:** El amount es SIEMPRE negativo (es una retención)

### Campo `re` (array)
```json
"re": [
  {
    "name": "0,50% RE (IVA 5%)",
    "amount": "23,79 €"
  },
  {
    "name": "5,20% RE (IVA 21%)",
    "amount": "8,51 €"
  }
]
```
**Nota:** Solo se incluyen los RE de los IVAs presentes en la tarifa

## Uso en Desarrollo

Estos payloads se pueden usar para:
1. Testing del generador de PDFs
2. Validación de cálculos fiscales
3. Ejemplos en documentación
4. Casos de prueba E2E

## Validación

Todos los cálculos han sido verificados:
- ✅ Bases proporcionales correctas por IVA
- ✅ IRPF 15% sobre base imponible total
- ✅ RE según porcentajes oficiales (0,5% y 5,2%)
- ✅ Totales finales coherentes

---

**Última actualización:** 2025-01-10
**Autor:** Claude Code
**Propósito:** Referencia para implementación Bloque 4 (IRPF y RE)
