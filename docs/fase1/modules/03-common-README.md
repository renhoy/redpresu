# Módulo Common - Documentación

**Estado:** ✅ COMPLETADO - READ-ONLY
**Commit Final:** `648c5d0`
**Fecha Completado:** 26 septiembre 2024

## Descripción

El módulo Common proporciona utilidades compartidas, validadores, transformadores, helpers de formateo y constantes centralizadas para toda la aplicación. Es la base sobre la que se construyen todos los demás módulos.

## Estructura de Archivos

```
src/lib/
├── constants/           # Constantes centralizadas
│   ├── index.ts        # Exportaciones centrales
│   ├── levels.ts       # Niveles jerárquicos
│   ├── statuses.ts     # Estados del sistema
│   ├── roles.ts        # Roles y permisos
│   ├── messages.ts     # Mensajes y configuración
│   ├── csv.ts          # Constantes CSV
│   └── calculations.ts # Constantes de cálculo
├── helpers/            # Funciones auxiliares
│   ├── format.ts       # Formateo de datos
│   ├── csv-errors.ts   # Manejo de errores CSV
│   ├── csv-utils.ts    # Utilidades CSV
│   ├── normalization-utils.ts     # Normalización
│   ├── transformation-utils.ts    # Transformaciones
│   ├── calculation-helpers.ts     # Helpers de cálculo
│   └── calculation-types.ts       # Tipos de cálculo
├── utils/              # Utilidades principales
│   ├── index.ts        # Exportaciones simplificadas
│   └── calculations.ts # Utilidades de cálculo
└── validators/         # Validadores y transformadores
    ├── index.ts        # Exportaciones principales
    ├── csv-parser.ts   # Parser CSV robusto
    ├── budget-validator.ts         # Validador de presupuestos
    ├── csv-converter.ts           # Conversor principal
    ├── data-transformer.ts        # Transformador de datos
    └── csv-types.ts              # Tipos TypeScript
```

## Funcionalidades Principales

### 1. Validador CSV (Tarea 1)

**Descripción:** Validador robusto para procesar CSV de tarifas y transformarlos a JSON.

**Archivos principales:**
- `validators/csv-parser.ts` - Parser CSV con detección automática
- `validators/budget-validator.ts` - Validador con Zod
- `validators/csv-converter.ts` - Conversor principal

**Uso básico:**
```typescript
import { CSV2JSONConverter } from '@/lib/validators';

const converter = new CSV2JSONConverter();
const result = await converter.convertCSVToJSON(csvContent);

if (result.success) {
  console.log('Datos:', result.data);
} else {
  console.log('Errores:', result.errors);
}
```

**Funcionalidades:**
- ✅ Detección automática de delimitadores (`,`, `;`, `\t`, `|`)
- ✅ Validación de estructura y jerarquía
- ✅ Sistema de errores estructurado con códigos y severidad
- ✅ Soporte para validación con Zod
- ✅ Manejo de BOM y caracteres especiales

### 2. Transformador CSV a JSON (Tarea 2)

**Descripción:** Transformador que convierte CSV validado a estructura JSON jerárquica.

**Archivos principales:**
- `validators/data-transformer.ts` - Transformador principal
- `helpers/normalization-utils.ts` - Normalización avanzada

**Uso básico:**
```typescript
import { DataTransformer } from '@/lib/validators';

const transformer = new DataTransformer();
const result = transformer.transformWithFullNormalization(validatedData);
```

**Funcionalidades:**
- ✅ Normalización de campos (Nivel → level)
- ✅ Traducción completa a inglés
- ✅ Traducción de niveles (Capítulo → chapter)
- ✅ Generación de campos adicionales
- ✅ Formato numérico inglés (2 decimales)

### 3. Utilidades de Cálculo (Tarea 3)

**Descripción:** Utilidades para cálculos de presupuestos con propagación de totales y gestión de IVA.

**Archivos principales:**
- `utils/calculations.ts` - Utilidades principales
- `helpers/calculation-helpers.ts` - Funciones de conveniencia

**Uso básico:**
```typescript
import { CalculationUtils, recalculateBudget } from '@/lib/utils';

// Cálculo simple
const amount = CalculationUtils.calculateItemAmount('2.5', '15.50');

// Recálculo completo
const result = recalculateBudget(budgetData);
console.log(result.totals); // { base, ivas, total }
```

**Funcionalidades:**
- ✅ Cálculo de importes: `amount = quantity × pvp`
- ✅ Propagación de totales a ancestros
- ✅ Cálculo de IVA agrupado por porcentaje
- ✅ Cálculo de totales finales
- ✅ Precisión decimal para evitar errores

### 4. Helpers de Formato y Constantes (Tarea 4)

**Descripción:** Helpers de formateo consistentes y constantes centralizadas.

**Archivos principales:**
- `helpers/format.ts` - Helpers de formateo
- `constants/index.ts` - Constantes centralizadas

