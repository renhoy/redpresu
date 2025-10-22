# 📦 PROMPT: Migración de Rapid-PDF como Módulo Interno de jeyca-presu

---

## 🎯 OBJETIVO DE LA TAREA

Migrar el **motor de renderizado de Rapid-PDF** desde un servicio API externo a un **módulo interno de jeyca-presu**. Eliminar toda la capa de API/servidor (Express, endpoints, autenticación) y convertir la funcionalidad core en una librería TypeScript que se ejecuta directamente dentro de Next.js usando Server Actions.

### ✅ Resultado Esperado

Al finalizar esta tarea:

1. ✅ Motor de Rapid-PDF integrado en `src/lib/rapid-pdf/`
2. ✅ Función `generatePDF(payload, outputPath)` disponible para Server Actions
3. ✅ Puppeteer funcionando correctamente en entorno Next.js
4. ✅ Templates migrados y operativos
5. ✅ Sin dependencia de API externa ni servidor Express
6. ✅ Payload optimizado con tipos TypeScript
7. ✅ PDFs generados con misma calidad que antes

---

## 📊 CONTEXTO DEL PROYECTO

### Estado Actual de jeyca-presu

**jeyca-presu** es una aplicación Next.js 15.5.4 para generación de presupuestos empresariales:

- **Stack**: Next.js + TypeScript + Supabase + Tailwind CSS
- **Fase actual**: Fase 2 (31% completado, 20/64 tareas)
- **Funcionalidad PDF**: Actualmente usa Rapid-PDF como API externa

### Arquitectura Actual (API Externa)

```
┌─────────────┐         ┌──────────────┐         ┌─────────┐
│  jeyca-     │  HTTP   │  Rapid-PDF   │ Puppeteer│   PDF   │
│  presu      │ ──────> │  API Server  │ ───────> │  Final  │
│ (Next.js)   │  POST   │  (Express)   │          │         │
└─────────────┘         └──────────────┘         └─────────┘
     │                         │
     │ buildPDFPayload()      │ RenderEngine
     │ fetch(API_URL)         │ ElementProcessor
     │ download PDF           │ PageManager
     └────────────────────────┘
```

### Arquitectura Objetivo (Módulo Interno)

```
┌──────────────────────────────────────────────────┐
│              jeyca-presu (Next.js)               │
│                                                  │
│  ┌─────────────────┐      ┌─────────────────┐  │
│  │  Server Action  │      │  Módulo PDF     │  │
│  │  budgets.ts     │ ───> │  rapid-pdf/     │  │
│  │                 │      │  - generator.ts │  │
│  │ generateBudget  │      │  - engine.ts    │  │
│  │ PDF()           │      │  - templates/   │  │
│  └─────────────────┘      └─────────────────┘  │
│                                   │              │
│                            Puppeteer             │
│                                   ↓              │
│                               ┌────────┐         │
│                               │  PDF   │         │
│                               │ Final  │         │
│                               └────────┘         │
└──────────────────────────────────────────────────┘
```

**Cambios clave:**

- ❌ Sin Express server
- ❌ Sin API REST / endpoints
- ❌ Sin autenticación por API key
- ❌ Sin fetch() / HTTP calls
- ✅ Importación directa: `import { generatePDF }`
- ✅ Ejecución síncrona en Server Action
- ✅ Puppeteer gestionado internamente

---

## 🔍 INFORMACIÓN TÉCNICA DE RAPID-PDF

### Componentes Core a Migrar

Según el README de Rapid-PDF, estos son los componentes esenciales:

#### 1. **RenderEngine** (`js/core/RenderEngine.js`)

- Gestión de Puppeteer para renderizado
- Medición precisa de alturas de elementos
- Aplicación de metadatos PDF
- Optimización de memoria

#### 2. **ElementProcessor** (`js/core/ElementProcessor.js`)

- Procesamiento de componentes divisibles (`levels`, `note`)
- Mapeo de datos desde budgetData
- Generación de elementsData optimizado

#### 3. **PageManager** (`js/core/PageManager.js`)

- Gestión de configuración de página
- Control de márgenes y espaciado
- Tracking de páginas totales

#### 4. **Algoritmo de Renderizado** (`js/app.js`)

- Inicialización y validación de template
- ElementProcessor → elementsData
- Medición de alturas con DOM virtual
- Renderizado por secciones (Headers → Content → Footers)
- Paginación inteligente con saltos automáticos
- Generación final: HTML → PDF (Puppeteer)

### Sistema de Templates

Cada template incluye:

- **Componentes JS**: Lógica de renderizado de cada sección
- **Estilos CSS**: Diseño específico del template
- **Configuración JSON**: Estructura del documento
- **Assets**: Logos, fuentes, recursos

**Templates existentes:**

- `color` (usado por defecto en payloads de jeyca-presu)
- `bn`

### Dependencias Necesarias

```json
{
  "puppeteer": "^24.10.0",
  "jsdom": "^26.1.0",
  "pdf-lib": "^1.17.1"
}
```

---

## 📋 TAREAS A REALIZAR

### ✅ FASE 1: Análisis del Código de Rapid-PDF (2-3 horas)

#### 1.1. Explorar Estructura de Rapid-PDF

```bash
# Navegar al código fuente de Rapid-PDF
cd {ubicacion-rapid-pdf}

# Ver estructura completa
tree -L 3 -I 'node_modules'

# Debe mostrar algo como:
# rapid_pdf/
# ├── server.js              ← NO migrar (servidor Express)
# ├── js/
# │   ├── app.js             ← MIGRAR (algoritmo principal)
# │   ├── server-app.js      ← NO migrar (endpoints API)
# │   └── core/              ← MIGRAR COMPLETO
# │       ├── RenderEngine.js
# │       ├── ElementProcessor.js
# │       └── PageManager.js
# ├── css/                   ← MIGRAR (estilos globales)
# ├── template/              ← MIGRAR COMPLETO
# │   └── {template-id}/
# │       ├── js/
# │       ├── css/
# │       └── assets/
# └── package.json
```

#### 1.2. Identificar Dependencias del Core

```bash
# Ver qué importa cada módulo core
cd {ubicacion-rapid-pdf}

# RenderEngine
grep -E "require\(|import " js/core/RenderEngine.js | head -20

# ElementProcessor
grep -E "require\(|import " js/core/ElementProcessor.js | head -20

# PageManager
grep -E "require\(|import " js/core/PageManager.js | head -20

# app.js (algoritmo principal)
grep -E "require\(|import " js/app.js | head -20
```

**Crear lista de dependencias:**

```
DEPENDENCIAS EXTERNAS (instalar en jeyca-presu):
- puppeteer
- jsdom
- pdf-lib

DEPENDENCIAS INTERNAS (migrar):
- core/RenderEngine
- core/ElementProcessor
- core/PageManager
- templates/*
```

#### 1.3. Analizar Punto de Entrada

```bash
# Ver cómo se usa en server.js (para entender flujo)
cat {ubicacion-rapid-pdf}/server.js | grep -A 50 "POST /generate_document"

# Buscar la función principal que ejecuta todo
grep -n "function.*generate\|async.*generate" js/app.js
```

**Identificar:**

- ✅ Función principal de entrada (ej: `generateDocument()`)
- ✅ Parámetros que recibe (payload, mode, etc.)
- ✅ Qué retorna (buffer, path, etc.)
- ✅ Manejo de errores

