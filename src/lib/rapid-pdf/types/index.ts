/**
 * Tipos para el módulo Rapid-PDF
 * Migrado desde Rapid-PDF API a módulo interno
 */

// ============================================================================
// PAYLOAD PRINCIPAL
// ============================================================================

export interface PDFPayload {
  mode: "desarrollo" | "produccion";
  company: CompanyData;
  pdf: PDFMetadata;
  summary: SummaryData;
  budget: BudgetData;
  conditions: ConditionsData;
}

// ============================================================================
// DATOS DE EMPRESA
// ============================================================================

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

// ============================================================================
// METADATOS DEL PDF
// ============================================================================

export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  creator: string;
  keywords: string;
}

// ============================================================================
// DATOS DE RESUMEN
// ============================================================================

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

// ============================================================================
// TOTALES
// ============================================================================

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

// ============================================================================
// DATOS DE PRESUPUESTO DETALLADO
// ============================================================================

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

// ============================================================================
// CONDICIONES
// ============================================================================

export interface ConditionsData {
  title: string;
  note: string;
}

// ============================================================================
// RESULTADO DE GENERACIÓN
// ============================================================================

export interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
  processingTime?: number;
}

// ============================================================================
// OPCIONES DE GENERACIÓN
// ============================================================================

export interface PDFGenerationOptions {
  outputPath?: string; // Si se proporciona, guarda archivo
  returnBuffer?: boolean; // Si true, retorna Buffer en lugar de guardar
  mode?: "desarrollo" | "produccion"; // Desarrollo genera HTML, producción PDF
}

// ============================================================================
// TIPOS INTERNOS DEL MOTOR (para uso interno del módulo)
// ============================================================================

export interface ProcessedElement {
  component: string;
  file: string;
  visibility: "first" | "last" | "all" | null;
  height: number;
  elementY: number;
  margin_bottom_total: number;
  section: string;
  levelData?: any;
  paragraphData?: any;
  [key: string]: any; // Campos adicionales dinámicos
}

export interface PageConfig {
  content_bottom: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  general_margin: number;
}

export interface StructureData {
  document: {
    page: {
      dimensions: {
        width: number;
        height: number;
      };
      margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
      };
      content_bottom: number;
      general_margin: number;
    };
    sections: {
      [key: string]: {
        header?: Array<{ component: string }>;
        content?: Array<{ component: string }>;
        footer?: Array<{ component: string }>;
      };
    };
    components: {
      [key: string]: {
        config: {
          file: string;
          visibility: "first" | "last" | "all";
          y?: number;
          margin_bottom?: number;
        };
      };
    };
  };
}
