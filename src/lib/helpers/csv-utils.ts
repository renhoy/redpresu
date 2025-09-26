import { LEVEL_MAP } from '../constants/csv';

/**
 * Utilidades para procesamiento de CSV
 */
export class CSVUtils {
  /**
   * Normaliza un texto a formato slug (sin acentos, minúsculas, sin espacios)
   */
  static createSlug(text: string): string {
    if (!text) return '';
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Remueve BOM (Byte Order Mark) del contenido
   */
  static removeBOM(content: string): string {
    return content.replace(/^\uFEFF/, '');
  }

  /**
   * Detecta el delimitador más probable en un CSV
   */
  static detectDelimiter(content: string, delimiters: string[] = [',', ';', '\t', '|']): string {
    const firstLine = content.split('\n')[0];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp('\\' + delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Valida si una fila CSV tiene contenido válido
   */
  static isValidRow(row: string[]): boolean {
    return row.some(field => field.length > 0);
  }

  /**
   * Verifica si un ID tiene formato válido (números separados por puntos)
   */
  static isValidIdFormat(id: string): boolean {
    return /^[0-9]+(\.[0-9]+)*$/.test(id);
  }

  /**
   * Valida si un nivel es válido
   */
  static isValidLevel(level: string): boolean {
    const normalized = this.createSlug(level);
    return normalized in LEVEL_MAP;
  }

  /**
   * Normaliza un nivel a su equivalente en inglés
   */
  static normalizeLevel(level: string): keyof typeof LEVEL_MAP | null {
    const normalized = this.createSlug(level);
    return normalized in LEVEL_MAP ? normalized as keyof typeof LEVEL_MAP : null;
  }

  /**
   * Verifica si es una nueva línea
   */
  static isNewline(char: string): boolean {
    return char === '\n' || char === '\r';
  }

  /**
   * Valida y formatea un número
   */
  static validateNumber(
    value: string,
    min: number | null = null,
    max: number | null = null
  ): { isValid: boolean; number?: number; error?: string } {
    const cleanValue = value.toString().replace(',', '.');
    const number = parseFloat(cleanValue);

    if (isNaN(number)) {
      return {
        isValid: false,
        error: `debe ser un número válido (encontrado: "${value}")`
      };
    }

    if (min !== null && number < min) {
      return {
        isValid: false,
        error: `debe ser mayor o igual a ${min}`
      };
    }

    if (max !== null && number > max) {
      return {
        isValid: false,
        error: `debe ser menor o igual a ${max}`
      };
    }

    return { isValid: true, number };
  }

  /**
   * Formatea un número a 2 decimales en formato inglés
   */
  static formatNumber(value: string | number): string {
    if (!value) return '0.00';
    const cleanValue = value.toString().replace(',', '.');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? '0.00' : number.toFixed(2);
  }

  /**
   * Obtiene la profundidad de jerarquía de un ID
   */
  static getHierarchyDepth(id: string): number {
    return id.split('.').length;
  }

  /**
   * Obtiene el ID padre de un ID dado
   */
  static getParentId(id: string): string {
    const parts = id.split('.');
    return parts.slice(0, -1).join('.');
  }

  /**
   * Verifica si un ID es hijo directo de otro
   */
  static isDirectChild(parentId: string, childId: string): boolean {
    return (
      childId.startsWith(parentId + '.') &&
      childId.split('.').length === parentId.split('.').length + 1
    );
  }

  /**
   * Verifica si un ID es descendiente de otro (cualquier nivel)
   */
  static isDescendant(ancestorId: string, descendantId: string): boolean {
    return (
      descendantId.startsWith(ancestorId + '.') &&
      descendantId.split('.').length > ancestorId.split('.').length
    );
  }

  /**
   * Genera ancestros requeridos para un ID de item
   */
  static getRequiredAncestors(itemId: string): Array<{ id: string; level: string; name: string }> {
    const parts = itemId.split('.');
    const depth = parts.length;
    const ancestors: Array<{ id: string; level: string; name: string }> = [];

    if (depth === 2) {
      ancestors.push({ id: parts[0], level: 'chapter', name: 'Capítulo' });
    } else if (depth === 3) {
      ancestors.push(
        { id: parts[0], level: 'chapter', name: 'Capítulo' },
        { id: parts.slice(0, 2).join('.'), level: 'subchapter', name: 'Subcapítulo' }
      );
    } else if (depth === 4) {
      ancestors.push(
        { id: parts[0], level: 'chapter', name: 'Capítulo' },
        { id: parts.slice(0, 2).join('.'), level: 'subchapter', name: 'Subcapítulo' },
        { id: parts.slice(0, 3).join('.'), level: 'section', name: 'Apartado' }
      );
    }

    return ancestors;
  }
}