#### 1.4. Documentar Templates

```bash
# Ver qué templates existen
ls -la template/

# Examinar estructura de un template
ls -la template/color/
# o
ls -la template/bn/

# Ver configuración del template
cat template/{template-id}/config.json | jq '.'
```

**Crear inventario:**

```
TEMPLATES DISPONIBLES:
- color (o bn)
  - Componentes JS: header, footer, summary, budget, conditions, totals
  - Estilos: CSS modulares por componente
  - Assets: logos, fuentes
```

---

### ✅ FASE 2: Setup del Módulo en jeyca-presu (2-3 horas)

#### 2.1. Crear Estructura de Directorios

```bash
cd /Users/josius/Documents/proy/jeyca-presu

# Crear estructura del módulo
mkdir -p src/lib/rapid-pdf/{core,templates,helpers,types}

# Crear subdirectorios para templates
mkdir -p src/lib/rapid-pdf/templates/default/{components,styles,assets}

# Estructura esperada:
# src/lib/rapid-pdf/
# ├── index.ts              # Exportación principal
# ├── generator.ts          # Función generatePDF()
# ├── core/
# │   ├── render-engine.ts
# │   ├── element-processor.ts
# │   └── page-manager.ts
# ├── templates/
# │   └── default/          # Template migrado
# │       ├── components/
# │       ├── styles/
# │       └── assets/
# ├── helpers/
# │   ├── html-builder.ts
# │   └── puppeteer-manager.ts
# └── types/
#     └── index.ts          # Tipos TypeScript
```

#### 2.2. Instalar Dependencias

```bash
cd /Users/josius/Documents/proy/jeyca-presu

# Instalar Puppeteer (recomendación: usar puppeteer en lugar de puppeteer-core)
npm install puppeteer

# Instalar dependencias adicionales
npm install jsdom pdf-lib

# Instalar tipos de TypeScript
npm install -D @types/jsdom
```

**Verificar instalación:**

```bash
npm list puppeteer
npm list jsdom
npm list pdf-lib
```

**Decisión sobre Puppeteer:**

✅ **Opción Recomendada: `puppeteer`** (full package)

- Incluye Chromium (~300MB)
- Funciona out-of-the-box en Next.js Server Actions
- No requiere configuración adicional
- Ideal para desarrollo y producción

❌ **puppeteer-core** (no recomendado para este caso)

- Más ligero pero requiere Chrome instalado por separado
- Configuración más compleja en producción
- Puede causar problemas en serverless (Vercel)

#### 2.3. Crear Tipos TypeScript

**Crear archivo:** `src/lib/rapid-pdf/types/index.ts`

```typescript
/**
 * Tipos para el módulo Rapid-PDF
 */

// Payload principal
export interface PDFPayload {
  mode: "desarrollo" | "produccion";
  company: CompanyData;
  pdf: PDFMetadata;
  summary: SummaryData;
  budget: BudgetData;
  conditions: ConditionsData;
}

// Datos de empresa
export interface CompanyData {
  logo: string;
  name: string;
  nif: string;
  address: string;
  contact: string;
  template: string; // ID del template a usar
  styles: Array<{
    primary_color?: string;
    secondary_color?: string;
  }>;
}

// Metadatos del PDF
export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  creator: string;
  keywords: string;
}

// Datos de resumen
export interface SummaryData {
  title: string;
  client: ClientData;
  note: string;
  levels: ChapterSummary[];
  totals: TotalsData;
}

export interface ClientData {
  name: string;
  nif_nie: string;
  address: string;
  contact: string;
  budget_date: string; // DD-MM-YYYY
  validity: string; // días
}

export interface ChapterSummary {
  level: "chapter";
  id: string;
  name: string;
  amount: string; // Formato: "1.234,56 €"
}

// Totales
export interface TotalsData {
  subtotal?: {
    name: string;
    amount: string;
  };
  base: {
    name: string;
    amount: string;
  };
  ivas: Array<{
    name: string; // "21,00% IVA"
    amount: string;
  }>;
  irpf?: {
    name: string;
    amount: string; // Negativo: "-123,45 €"
  };
  re?: Array<{
    name: string;
    amount: string;
  }>;
  total: {
    name: string;
    amount: string;
  };
}

// Datos de presupuesto detallado
export interface BudgetData {
  title: string;
  levels: BudgetLine[];
}

export type BudgetLineLevel = "chapter" | "subchapter" | "section" | "item";

export interface BudgetLine {
  level: BudgetLineLevel;
  id: string; // Jerárquico: "1", "1.1", "1.1.1", "1.1.1.1"
  name: string;
  description?: string;
  unit?: string; // Solo items
  quantity?: string; // Solo items, formato: "1.234,56"
  iva_percentage?: string; // Solo items, formato: "21,00"
  pvp?: string; // Solo items, formato: "1.234,56 €"
  amount?: string; // Formato: "1.234,56 €"
}

// Condiciones
export interface ConditionsData {
  title: string;
  note: string;
}

// Resultado de generación
export interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
  processingTime?: number;
}

// Opciones de generación
export interface PDFGenerationOptions {
  outputPath?: string; // Si se proporciona, guarda archivo
  returnBuffer?: boolean; // Si true, retorna Buffer en lugar de guardar
  mode?: "desarrollo" | "produccion"; // Desarrollo genera HTML, producción PDF
}
```

---

### ✅ FASE 3: Migración del Core (6-8 horas)

#### 3.1. Migrar RenderEngine

**Crear archivo:** `src/lib/rapid-pdf/core/render-engine.ts`

**Estrategia de migración:**

1. Copiar código de `js/core/RenderEngine.js`
2. Convertir de JavaScript a TypeScript
3. Adaptar imports CommonJS (`require`) a ES6 (`import`)
4. Añadir tipos a funciones y variables
5. Gestionar instancia de Puppeteer (singleton o pool)

**Ejemplo de estructura:**

```typescript
/**
 * RenderEngine - Gestión de Puppeteer y renderizado
 * Migrado desde: js/core/RenderEngine.js
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { JSDOM } from "jsdom";
import { PDFDocument } from "pdf-lib";

export class RenderEngine {
  private browser: Browser | null = null;

  /**
   * Inicializa el navegador Puppeteer
   */
  async initialize(): Promise<void> {
    if (this.browser) return;

    console.log("[RenderEngine] Inicializando Puppeteer...");

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    console.log("[RenderEngine] Puppeteer inicializado");
  }

  /**
   * Renderiza HTML a PDF usando Puppeteer
   */
  async renderHTMLToPDF(
    html: string,
    options: {
      format?: "A4" | "Letter";
      margins?: { top: string; bottom: string; left: string; right: string };
    } = {}
  ): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();

    try {
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Cargar HTML
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: options.format || "A4",
        printBackground: true,
        margin: options.margins || {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Mide altura de un elemento HTML
   * Usado para cálculos de paginación
   */
  async measureElementHeight(html: string): Promise<number> {
    const dom = new JSDOM(html);
    const element = dom.window.document.body.firstElementChild;

    if (!element) return 0;

    // Simulación de medición (adaptar según lógica original)
    return element.textContent?.length || 0;
  }

  /**
   * Aplica metadatos al PDF generado
   */
  async applyMetadata(
    pdfBuffer: Buffer,
    metadata: {
      title: string;
      author: string;
      subject: string;
      creator: string;
      keywords: string;
    }
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    pdfDoc.setTitle(metadata.title);
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setSubject(metadata.subject);
    pdfDoc.setCreator(metadata.creator);
    pdfDoc.setKeywords([metadata.keywords]);

    const updatedPdfBytes = await pdfDoc.save();
    return Buffer.from(updatedPdfBytes);
  }

  /**
   * Cierra el navegador Puppeteer
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("[RenderEngine] Puppeteer cerrado");
    }
  }
}

// Singleton para reutilizar instancia
let engineInstance: RenderEngine | null = null;

export function getRenderEngine(): RenderEngine {
  if (!engineInstance) {
    engineInstance = new RenderEngine();
  }
  return engineInstance;
}
```

