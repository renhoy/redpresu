/**
 * Generator - Función principal de generación de PDFs
 * Migrado desde: js/app.js
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  PDFPayload,
  PDFGenerationResult,
  PDFGenerationOptions,
  StructureData,
  ProcessedElement,
} from "./types";
import { PageManager } from "./core/page-manager";
import { ElementProcessor } from "./core/element-processor";
import { RenderEngine, getRenderEngine } from "./core/render-engine";

/**
 * Genera un PDF desde un payload
 * Función principal del módulo
 */
export async function generatePDF(
  payload: PDFPayload,
  options: PDFGenerationOptions = {}
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  let renderEngine: RenderEngine | null = null;

  try {
    console.log("[generatePDF] Iniciando generación...");
    console.log("[generatePDF] Template:", payload.company.template);
    console.log("[generatePDF] Modo:", payload.mode || options.mode);

    // 1. VALIDAR TEMPLATE
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
        error: `Template '${payload.company.template}' no encontrado en ${templatePath}`,
      };
    }

    // 2. CARGAR STRUCTURE DATA
    const structureData = await loadStructureData(payload.company.template);

    // 3. INICIALIZAR MÓDULOS
    const pageManager = new PageManager();
    const elementProcessor = new ElementProcessor();
    renderEngine = getRenderEngine(pageManager);

    // Configurar página
    const pageConfig = extractPageConfig(structureData);
    pageManager.config(pageConfig);

    // Configurar RenderEngine
    renderEngine.setBudgetData(payload);
    renderEngine.setStructureData(structureData);

    // Inicializar ElementProcessor
    elementProcessor.init(payload, structureData);

    // 4. GENERAR ELEMENTS DATA
    console.log("[generatePDF] Generando elementsData...");
    const elementsData = await elementProcessor.generateElementsData();

    // 5. CALCULAR ALTURAS REALES
    console.log("[generatePDF] Calculando alturas...");
    await renderEngine.initTemporaryPage();

    for (const sectionData of elementsData) {
      for (const areaData of sectionData) {
        for (const element of areaData) {
          element.height = await renderEngine.measureElementHeight(element);
        }
      }
    }

    // Calcular margin_bottom_total
    calculateMarginBottomTotal(elementsData, structureData);

    await renderEngine.destroyTemporaryPage();

    // 6. RENDERIZAR DOCUMENTO
    console.log("[generatePDF] Renderizando documento...");
    const finalHTML = await renderDocument(
      renderEngine,
      elementsData,
      structureData,
      pageManager
    );

    // 7. DECIDIR MODO DE SALIDA
    const mode = payload.mode || options.mode || "produccion";

    if (mode === "desarrollo") {
      // Modo desarrollo: guardar HTML
      if (options.outputPath) {
        await fs.writeFile(options.outputPath, finalHTML, "utf-8");
        console.log("[generatePDF] HTML guardado:", options.outputPath);
      }

      return {
        success: true,
        filePath: options.outputPath,
        processingTime: Date.now() - startTime,
      };
    } else {
      // Modo producción: generar PDF
      console.log("[generatePDF] Generando PDF con Puppeteer...");
      const pdfBuffer = await renderEngine.generatePDFFromSavedHTML(finalHTML);

      // Guardar PDF si se especificó outputPath
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
    }
  } catch (error) {
    console.error("[generatePDF] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  } finally {
    // Cerrar Puppeteer si fue inicializado
    if (renderEngine) {
      await renderEngine.close();
    }
  }
}

/**
 * Cierra recursos (llamar al finalizar la aplicación)
 */
export async function closePDFResources(): Promise<void> {
  const pageManager = new PageManager();
  const engine = getRenderEngine(pageManager);
  await engine.close();
}

/**
 * Carga el archivo structure.json del template
 */
