/**
 * Utilidades para normalización y traducción de datos CSV a JSON
 */

/**
 * Mapeo de campos normalizados (slug) a inglés
 */
export const FIELD_TRANSLATION_MAP = {
  // Campos normalizados (slug) → campos JSON ingleses
  'nivel': 'level',
  'id': 'id',
  'nombre': 'name',
  'descripcion': 'description',
  'ud': 'unit',
  'iva': 'iva_percentage',
  '%iva': 'iva_percentage',
  'piva': 'iva_percentage',
  'pvp': 'pvp',
  // También soportar nombres en inglés directamente
  'level': 'level',
  'name': 'name',
  'description': 'description',
  'unit': 'unit',
  'iva_percentage': 'iva_percentage',
  'ivapercentage': 'iva_percentage'
} as const;

/**
 * Mapeo inverso para convertir de inglés a español
 */
export const REVERSE_FIELD_TRANSLATION_MAP = {
  'level': 'nivel',
  'id': 'id',
  'name': 'nombre',
  'description': 'descripcion',
  'unit': 'ud',
  'iva_percentage': '%iva',
  'pvp': 'pvp'
} as const;

/**
 * Clase para normalización y traducción de datos
 */
export class NormalizationUtils {
  /**
   * Normaliza un campo eliminando tildes y caracteres especiales
   */
  static normalizeField(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .normalize('NFD') // Descomponer caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Eliminar marcas diacríticas (tildes)
      .replace(/[^a-z0-9_]/g, '') // Solo letras, números y guiones bajos
      .trim();
  }

  /**
   * Traduce campos del español/inglés al inglés estándar (3 pasos)
   * Paso 1: Convertir a slug (minúsculas, sin acentos, sin espacios)
   * Paso 2: Mapear a nombres inglés estándar
   * Paso 3: Retornar campo normalizado o descartar si no es válido
   */
  static translateFieldToEnglish(field: string): string {
    // Paso 1: Normalizar a slug
    const normalized = this.normalizeField(field);

    // Paso 2: Mapear usando la tabla de traducción
    const mapped = FIELD_TRANSLATION_MAP[normalized as keyof typeof FIELD_TRANSLATION_MAP];

    // Paso 3: Retornar mapeado o el slug si no está en el mapa
    return mapped || normalized;
  }

  /**
   * Traduce campos del inglés al español
   */
  static translateFieldToSpanish(englishField: string): string {
    return REVERSE_FIELD_TRANSLATION_MAP[englishField as keyof typeof REVERSE_FIELD_TRANSLATION_MAP] || englishField;
  }

  /**
   * Normaliza texto PRESERVANDO tildes, espacios y mayúsculas
   * Solo elimina espacios al inicio/final
   */
  static normalizeText(text: string): string {
    if (!text) return '';

    return text.trim();
  }

  /**
   * Normaliza texto eliminando tildes (usado solo para comparaciones internas)
   */
  static normalizeTextWithoutAccents(text: string): string {
    if (!text) return '';

    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Formatea números a formato inglés (punto decimal, 2 decimales)
   */
  static formatNumberToEnglish(value: string | number): string {
    if (!value) return '0.00';

    // Convertir a string y limpiar
    const cleanValue = value.toString()
      .replace(',', '.') // Cambiar coma por punto
      .replace(/[^\d.-]/g, ''); // Solo dígitos, punto y signo menos

    const number = parseFloat(cleanValue);

    if (isNaN(number)) {
      return '0.00';
    }

    return number.toFixed(2);
  }

  /**
   * Formatea números a formato español (coma decimal, 2 decimales)
   */
  static formatNumberToSpanish(value: string | number): string {
    const englishFormat = this.formatNumberToEnglish(value);
    return englishFormat.replace('.', ',');
  }

  /**
   * Valida y normaliza un número dentro de un rango
   */
  static validateAndFormatNumber(
    value: string | number,
    min?: number,
    max?: number
  ): { isValid: boolean; formattedValue: string; error?: string } {
    const formatted = this.formatNumberToEnglish(value);
    const number = parseFloat(formatted);

    if (isNaN(number)) {
      return {
        isValid: false,
        formattedValue: '0.00',
        error: `Valor inválido: "${value}"`
      };
    }

    if (min !== undefined && number < min) {
      return {
        isValid: false,
        formattedValue: formatted,
        error: `Valor debe ser mayor o igual a ${min}`
      };
    }

    if (max !== undefined && number > max) {
      return {
        isValid: false,
        formattedValue: formatted,
        error: `Valor debe ser menor o igual a ${max}`
      };
    }

    return {
      isValid: true,
      formattedValue: formatted
    };
  }

  /**
   * Limpia y normaliza descripciones (preservando tildes)
   */
  static normalizeDescription(description?: string): string {
    if (!description || description.trim() === '') {
      return ' '; // Espacio en blanco para mantener compatibilidad
    }

    return this.normalizeText(description); // Ahora preserva tildes
  }

  /**
   * Normaliza unidades de medida
   */
  static normalizeUnit(unit?: string): string {
    if (!unit || unit.trim() === '') {
      return '';
    }

    // Normalizar unidades comunes
    const normalized = this.normalizeText(unit.toLowerCase());

    const unitMap: Record<string, string> = {
      'metros': 'm',
      'metro': 'm',
      'mts': 'm',
      'mt': 'm',
      'metros cuadrados': 'm²',
      'metro cuadrado': 'm²',
      'm2': 'm²',
      'metros cubicos': 'm³',
      'metro cubico': 'm³',
      'm3': 'm³',
      'kilogramos': 'kg',
      'kilogramo': 'kg',
      'kgs': 'kg',
      'gramos': 'g',
      'gramo': 'g',
      'litros': 'l',
      'litro': 'l',
      'unidades': 'ud',
      'unidad': 'ud',
      'uds': 'ud',
      'horas': 'h',
      'hora': 'h'
    };

    return unitMap[normalized] || unit.trim();
  }

  /**
   * Crea un objeto normalizado con todos los campos traducidos
   */
  static createNormalizedObject(rawData: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    Object.keys(rawData).forEach(key => {
      const translatedKey = this.translateFieldToEnglish(key);
      let value = rawData[key];

      // Aplicar normalización específica según el campo
      switch (translatedKey) {
        case 'description':
          value = this.normalizeDescription(value);
          break;
        case 'unit':
          value = this.normalizeUnit(value);
          break;
        case 'iva_percentage':
        case 'pvp':
          value = this.formatNumberToEnglish(value);
          break;
        case 'name':
          value = this.normalizeText(value);
          break;
        default:
          if (typeof value === 'string') {
            value = value.trim();
          }
      }

      normalized[translatedKey] = value;
    });

    return normalized;
  }

  /**
   * Valida que todos los campos requeridos estén presentes
   */
  static validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Genera campos adicionales requeridos para el JSON final
   */
  static generateAdditionalFields(level: string): Record<string, string> {
    const fields: Record<string, string> = {
      amount: '0,00'
    };

    // Solo items (partidas) tienen quantity
    if (level === 'item') {
      fields.quantity = '0,00';
    }

    return fields;
  }
}