**IMPORTANTE:**

- Revisar el código original de `RenderEngine.js` para copiar toda la lógica específica
- Adaptar mediciones de altura según algoritmo original
- Mantener optimizaciones de memoria

#### 3.2. Migrar ElementProcessor

**Crear archivo:** `src/lib/rapid-pdf/core/element-processor.ts`

**Estructura básica:**

```typescript
/**
 * ElementProcessor - Procesamiento de elementos y datos
 * Migrado desde: js/core/ElementProcessor.js
 */

import { PDFPayload, BudgetLine } from "../types";

export interface ProcessedElement {
  type: string;
  data: any;
  divisible: boolean; // Puede dividirse entre páginas
  height?: number;
}

export class ElementProcessor {
  /**
   * Procesa el payload completo y genera elementsData
   */
  static processPayload(payload: PDFPayload): ProcessedElement[] {
    const elements: ProcessedElement[] = [];

    // Procesar header
    elements.push({
      type: "header",
      data: payload.company,
      divisible: false,
    });

    // Procesar summary
    elements.push({
      type: "summary",
      data: payload.summary,
      divisible: false,
    });

    // Procesar budget levels (divisible)
    payload.budget.levels.forEach((line) => {
      elements.push({
        type: "budget-line",
        data: line,
        divisible: line.level === "item", // Solo items son divisibles
      });
    });

    // Procesar totales
    elements.push({
      type: "totals",
      data: payload.summary.totals,
      divisible: false,
    });

    // Procesar conditions
    elements.push({
      type: "conditions",
      data: payload.conditions,
      divisible: true, // Notas pueden dividirse
    });

    return elements;
  }

  /**
   * Mapea datos de presupuesto a formato de template
   */
  static mapBudgetData(lines: BudgetLine[]): any {
    // Adaptar según estructura esperada por templates
    return lines.map((line) => ({
      level: line.level,
      id: line.id,
      name: line.name,
      description: line.description || "",
      unit: line.unit || "",
      quantity: line.quantity || "",
      iva: line.iva_percentage || "",
      pvp: line.pvp || "",
      amount: line.amount || "",
    }));
  }
}
```

**Copiar lógica específica del archivo original.**

#### 3.3. Migrar PageManager

**Crear archivo:** `src/lib/rapid-pdf/core/page-manager.ts`

```typescript
/**
 * PageManager - Gestión de paginación y configuración
 * Migrado desde: js/core/PageManager.js
 */

export interface PageConfig {
  format: "A4" | "Letter";
  width: number; // mm
  height: number; // mm
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentHeight: number; // Altura disponible para contenido
}

export class PageManager {
  private config: PageConfig;
  private currentPage: number = 1;
  private totalPages: number = 0;

  constructor(format: "A4" | "Letter" = "A4") {
    this.config = this.getPageConfig(format);
  }

  private getPageConfig(format: "A4" | "Letter"): PageConfig {
    const configs = {
      A4: {
        format: "A4" as const,
        width: 210,
        height: 297,
        margins: { top: 20, bottom: 20, left: 15, right: 15 },
        contentHeight: 0,
      },
      Letter: {
        format: "Letter" as const,
        width: 216,
        height: 279,
        margins: { top: 20, bottom: 20, left: 15, right: 15 },
        contentHeight: 0,
      },
    };

    const config = configs[format];
    config.contentHeight =
      config.height - config.margins.top - config.margins.bottom;

    return config;
  }

  getConfig(): PageConfig {
    return { ...this.config };
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  nextPage(): void {
    this.currentPage++;
    if (this.currentPage > this.totalPages) {
      this.totalPages = this.currentPage;
    }
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  canFitInPage(elementHeight: number, currentHeight: number): boolean {
    return currentHeight + elementHeight <= this.config.contentHeight;
  }
}
```

#### 3.4. Migrar Algoritmo Principal

**Crear archivo:** `src/lib/rapid-pdf/generator.ts`

```typescript
/**
 * Generator - Función principal de generación de PDFs
 * Migrado desde: js/app.js
 */

import fs from "fs/promises";
import path from "path";
import { getRenderEngine } from "./core/render-engine";
import { ElementProcessor } from "./core/element-processor";
import { PageManager } from "./core/page-manager";
import { PDFPayload, PDFGenerationResult, PDFGenerationOptions } from "./types";
import { HTMLBuilder } from "./helpers/html-builder";

/**
 * Genera un PDF desde un payload
 * Función principal del módulo
 */
export async function generatePDF(
  payload: PDFPayload,
  options: PDFGenerationOptions = {}
): Promise<PDFGenerationResult> {
  const startTime = Date.now();

  try {
    console.log("[generatePDF] Iniciando generación...");
    console.log("[generatePDF] Template:", payload.company.template);
    console.log("[generatePDF] Modo:", payload.mode || options.mode);

    // 1. Validar template
    const templatePath = path.join(
      process.cwd(),
      "src/lib/rapid-pdf/templates",
      payload.company.template
    );

    try {
      await fs.access(templatePath);
    } catch {
      return {
        success: false,
        error: `Template '${payload.company.template}' no encontrado`,
      };
    }

    // 2. Procesar elementos
    console.log("[generatePDF] Procesando elementos...");
    const elements = ElementProcessor.processPayload(payload);

    // 3. Configurar página
    const pageManager = new PageManager("A4");

    // 4. Construir HTML
    console.log("[generatePDF] Construyendo HTML...");
    const htmlBuilder = new HTMLBuilder(payload.company.template);
    const html = await htmlBuilder.build(payload, elements, pageManager);

    // Si modo desarrollo, retornar HTML
    const mode = payload.mode || options.mode || "produccion";
    if (mode === "desarrollo") {
      if (options.outputPath) {
        await fs.writeFile(options.outputPath, html, "utf-8");
        console.log("[generatePDF] HTML guardado:", options.outputPath);
      }

      return {
        success: true,
        filePath: options.outputPath,
        processingTime: Date.now() - startTime,
      };
    }

    // 5. Renderizar PDF con Puppeteer
    console.log("[generatePDF] Renderizando PDF con Puppeteer...");
    const engine = getRenderEngine();
    await engine.initialize();

    let pdfBuffer = await engine.renderHTMLToPDF(html, {
      format: "A4",
      margins: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    // 6. Aplicar metadatos
    console.log("[generatePDF] Aplicando metadatos...");
    pdfBuffer = await engine.applyMetadata(pdfBuffer, payload.pdf);

    // 7. Guardar o retornar
    if (options.outputPath) {
      await fs.writeFile(options.outputPath, pdfBuffer);
      console.log("[generatePDF] PDF guardado:", options.outputPath);
    }

    const processingTime = Date.now() - startTime;
    console.log("[generatePDF] ✅ Completado en", processingTime, "ms");

    return {
      success: true,
      filePath: options.outputPath,
      buffer: options.returnBuffer ? pdfBuffer : undefined,
      processingTime,
    };
  } catch (error) {
    console.error("[generatePDF] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Cierra recursos (llamar al finalizar la aplicación)
 */
export async function closePDFResources(): Promise<void> {
  const engine = getRenderEngine();
  await engine.close();
}
```

