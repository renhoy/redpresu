/**
 * ElementProcessor - Procesamiento de elementos y datos
 * Migrado desde: js/core/ElementProcessor.js
 */

import type {
  PDFPayload,
  BudgetLine,
  ProcessedElement,
  StructureData,
} from "../types";

export class ElementProcessor {
  private budgetData: PDFPayload | null = null;
  private structureData: StructureData | null = null;
  private elementsCache: Map<string, any> = new Map();

  /**
   * Configura el procesador con los datos principales
   */
  init(budgetData: PDFPayload, structureData: StructureData): void {
    this.budgetData = budgetData;
    this.structureData = structureData;

    console.log("ElementProcessor: Inicializado correctamente");
    console.log(`- Template: ${budgetData.company.template}`);
    console.log(
      `- Secciones disponibles: ${Object.keys(structureData.document.sections).join(", ")}`
    );
  }

  /**
   * Genera elementsData según el esquema especificado
   */
  async generateElementsData(): Promise<ProcessedElement[][][]> {
    if (!this.budgetData || !this.structureData) {
      throw new Error("ElementProcessor no inicializado");
    }

    console.log("=== GENERANDO ELEMENTS DATA ===");

    const elementsData: ProcessedElement[][][] = [];

    // Procesar secciones en orden: summary, budget, conditions
    const sectionOrder = ["summary", "budget", "conditions"];

    for (const sectionKey of sectionOrder) {
      const sectionConfig = this.structureData.document.sections[sectionKey];
      if (!sectionConfig) continue;

      console.log(`Procesando sección: ${sectionKey}`);

      const sectionData: ProcessedElement[][] = [];

      // [areas]: header, content, footer (siempre en este orden)
      const areas = ["header", "content", "footer"];

      for (const areaType of areas) {
        const areaData: ProcessedElement[] = [];

        const areaConfig = sectionConfig[areaType as keyof typeof sectionConfig];
        if (areaConfig && Array.isArray(areaConfig)) {
          for (const componentConfig of areaConfig) {
            const componentName = componentConfig.component;
            const componentInfo =
              this.structureData.document.components[componentName];

            if (!componentInfo) {
              console.warn(`Componente ${componentName} no encontrado`);
              continue;
            }

            console.log(`  Generando elementos para: ${componentName}`);

            // Generar elementos para el componente
            const componentElements = await this.generateComponentElements(
              componentName,
              componentInfo,
              sectionKey,
              areaType
            );

            // Añadir componente al área
            areaData.push(...componentElements);
          }
        }

        // Añadir área al section (aunque esté vacía)
        sectionData.push(areaData);
      }

      // Añadir sección a elementsData
      elementsData.push(sectionData);
    }

    this.logElementsDataSummary(elementsData);
    return elementsData;
  }

  /**
   * Genera elementos para un componente específico
   */
  private async generateComponentElements(
    componentName: string,
    componentInfo: any,
    sectionKey: string,
    areaType: string
  ): Promise<ProcessedElement[]> {
    const elements: ProcessedElement[] = [];

    // Crear elemento base
    const baseElement = this.createBaseElement(
      componentName,
      componentInfo,
      sectionKey
    );

    // Manejar componentes divisibles
    if (componentName === "levels") {
      const levels =
        (this.budgetData as any)[sectionKey]?.levels || [];

      if (levels.length === 0) {
        console.warn(`No hay levels en budgetData.${sectionKey}.levels`);
        return elements;
      }

      console.log(`    Procesando ${levels.length} levels`);

      for (const levelData of levels) {
        const element = await this.enrichElement(
          { ...baseElement },
          sectionKey,
          { levelData }
        );
        elements.push(element);
      }
    } else if (componentName === "note") {
      const noteText = (this.budgetData as any)[sectionKey]?.note || "";

      if (!noteText.trim() || noteText === "<p></p>") {
        console.warn(`No hay note válida en budgetData.${sectionKey}.note`);
        return elements;
      }

      // Procesar notas dividiendo por párrafos individuales
      const paragraphs = this.processNoteText(noteText);
      console.log(`    Procesando ${paragraphs.length} párrafos de note`);

      for (const paragraphData of paragraphs) {
        const element = await this.enrichElement(
          { ...baseElement },
          sectionKey,
          { paragraphData }
        );
        elements.push(element);
      }
    } else {
      // Componente simple
      const element = await this.enrichElement(baseElement, sectionKey, null);
      elements.push(element);
    }

    return elements;
  }

