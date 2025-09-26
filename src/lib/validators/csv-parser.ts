import { ParseResult } from './csv-types';
import { ErrorFactory } from '../helpers/csv-errors';
import { CSVUtils } from '../helpers/csv-utils';
import { CSV_DELIMITERS } from '../constants/csv';

/**
 * Parser CSV robusto que maneja diferentes formatos y delimitadores
 */
export class CSVParser {
  private readonly delimiters: readonly string[];

  constructor() {
    this.delimiters = CSV_DELIMITERS;
  }

  /**
   * Parsea contenido CSV y retorna filas estructuradas
   */
  parse(content: string): ParseResult {
    try {
      // Limpiar BOM si existe
      const cleanContent = CSVUtils.removeBOM(content);

      // Detectar delimitador
      const delimiter = CSVUtils.detectDelimiter(cleanContent, [...this.delimiters]);

      // Parsear contenido
      const rows = this.parseRows(cleanContent, delimiter);

      if (rows.length === 0) {
        return {
          success: false,
          errors: [ErrorFactory.createParseError('Archivo CSV vacío o inválido')]
        };
      }

      return { success: true, data: rows, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [ErrorFactory.createParseError(error instanceof Error ? error.message : 'Error desconocido')]
      };
    }
  }

  /**
   * Parsea filas del CSV manejando comillas y caracteres especiales
   */
  private parseRows(content: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Comilla escapada
          currentField += '"';
          i += 2;
          continue;
        }
        // Cambiar estado de comillas
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        // Fin de campo
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (this.isNewline(char, nextChar) && !inQuotes) {
        // Fin de línea
        if (char === '\r' && nextChar === '\n') {
          i++; // Saltar \n después de \r
        }

        currentRow.push(currentField.trim());
        if (CSVUtils.isValidRow(currentRow)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        // Carácter normal
        currentField += char;
      }
      i++;
    }

    // Procesar última fila si existe
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (CSVUtils.isValidRow(currentRow)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Verifica si un carácter es nueva línea
   */
  private isNewline(char: string, nextChar?: string): boolean {
    return CSVUtils.isNewline(char);
  }
}