#### 3.5. Crear Helper de Construcción HTML

**Crear archivo:** `src/lib/rapid-pdf/helpers/html-builder.ts`

```typescript
/**
 * HTMLBuilder - Construye el HTML del documento
 */

import fs from "fs/promises";
import path from "path";
import { PDFPayload, ProcessedElement } from "../types";
import { PageManager } from "../core/page-manager";

export class HTMLBuilder {
  private templateId: string;
  private templatePath: string;

  constructor(templateId: string) {
    this.templateId = templateId;
    this.templatePath = path.join(
      process.cwd(),
      "src/lib/rapid-pdf/templates",
      templateId
    );
  }

  /**
   * Construye el HTML completo del documento
   */
  async build(
    payload: PDFPayload,
    elements: ProcessedElement[],
    pageManager: PageManager
  ): Promise<string> {
    // Cargar estilos CSS
    const styles = await this.loadStyles();

    // Construir body con elementos
    const body = await this.buildBody(payload, elements, pageManager);

    // Ensamblar HTML completo
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.pdf.title}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${body}
</body>
</html>
    `.trim();
  }

  /**
   * Carga todos los estilos CSS del template
   */
  private async loadStyles(): Promise<string> {
    const stylesPath = path.join(this.templatePath, "styles");

    try {
      const files = await fs.readdir(stylesPath);
      const cssFiles = files.filter((f) => f.endsWith(".css"));

      const styles = await Promise.all(
        cssFiles.map((file) =>
          fs.readFile(path.join(stylesPath, file), "utf-8")
        )
      );

      return styles.join("\n\n");
    } catch (error) {
      console.warn("[HTMLBuilder] No se pudieron cargar estilos:", error);
      return "";
    }
  }

  /**
   * Construye el body del documento con todos los elementos
   */
  private async buildBody(
    payload: PDFPayload,
    elements: ProcessedElement[],
    pageManager: PageManager
  ): Promise<string> {
    let html = "";

    for (const element of elements) {
      switch (element.type) {
        case "header":
          html += await this.renderHeader(payload.company, payload.pdf);
          break;

        case "summary":
          html += await this.renderSummary(payload.summary);
          break;

        case "budget-line":
          html += await this.renderBudgetLine(element.data);
          break;

        case "totals":
          html += await this.renderTotals(payload.summary.totals);
          break;

        case "conditions":
          html += await this.renderConditions(payload.conditions);
          break;
      }
    }

    return html;
  }

  // Métodos de renderizado por componente (adaptar según templates)

  private async renderHeader(company: any, pdf: any): Promise<string> {
    return `
      <div class="header">
        ${
          company.logo
            ? `<img src="${company.logo}" alt="Logo" class="logo">`
            : ""
        }
        <div class="company-info">
          <h1>${company.name}</h1>
          <p>NIF: ${company.nif}</p>
          <p>${company.address}</p>
          <p>${company.contact}</p>
        </div>
        <div class="pdf-info">
          <h2>${pdf.title}</h2>
        </div>
      </div>
    `;
  }

  private async renderSummary(summary: any): Promise<string> {
    return `
      <div class="summary">
        <h2>${summary.title}</h2>
        <div class="client-info">
          <h3>Cliente</h3>
          <p>${summary.client.name}</p>
          <p>NIF: ${summary.client.nif_nie}</p>
          <p>${summary.client.address}</p>
          <p>${summary.client.contact}</p>
          <p>Fecha: ${summary.client.budget_date}</p>
          <p>Validez: ${summary.client.validity} días</p>
        </div>
        ${summary.note ? `<div class="note">${summary.note}</div>` : ""}
      </div>
    `;
  }

  private async renderBudgetLine(line: any): Promise<string> {
    const indent =
      line.level === "chapter" ? 0 : line.level === "subchapter" ? 20 : 40;

    return `
      <div class="budget-line level-${
        line.level
      }" style="margin-left: ${indent}px">
        <span class="id">${line.id}</span>
        <span class="name">${line.name}</span>
        ${line.amount ? `<span class="amount">${line.amount}</span>` : ""}
      </div>
    `;
  }

  private async renderTotals(totals: any): Promise<string> {
    let html = '<div class="totals">';

    if (totals.subtotal) {
      html += `<div class="total-line"><span>${totals.subtotal.name}</span><span>${totals.subtotal.amount}</span></div>`;
    }

    html += `<div class="total-line"><span>${totals.base.name}</span><span>${totals.base.amount}</span></div>`;

    totals.ivas.forEach((iva: any) => {
      html += `<div class="total-line"><span>${iva.name}</span><span>${iva.amount}</span></div>`;
    });

    if (totals.irpf) {
      html += `<div class="total-line"><span>${totals.irpf.name}</span><span>${totals.irpf.amount}</span></div>`;
    }

    if (totals.re && totals.re.length > 0) {
      totals.re.forEach((re: any) => {
        html += `<div class="total-line"><span>${re.name}</span><span>${re.amount}</span></div>`;
      });
    }

    html += `<div class="total-line total-final"><span>${totals.total.name}</span><span>${totals.total.amount}</span></div>`;
    html += "</div>";

    return html;
  }

  private async renderConditions(conditions: any): Promise<string> {
    return `
      <div class="conditions">
        <h2>${conditions.title}</h2>
        <div class="note">${conditions.note}</div>
      </div>
    `;
  }
}
```

**NOTA:** Este helper es una implementación básica. Revisar código original de templates para copiar lógica exacta de renderizado.

---

### ✅ FASE 4: Migración de Templates (3-4 horas)

#### 4.1. Copiar Template

```bash
cd /Users/josius/Documents/proy/jeyca-presu

# Copiar template completo desde Rapid-PDF
cp -r {ubicacion-rapid-pdf}/template/color src/lib/rapid-pdf/templates/default

# O si el template se llama "bn"
cp -r {ubicacion-rapid-pdf}/template/bn src/lib/rapid-pdf/templates/default

# Verificar estructura copiada
ls -la src/lib/rapid-pdf/templates/default/
```

#### 4.2. Convertir Componentes JS a TypeScript (Opcional)

Si los componentes del template están en JavaScript y quieres TypeScript:

```bash
cd src/lib/rapid-pdf/templates/default

# Renombrar archivos .js a .ts
find components -name "*.js" -exec bash -c 'mv "$0" "${0%.js}.ts"' {} \;

# Revisar y añadir tipos TypeScript manualmente
```

**Ejemplo de conversión:**

```javascript
// ANTES (JavaScript): components/header.js
class Header {
  constructor(data) {
    this.data = data;
  }

  render() {
    return `<div>${this.data.name}</div>`;
  }
}

module.exports = Header;
```

```typescript
// DESPUÉS (TypeScript): components/header.ts
interface HeaderData {
  name: string;
  logo?: string;
}