  /**
   * Procesa texto de notas dividiendo por párrafos
   * ALGORITMO:
   * - <p>: cada párrafo es un bloque independiente (incluidos vacíos)
   * - <ul>/<ol>: dividir por <li> manteniendo etiquetas de lista
   * - Resultado: HTML válido en cada bloque para medir alturas correctamente
   */
  private processNoteText(noteText: string): string[] {
    if (!noteText || !noteText.trim()) {
      return [];
    }

    const isHTML = /<[^>]+>/.test(noteText);

    if (isHTML) {
      const blocks: string[] = [];
      let remainingHTML = noteText.trim();

      // Procesar el HTML token por token
      while (remainingHTML.length > 0) {
        remainingHTML = remainingHTML.trim();

        // 1. Detectar y extraer párrafos <p>...</p>
        const pMatch = remainingHTML.match(/^<p[^>]*>[\s\S]*?<\/p>/i);
        if (pMatch) {
          let paragraph = pMatch[0];

          // Convertir párrafos vacíos en párrafo con contenido transparente
          if (paragraph === '<p></p>' || paragraph.match(/^<p[^>]*>\s*<\/p>$/)) {
            paragraph = '<p style="color: transparent;">.</p>';
          }

          blocks.push(paragraph);
          remainingHTML = remainingHTML.substring(pMatch[0].length);
          continue;
        }

        // 2. Detectar y procesar listas <ul>...</ul>
        const ulMatch = remainingHTML.match(/^<ul[^>]*>([\s\S]*?)<\/ul>/i);
        if (ulMatch) {
          const fullList = ulMatch[0];
          const listContent = ulMatch[1];
          const ulOpenTag = fullList.substring(0, fullList.indexOf('>') + 1); // Capturar <ul> con sus atributos

          // Extraer cada <li> y crear bloques individuales con estructura completa
          const liMatches = listContent.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
          if (liMatches) {
            liMatches.forEach((li) => {
              // Crear HTML válido: <ul><li>contenido</li></ul>
              blocks.push(`${ulOpenTag}${li}</ul>`);
            });
          }

          remainingHTML = remainingHTML.substring(fullList.length);
          continue;
        }

        // 3. Detectar y procesar listas <ol>...</ol>
        const olMatch = remainingHTML.match(/^<ol[^>]*>([\s\S]*?)<\/ol>/i);
        if (olMatch) {
          const fullList = olMatch[0];
          const listContent = olMatch[1];
          const olOpenTag = fullList.substring(0, fullList.indexOf('>') + 1); // Capturar <ol> con sus atributos

          // Extraer cada <li> y crear bloques individuales con estructura completa
          const liMatches = listContent.match(/<li[^>]*>[\s\S]*?<\/li>/gi);
          if (liMatches) {
            liMatches.forEach((li) => {
              // Crear HTML válido: <ol><li>contenido</li></ol>
              blocks.push(`${olOpenTag}${li}</ol>`);
            });
          }

          remainingHTML = remainingHTML.substring(fullList.length);
          continue;
        }

        // 4. Si no coincide con ningún patrón conocido, salir para evitar loop infinito
        console.warn('[processNoteText] HTML no procesado:', remainingHTML.substring(0, 100));
        break;
      }

      return blocks;
    } else {
      // Texto plano: dividir por dobles saltos de línea
      return noteText
        .split("\n\n")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    }
  }

  /**
   * Crea elemento base según el esquema elementsData
   */
  private createBaseElement(
    componentName: string,
    componentInfo: any,
    sectionKey: string
  ): ProcessedElement {
    const config = componentInfo.config || {};

    return {
      component: componentName,
      file: config.file,
      visibility:
        config.visibility === "variable" ? null : config.visibility,
      height: 0,
      elementY: config.y || 0,
      margin_bottom_total: 0,
      section: sectionKey,
    };
  }

  /**
   * Enriquece elemento con datos específicos del componente
   */
  private async enrichElement(
    element: ProcessedElement,
    sectionKey: string,
    extraData: any = null
  ): Promise<ProcessedElement> {
    const componentName = element.component;

    // Mapear datos según el componente
    const mappedData = await this.mapComponentFields(
      componentName,
      sectionKey,
      extraData
    );

    // Combinar elemento base con datos mapeados
    const enrichedElement = { ...element, ...mappedData };

    // Calcular margin_bottom_total inicial (solo general_margin)
    enrichedElement.margin_bottom_total =
      this.structureData?.document.page?.general_margin || 0;

    return enrichedElement;
  }

