// Módulo conversor CSV a JSON profesional
// {"_META_file_path_": "csv2json.js"}

/**
 * Códigos de error estructurados
 */
const ERROR_CODES = {
  PARSE_ERROR: 'PARSE_ERROR',
  STRUCTURE_ERROR: 'STRUCTURE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  HIERARCHY_ERROR: 'HIERARCHY_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  SEQUENCE_ERROR: 'SEQUENCE_ERROR',
  RANGE_ERROR: 'RANGE_ERROR'
};

/**
 * Niveles de severidad
 */
const SEVERITY = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning'
};

/**
 * Parser CSV robusto
 */
class CSVParser {
  constructor() {
    this.delimiters = [',', ';', '\t', '|'];
  }

  parse(content) {
    try {
      // Detectar y limpiar BOM
      const cleanContent = this.removeBOM(content);
      
      // Detectar delimitador
      const delimiter = this.detectDelimiter(cleanContent);
      
      // Parsear contenido
      const rows = this.parseRows(cleanContent, delimiter);
      
      if (rows.length === 0) {
        return {
          success: false,
          errors: [{
            code: ERROR_CODES.PARSE_ERROR,
            severity: SEVERITY.FATAL,
            message: 'Archivo CSV vacío o inválido'
          }]
        };
      }

      return { success: true, data: rows, errors: [] };
    } catch (error) {
      return {
        success: false,
        errors: [{
          code: ERROR_CODES.PARSE_ERROR,
          severity: SEVERITY.FATAL,
          message: `Error al parsear CSV: ${error.message}`
        }]
      };
    }
  }

  removeBOM(content) {
    return content.replace(/^\uFEFF/, '');
  }