export class Header {
  private data: HeaderData;

  constructor(data: HeaderData) {
    this.data = data;
  }

  render(): string {
    return `<div>${this.data.name}</div>`;
  }
}
```

#### 4.3. Actualizar Rutas de Assets

Si hay rutas absolutas a assets, actualizarlas:

```typescript
// Antes:
logo: "/assets/logo.png";

// Después:
logo: "/lib/rapid-pdf/templates/default/assets/logo.png";
```

#### 4.4. Crear Estilos Base

**Crear archivo:** `src/lib/rapid-pdf/templates/default/styles/base.css`

```css
/* Estilos base del template */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
  color: #333;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000;
}

.header .logo {
  max-width: 150px;
  height: auto;
}

.header .company-info {
  flex: 1;
  padding: 0 20px;
}

.header .pdf-info {
  text-align: right;
}

/* Summary */
.summary {
  margin-bottom: 30px;
}

.summary .client-info {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
}

/* Budget lines */
.budget-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.budget-line.level-chapter {
  font-weight: bold;
  font-size: 12pt;
  border-bottom: 2px solid #333;
  margin-top: 15px;
}

.budget-line.level-subchapter {
  font-weight: 600;
  font-size: 11pt;
}

.budget-line .id {
  width: 80px;
}

.budget-line .name {
  flex: 1;
}

.budget-line .amount {
  width: 120px;
  text-align: right;
}

/* Totals */
.totals {
  margin-top: 30px;
  padding: 20px;
  background: #f9f9f9;
  border: 1px solid #ddd;
}

