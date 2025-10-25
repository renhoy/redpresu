/**
 * RenderEngine - Gestión de Puppeteer y renderizado
 * Migrado desde: js/core/RenderEngine.js
 */

import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { PDFDocument } from "pdf-lib";
import type { PDFPayload, ProcessedElement, StructureData } from "../types";
import { PageManager } from "./page-manager";

// Usar require para fs.promises (compatible con Next.js Server Actions)
const fs = require("fs").promises;

export class RenderEngine {
  private pageManager: PageManager;
  private budgetData: PDFPayload | null = null;
  private structureData: StructureData | null = null;
  private browser: Browser | null = null;
  private activePage: Page | null = null;
  private componentCache: Map<string, any> = new Map();

  /**
   * Carga un componente dinámicamente según el template del payload
   * Igual que rapid_pdf: usa budgetData.company.template para la ruta
   * Usa import() dinámico que es compatible con Next.js
   */
  private async loadComponentAsync(componentFile: string): Promise<any> {
    if (!this.budgetData) {
      throw new Error("budgetData no está configurado");
    }

    const templateId = this.budgetData.company.template;
    const cacheKey = `${templateId}/${componentFile}`;

    // console.log(`[loadComponentAsync] Cargando: ${componentFile} del template: ${templateId}`);

    // Usar cache para evitar recargar
    if (this.componentCache.has(cacheKey)) {
      // console.log(`[loadComponentAsync] ✓ Usando cache para: ${componentFile}`);
      return this.componentCache.get(cacheKey);
    }

    // Cargar componente usando import() dinámico
    // Next.js soporta esto para Server Actions
    const componentPath = `../templates/${templateId}/js/component/${componentFile}`;

    try {
      const module = await import(componentPath);
      const ComponentClass = module.default || module;
      this.componentCache.set(cacheKey, ComponentClass);
      // console.log(`[loadComponentAsync] ✓ Cargado exitosamente: ${componentFile}`);
      return ComponentClass;
    } catch (error) {
      console.error(`[loadComponentAsync] ✗ Error cargando ${componentFile}:`, error);
      throw new Error(`Error cargando componente '${componentFile}' del template '${templateId}': ${error.message}`);
    }
  }

  constructor(pageManager: PageManager) {
    this.pageManager = pageManager;
  }

  setBudgetData(budgetData: PDFPayload): void {
    this.budgetData = budgetData;
  }

  setStructureData(structureData: StructureData): void {
    this.structureData = structureData;
  }

  /**
   * Inicializa página temporal para medición de alturas
   */
  async initTemporaryPage(): Promise<void> {
    console.log("RenderEngine: Inicializando página temporal para medición");

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--disable-gpu-sandbox",
        "--disable-software-rasterizer",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-pings",
        "--password-store=basic",
        "--use-mock-keychain",
        "--disable-web-security",
        "--allow-running-insecure-content",
        "--disable-blink-features=AutomationControlled",
      ],
      timeout: 60000,
    });

    this.activePage = await this.browser.newPage();
    await this.activePage.setViewport({
      width: 1000,
      height: 2000,
    });

    const cssContent = await this.loadAllCSS();

    const baseHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>${cssContent}</style>
</head>
<body>
  <div id="measure-container" style="width: 686px; position: absolute; left: -9999px; top: 0; visibility: hidden;"></div>