  detectDelimiter(content) {
    const firstLine = content.split('\n')[0];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of this.delimiters) {
      const count = (firstLine.match(new RegExp('\\' + delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  parseRows(content, delimiter) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (this.isNewline(char, nextChar) && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        
        currentRow.push(currentField.trim());
        if (this.isValidRow(currentRow)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
      i++;
    }

    // Última fila
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (this.isValidRow(currentRow)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  isNewline(char, nextChar) {
    return char === '\n' || char === '\r';
  }

  isValidRow(row) {
    return row.some(field => field.length > 0);
  }
}

/**
 * Validador de presupuestos
 */
class BudgetValidator {
  constructor() {
    this.validLevels = {
      'capitulo': 'chapter',
      'subcapitulo': 'subchapter', 
      'apartado': 'section',
      'partida': 'item'
    };
    
    this.requiredFields = {
      spanish: ['nivel', 'id', 'nombre', 'descripcion', 'ud', '%iva', 'pvp'],
      english: ['level', 'id', 'name', 'description', 'unit', 'iva_percentage', 'pvp']
    };

    this.itemRequiredFields = ['nivel', 'id', 'nombre', 'descripcion', 'ud', '%iva', 'pvp'];
    this.containerRequiredFields = ['nivel', 'id', 'nombre'];
  }

  validateStructure(rows) {
    const errors = [];
    
    if (rows.length < 2) {
      errors.push({
        code: ERROR_CODES.STRUCTURE_ERROR,
        severity: SEVERITY.FATAL,
        message: 'CSV debe tener cabeceras y al menos una fila de datos'
      });
      return { success: false, errors };
    }

    const headers = rows[0];
    const fieldMap = this.mapFields(headers);
    
    if (!fieldMap.success) {
      errors.push(...fieldMap.errors);
      return { success: false, errors };
    }

    return { success: true, fieldMap: fieldMap.data, errors: [] };
  }

  mapFields(headers) {
    const slugHeaders = headers.map(h => this.createSlug(h));
    const spanishSlugs = this.requiredFields.spanish.map(f => this.createSlug(f));
    const englishSlugs = this.requiredFields.english.map(f => this.createSlug(f));
    
    const hasSpanish = spanishSlugs.every(slug => slugHeaders.includes(slug));
    const hasEnglish = englishSlugs.every(slug => slugHeaders.includes(slug));
    
    if (!hasSpanish && !hasEnglish) {
      return {
        success: false,
        errors: [{
          code: ERROR_CODES.STRUCTURE_ERROR,
          severity: SEVERITY.FATAL,
          message: 'Faltan campos esenciales: nivel, id, nombre, descripcion, ud, %iva, pvp'
        }]
      };
    }

    const fieldMap = {};
    const fieldsToMap = hasSpanish ? this.requiredFields.spanish : this.requiredFields.english;
    
    fieldsToMap.forEach(field => {
      const slug = this.createSlug(field);
      const index = slugHeaders.indexOf(slug);
      if (index !== -1) {
        fieldMap[field] = index;
      }
    });

    return { success: true, data: fieldMap, errors: [] };
  }

  createSlug(text) {
    if (!text) return '';
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  validateData(rows, fieldMap) {
    const errors = [];
    const processedData = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = this.processRow(rows[i], fieldMap, i + 1);
      
      if (row.errors.length > 0) {
        errors.push(...row.errors);
        continue;
      }

      processedData.push(row.data);
    }

    // Validaciones globales
    const globalErrors = this.validateGlobalConstraints(processedData);
    errors.push(...globalErrors);

    return { 
      success: errors.length === 0, 
      data: processedData.filter(item => item !== null), 
      errors 
    };
  }

  processRow(values, fieldMap, lineNumber) {
    const errors = [];
    const data = { lineNumber, originalRow: values };
    
    // Extraer campos
    Object.keys(fieldMap).forEach(field => {
      const index = fieldMap[field];
      data[field] = values[index] ? values[index].trim() : '';
    });

    // Normalizar nivel
    if (data.nivel) {
      data.normalizedLevel = this.createSlug(data.nivel);
    }

    // Validar según tipo
    if (data.normalizedLevel === 'partida') {
      const itemErrors = this.validateItem(data, lineNumber);
      errors.push(...itemErrors);
    } else if (['capitulo', 'subcapitulo', 'apartado'].includes(data.normalizedLevel)) {
      const containerErrors = this.validateContainer(data, lineNumber);
      errors.push(...containerErrors);
    } else {
      errors.push({
        code: ERROR_CODES.VALIDATION_ERROR,
        severity: SEVERITY.ERROR,
        line: lineNumber,
        originalRow: values,
        message: `Nivel inválido: "${data.nivel}"`
      });
    }

    return { data: errors.length === 0 ? data : null, errors };
  }

  validateItem(data, lineNumber) {
    const errors = [];
    
    // Campos obligatorios
    if (!data.id) {
      errors.push(this.createFieldError('ID', 'no puede estar vacío', lineNumber, data.originalRow));
    }
    if (!data.nombre) {
      errors.push(this.createFieldError('nombre', 'no puede estar vacío', lineNumber, data.originalRow));
    }
    if (!data.ud) {
      errors.push(this.createFieldError('unidad', 'no puede estar vacía', lineNumber, data.originalRow));
    }
    
    // Validar números
    if (!data['%iva'] || data['%iva'] === '') {
      errors.push(this.createFieldError('%IVA', 'no puede estar vacío', lineNumber, data.originalRow));
    } else {
      const ivaError = this.validateNumber(data['%iva'], '%IVA', lineNumber, 0, 100, data.originalRow);
      if (ivaError) errors.push(ivaError);
    }

    if (!data.pvp || data.pvp === '') {
      errors.push(this.createFieldError('PVP', 'no puede estar vacío', lineNumber, data.originalRow));
    } else {
      const pvpError = this.validateNumber(data.pvp, 'PVP', lineNumber, 0, null, data.originalRow);
      if (pvpError) errors.push(pvpError);
    }

    // Validar ID formato
    if (data.id && !this.isValidIdFormat(data.id)) {
      errors.push(this.createFieldError('ID', 'formato inválido (debe ser números separados por puntos)', lineNumber, data.originalRow));
    }

    return errors;
  }

  validateContainer(data, lineNumber) {
    const errors = [];
    
    if (!data.id) {
      errors.push(this.createFieldError('ID', 'no puede estar vacío', lineNumber, data.originalRow));
    }
    if (!data.nombre) {
      errors.push(this.createFieldError('nombre', 'no puede estar vacío', lineNumber, data.originalRow));
    }
    
    // Validar ID formato
    if (data.id && !this.isValidIdFormat(data.id)) {
      errors.push(this.createFieldError('ID', 'formato inválido (debe ser números separados por puntos)', lineNumber, data.originalRow));
    }

    return errors;
  }

  validateNumber(value, fieldName, lineNumber, min = null, max = null, originalRow = null) {
    const cleanValue = value.toString().replace(',', '.');
    const number = parseFloat(cleanValue);
    
    if (isNaN(number)) {
      return this.createFieldError(fieldName, `debe ser un número válido (encontrado: "${value}")`, lineNumber, originalRow);
    }
    
    if (min !== null && number < min) {
      return this.createFieldError(fieldName, `debe ser mayor o igual a ${min}`, lineNumber, originalRow);
    }
    
    if (max !== null && number > max) {
      return this.createFieldError(fieldName, `debe ser menor o igual a ${max}`, lineNumber, originalRow);
    }
    
    return null;
  }

  isValidIdFormat(id) {
    return /^[0-9]+(\.[0-9]+)*$/.test(id);
  }

  createFieldError(field, message, lineNumber, originalRow = null) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      severity: SEVERITY.ERROR,
      line: lineNumber,
      field: field,
      originalRow: originalRow,
      message: `${field} ${message}`
    };
  }

  validateGlobalConstraints(data) {
    const errors = [];
    
    // Validar duplicados
    const duplicateErrors = this.validateDuplicates(data);
    errors.push(...duplicateErrors);
    
    // Validar jerarquía
    const hierarchyErrors = this.validateHierarchy(data);
    errors.push(...hierarchyErrors);
    
    // Validar secuencias
    const sequenceErrors = this.validateSequences(data);
    errors.push(...sequenceErrors);
    
    return errors;
  }

  validateDuplicates(data) {
    const errors = [];
    const seen = new Map();
    
    for (const item of data) {
      if (!item.id) continue;
      
      if (seen.has(item.id)) {
        const firstItem = seen.get(item.id);
        errors.push({
          code: ERROR_CODES.DUPLICATE_ERROR,
          severity: SEVERITY.ERROR,
          originalRow: item.originalRow,
          message: `ID duplicado: ${item.id} (también aparece en otra línea)`
        });
      } else {
        seen.set(item.id, item);
      }
    }
    
    return errors;
  }

  validateHierarchy(data) {
    const errors = [];
    const items = data.filter(item => item.normalizedLevel === 'partida');
    const existingIds = new Set(data.map(item => item.id));
    
    for (const item of items) {
      if (!item.id) continue;
      
      const hierarchyError = this.validateItemHierarchy(item, existingIds, data);
      if (hierarchyError) {
        errors.push(hierarchyError);
      }
    }
    
    return errors;
  }

  validateItemHierarchy(item, existingIds, allData) {
    const parts = item.id.split('.');
    const depth = parts.length;
    
    let requiredAncestors = [];
    
    if (depth === 2) {
      requiredAncestors = [{ id: parts[0], level: 'chapter', name: 'Capítulo' }];
    } else if (depth === 3) {
      requiredAncestors = [
        { id: parts[0], level: 'chapter', name: 'Capítulo' },
        { id: parts.slice(0, 2).join('.'), level: 'subchapter', name: 'Subcapítulo' }
      ];
    } else if (depth === 4) {
      requiredAncestors = [
        { id: parts[0], level: 'chapter', name: 'Capítulo' },
        { id: parts.slice(0, 2).join('.'), level: 'subchapter', name: 'Subcapítulo' },
        { id: parts.slice(0, 3).join('.'), level: 'section', name: 'Apartado' }
      ];
    } else {
      return {
        code: ERROR_CODES.HIERARCHY_ERROR,
        severity: SEVERITY.ERROR,
        line: item.lineNumber,
        originalRow: item.originalRow,
        message: `Partida ${item.id}: profundidad inválida (${depth} niveles)`
      };
    }

    const missing = requiredAncestors.filter(ancestor => !existingIds.has(ancestor.id));
    
    if (missing.length > 0) {
      const missingList = missing.map(m => `${m.name}: ${m.id}`).join(', ');
      return {
        code: ERROR_CODES.HIERARCHY_ERROR,
        severity: SEVERITY.ERROR,
        line: item.lineNumber,
        originalRow: item.originalRow,
        message: `Partida ${item.id}: faltan ancestros: ${missingList}`
      };
    }
    
    return null;
  }

  validateSequences(data) {
    const errors = [];
    const byLevel = {};
    
    // Agrupar por nivel y padre
    for (const item of data) {
      if (!item.id) continue;
      
      const parts = item.id.split('.');
      const level = parts.length;
      const parentId = parts.slice(0, -1).join('.');
      const sequence = parseInt(parts[parts.length - 1]);
      
      if (!byLevel[level]) byLevel[level] = {};
      if (!byLevel[level][parentId]) byLevel[level][parentId] = [];
      
      byLevel[level][parentId].push({ sequence, item });
    }
    
    // Validar secuencias
    for (const level in byLevel) {
      for (const parentId in byLevel[level]) {
        const items = byLevel[level][parentId].sort((a, b) => a.sequence - b.sequence);
        
        for (let i = 0; i < items.length; i++) {
          const expected = i + 1;
          const actual = items[i].sequence;
          
          if (actual !== expected) {
            errors.push({
              code: ERROR_CODES.SEQUENCE_ERROR,
              severity: SEVERITY.WARNING,
              originalRow: items[i].item.originalRow,
              message: `Secuencia incorrecta: esperado ${expected}, encontrado ${actual}`
            });
          }
        }
      }
    }
    
    return errors;
  }
}

/**
 * Transformador de datos
 */
class DataTransformer {
  constructor() {
    this.levelMap = {
      'capitulo': 'chapter',
      'subcapitulo': 'subchapter',
      'apartado': 'section', 
      'partida': 'item'
    };
  }

  transform(data) {
    return data.map(item => {
      const transformed = {
        level: this.levelMap[item.normalizedLevel],
        id: item.id,
        name: item.nombre,
        amount: '0.00'
      };

      if (item.normalizedLevel === 'partida') {
        transformed.description = item.descripcion || ' ';
        transformed.unit = item.ud || '';
        transformed.quantity = '0.00';
        transformed.iva_percentage = this.formatNumber(item['%iva']);
        transformed.pvp = this.formatNumber(item.pvp);
      }

      return transformed;
    });
  }

  formatNumber(value) {
    if (!value) return '0.00';
    const cleanValue = value.toString().replace(',', '.');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? '0.00' : number.toFixed(2);
  }
}

/**
 * Conversor principal
 */
class CSV2JSONConverter {
  constructor() {
    this.parser = new CSVParser();
    this.validator = new BudgetValidator();
    this.transformer = new DataTransformer();
  }

  async convertCSVToJSON(csvContent) {
    // 1. Parsear CSV
    const parseResult = this.parser.parse(csvContent);
    if (!parseResult.success) {
      return { success: false, data: null, errors: parseResult.errors };
    }

    // 2. Validar estructura
    const structureResult = this.validator.validateStructure(parseResult.data);
    if (!structureResult.success) {
      return { success: false, data: null, errors: structureResult.errors };
    }

    // 3. Validar datos
    const dataResult = this.validator.validateData(parseResult.data, structureResult.fieldMap);
    if (!dataResult.success) {
      return { success: false, data: null, errors: dataResult.errors };
    }

    // 4. Transformar a JSON
    const jsonData = this.transformer.transform(dataResult.data);
    
    return { success: true, data: jsonData, errors: [] };
  }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CSV2JSONConverter, ERROR_CODES, SEVERITY };
} else if (typeof window !== 'undefined') {
  window.CSV2JSONConverter = CSV2JSONConverter;
  window.ERROR_CODES = ERROR_CODES;
  window.SEVERITY = SEVERITY;
}