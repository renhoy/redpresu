/**
 * Helpers de formateo para uso en toda la aplicación
 */

/**
 * Configuraciones de formateo por locale
 */
const LOCALE_CONFIG = {
  es: {
    decimal: ',',
    thousands: '.',
    currency: '€',
    dateFormat: 'DD-MM-YYYY'
  },
  en: {
    decimal: '.',
    thousands: ',',
    currency: '$',
    dateFormat: 'MM-DD-YYYY'
  }
} as const;

/**
 * FORMATEO DE MONEDA
 */

/**
 * Formatea un amount a moneda española
 * @param amount - Valor numérico o string
 * @returns Formato: "1.234,56 €"
 * @example formatCurrency(1234.56) // "1.234,56 €"
 */
export function formatCurrency(amount: string | number): string {
  const numericValue = parseNumericValue(amount);

  if (isNaN(numericValue)) {
    return '0,00 €';
  }

  const formatted = Math.abs(numericValue).toFixed(2);
  const [integer, decimal] = formatted.split('.');

  // Agregar separadores de miles
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const result = `${formattedInteger},${decimal} €`;
  return numericValue < 0 ? `-${result}` : result;
}

/**
 * Formatea moneda en formato compacto
 * @param amount - Valor numérico o string
 * @returns Formato: "1,5K €", "2,3M €"
 * @example formatCurrencyCompact(1500) // "1,5K €"
 */
export function formatCurrencyCompact(amount: string | number): string {
  const numericValue = parseNumericValue(amount);

  if (isNaN(numericValue)) {
    return '0 €';
  }

  const absValue = Math.abs(numericValue);
  const sign = numericValue < 0 ? '-' : '';

  if (absValue >= 1000000) {
    const millions = (absValue / 1000000).toFixed(1).replace('.', ',');
    return `${sign}${millions}M €`;
  } else if (absValue >= 1000) {
    const thousands = (absValue / 1000).toFixed(1).replace('.', ',');
    return `${sign}${thousands}K €`;
  } else {
    return `${sign}${absValue.toFixed(0)} €`;
  }
}

/**
 * Parsea una string de moneda a número
 * @param formatted - String formateada como "1.234,56 €"
 * @returns Valor numérico
 * @example parseCurrency("1.234,56 €") // 1234.56
 */
export function parseCurrency(formatted: string): number {
  if (!formatted || typeof formatted !== 'string') {
    return 0;
  }

  // Remover símbolo de moneda y espacios
  const cleaned = formatted
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .trim();

  // Manejar signo negativo
  const isNegative = cleaned.startsWith('-');
  const valueWithoutSign = isNegative ? cleaned.substring(1) : cleaned;

  // Convertir formato español a inglés
  const normalized = valueWithoutSign
    .replace(/\./g, '') // Remover separadores de miles
    .replace(/,/g, '.'); // Cambiar coma decimal a punto

  const result = parseFloat(normalized);
  return isNegative ? -result : result;
}

/**
 * FORMATEO DE NÚMEROS
 */

/**
 * Formatea número en formato español
 * @param value - Valor a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns Formato: "1.234,56"
 */
export function formatNumberES(value: string | number, decimals: number = 2): string {
  const numericValue = parseNumericValue(value);

  if (isNaN(numericValue)) {
    return '0' + (decimals > 0 ? `,${Array(decimals).fill('0').join('')}` : '');
  }

  const formatted = Math.abs(numericValue).toFixed(decimals);
  const [integer, decimal] = formatted.split('.');

  // Agregar separadores de miles
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const result = decimals > 0 ? `${formattedInteger},${decimal}` : formattedInteger;
  return numericValue < 0 ? `-${result}` : result;
}

/**
 * Formatea número en formato inglés
 * @param value - Valor a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns Formato: "1,234.56"
 */
export function formatNumberEN(value: string | number, decimals: number = 2): string {
  const numericValue = parseNumericValue(value);

  if (isNaN(numericValue)) {
    return '0' + (decimals > 0 ? `.${Array(decimals).fill('0').join('')}` : '');
  }

  const formatted = Math.abs(numericValue).toFixed(decimals);
  const [integer, decimal] = formatted.split('.');

  // Agregar separadores de miles
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const result = decimals > 0 ? `${formattedInteger}.${decimal}` : formattedInteger;
  return numericValue < 0 ? `-${result}` : result;
}

/**
 * Parsea número formateado según locale
 * @param formatted - String formateada
 * @param locale - Locale ('es' | 'en')
 * @returns Valor numérico
 */
export function parseNumber(formatted: string, locale: 'es' | 'en' = 'es'): number {
  if (!formatted || typeof formatted !== 'string') {
    return 0;
  }

  let normalized = formatted.trim();

  // Manejar signo negativo
  const isNegative = normalized.startsWith('-');
  if (isNegative) {
    normalized = normalized.substring(1);
  }

  if (locale === 'es') {
    // Formato español: remover puntos (miles), cambiar coma (decimal) a punto
    normalized = normalized
      .replace(/\./g, '')
      .replace(/,/g, '.');
  } else {
    // Formato inglés: remover comas (miles)
    normalized = normalized.replace(/,/g, '');
  }

  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : (isNegative ? -result : result);
}

/**
 * FORMATEO DE FECHAS
 */

/**
 * Formatea fecha según formato especificado
 * @param date - Fecha a formatear
 * @param format - Formato deseado (default: "DD-MM-YYYY")
 * @returns Fecha formateada
 * @example formatDate(new Date(), "DD-MM-YYYY") // "22-04-2025"
 */