async function loadStructureData(templateId: string): Promise<StructureData> {
  const structurePath = path.join(
    process.cwd(),
    "src/lib/rapid-pdf/templates",
    templateId,
    "json",
    "structure.json"
  );

  try {
    await fs.access(structurePath);
    const structureContent = await fs.readFile(structurePath, "utf8");
    return JSON.parse(structureContent);
  } catch (error) {
    throw new Error(
      `ERROR: Archivo structure.json no encontrado en: ${structurePath}`
    );
  }
}

/**
 * Extrae configuración de página desde structureData
 */
function extractPageConfig(structureData: StructureData) {
  const pageData = structureData.document.page || {};
  return {
    content_bottom: pageData.content_bottom || 900,
    margins: {
      top: pageData.margins?.top || 40,
      bottom: pageData.margins?.bottom || 40,
      left: pageData.margins?.left || 54,
      right: pageData.margins?.right || 54,
    },
    general_margin: pageData.general_margin || 1,
  };
}

/**
 * Calcula margin_bottom_total para cada elemento
 */
function calculateMarginBottomTotal(
  elementsData: ProcessedElement[][][],
  structureData: StructureData
): void {
  const generalMargin = structureData.document.page?.general_margin || 0;

  for (const sectionData of elementsData) {
    for (const areaData of sectionData) {
      const componentGroups = new Map<string, ProcessedElement[]>();

      // Agrupar elementos por componente
      for (const element of areaData) {
        if (!componentGroups.has(element.component)) {
          componentGroups.set(element.component, []);
        }
        componentGroups.get(element.component)!.push(element);
      }

      // Actualizar margen del último elemento de cada componente
      for (const [componentName, elements] of componentGroups) {
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const isLastElement = i === elements.length - 1;

          if (isLastElement) {
            const componentConfig =
              structureData.document.components[componentName]?.config || {};
            const marginBottom = componentConfig.margin_bottom || 0;
            element.margin_bottom_total = generalMargin + marginBottom;
          } else {
            element.margin_bottom_total = generalMargin;
          }
        }
      }
    }
  }
}

/**
 * Algoritmo principal de renderizado
 */
async function renderDocument(
  renderEngine: RenderEngine,
  elementsData: ProcessedElement[][][],
  structureData: StructureData,
  pageManager: PageManager
): Promise<string> {
  console.log("=== RENDERIZANDO DOCUMENTO ===");

  // Inicializar página final
  await renderEngine.initFinalPage();

  // Variables de control del algoritmo
  let currentY = structureData.document.page.margins.top;
  let currentPage = 1;
  let totalPages = 1;
  const pageBreakY = structureData.document.page.content_bottom;

  // Procesar cada sección
  for (let sectionIndex = 0; sectionIndex < elementsData.length; sectionIndex++) {
    console.log(`=== PROCESANDO SECCIÓN ${sectionIndex} ===`);

    // Reiniciar Y al inicio de cada sección
    currentY = structureData.document.page.margins.top;

    // 1. Renderizar headers
    currentY = await renderArea(
      renderEngine,
      elementsData,
      0,
      sectionIndex,
      currentY,
      pageBreakY,
      currentPage,
      totalPages
    );

    // 2. Renderizar contents con saltos de página
    const contentResult = await renderContentArea(
      renderEngine,
      elementsData,
      structureData,
      1,
      sectionIndex,
      currentY,
      pageBreakY,
      currentPage,
      totalPages
    );
    currentY = contentResult.newY;

    // Si hubo saltos de página en content, actualizar páginas
    if (contentResult.newPagesCreated > 0) {
      totalPages += contentResult.newPagesCreated;
      currentPage = totalPages;
    }

    // 3. Renderizar footers
    await renderArea(
      renderEngine,
      elementsData,
      2,
      sectionIndex,
      currentY,
      pageBreakY,
      currentPage,
      totalPages
    );

    // 4. Si hay más secciones, crear nueva página
    if (sectionIndex < elementsData.length - 1) {
      await renderEngine.createNewPageBreak();
      totalPages++;
      currentPage++;
    }
  }

  // 5. Actualizar elementos pagination
  await renderEngine.updateAllPaginationElements(totalPages);

  // 6. Obtener HTML final
  const finalHTML = await renderEngine.getFinalHTML();

  return finalHTML;
}