</body>
</html>`;

    await this.activePage.setContent(baseHTML);
  }

  /**
   * Mide altura real de elemento en página temporal
   */
  async measureElementHeight(element: ProcessedElement): Promise<number> {
    if (!this.activePage) {
      throw new Error("Página temporal no inicializada");
    }

    try {
      console.log(`RenderEngine: Midiendo altura de ${element.component}`);

      const componentHTML = await this.generateComponentHTML(element);

      await this.activePage.evaluate(() => {
        const container = document.getElementById("measure-container");
        if (container) {
          container.innerHTML = "";
        }
      });

      await this.activePage.evaluate((html) => {
        const container = document.getElementById("measure-container");
        if (container) {
          container.innerHTML = html;
        }
      }, componentHTML);

      const height = await this.activePage.evaluate(() => {
        const container = document.getElementById("measure-container");
        const element = container ? container.firstElementChild : null;
        return element ? (element as HTMLElement).offsetHeight : 0;
      });

      console.log(`RenderEngine: ${element.component} = ${height}px`);
      return height;
    } catch (error) {
      console.error(`Error midiendo altura de ${element.component}:`, error);
      return 20;
    }
  }

  /**
   * Destruye página temporal tras medición
   */
  async destroyTemporaryPage(): Promise<void> {
    console.log("RenderEngine: Destruyendo página temporal");

    if (this.activePage) {
      try {
        await this.activePage.close();
      } catch (error) {
        console.warn("Error cerrando página temporal:", error);
      }
      this.activePage = null;
    }

    console.log("RenderEngine: Página temporal destruida");
  }

  /**
   * Inicializa página final para renderizado
   */
  async initFinalPage(isDevelopment: boolean = false): Promise<void> {
    if (!this.budgetData || !this.structureData) {
      throw new Error("BudgetData y StructureData deben estar configurados");
    }

    if (isDevelopment) {
      console.log("RenderEngine: Página final inicializada");
    }

    if (this.activePage) {
      try {
        await this.activePage.close();
      } catch (error) {
        if (isDevelopment) {
          console.warn("Error cerrando página previa:", error);
        }
      }
      this.activePage = null;
    }

    if (!this.browser) {
      throw new Error("ERROR: Browser no disponible para crear página final");
    }

    const pageConfig = this.structureData.document.page;

    this.activePage = await this.browser.newPage();

    await this.activePage.setViewport({
      width: pageConfig.dimensions.width,
      height: pageConfig.dimensions.height,
    });

    const cssContent = await this.loadAllCSS();

    const pageTitle = this.budgetData.pdf?.title || "Presupuesto";

    // Inyectar variables CSS de márgenes desde structure.json
    const margins = pageConfig.margins || {};
    const dimensions = pageConfig.dimensions || {};
    const contentHeight = (dimensions.height || 1123) - (margins.top || 40) - (margins.bottom || 40);

    const cssVariables = `