**Uso básico:**
```typescript
import {
  formatCurrency,
  BUDGET_STATUSES,
  USER_ROLES
} from '@/lib/validators';

// Formateo
const formatted = formatCurrency(1234.56); // "1.234,56 €"

// Constantes
const status = BUDGET_STATUSES.DRAFT; // "borrador"
const adminRole = USER_ROLES.ADMIN; // "admin"
```

**Funcionalidades:**
- ✅ Formateo de moneda española
- ✅ Formateo de números (ES/EN)
- ✅ Formateo de fechas
- ✅ Normalización de strings
- ✅ Constantes de niveles, estados, roles
- ✅ Mensajes de error centralizados

## API Reference

### Exports Principales

```typescript
// Conversor principal
export { CSV2JSONConverter } from './csv-converter';

// Tipos principales
export type {
  BudgetItem,
  ValidationError,
  OperationResult,
  ValidationConfig,
  BudgetLevel,
  ErrorCode,
  ErrorSeverity
} from './csv-types';

// Utilidades de cálculo
export { CalculationUtils } from '../utils/calculations';
export { CalculationHelpers } from '../helpers/calculation-helpers';

// Helpers de formateo
export {
  formatCurrency,
  formatCurrencyCompact,
  parseCurrency,
  formatNumberES,
  formatNumberEN,
  parseNumber,
  formatDate,
  formatDateRelative,
  parseDate,
  removeAccents,
  createSlug,
  capitalize,
  truncate
} from '../helpers/format';

// Todas las constantes del sistema
export * from '../constants';
```

### Funciones de Conveniencia

```typescript
import {
  calculateItemAmount,
  recalculateBudget,
  getBudgetStats,
  validateCalculationData
} from '@/lib/utils';
```

## Tipos TypeScript

### BudgetItem
```typescript
interface BudgetItem {
  level: 'chapter' | 'subchapter' | 'section' | 'item';
  id: string;
  name: string;
  amount: string;
  description?: string;
  unit?: string;
  quantity?: string;
  iva_percentage?: string;
  pvp?: string;
}
```

### ValidationError
```typescript
interface ValidationError {
  code: ErrorCode;
  severity: ErrorSeverity;
  message: string;
  line?: number;
  field?: string;
  originalRow?: string[];
}
```

### TotalsResult
```typescript
interface TotalsResult {
  base: TotalLine;
  ivas: IVAGroup[];
  total: TotalLine;
}
```

## Configuraciones

### Constantes Principales
```typescript
// Niveles jerárquicos
LEVELS = {
  CHAPTER: 'chapter',
  SUBCHAPTER: 'subchapter',
  SECTION: 'section',
  ITEM: 'item'
}

// Estados de presupuesto
BUDGET_STATUSES = {
  DRAFT: 'borrador',
  PENDING: 'pendiente',
  SENT: 'enviado',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
  EXPIRED: 'caducado'
}

// Roles de usuario
USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  VENDOR: 'vendedor'
}
```

### Presets de Cálculo
```typescript
CALCULATION_PRESETS = {
  SPANISH_STANDARD: {
    decimals: 2,
    currency: '€',
    useCommaSeparator: true,
    validateNegative: true
  },
  EXPORT_FORMAT: {
    decimals: 2,
    currency: '€',
    useCommaSeparator: false,
    validateNegative: true
  }
}
```

## Notas Técnicas

### Precisión Decimal
- Se utiliza aritmética de enteros para evitar errores de punto flotante
- Todos los cálculos mantienen precisión de 2 decimales
- Soporte para formato español (coma decimal) e inglés (punto decimal)

### Validación de Jerarquía
- Soporte para hasta 4 niveles de profundidad
- Validación automática de secuencias numéricas
- Detección de elementos huérfanos y referencias circulares

### Internacionalización
- Preparado para español e inglés
- Formateo de fechas, números y moneda localizado
- Constantes traducibles

### Performance
- Parsing optimizado para archivos CSV grandes
- Validación por lotes para mejor rendimiento
- Caching automático de 15 minutos para WebFetch

## Dependencias

- **zod** - Validación de esquemas TypeScript
- **Next.js 14** - Framework base
- **TypeScript** - Tipado estático

## Testing

El módulo está diseñado con funciones puras y testeables:
- Todas las utilidades son funciones puras sin efectos secundarios
- Validaciones separadas por responsabilidad
- Mocks disponibles para testing unitario

## Próximos Módulos

Este módulo sirve como base para:
- **Tariff Management** - Gestión de tarifas
- **Budget Management** - Gestión de presupuestos
- **Client Management** - Gestión de clientes
- **User Management** - Gestión de usuarios

---

**⚠️ IMPORTANTE:** Este módulo está marcado como READ-ONLY. No realizar modificaciones sin actualizar el estado en PRD.md y claude.md.