  /**
   * Mapea campos específicos del componente desde budgetData
   */
  private async mapComponentFields(
    componentName: string,
    sectionKey: string,
    extraData: any = null
  ): Promise<Record<string, any>> {
    if (!this.budgetData) return {};

    const mappedData: Record<string, any> = {};

    switch (componentName) {
      case "company":
        Object.assign(mappedData, {
          name: this.budgetData.company?.name,
          nif: this.budgetData.company?.nif,
          address: this.budgetData.company?.address,
          contact: this.budgetData.company?.contact,
          logo: this.budgetData.company?.logo,
        });
        break;

      case "title":
        mappedData.title = (this.budgetData as any)[sectionKey]?.title;
        break;

      case "client":
        const clientData =
          (this.budgetData as any)[sectionKey]?.client || {};
        Object.assign(mappedData, {
          budget_number: (this.budgetData as any)[sectionKey]?.budget_number,
          client_name: clientData.name,
          client_nif_nie: clientData.nif_nie,
          client_address: clientData.address,
          client_contact: clientData.contact,
          budget_date: clientData.budget_date,
          validity: clientData.validity,
        });
        break;

      case "levels":
        if (extraData && extraData.levelData) {
          Object.assign(mappedData, {
            levelData: extraData.levelData,
            level_type: extraData.levelData.level,
            level_id: extraData.levelData.id,
            level_name: extraData.levelData.name,
            level_amount: extraData.levelData.amount,
            level_unit: extraData.levelData.unit,
            level_quantity: extraData.levelData.quantity,
            level_pvp: extraData.levelData.pvp,
            level_iva_percentage: extraData.levelData.iva_percentage,
            level_description: extraData.levelData.description,
          });
        }
        break;

      case "totals":
        const totalsData =
          (this.budgetData as any)[sectionKey]?.totals || {};
        Object.assign(mappedData, {
          base: totalsData.base,
          ivas: totalsData.ivas || [],
          total: totalsData.total,
          base_name: totalsData.base?.name,
          base_amount: totalsData.base?.amount,
          total_name: totalsData.total?.name,
          total_amount: totalsData.total?.amount,
        });
        break;

      case "note":
        if (extraData && extraData.paragraphData) {
          mappedData.paragraphData = extraData.paragraphData;
          mappedData.paragraph_text = extraData.paragraphData;
        }
        break;

      case "signatures":
        const signatureClientData =
          (this.budgetData as any)[sectionKey]?.client || {};
        const signatureCompanyData = this.budgetData.company || {};
        Object.assign(mappedData, {
          signature_client_name: signatureClientData.name,
          signature_client_nif_nie: signatureClientData.nif_nie,
          signature_company_name: signatureCompanyData.name,
          signature_company_nif: signatureCompanyData.nif,
          signature_company_address: signatureCompanyData.address,
          signature_company_contact: signatureCompanyData.contact,
          signature_company_logo: signatureCompanyData.logo,
        });
        break;

      case "pagination":
        const paginationClientData =
          (this.budgetData as any)[sectionKey]?.client || {};
        Object.assign(mappedData, {
          pagination_budget_date: paginationClientData.budget_date,
          pagination_validity: paginationClientData.validity,
          current_page: 1,
          total_pages: 1,
        });
        break;

      case "separator":
        break;

      default:
        console.warn(`Mapeo no definido para componente: ${componentName}`);
    }

    return mappedData;
  }

  /**
   * Registra resumen de elementsData generado
   */
  private logElementsDataSummary(elementsData: ProcessedElement[][][]): void {
    let totalElements = 0;
    let totalSections = elementsData.length;

    for (const [sectionIndex, sectionData] of elementsData.entries()) {
      let sectionElements = 0;

      for (const [areaIndex, areaData] of sectionData.entries()) {
        sectionElements += areaData.length;
      }

      totalElements += sectionElements;
      console.log(`  Sección ${sectionIndex}: ${sectionElements} elementos`);
    }

    console.log(`Total: ${totalSections} secciones, ${totalElements} elementos`);
  }

  /**
   * Calcula margin_bottom_total final para último elemento de componente
   */
  updateMarginBottomForLastElement(elementsData: ProcessedElement[][][]): void {
    if (!this.structureData) return;

    for (const sectionData of elementsData) {
      for (const areaData of sectionData) {
        const componentGroups = new Map<string, ProcessedElement[]>();

        // Agrupar por componente
        for (const element of areaData) {
          if (!componentGroups.has(element.component)) {
            componentGroups.set(element.component, []);
          }
          componentGroups.get(element.component)!.push(element);
        }

        // Actualizar último de cada grupo
        for (const [componentName, elements] of componentGroups) {
          if (elements.length > 0) {
            const lastElement = elements[elements.length - 1];

            const generalMargin =
              this.structureData.document.page?.general_margin || 0;
            const componentConfig =
              this.structureData.document.components[componentName]?.config ||
              {};
            const componentMarginBottom = componentConfig.margin_bottom || 0;

            lastElement.margin_bottom_total =
              generalMargin + componentMarginBottom;
          }
        }
      }
    }
  }
}