export function formatDate(date: Date | string, format: string = 'DD-MM-YYYY'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear().toString();

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year);
}

/**
 * Formatea fecha en formato relativo
 * @param date - Fecha a formatear
 * @returns Formato: "hace 2 días", "en 5 días"
 */
export function formatDateRelative(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'hoy';
  } else if (diffDays === 1) {
    return 'mañana';
  } else if (diffDays === -1) {
    return 'ayer';
  } else if (diffDays > 0) {
    return `en ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  } else {
    return `hace ${Math.abs(diffDays)} día${Math.abs(diffDays) > 1 ? 's' : ''}`;
  }
}

/**
 * Parsea string de fecha a Date
 * @param dateString - String de fecha en formato DD-MM-YYYY
 * @returns Objeto Date
 */
export function parseDate(dateString: string): Date {
  if (!dateString || typeof dateString !== 'string') {
    return new Date(NaN);
  }

  // Intentar varios formatos
  const formats = [
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/ // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format === formats[1]) {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // DD-MM-YYYY o DD/MM/YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      }
    }
  }

  // Intentar parsing estándar como fallback
  return new Date(dateString);
}

/**
 * NORMALIZACIÓN DE STRINGS
 */

/**
 * Elimina tildes y caracteres especiales
 * @param text - Texto a normalizar
 * @returns Texto sin tildes
 * @example removeAccents("ñáéíóú") // "naeiou"
 */
export function removeAccents(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');
}

/**
 * Crea slug para URLs
 * @param text - Texto a convertir
 * @returns Slug válido
 * @example createSlug("Capítulo 1: Instalación") // "capitulo-1-instalacion"
 */
export function createSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return removeAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .replace(/^-|-$/g, ''); // Remover guiones al inicio/final
}

/**
 * Capitaliza primera letra de cada palabra
 * @param text - Texto a capitalizar
 * @returns Texto capitalizado
 * @example capitalize("juan pérez") // "Juan Pérez"
 */
export function capitalize(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Trunca texto con puntos suspensivos
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima
 * @returns Texto truncado
 * @example truncate("Texto muy largo", 10) // "Texto muy..."
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * UTILIDADES AUXILIARES
 */

/**
 * Convierte cualquier valor a número
 */
function parseNumericValue(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Intentar parsing directo primero
    const direct = parseFloat(value);
    if (!isNaN(direct)) {
      return direct;
    }

    // Limpiar y parsear
    const cleaned = value
      .replace(/[^\d.,-]/g, '') // Solo números, puntos, comas y signos
      .replace(',', '.'); // Convertir coma a punto

    return parseFloat(cleaned);
  }

  return 0;
}

/**
 * FORMATEO DE FECHAS PARA NÚMEROS ÚNICOS
 */

export type DateNumberFormat =
  | 'YYYYMMDD'           // 20251119
  | 'YYYYMMDD-HHMMSS'    // 20251119-143025
  | 'YYYYMMDD_HHMMSS'    // 20251119_143025
  | 'timestamp-ms'       // 1700401825789

/**
 * Formatea una fecha como número para IDs únicos, nombres de archivo, etc.
 *
 * @param date - Fecha a formatear (default: ahora)
 * @param format - Formato deseado
 * @returns String formateado
 *
 * @example
 * formatDateToNumber() // "20251119-143025"
 * formatDateToNumber(new Date(), 'YYYYMMDD') // "20251119"
 * formatDateToNumber(new Date(), 'timestamp-ms') // "1700401825789"
 */
export function formatDateToNumber(
  date: Date = new Date(),
  format: DateNumberFormat = 'YYYYMMDD-HHMMSS'
): string {
  switch (format) {
    case 'YYYYMMDD': {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }

    case 'YYYYMMDD-HHMMSS': {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      return `${year}${month}${day}-${hour}${minute}${second}`
    }

    case 'YYYYMMDD_HHMMSS': {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      return `${year}${month}${day}_${hour}${minute}${second}`
    }

    case 'timestamp-ms':
      return String(date.getTime())

    default:
      throw new Error(`Formato de fecha no soportado: ${format}`)
  }
}

/**
 * Parsea un número de fecha en formato YYYYMMDD-HHMMSS a Date
 *
 * @param dateNumber - String con fecha en formato numérico
 * @returns Date o null si el formato es inválido
 *
 * @example
 * parseDateNumber('20251119-143025') // Date(2025-11-19 14:30:25)
 * parseDateNumber('20251119') // Date(2025-11-19 00:00:00)
 * parseDateNumber('invalid') // null
 */
export function parseDateNumber(dateNumber: string): Date | null {
  if (!dateNumber || typeof dateNumber !== 'string') {
    return null
  }

  // Formato YYYYMMDD-HHMMSS o YYYYMMDD_HHMMSS
  const matchFull = dateNumber.match(/^(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})$/)
  if (matchFull) {
    const [, year, month, day, hour, minute, second] = matchFull
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    )
    return isNaN(date.getTime()) ? null : date
  }

  // Formato YYYYMMDD
  const matchShort = dateNumber.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (matchShort) {
    const [, year, month, day] = matchShort
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isNaN(date.getTime()) ? null : date
  }

  // Formato timestamp-ms
  if (/^\d+$/.test(dateNumber)) {
    const timestamp = parseInt(dateNumber)
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? null : date
  }

  return null
}