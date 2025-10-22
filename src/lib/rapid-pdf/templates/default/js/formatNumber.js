/**
 * Formatea un número de formato inglés a español
 * @param {string|number} value - Número en formato inglés (ej: "1234.56" o 1234.56)
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {string} Número formateado en español (ej: "1.234,56")
 */
function formatSpanishNumber(value, decimals = 2) {
  // Convertir a número si es string
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0' + (decimals > 0 ? ',' + '0'.repeat(decimals) : '');
  }

  // Formatear con separadores de miles y coma decimal
  const parts = Math.abs(num).toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1] || '';

  const result = decimals > 0 ? `${integerPart},${decimalPart}` : integerPart;
  return num < 0 ? `-${result}` : result;
}

/**
 * Formatea un número con símbolo de euro
 * @param {string|number} value - Número en formato inglés
 * @returns {string} Número formateado con € (ej: "1.234,56 €")
 */
function formatCurrency(value) {
  return formatSpanishNumber(value, 2) + ' €';
}

// Exportar funciones (compatible con Node.js y navegador)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatSpanishNumber, formatCurrency };
}