.totals .total-line {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.totals .total-final {
  font-weight: bold;
  font-size: 12pt;
  border-top: 2px solid #000;
  margin-top: 10px;
  padding-top: 10px;
}

/* Conditions */
.conditions {
  margin-top: 40px;
  page-break-before: auto;
}

.conditions h2 {
  font-size: 12pt;
  margin-bottom: 15px;
}

.conditions .note {
  white-space: pre-wrap;
  line-height: 1.6;
}

/* Print-specific */
@media print {
  body {
    margin: 0;
  }

  .page-break {
    page-break-before: always;
  }
}
```

---

### ✅ FASE 5: Integración con Server Action (1-2 horas)

#### 5.1. Actualizar Server Action

**Editar archivo:** `src/app/actions/budgets.ts`

**ANTES (con API externa):**

```typescript
// Líneas ~1097-1354 (aproximadamente)
export async function generateBudgetPDF(budgetId: string) {
  // ... código de autenticación y obtención de datos ...

  // Construir payload
  const payload = buildPDFPayload(budgetTyped, tariffTyped);

  // Llamar a API externa (ELIMINAR ESTO)
  const response = await fetch(`${RAPID_PDF_URL}/generate_document`, {
    method: "POST",
    headers: {
      "x-api-key": RAPID_PDF_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Descargar PDF
  const pdfBuffer = await response.arrayBuffer();

  // ... guardar en Storage ...
}
```

**DESPUÉS (con módulo interno):**

```typescript
// Añadir import al inicio del archivo
import { generatePDF } from "@/lib/rapid-pdf";
import path from "path";
import { randomUUID } from "crypto";

export async function generateBudgetPDF(budgetId: string): Promise<{
  success: boolean;
  pdf_url?: string;
  error?: string;
}> {
  try {
    log.info(
      "[generateBudgetPDF] Iniciando generación PDF para budget:",
      budgetId
    );

    // ... código de autenticación existente ...
    // ... obtención de budget + tariff ...
    // ... validaciones de seguridad ...

    // 1. Construir payload (sin cambios)
    log.info("[generateBudgetPDF] Construyendo payload...");
    const payload = buildPDFPayload(budgetTyped, tariffTyped);

    // 2. Definir ruta temporal para el PDF
    const tempDir = path.join(process.cwd(), "temp", "pdfs");
    await fs.mkdir(tempDir, { recursive: true });

    const tempFileName = `budget-${budgetId}-${randomUUID()}.pdf`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // 3. Generar PDF con módulo interno (NUEVO)
    log.info("[generateBudgetPDF] Generando PDF con módulo interno...");

    const result = await generatePDF(payload, {
      outputPath: tempFilePath,
      mode: "produccion",
    });

    if (!result.success) {
      log.error("[generateBudgetPDF] Error generando PDF:", result.error);
      return { success: false, error: result.error };
    }

    log.info(
      "[generateBudgetPDF] PDF generado exitosamente en",
      result.processingTime,
      "ms"
    );

    // 4. Leer archivo generado
    const pdfBuffer = await fs.readFile(tempFilePath);

    // 5. Subir a Supabase Storage (sin cambios en esta parte)
    const now = new Date();
    const datePart = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const timestamp = `${datePart}_${timePart}`;

    const clientName = sanitizeFilename(budgetTyped.client_name);
    const clientNif = sanitizeFilename(budgetTyped.client_nif_nie || "sin_nif");
    const filename = `presupuesto_${clientName}_${clientNif}_${timestamp}.pdf`;

    const storagePath = `${budgetTyped.company_id}/${filename}`;

    log.info("[generateBudgetPDF] Subiendo a Storage:", storagePath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("budget-pdfs")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      log.error("[generateBudgetPDF] Error subiendo a Storage:", uploadError);
      return { success: false, error: "Error guardando PDF en Storage" };
    }

    // 6. Limpiar archivo temporal
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      log.warn(
        "[generateBudgetPDF] No se pudo limpiar archivo temporal:",
        cleanupError
      );
    }

    // 7. Actualizar pdf_url en budgets (sin cambios)
    const { error: updateError } = await supabaseAdmin
      .from("redpresu_budgets")
      .update({ pdf_url: storagePath })
      .eq("id", budgetId);

    if (updateError) {
      log.error("[generateBudgetPDF] Error actualizando pdf_url:", updateError);
      await supabaseAdmin.storage.from("budget-pdfs").remove([storagePath]);
      return { success: false, error: "Error actualizando presupuesto" };
    }

    log.info(
      "[generateBudgetPDF] ✅ PDF generado y guardado exitosamente:",
      storagePath
    );
    revalidatePath("/budgets");

    // Generar signed URL para retornar al cliente
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from("budget-pdfs")
      .createSignedUrl(storagePath, 3600);

    return {
      success: true,
      pdf_url: signedUrlData?.signedUrl || storagePath,
    };
  } catch (error) {
    const sanitized = sanitizeError(error, {
      context: "generateBudgetPDF",
      category: "pdf_generation",
      metadata: { budgetId },
    });
    return { success: false, error: sanitized.userMessage };
  }
}
```

**Cambios clave:**

- ✅ Reemplazar `fetch()` por `import { generatePDF }`
- ✅ Crear directorio temporal `temp/pdfs/`
- ✅ Generar PDF directamente con módulo
- ✅ Limpiar archivo temporal después de subir a Storage
- ✅ Mantener toda la lógica de seguridad y Storage

#### 5.2. Actualizar Helper de Payload (Opcional)

Si quieres optimizar el payload para TypeScript:

**Editar archivo:** `src/lib/helpers/pdf-payload-builder.ts`

```typescript
// Añadir import de tipos
import type { PDFPayload } from "@/lib/rapid-pdf/types";

export function buildPDFPayload(budget: Budget, tariff: Tariff): PDFPayload {
  // ... código existente ...

  // Asegurar que retorna tipo PDFPayload correcto
  const payload: PDFPayload = {
    mode: "produccion",
    company: {
      // ... datos existentes ...
    },
    pdf: {
      // ... datos existentes ...
    },
    summary: {
      // ... datos existentes ...
    },
    budget: {
      // ... datos existentes ...
    },
    conditions: {
      // ... datos existentes ...
    },
  };

  return payload;
}
```

#### 5.3. Eliminar Variables de Entorno Obsoletas

**Editar archivo:** `.env.local`

```bash
# ELIMINAR (ya no se necesitan):
# RAPID_PDF_URL=http://localhost:3001
# RAPID_PDF_API_KEY=rapid-pdf-secret-key-2025

# El resto de variables se mantienen igual
```

---

### ✅ FASE 6: Testing y Validación (2-3 horas)

#### 6.1. Test Unitario del Módulo

**Crear archivo:** `src/lib/rapid-pdf/__tests__/generator.test.ts`

```typescript
import { generatePDF } from "../generator";
import { PDFPayload } from "../types";
import fs from "fs/promises";
import path from "path";

describe("Rapid-PDF Generator", () => {
  const mockPayload: PDFPayload = {
    mode: "produccion",
    company: {
      logo: "",
      name: "Test Empresa S.L.",
      nif: "B12345678",
      address: "Calle Test 123",
      contact: "test@test.com",
      template: "default",
      styles: [{ primary_color: "#e8951c" }, { secondary_color: "#109c61" }],
    },
    pdf: {
      title: "Test PDF",
      author: "Test",
      subject: "Testing",
      creator: "app server rapidPDF",
      keywords: "test",
    },
    summary: {
      title: "Resumen",
      client: {
        name: "Cliente Test",
        nif_nie: "12345678A",
        address: "Dirección test",
        contact: "cliente@test.com",
        budget_date: "22-04-2025",
        validity: "30",
      },
      note: "",
      levels: [],
      totals: {
        base: { name: "Base Imponible", amount: "1.000,00 €" },
        ivas: [{ name: "21,00% IVA", amount: "210,00 €" }],
        total: { name: "TOTAL", amount: "1.210,00 €" },
      },
    },
    budget: {
      title: "Presupuesto",
      levels: [],
    },
    conditions: {
      title: "Condiciones",
      note: "Condiciones de prueba",
    },
  };

  afterAll(async () => {
    // Limpiar archivos de test
    const testFile = path.join(process.cwd(), "temp", "test-output.pdf");
    try {
      await fs.unlink(testFile);
    } catch {}
  });

  it("debe generar PDF correctamente", async () => {
    const outputPath = path.join(process.cwd(), "temp", "test-output.pdf");

    const result = await generatePDF(mockPayload, {
      outputPath,
      mode: "produccion",
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(outputPath);
    expect(result.processingTime).toBeGreaterThan(0);

    // Verificar que el archivo existe
    const stats = await fs.stat(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  }, 30000); // 30s timeout

  it("debe generar HTML en modo desarrollo", async () => {
    const outputPath = path.join(process.cwd(), "temp", "test-output.html");

    const result = await generatePDF(mockPayload, {
      outputPath,
      mode: "desarrollo",
    });

    expect(result.success).toBe(true);

    // Verificar que el HTML existe
    const html = await fs.readFile(outputPath, "utf-8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test Empresa S.L.");
  });

  it("debe manejar errores de template no encontrado", async () => {
    const invalidPayload = {
      ...mockPayload,
      company: {
        ...mockPayload.company,
        template: "template-inexistente",
      },
    };

    const result = await generatePDF(invalidPayload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("no encontrado");
  });
});
```

#### 6.2. Test de Integración con Server Action

**Crear presupuesto de test y generar PDF desde la interfaz:**

```bash
# 1. Iniciar servidor de desarrollo
cd /Users/josius/Documents/proy/jeyca-presu
npm run dev

# 2. Desde la interfaz web:
# - Ir a /budgets
# - Seleccionar un presupuesto existente
# - Hacer clic en "Generar PDF"
# - Verificar que se descarga correctamente
```

**Checklist de validaciones:**

```
FUNCIONALIDAD BÁSICA:
[ ] Módulo rapid-pdf se importa correctamente
[ ] generatePDF() se ejecuta sin errores
[ ] PDF se genera en tiempo < 15 segundos
[ ] Archivo PDF es válido y se abre correctamente

FORMATO Y CONTENIDO:
[ ] Logo aparece (si está configurado)
[ ] Datos de empresa correctos
[ ] Datos de cliente correctos
[ ] Tabla de presupuesto con jerarquía
[ ] Totales correctos
[ ] Formato español: 1.234,56 €
[ ] IRPF se muestra si aplica
[ ] Recargo Equivalencia se muestra si aplica

INTEGRACIÓN:
[ ] Server Action llama al módulo correctamente
[ ] PDF se sube a Supabase Storage
[ ] pdf_url se actualiza en BD
[ ] Usuario recibe signed URL válida
[ ] Archivo temporal se limpia

PERFORMANCE:
[ ] Generación < 15 segundos
[ ] Uso de memoria normal (< 1GB)
[ ] Sin memory leaks (probar 10 PDFs consecutivos)
[ ] Instancia de Puppeteer se reutiliza

ERRORES Y EDGE CASES:
[ ] Error si template no existe
[ ] Error si payload inválido
[ ] Timeout si Puppeteer falla
[ ] Cleanup de recursos si hay error
```

#### 6.3. Test de Performance

```bash
# Crear script de test de carga
cat > test-pdf-performance.ts << 'EOF'
import { generatePDF } from './src/lib/rapid-pdf';
import { mockPayload } from './src/lib/rapid-pdf/__tests__/fixtures';

async function testPerformance() {
  const iterations = 10;
  const times: number[] = [];

  console.log(`\nGenerando ${iterations} PDFs...`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    const result = await generatePDF(mockPayload, {
      outputPath: `temp/test-${i}.pdf`,
    });

    const time = Date.now() - start;
    times.push(time);

    console.log(`[${i + 1}/${iterations}] ${time}ms - ${result.success ? '✅' : '❌'}`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log('\n=== RESULTADOS ===');
  console.log(`Promedio: ${avg.toFixed(0)}ms`);
  console.log(`Mínimo: ${min}ms`);
  console.log(`Máximo: ${max}ms`);
}

testPerformance();
EOF

# Ejecutar test
npx ts-node test-pdf-performance.ts
```

**Resultados esperados:**

- Promedio: < 10 segundos
- Sin errores de memoria
- Puppeteer se reutiliza correctamente

---

### ✅ FASE 7: Documentación y Cleanup (1-2 horas)

#### 7.1. Actualizar `arquitectura.md`

**Añadir sección:**

```markdown
---

## 📦 Módulo Rapid-PDF (Interno)

### Arquitectura

**Tipo:** Módulo interno de jeyca-presu
**Ubicación:** `src/lib/rapid-pdf/`
**Tecnología:** TypeScript + Puppeteer 24.10

### Estructura del Módulo
```

src/lib/rapid-pdf/
├── index.ts # Exportación principal
├── generator.ts # Función generatePDF()
├── core/
│ ├── render-engine.ts # Gestión de Puppeteer
│ ├── element-processor.ts # Procesamiento de datos
│ └── page-manager.ts # Paginación
├── helpers/
│ └── html-builder.ts # Construcción de HTML
├── templates/
│ └── default/ # Template predeterminado
│ ├── components/
│ ├── styles/
│ └── assets/
└── types/
└── index.ts # Tipos TypeScript

```

### Flujo de Generación

```

Server Action (budgets.ts)
↓
generateBudgetPDF(budgetId)
↓
buildPDFPayload(budget, tariff) → PDFPayload
↓
import { generatePDF } from '@/lib/rapid-pdf'
↓
generatePDF(payload, options)
├─→ ElementProcessor.processPayload()
├─→ HTMLBuilder.build()
├─→ RenderEngine.renderHTMLToPDF()
└─→ RenderEngine.applyMetadata()
↓
PDF Buffer
↓
Guardar en temp/ → Subir a Storage → Limpiar temp
↓
Retornar signed URL

````

### Ventajas de la Migración

**Antes (API Externa):**
- ❌ Dependencia de servicio externo
- ❌ Latencia de red
- ❌ Necesita autenticación
- ❌ Costos de API (potencial)
- ❌ Más puntos de fallo

**Después (Módulo Interno):**
- ✅ Sin dependencias externas
- ✅ Ejecución directa (más rápido)
- ✅ Sin autenticación necesaria
- ✅ Sin costos adicionales
- ✅ Más control y debugging
- ✅ Tipos TypeScript nativos

### Componentes Clave

#### RenderEngine
- Singleton de Puppeteer para reutilizar navegador
- Renderiza HTML → PDF con configuración A4
- Aplica metadatos al PDF generado
- Gestión optimizada de memoria

#### ElementProcessor
- Procesa payload y genera elementsData
- Identifica elementos divisibles para paginación
- Mapea datos de presupuesto a formato de template

#### HTMLBuilder
- Construye HTML completo del documento
- Carga estilos CSS del template
- Renderiza componentes (header, summary, budget, totals)
- Gestiona jerarquía de elementos

#### PageManager
- Configuración de página (A4, márgenes)
- Tracking de páginas y espacios
- Cálculos para saltos de página

### Performance

- **Generación típica:** 5-10 segundos
- **Uso de memoria:** < 1GB (con Puppeteer)
- **Reutilización de navegador:** Sí (singleton)
- **Cleanup automático:** Archivos temporales eliminados

### Mantenimiento

**Actualizar templates:**
```bash
# Editar componentes
vi src/lib/rapid-pdf/templates/default/components/*.ts

# Actualizar estilos
vi src/lib/rapid-pdf/templates/default/styles/*.css
````

**Debugging:**

```typescript
// Habilitar modo desarrollo para ver HTML
const result = await generatePDF(payload, {
  mode: "desarrollo",
  outputPath: "temp/debug.html",
});
```

**Logs:**

```bash
# Ver logs de generación
grep "\[generatePDF\]" logs/app.log
grep "\[RenderEngine\]" logs/app.log
```

---

````

#### 7.2. Crear README del Módulo

**Crear archivo:** `src/lib/rapid-pdf/README.md`

```markdown
# 📦 Módulo Rapid-PDF

Motor de generación de PDFs empresariales integrado en jeyca-presu.

## Uso

### Generar PDF desde Server Action

```typescript
import { generatePDF } from '@/lib/rapid-pdf';

export async function generateBudgetPDF(budgetId: string) {
  const payload = buildPDFPayload(budget, tariff);

  const result = await generatePDF(payload, {
    outputPath: '/path/to/output.pdf',
    mode: 'produccion'
  });

  if (result.success) {
    console.log('PDF generado:', result.filePath);
  } else {
    console.error('Error:', result.error);
  }
}
````

### Generar HTML (debugging)

```typescript
const result = await generatePDF(payload, {
  outputPath: "temp/debug.html",
  mode: "desarrollo",
});
```

### Obtener Buffer en memoria

```typescript
const result = await generatePDF(payload, {
  returnBuffer: true,
  mode: "produccion",
});

if (result.success && result.buffer) {
  // Usar buffer directamente
  await uploadToStorage(result.buffer);
}
```

## Estructura del Payload

Ver tipos completos en `types/index.ts`.

```typescript
interface PDFPayload {
  mode: "desarrollo" | "produccion";
  company: CompanyData;
  pdf: PDFMetadata;
  summary: SummaryData;
  budget: BudgetData;
  conditions: ConditionsData;
}
```

## Templates

Template predeterminado: `default`

### Estructura de Template

```
templates/default/
├── components/       # Componentes de renderizado
│   ├── header.ts
│   ├── summary.ts
│   ├── budget-line.ts
│   └── totals.ts
├── styles/           # Estilos CSS
│   ├── base.css
│   └── components.css
└── assets/           # Recursos (logos, etc)
```

### Crear Nuevo Template

1. Copiar template default
2. Modificar componentes y estilos
3. Usar template ID en payload: `company.template = "mi-template"`

## Performance

- Primera generación: ~10-15s (inicializa Puppeteer)
- Generaciones siguientes: ~5-10s (reutiliza navegador)
- Recomendación: Mantener Puppeteer en singleton

## Troubleshooting

### Error "Template not found"

```bash
# Verificar que existe el template
ls -la src/lib/rapid-pdf/templates/{template-id}/
```

### Error "Puppeteer timeout"

```typescript
// Aumentar timeout en RenderEngine
await page.setContent(html, {
  waitUntil: "networkidle0",
  timeout: 60000, // Aumentar a 60s
});
```

### Memory leak

```bash
# Verificar que el navegador se cierra
# En generator.ts, asegurar que se llama:
await engine.close();
```

## Testing

```bash
# Unit tests
npm test src/lib/rapid-pdf

# Test de integración
npm run test:integration
```

## Migración desde API Externa

Este módulo reemplaza la integración con Rapid-PDF API externa.

**Cambios realizados:**

- ✅ Eliminado `fetch(RAPID_PDF_URL)`
- ✅ Añadido `import { generatePDF }`
- ✅ Eliminadas variables de entorno de API
- ✅ Payload optimizado con tipos TypeScript

---

**Versión:** 1.0
**Última actualización:** 2025-01-22

````

#### 7.3. Eliminar Código Obsoleto

```bash
cd /Users/josius/Documents/proy/jeyca-presu

# Buscar referencias obsoletas a API externa
grep -r "RAPID_PDF_URL" src/
grep -r "RAPID_PDF_API_KEY" src/
grep -r "rapid-pdf-secret-key" src/

# Si hay referencias, eliminarlas manualmente
````

**Eliminar variables de entorno:**

```bash
# Editar .env.local
# Eliminar líneas:
# RAPID_PDF_URL=...
# RAPID_PDF_API_KEY=...
```

#### 7.4. Commit de Migración

```bash
cd /Users/josius/Documents/proy/jeyca-presu

git add src/lib/rapid-pdf/
git add src/app/actions/budgets.ts
git add src/lib/helpers/pdf-payload-builder.ts
git add package.json package-lock.json
git add .env.local
git add arquitectura.md

git commit -m "feat(pdf): migrar Rapid-PDF a módulo interno

- Integrar motor de Rapid-PDF como módulo TypeScript en src/lib/rapid-pdf/
- Componentes core: RenderEngine, ElementProcessor, PageManager, HTMLBuilder
- Templates migrados desde Rapid-PDF original
- Reemplazar integración API externa por llamada directa al módulo
- Añadir Puppeteer como dependencia (generación PDF)
- Optimizar payload con tipos TypeScript
- Eliminar dependencia de API externa (sin fetch, sin autenticación)
- Archivos temporales en temp/ con cleanup automático
- Tests unitarios y de integración
- Performance: 5-10s por PDF (navegador reutilizable)

BREAKING CHANGES:
- Eliminadas variables de entorno RAPID_PDF_URL y RAPID_PDF_API_KEY
- Payload ahora usa tipos TypeScript estrictos

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ CHECKLIST FINAL DE ENTREGA

### Infraestructura

- [ ] Módulo creado en `src/lib/rapid-pdf/`
- [ ] Dependencias instaladas (puppeteer, jsdom, pdf-lib)
- [ ] Estructura de directorios completa
- [ ] Templates migrados

### Core

- [ ] RenderEngine migrado y funcional
- [ ] ElementProcessor migrado y funcional
- [ ] PageManager migrado y funcional
- [ ] HTMLBuilder implementado
- [ ] generator.ts con función principal

### Integración

- [ ] Server Action actualizado
- [ ] Import de módulo correcto
- [ ] Sin referencias a API externa
- [ ] Variables de entorno limpiadas

### Funcionalidad

- [ ] PDFs se generan correctamente
- [ ] Formato español correcto
- [ ] IRPF y RE funcionan
- [ ] Logos aparecen
- [ ] Templates operativos

### Performance

- [ ] Generación < 15 segundos
- [ ] Sin memory leaks
- [ ] Puppeteer se reutiliza
- [ ] Cleanup de archivos temporales

### Testing

- [ ] Tests unitarios pasando
- [ ] Tests de integración OK
- [ ] Test desde interfaz OK
- [ ] Test de performance OK

### Documentación

- [ ] arquitectura.md actualizado
- [ ] README del módulo creado
- [ ] Tipos TypeScript completos
- [ ] Comentarios en código

### Cleanup

- [ ] Código obsoleto eliminado
- [ ] Variables de entorno limpiadas
- [ ] Sin referencias a API externa
- [ ] Commit realizado

---

## 🎯 CRITERIOS DE ÉXITO

La tarea se considera **completada exitosamente** cuando:

### Mínimos (obligatorios):

- ✅ Módulo rapid-pdf funcional en `src/lib/rapid-pdf/`
- ✅ PDFs generados correctamente sin API externa
- ✅ Performance < 15 segundos por PDF
- ✅ Tipos TypeScript completos
- ✅ Tests básicos pasando

### Deseables (recomendados):

- ✅ Puppeteer optimizado (singleton)
- ✅ Cleanup automático de temporales
- ✅ Documentación completa
- ✅ Sin memory leaks
- ✅ IRPF y RE funcionando

### Opcionales (nice-to-have):

- 🎯 Múltiples templates
- 🎯 Cache de navegador Puppeteer
- 🎯 Modo batch para múltiples PDFs
- 🎯 Compresión de PDFs generados

---

## 📅 ESTIMACIÓN TEMPORAL

| Fase       | Duración        | Descripción                            |
| ---------- | --------------- | -------------------------------------- |
| **Fase 1** | 2-3 horas       | Análisis del código de Rapid-PDF       |
| **Fase 2** | 2-3 horas       | Setup del módulo en jeyca-presu        |
| **Fase 3** | 6-8 horas       | Migración del core (RenderEngine, etc) |
| **Fase 4** | 3-4 horas       | Migración de templates                 |
| **Fase 5** | 1-2 horas       | Integración con Server Action          |
| **Fase 6** | 2-3 horas       | Testing y validación                   |
| **Fase 7** | 1-2 horas       | Documentación y cleanup                |
| **TOTAL**  | **17-25 horas** | ~3-4 días de trabajo                   |

---

## 🚨 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema 1: Puppeteer no funciona en Next.js

**Error:**

```
Error: Failed to launch the browser process
```

**Solución:**

```bash
# Instalar dependencias de Chrome (Ubuntu/Debian)
sudo apt-get install -y \
  ca-certificates fonts-liberation \
  libappindicator3-1 libasound2 libatk-bridge2.0-0 \
  libdrm2 libgtk-3-0 libnspr4 libnss3 libxss1 \
  libxtst6 lsb-release xdg-utils

# Actualizar args de Puppeteer
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage'
]
```

---

### Problema 2: Out of memory con Puppeteer

**Error:**

```
JavaScript heap out of memory
```

**Solución:**

```bash
# Aumentar heap size de Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# O en package.json:
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"

# Asegurar que se cierra el navegador
await engine.close();
```

---

### Problema 3: Templates no se cargan

**Error:**

```
Template 'default' no encontrado
```

**Solución:**

```bash
# Verificar ruta correcta
ls -la src/lib/rapid-pdf/templates/default/

# Verificar que se copió el template completo
ls -la src/lib/rapid-pdf/templates/default/components/
ls -la src/lib/rapid-pdf/templates/default/styles/

# Revisar path en generator.ts
const templatePath = path.join(
  process.cwd(),
  'src/lib/rapid-pdf/templates',
  payload.company.template
);
```

---

### Problema 4: Estilos CSS no se aplican

**Síntomas:**

- PDF sin formato
- Tabla sin bordes
- Colores incorrectos

**Solución:**

```typescript
// En HTMLBuilder, asegurar que se cargan estilos
const styles = await this.loadStyles();

// Verificar que Puppeteer imprime backgrounds
await page.pdf({
  format: 'A4',
  printBackground: true,  // CRÍTICO
  margin: { ... }
});
```

---

### Problema 5: Imágenes (logos) no aparecen

**Causa:**

- Rutas relativas no resueltas
- Logo no accesible desde Puppeteer

**Solución:**

```typescript
// Opción A: Usar data URLs (base64)
const logoBase64 = await fs.readFile(logoPath, "base64");
const logoDataUrl = `data:image/png;base64,${logoBase64}`;

// Opción B: Asegurar ruta absoluta
const logoAbsolutePath = path.join(process.cwd(), "public", logoPath);
```

---

## 📝 NOTAS FINALES

### Importante:

1. **Revisar código original de Rapid-PDF**: Este prompt es una guía general. Debes copiar la lógica específica de cada componente del código original.

2. **Tipos TypeScript**: Los tipos proporcionados son básicos. Ajusta según la estructura real del payload.

3. **Templates**: La implementación de HTMLBuilder es simplificada. Adapta según los componentes reales de tus templates.

4. **Performance**: Puppeteer es pesado (~300MB). Considerar alternativas más ligeras si es crítico.

5. **Serverless**: Si despliegas en Vercel/Netlify, Puppeteer puede tener limitaciones. Considerar usar servicio externo en ese caso.

### Próximos Pasos (Post-Migración):

- Monitorear uso de memoria en producción
- Optimizar templates para reducir tamaño de PDFs
- Considerar cache de navegador Puppeteer
- Implementar cola para generaciones masivas
- Añadir watermarks o protección a PDFs

---

**FIN DEL PROMPT**

---

**Versión:** 1.0
**Fecha:** 2025-01-22
**Autor:** Claude Code
**Proyecto:** jeyca-presu (Fase 2)
**Tipo:** Migración de API a Módulo Interno
