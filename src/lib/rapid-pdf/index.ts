/**
 * Rapid-PDF Module
 * Motor de generación de PDFs empresariales integrado en jeyca-presu
 * Migrado desde Rapid-PDF API externa
 */

// Exportar función principal
export { generatePDF, closePDFResources } from "./generator";

// Exportar tipos
export type {
  PDFPayload,
  PDFGenerationResult,
  PDFGenerationOptions,
  CompanyData,
  PDFMetadata,
  SummaryData,
  ClientData,
  ChapterSummary,
  TotalsData,
  BudgetData,
  BudgetLine,
  BudgetLineLevel,
  ConditionsData,
} from "./types";
