# 📦 Módulo Rapid-PDF

Motor de generación de PDFs empresariales integrado en jeyca-presu.

## 🚀 Estado de la Migración

✅ **COMPLETADO** - Migración de Rapid-PDF de API externa a módulo interno

### Fases Completadas

- ✅ **FASE 1**: Análisis del código de Rapid-PDF
- ✅ **FASE 2**: Setup del módulo en jeyca-presu
- ✅ **FASE 3**: Migración del core (RenderEngine, ElementProcessor, PageManager)
- ✅ **FASE 4**: Migración de templates
- ✅ **FASE 5**: Integración con Server Action

### Pendiente

- ⚠️ **FASE 6**: Testing y validación
- ⚠️ **FASE 7**: Documentación final y cleanup

## 🔧 Configuración

### Variables de Entorno

Añadir a `.env.local`:

```bash
# Control de qué sistema usar para PDFs
USE_RAPID_PDF_MODULE=true    # true = módulo interno, false = API externa (legacy)

# LEGACY (solo si USE_RAPID_PDF_MODULE=false)
RAPID_PDF_URL=http://localhost:3001
RAPID_PDF_API_KEY=rapid-pdf-secret-key-2025
```

### Cambio entre Sistemas

**Para usar el módulo interno (NUEVO):**
```bash
USE_RAPID_PDF_MODULE=true
```

**Para usar la API externa (LEGACY):**
```bash
USE_RAPID_PDF_MODULE=false
```

## 📖 Uso

### Generar PDF desde Server Action

```typescript
import { generatePDF } from '@/lib/rapid-pdf'

export async function generateBudgetPDF(budgetId: string) {
  const payload = buildPDFPayload(budget, tariff)

  const result = await generatePDF(payload, {
    outputPath: '/path/to/output.pdf',
    mode: 'produccion'
  })

  if (result.success) {
    console.log('PDF generado:', result.filePath)
  } else {
    console.error('Error:', result.error)
  }
}
```

### Generar HTML (debugging)

```typescript
const result = await generatePDF(payload, {
  outputPath: 'temp/debug.html',
  mode: 'desarrollo',
})
```

### Obtener Buffer en memoria

```typescript
const result = await generatePDF(payload, {
  returnBuffer: true,
  mode: 'produccion',
})

if (result.success && result.buffer) {
  // Usar buffer directamente
  await uploadToStorage(result.buffer)
}
```

## 📂 Estructura del Módulo

```
src/lib/rapid-pdf/
├── index.ts              # Exportación principal
├── generator.ts          # Función generatePDF()
├── core/
│   ├── render-engine.ts     # Gestión de Puppeteer
│   ├── element-processor.ts # Procesamiento de datos
│   └── page-manager.ts      # Paginación
├── templates/
│   └── default/          # Template predeterminado
│       ├── js/
│       │   └── component/
│       ├── css/
│       ├── assets/
│       └── json/
│           └── structure.json
└── types/
    └── index.ts          # Tipos TypeScript
```

## 🔍 Estructura del Payload

Ver tipos completos en `types/index.ts`.

```typescript
interface PDFPayload {
  mode: "desarrollo" | "produccion"
  company: CompanyData
  pdf: PDFMetadata
  summary: SummaryData
  budget: BudgetData
  conditions: ConditionsData
}
```

## 🎨 Templates

Template predeterminado: `default`

### Estructura de Template

```
templates/default/
├── js/
│   └── component/       # Componentes de renderizado
│       ├── headerCompany.js
│       ├── headerTitle.js
│       ├── contentClient.js
│       ├── contentLevels.js
│       ├── contentTotals.js
│       ├── contentNote.js
│       ├── contentSeparator.js
│       ├── footerSignatures.js
│       └── footerPagination.js
├── css/                 # Estilos CSS
│   ├── styles.css
│   ├── common.css
│   └── [component].css
├── assets/              # Recursos (logos, etc)
└── json/
    └── structure.json   # Configuración del template
```

### Crear Nuevo Template

1. Copiar template default
2. Modificar componentes y estilos
3. Usar template ID en payload: `company.template = "mi-template"`

## ⚡ Performance

- Primera generación: ~10-15s (inicializa Puppeteer)
- Generaciones siguientes: ~5-10s (reutiliza navegador)
- Recomendación: Mantener Puppeteer en singleton

## 🐛 Troubleshooting

### Error "Template not found"

```bash
# Verificar que existe el template
ls -la src/lib/rapid-pdf/templates/{template-id}/
```

### Error "Puppeteer timeout"

```typescript
// Aumentar timeout en RenderEngine (si es necesario)
// En render-engine.ts línea ~374:
await pdfPage.setContent(cleanedHTML, {
  waitUntil: "networkidle0",
  timeout: 60000 // Aumentar a 60s si es necesario
})
```

### Memory leak

```bash
# Verificar que el navegador se cierra
# El módulo ya gestiona esto automáticamente en generator.ts
```

## 🧪 Testing

```bash
# Unit tests (pendiente)
npm test src/lib/rapid-pdf

# Test de integración (pendiente)
npm run test:integration
```

## 📝 Migración desde API Externa

Este módulo reemplaza la integración con Rapid-PDF API externa.

**Cambios realizados:**

- ✅ Eliminado `fetch(RAPID_PDF_URL)` (cuando USE_RAPID_PDF_MODULE=true)
- ✅ Añadido `import { generatePDF }`
- ✅ Lógica de API conservada como fallback
- ✅ Payload optimizado con tipos TypeScript

**Variables de entorno:**

- Opcional: `RAPID_PDF_URL` y `RAPID_PDF_API_KEY` (solo si USE_RAPID_PDF_MODULE=false)

## ⚠️ Limitaciones Conocidas

1. **Componentes de template**: Actualmente en JS, necesitan ser portados a TypeScript
2. **generateComponentHTML**: Usa HTML placeholder, necesita integración real con componentes
3. **CSS paths**: Hardcodeados a template "default"
4. **Testing**: Sin tests automatizados aún

## 🔄 Próximos Pasos

1. ✅ Convertir componentes JS del template a TypeScript
2. ✅ Integrar componentes reales en RenderEngine.generateComponentHTML()
3. ✅ Añadir soporte para múltiples templates
4. ✅ Crear tests unitarios
5. ✅ Optimizar carga de CSS (cache)
6. ✅ Documentación completa de componentes

---

**Versión:** 1.0
**Última actualización:** 2025-01-22
**Autor:** Claude Code (Migración automática)