/**
 * Renderiza un área específica (header/content/footer)
 */
async function renderArea(
  renderEngine: RenderEngine,
  elementsData: ProcessedElement[][][],
  areaIndex: number,
  sectionIndex: number,
  currentY: number,
  pageBreakY: number,
  currentPage: number,
  totalPages: number
): Promise<number> {
  const areaNames = ["header", "content", "footer"];
  console.log(`=== RENDERIZANDO ${areaNames[areaIndex].toUpperCase()} ===`);

  let workingY = currentY;
  const sectionData = elementsData[sectionIndex] || [];
  const areaData = sectionData[areaIndex] || [];

  for (const element of areaData) {
    if (shouldRenderElement(element, currentPage, totalPages)) {
      if (element.elementY > 0) {
        // Elemento con posición fija
        await renderEngine.renderElementAtPosition(element, element.elementY);
      } else {
        // Elemento dinámico
        await renderEngine.renderElementAtPosition(element, workingY);
        workingY += element.height + element.margin_bottom_total;
      }
    }
  }

  return workingY;
}

/**
 * Renderiza área content con gestión de saltos de página
 */
async function renderContentArea(
  renderEngine: RenderEngine,
  elementsData: ProcessedElement[][][],
  structureData: StructureData,
  areaIndex: number,
  sectionIndex: number,
  currentY: number,
  pageBreakY: number,
  currentPage: number,
  totalPages: number
): Promise<{ newY: number; newPagesCreated: number }> {
  console.log("=== RENDERIZANDO CONTENT CON SALTOS DE PÁGINA ===");

  let workingY = currentY;
  let newPagesCreated = 0;
  const sectionData = elementsData[sectionIndex] || [];
  const areaData = sectionData[areaIndex] || [];

  for (let i = 0; i < areaData.length; i++) {
    const element = areaData[i];

    if (element.elementY > 0) {
      // Elemento con posición fija
      await renderEngine.renderElementAtPosition(element, element.elementY);
      continue;
    }

    // Elemento dinámico - verificar si cabe
    const requiredSpace = element.height + element.margin_bottom_total;
    const projectedY = workingY + requiredSpace;

    if (projectedY <= pageBreakY) {
      // Cabe en la página actual
      await renderEngine.renderElementAtPosition(element, workingY);
      workingY = projectedY;
    } else {
      // No cabe - crear nueva página
      console.log(
        `Salto de página requerido en Y=${workingY}, elemento necesita ${requiredSpace}px`
      );

      // Renderizar footers en página actual
      await renderArea(
        renderEngine,
        elementsData,
        2,
        sectionIndex,
        workingY,
        pageBreakY,
        currentPage + newPagesCreated,
        totalPages + newPagesCreated
      );

      // Crear nueva página
      await renderEngine.createNewPageBreak();
      newPagesCreated++;

      // Reiniciar Y y renderizar headers en nueva página
      workingY = structureData.document.page.margins.top;
      workingY = await renderArea(
        renderEngine,
        elementsData,
        0,
        sectionIndex,
        workingY,
        pageBreakY,
        currentPage + newPagesCreated,
        totalPages + newPagesCreated
      );

      // Renderizar el elemento en la nueva página
      await renderEngine.renderElementAtPosition(element, workingY);
      workingY += requiredSpace;
    }
  }

  return { newY: workingY, newPagesCreated };
}

/**
 * Determina si un elemento debe renderizarse según su visibilidad
 */
function shouldRenderElement(
  element: ProcessedElement,
  currentPage: number,
  totalPages: number
): boolean {
  switch (element.visibility) {
    case "first":
      return currentPage === 1;
    case "last":
      return currentPage === totalPages;
    case "all":
      return true;
    case null:
    case undefined:
      return true;
    default:
      return true;
  }
}