:root {
  --page-width: ${dimensions.width || 794}px;
  --page-height: ${dimensions.height || 1123}px;
  --margin-top: ${margins.top || 40}px;
  --margin-bottom: ${margins.bottom || 40}px;
  --margin-left: ${margins.left || 54}px;
  --margin-right: ${margins.right || 54}px;
  --content-width: 100%;
  --content-height: ${contentHeight}px;
}`;

    const baseHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <style>${cssContent}</style>
  <style>${cssVariables}</style>
</head>
<body>
  <div id="app">
    <div class="page">
      <div class="content-area">
      </div>
    </div>
  </div>
</body>
</html>`;

    await this.activePage.setContent(baseHTML);
  }

  /**
   * Renderiza elemento creando DOM directamente en página actual
   */
  async renderElementAtPosition(
    element: ProcessedElement,
    yPosition: number,
    isDevelopment: boolean = false
  ): Promise<void> {
    if (!this.activePage || !this.budgetData || !this.structureData) {
      throw new Error("RenderEngine no inicializado correctamente");
    }

    try {
      const componentHTML = await this.generateComponentHTML(
        element,
        yPosition
      );

      await this.activePage.evaluate(
        (html, yPos, componentName) => {
          const pages = document.querySelectorAll(".page");
          const currentPage = pages[pages.length - 1];
          const targetArea = currentPage
            ? currentPage.querySelector(".content-area")
            : null;

          if (targetArea) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;

            const componentElement = tempDiv.firstElementChild;

            if (componentElement) {
              (componentElement as HTMLElement).style.position = "absolute";
              (componentElement as HTMLElement).style.left = "0px";
              (componentElement as HTMLElement).style.top = yPos + "px";
              (componentElement as HTMLElement).style.width = "100%";

              componentElement.classList.add(`element-${componentName}`);

              targetArea.appendChild(componentElement);
            }
          }
        },
        componentHTML,
        yPosition,
        element.component
      );

      if (isDevelopment) {
        console.log(
          `RenderEngine: Renderizado ${element.component} en Y=${yPosition}`
        );
      }
    } catch (error) {
      console.error(`Error renderizando ${element.component}:`, error);
    }
  }

  /**
   * Elimina elemento específico de la página actual
   */
  async removeElementFromPage(elementIdentifier: string): Promise<void> {
    if (!this.activePage) return;

    try {
      await this.activePage.evaluate((identifier) => {
        const elements = document.querySelectorAll(`.element-${identifier}`);
        elements.forEach((el) => el.remove());
      }, elementIdentifier);

      console.log(`RenderEngine: Elemento ${elementIdentifier} eliminado`);
    } catch (error) {
      console.error(`Error eliminando elemento ${elementIdentifier}:`, error);
    }
  }

  /**
   * Crea nueva página sin estilos inline
   */
  async createNewPageBreak(): Promise<void> {
    if (!this.activePage) return;

    await this.activePage.evaluate(() => {
      const app = document.getElementById("app");

      const page = document.createElement("div");
      page.className = "page";

      const contentArea = document.createElement("div");
      contentArea.className = "content-area";

      page.appendChild(contentArea);
      app?.appendChild(page);
    });

    console.log("RenderEngine: Nueva página creada");
  }

  /**
   * Actualiza todos los elementos pagination con páginas totales
   */
  async updateAllPaginationElements(totalPages: number): Promise<void> {
    if (!this.activePage) return;

    await this.activePage.evaluate((total) => {
      const paginationElements = document.querySelectorAll(
        ".element-pagination"
      );
      paginationElements.forEach((element, index) => {
        const pageNumber =
          Math.floor((index / paginationElements.length) * total) + 1;
        const pagesSpan = element.querySelector(".pages, .paginas");
        if (pagesSpan) {
          pagesSpan.textContent = `Página ${pageNumber} de ${total}`;
        }
      });
    }, totalPages);

    console.log(
      `RenderEngine: Paginación actualizada - ${totalPages} páginas totales`
    );
  }

  /**
   * Obtiene HTML final único
   */
  async getFinalHTML(): Promise<string> {
    if (!this.activePage) {
      throw new Error("Página no inicializada");
    }

    try {
      // Esperar a que se complete el renderizado
      await new Promise((resolve) => setTimeout(resolve, 500));

      const html = await this.activePage.evaluate(
        () => document.documentElement.outerHTML
      );
      console.log("RenderEngine: HTML final único generado");
      return html;
    } catch (error) {
      console.error("Error obteniendo HTML final:", error);
      return "<html><body>Error generando HTML</body></html>";
    }
  }

  /**
   * Genera PDF desde HTML guardado con metadatos usando pdf-lib
   */
  async generatePDFFromSavedHTML(savedHTML: string): Promise<Buffer> {
    if (!this.browser || !this.budgetData || !this.structureData) {
      throw new Error("RenderEngine no inicializado correctamente");
    }

    try {
      console.log("RenderEngine: Iniciando generación de PDF desde HTML");

      // Crear nueva página para PDF desde HTML guardado
      const pdfPage = await this.browser.newPage();

      const pageConfig = this.structureData.document.page;
      await pdfPage.setViewport({
        width: pageConfig.dimensions.width,
        height: pageConfig.dimensions.height,
      });

      console.log("RenderEngine: Configurando contenido HTML en página PDF");

      // Obtener metadatos desde budgetData.pdf
      const pdfMetadata = this.budgetData.pdf || {};
      const pdfTitle = pdfMetadata.title || "Presupuesto";
      const pdfAuthor =
        pdfMetadata.author || this.budgetData.company?.name || "Empresa";
      const pdfSubject = pdfMetadata.subject || "Documento de Presupuesto";
      const pdfCreator = pdfMetadata.creator || "Rapid PDF v2.1.0";
      const pdfKeywords = pdfMetadata.keywords || "presupuesto";

      // Modificar HTML para PDF
      const cleanedHTML = savedHTML
        .replace(/<title>.*?<\/title>/i, `<title>${pdfTitle}</title>`)
        .replace(
          /<body[^>]*>/,
          '<body style="margin: 0; padding: 0; background-color: #f0f0f0;">'
        )
        .replace(
          /#app\s*{[^}]*}/g,
          "#app { display: flex; flex-direction: column; align-items: center; padding: 0; margin: 0; }"
        )
        .replace(
          /\.page\s*{[^}]*}/g,
          ".page { width: 794px; height: 1123px; margin: 0; background-color: white; position: relative; overflow: hidden; box-sizing: border-box; page-break-after: always; }"
        );

      await pdfPage.setContent(cleanedHTML, { waitUntil: "networkidle0" });

      console.log("RenderEngine: Generando PDF inicial con Puppeteer");

      // Generar PDF inicial con Puppeteer
      console.log("RenderEngine: Llamando a page.pdf()...");
      const puppeteerPdfData = await pdfPage.pdf({
        width: pageConfig.dimensions.width + "px",
        height: pageConfig.dimensions.height + "px",
        printBackground: true,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        pageRanges: "",
        displayHeaderFooter: false,
        preferCSSPageSize: true,
      });

      console.log("RenderEngine: PDF generado, cerrando página...");
      await pdfPage.close();
      console.log("RenderEngine: Página cerrada correctamente");

      console.log("RenderEngine: Aplicando metadatos con pdf-lib");
      console.log(`- Título: ${pdfTitle}`);
      console.log(`- Autor: ${pdfAuthor}`);
      console.log(`- Asunto: ${pdfSubject}`);
      console.log(`- Creador: ${pdfCreator}`);
      console.log(`- Palabras clave: ${pdfKeywords}`);

      // Cargar PDF con pdf-lib para modificar metadatos
      const pdfDoc = await PDFDocument.load(puppeteerPdfData);

      // Establecer metadatos desde payload
      pdfDoc.setTitle(pdfTitle);
      pdfDoc.setAuthor(pdfAuthor);
      pdfDoc.setSubject(pdfSubject);
      pdfDoc.setCreator(pdfCreator);
      pdfDoc.setProducer(pdfCreator);
      pdfDoc.setKeywords([pdfKeywords]);

      // Configurar fechas
      const currentDate = new Date();
      pdfDoc.setCreationDate(currentDate);
      pdfDoc.setModificationDate(currentDate);

      // Guardar PDF con metadatos
      const finalPdfBuffer = await pdfDoc.save();

      console.log("RenderEngine: PDF generado correctamente con metadatos");
      console.log(`- Buffer size: ${finalPdfBuffer.length} bytes`);

      return Buffer.from(finalPdfBuffer);
    } catch (error) {
      console.error("Error generando PDF desde HTML guardado:", error);
      throw error;
    }
  }

  /**
   * Genera HTML del componente con posicionamiento incluido
   */
  async generateComponentHTML(
    element: ProcessedElement,
    yPosition: number | null = null
  ): Promise<string> {
    if (!this.budgetData || !this.structureData) {
      throw new Error("RenderEngine no inicializado");
    }

    try {
      const componentName = element.component;

      // Mapear nombre de componente a archivo (dinámicamente desde template)
      const componentFileMap: Record<string, string> = {
        company: "headerCompany.js",
        title: "headerTitle.js",
        client: "contentClient.js",
        separator: "contentSeparator.js",
        levels: "contentLevels.js",
        totals: "contentTotals.js",
        note: "contentNote.js",
        signatures: "footerSignatures.js",
        pagination: "footerPagination.js",
      };

      const componentFile = componentFileMap[componentName];
      if (!componentFile) {
        console.warn(`Componente desconocido: ${componentName}`);
        return `<div class="component-${componentName}"></div>`;
      }

      // Cargar componente dinámicamente según el template
      const ComponentClass = await this.loadComponentAsync(componentFile);

      // Crear instancia y renderizar según el tipo de componente
      let componentInstance;

      if (componentName === "levels") {
        // Para levels, pasar levelData
        console.log(`[generateComponentHTML] levels - levelData:`, element.levelData ? "presente" : "ausente");
        componentInstance = new ComponentClass({
          levelData: element.levelData,
        });
      } else if (componentName === "totals") {
        // Para totals, pasar datos de totales desde budgetData
        const totalsData = this.budgetData.summary?.totals;
        console.log(`[generateComponentHTML] totals - totalsData:`, totalsData ? "presente" : "ausente");
        if (!totalsData) {
          return `<div class="component-totals"></div>`;
        }

        componentInstance = new ComponentClass({
          base_name: totalsData.base?.name || "Base Imponible",
          base_amount: totalsData.base?.amount || "0.00",
          ivas: totalsData.ivas || [],
          subtotal: totalsData.subtotal,
          subtotal_name: totalsData.subtotal?.name,
          subtotal_amount: totalsData.subtotal?.amount,
          irpf: totalsData.irpf,
          irpf_name: totalsData.irpf?.name,
          irpf_amount: totalsData.irpf?.amount,
          re: totalsData.re || [],
          total_name: totalsData.total?.name || "TOTAL PRESUPUESTO",
          total_amount: totalsData.total?.amount || "0.00",
        });
      } else if (componentName === "client") {
        // Para client, usar los datos del element (que ya incluyen budget_number)
        console.log(`[generateComponentHTML] client - usando datos del element`);
        componentInstance = new ComponentClass(element);
      } else if (componentName === "note") {
        // Para note, usar el paragraphData del elemento (cada elemento es un párrafo individual)
        const paragraphData = (element as any).paragraphData || (element as any).paragraph_text || "";
        console.log(`[generateComponentHTML] note - paragraph length:`, paragraphData.length);
        componentInstance = new ComponentClass({ paragraphData });
      } else {
        // Para otros componentes, pasar element completo
        console.log(`[generateComponentHTML] ${componentName} - usando element completo`);
        componentInstance = new ComponentClass(element);
      }

      // Renderizar HTML
      const html = componentInstance.render();
      return html;
    } catch (error) {
      console.error(`Error generando HTML para ${element.component}:`, error);
      console.error("Stack:", error instanceof Error ? error.stack : "");
      return `<div class="component-error">Error: ${element.component}</div>`;
    }
  }

  /**
   * Carga todo el CSS necesario
   * Igual que rapid_pdf: carga CSS globales y de cada componente
   */
  private async loadAllCSS(): Promise<string> {
    if (!this.budgetData) {
      throw new Error("BudgetData no configurado");
    }

    const templateId = this.budgetData.company.template;
    const templateBasePath = path.join(process.cwd(), "src/lib/rapid-pdf/templates", templateId, "css");
    const globalCSSPath = path.join(process.cwd(), "src/lib/rapid-pdf/css");

    // IMPORTANTE: Orden correcto de carga CSS (igual que rapid_pdf):
    // 1. themeVariables.css - Define las variables CSS
    // 2. styles-global.css - Define .page, .content-area, etc.
    // 3. styles.css del template - Estilos específicos del template
    // 4. CSS de componentes
    const cssFiles = [
      path.join(globalCSSPath, "themeVariables.css"),  // <- PRIMERO: variables globales
      path.join(globalCSSPath, "styles-global.css"),   // <- SEGUNDO: estilos globales (.page, .content-area)
      path.join(templateBasePath, "styles.css"),       // <- TERCERO: estilos del template
      path.join(templateBasePath, "headerCompany.css"),
      path.join(templateBasePath, "headerTitle.css"),
      path.join(templateBasePath, "contentClient.css"),
      path.join(templateBasePath, "contentSeparator.css"),
      path.join(templateBasePath, "contentTotals.css"),
      path.join(templateBasePath, "contentNote.css"),
      path.join(templateBasePath, "contentLevels.css"),
      path.join(templateBasePath, "footerSignatures.css"),
      path.join(templateBasePath, "footerPagination.css"),
      path.join(templateBasePath, "common.css"),
      path.join(templateBasePath, "summary.css"),
      path.join(templateBasePath, "budget.css"),
    ];

    let combinedCSS = "";
    console.log(`[loadAllCSS] Cargando CSS para template: ${templateId}`);

    for (const cssFile of cssFiles) {
      try {
        const cssContent = await fs.readFile(cssFile, "utf8");
        combinedCSS += `\n/* ${path.basename(cssFile)} */\n${cssContent}\n`;
        console.log(`[loadAllCSS] ✓ Cargado: ${path.basename(cssFile)} (${cssContent.length} bytes)`);
      } catch (error) {
        console.warn(`[loadAllCSS] ✗ CSS file not found: ${cssFile}`);
      }
    }

    console.log(`[loadAllCSS] Total CSS combinado: ${combinedCSS.length} bytes`);
    const processedCSS = this.applyDynamicColors(combinedCSS);
    console.log(`[loadAllCSS] Después de applyDynamicColors: ${processedCSS.length} bytes`);

    return processedCSS;
  }

  /**
   * Aplica colores dinámicos del budget
   */
  private applyDynamicColors(cssContent: string): string {
    if (!this.budgetData) return cssContent;

    const companyStyles = this.budgetData.company?.styles || [];
    let processedCSS = cssContent;

    companyStyles.forEach((style) => {
      if (style.primary_color) {
        processedCSS = processedCSS.replace(
          /--color-primary:\s*[^;]+;/g,
          `--color-primary: ${style.primary_color};`
        );
        const primaryDark = this.adjustColor(style.primary_color, -20);
        const primaryLight = this.adjustColor(style.primary_color, 20);
        processedCSS = processedCSS.replace(
          /--color-primary-dark:\s*[^;]+;/g,
          `--color-primary-dark: ${primaryDark};`
        );
        processedCSS = processedCSS.replace(
          /--color-primary-light:\s*[^;]+;/g,
          `--color-primary-light: ${primaryLight};`
        );
      }
      if (style.secondary_color) {
        processedCSS = processedCSS.replace(
          /--color-secondary:\s*[^;]+;/g,
          `--color-secondary: ${style.secondary_color};`
        );
        const secondaryDark = this.adjustColor(style.secondary_color, -20);
        const secondaryLight = this.adjustColor(style.secondary_color, 20);
        processedCSS = processedCSS.replace(
          /--color-secondary-dark:\s*[^;]+;/g,
          `--color-secondary-dark: ${secondaryDark};`
        );
        processedCSS = processedCSS.replace(
          /--color-secondary-light:\s*[^;]+;/g,
          `--color-secondary-light: ${secondaryLight};`
        );
      }
    });

    return processedCSS;
  }

  /**
   * Ajusta color hex
   */
  private adjustColor(color: string, percent: number): string {
    if (!color.startsWith("#")) {
      color = "#" + color;
    }

    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(((R * (100 + percent)) / 100).toString());
    G = parseInt(((G * (100 + percent)) / 100).toString());
    B = parseInt(((B * (100 + percent)) / 100).toString());

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    R = R > 0 ? R : 0;
    G = G > 0 ? G : 0;
    B = B > 0 ? B : 0;

    const RR = R.toString(16).length === 1 ? "0" + R.toString(16) : R.toString(16);
    const GG = G.toString(16).length === 1 ? "0" + G.toString(16) : G.toString(16);
    const BB = B.toString(16).length === 1 ? "0" + B.toString(16) : B.toString(16);

    return "#" + RR + GG + BB;
  }

  /**
   * Cierra todas las instancias de Puppeteer
   */
  async close(): Promise<void> {
    try {
      if (this.activePage && typeof this.activePage.close === 'function') {
        await this.activePage.close().catch((err) => {
          console.warn("Error cerrando página (ya podría estar cerrada):", err.message);
        });
        this.activePage = null;
      }
      if (this.browser && typeof this.browser.close === 'function') {
        await this.browser.close().catch((err) => {
          console.warn("Error cerrando browser (ya podría estar cerrado):", err.message);
        });
        this.browser = null;
      }
      console.log("RenderEngine: Puppeteer cerrado correctamente");
    } catch (error) {
      console.error("Error cerrando Puppeteer:", error);
    }
  }

  /**
   * Valida que Puppeteer está disponible
   */
  static async validatePuppeteer(): Promise<boolean> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        timeout: 30000,
      });
      await browser.close();
      return true;
    } catch (error) {
      throw new Error(
        `ERROR: Puppeteer no está disponible: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Singleton para reutilizar instancia
let engineInstance: RenderEngine | null = null;

export function getRenderEngine(pageManager: PageManager): RenderEngine {
  if (!engineInstance) {
    engineInstance = new RenderEngine(pageManager);
  }
  return engineInstance;
}
