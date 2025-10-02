import { z } from 'zod';
import {
  StructureValidationResult,
  DataValidationResult,
  FieldMap,
  ProcessedRow,
  ValidationConfig
} from './csv-types';
import { ErrorFactory } from '../helpers/csv-errors';
import { CSVUtils } from '../helpers/csv-utils';
import { REQUIRED_FIELDS, SEVERITY } from '../constants/csv';

/**
 * Schema Zod para validar campos de items
 */
const ItemSchema = z.object({
  nivel: z.string().min(1, 'Nivel no puede estar vacío'),
  id: z.string().min(1, 'ID no puede estar vacío').regex(/^[0-9]+(\.[0-9]+)*$/, 'ID debe tener formato válido'),
  nombre: z.string().min(1, 'Nombre no puede estar vacío'),
  descripcion: z.string().optional(),
  ud: z.string().min(1, 'Unidad no puede estar vacía'),
  '%iva': z.string().min(1, '%IVA no puede estar vacío'),
  pvp: z.string().min(1, 'PVP no puede estar vacío')
});

/**
 * Schema Zod para validar campos de contenedores
 */
const ContainerSchema = z.object({
  nivel: z.string().min(1, 'Nivel no puede estar vacío'),
  id: z.string().min(1, 'ID no puede estar vacío').regex(/^[0-9]+(\.[0-9]+)*$/, 'ID debe tener formato válido'),
  nombre: z.string().min(1, 'Nombre no puede estar vacío'),
  descripcion: z.string().optional(),
  ud: z.string().optional(),
  '%iva': z.string().optional(),
  pvp: z.string().optional()
});

/**
 * Validador de presupuestos con validaciones robustas
 */
export class BudgetValidator {
  private readonly config: ValidationConfig;

  constructor(config: ValidationConfig = {}) {
    this.config = {
      strictMode: false,
      allowMissingDescriptions: true,
      maxHierarchyDepth: 4,
      ...config
    };
  }

  /**
   * Valida la estructura del CSV (cabeceras y formato)
   */
  validateStructure(rows: string[][]): StructureValidationResult {
    const errors = [];

    if (rows.length < 2) {
      errors.push(ErrorFactory.createStructureError(
        'El archivo está vacío o no tiene estructura válida. Debe incluir cabeceras y al menos una fila de datos. Descarga plantilla: /tarifa-plantilla.csv'
      ));
      return { success: false, errors };
    }

    const headers = rows[0];
    const fieldMapResult = this.mapFields(headers);

    if (!fieldMapResult.success) {
      errors.push(...fieldMapResult.errors);
      return { success: false, errors };
    }

    return {
      success: true,
      fieldMap: fieldMapResult.data,
      errors: []
    };
  }

  /**
   * Mapea los campos de las cabeceras a índices (con normalización 3 pasos)
   */
  private mapFields(headers: string[]): { success: boolean; data?: FieldMap; errors: z.ZodIssue[] } {
    // Paso 1: Normalizar cabeceras a slug
    const slugHeaders = headers.map(h => CSVUtils.createSlug(h));

    // Campos obligatorios en slug
    const requiredSlugs = ['nivel', 'id', 'nombre', 'descripcion', 'ud', 'pvp'];
    const ivaVariants = ['iva', '%iva', 'piva', 'ivapercentage', 'iva_percentage'];

    // Paso 2: Verificar que existan todos los campos obligatorios
    const missingFields: string[] = [];
    const fieldMap: FieldMap = {};

    // Mapear cada campo requerido
    const fieldsToMap = {
      'nivel': 'nivel',
      'id': 'id',
      'nombre': 'nombre',
      'descripcion': 'descripcion',
      'ud': 'ud',
      'pvp': 'pvp'
    };

    Object.entries(fieldsToMap).forEach(([spanishField, _]) => {
      const index = slugHeaders.indexOf(spanishField);
      if (index !== -1) {
        fieldMap[spanishField] = index;
      } else {
        // Buscar versión en inglés
        const englishVariants: Record<string, string[]> = {
          'nivel': ['level'],
          'nombre': ['name'],
          'descripcion': ['description'],
          'ud': ['unit']
        };

        const variants = englishVariants[spanishField] || [];
        let found = false;

        for (const variant of variants) {
          const variantIndex = slugHeaders.indexOf(variant);
          if (variantIndex !== -1) {
            fieldMap[spanishField] = variantIndex;
            found = true;
            break;
          }
        }

        if (!found) {
          missingFields.push(spanishField === 'nivel' ? 'Nivel (o Level)' :
                           spanishField === 'nombre' ? 'Nombre (o Name)' :
                           spanishField === 'descripcion' ? 'Descripción (o Description)' :
                           spanishField === 'ud' ? 'Ud (o Unit)' : spanishField.toUpperCase());
        }
      }
    });

    // Buscar IVA en cualquier variante
    let ivaFound = false;
    for (const variant of ivaVariants) {
      const index = slugHeaders.indexOf(variant);
      if (index !== -1) {
        fieldMap['%iva'] = index;
        ivaFound = true;
        break;
      }
    }

    if (!ivaFound) {
      missingFields.push('%IVA (o iva_percentage)');
    }

    // Paso 3: Si faltan campos, generar error descriptivo con columnas encontradas
    if (missingFields.length > 0) {
      const foundColumns = headers.join(', ');
      return {
        success: false,
        errors: [ErrorFactory.createStructureError(
          `El archivo no contiene las columnas obligatorias. Columnas requeridas: Nivel (o Level), ID, Nombre (o Name), Descripción (o Description), Ud (o Unit), %IVA (o iva_percentage), PVP. Columnas encontradas en tu archivo: ${foundColumns}.`
        )]
      };
    }

    return { success: true, data: fieldMap, errors: [] };
  }

  /**
   * Valida los datos del CSV
   */
  validateData(rows: string[][], fieldMap: FieldMap): DataValidationResult {
    const errors = [];
    const processedData: ProcessedRow[] = [];

    for (let i = 1; i < rows.length; i++) {
      const rowResult = this.processRow(rows[i], fieldMap, i + 1);

      if (rowResult.errors.length > 0) {
        errors.push(...rowResult.errors);
        // Solo continuar si hay errores fatales o errors (no warnings)
        const hasFatalErrors = rowResult.errors.some(e => e.severity === SEVERITY.FATAL || e.severity === SEVERITY.ERROR);
        if (hasFatalErrors) {
          continue;
        }
      }

      if (rowResult.data) {
        processedData.push(rowResult.data);
      }
    }

    // Validaciones globales
    const globalErrors = this.validateGlobalConstraints(processedData);
    errors.push(...globalErrors);

    // El éxito depende solo de si hay errores fatales o errors (no warnings)
    const hasFatalErrors = errors.some(e => e.severity === SEVERITY.FATAL || e.severity === SEVERITY.ERROR);

    return {
      success: !hasFatalErrors,
      data: processedData.filter(item => item !== null),
      errors
    };
  }

  /**
   * Procesa una fila individual
   */
  private processRow(
    values: string[],
    fieldMap: FieldMap,
    lineNumber: number
  ): { data: ProcessedRow | null; errors: z.ZodIssue[] } {
    const errors = [];
    const data: ProcessedRow = {
      lineNumber,
      originalRow: values
    };

    // Extraer campos según el mapeo
    Object.keys(fieldMap).forEach(field => {
      const index = fieldMap[field];
      data[field as keyof ProcessedRow] = values[index] ? values[index].trim() : '';
    });

    // Normalizar y validar nivel
    if (data.nivel) {
      const normalizedLevel = CSVUtils.normalizeLevel(data.nivel);
      if (!normalizedLevel) {
        errors.push(ErrorFactory.createFieldError(
          'Nivel',
          `inválido en fila ${lineNumber}: "${data.nivel}". Valores permitidos: Capítulo, Subcapítulo, Apartado, Partida. Descarga plantilla: /tarifa-plantilla.csv`,
          lineNumber,
          values
        ));
        return { data: null, errors };
      }
      data.normalizedLevel = normalizedLevel;
    }

    // Validar según tipo de elemento
    if (data.normalizedLevel === 'partida') {
      const itemErrors = this.validateItem(data, lineNumber);
      errors.push(...itemErrors);
    } else if (['capitulo', 'subcapitulo', 'apartado'].includes(data.normalizedLevel || '')) {
      const containerErrors = this.validateContainer(data, lineNumber);
      errors.push(...containerErrors);
    }

    return { data: errors.length === 0 ? data : null, errors };
  }

  /**
   * Valida un item (partida) usando Zod
   */
  private validateItem(data: ProcessedRow, lineNumber: number): z.ZodIssue[] {
    const errors = [];

    try {
      // Validación básica con Zod
      ItemSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(zodError => {
          errors.push(ErrorFactory.createFieldError(
            zodError.path[0] as string,
            zodError.message,
            lineNumber,
            data.originalRow
          ));
        });
      }
    }

    // Validaciones adicionales de números con mensajes mejorados
    if (data['%iva']) {
      const ivaValidation = CSVUtils.validateNumber(data['%iva'], 0, 100);
      if (!ivaValidation.isValid) {
        const itemName = data.nombre || 'Sin nombre';
        const itemId = data.id || '';
        errors.push(ErrorFactory.createFieldError(
          '%IVA',
          `inválido en Partida "${itemName}" (${itemId}): "${data['%iva']}". Debe estar entre 0 y 100. Descarga plantilla: /tarifa-plantilla.csv`,
          lineNumber,
          data.originalRow
        ));
      }
    }

    if (data.pvp) {
      const pvpValidation = CSVUtils.validateNumber(data.pvp, 0, null);
      if (!pvpValidation.isValid) {
        const itemName = data.nombre || 'Sin nombre';
        const itemId = data.id || '';
        errors.push(ErrorFactory.createFieldError(
          'PVP',
          `inválido en Partida "${itemName}" (${itemId}): "${data.pvp}". Debe ser un número mayor o igual a 0. Descarga plantilla: /tarifa-plantilla.csv`,
          lineNumber,
          data.originalRow
        ));
      }
    }

    return errors;
  }

  /**
   * Valida un contenedor (capítulo, subcapítulo, apartado) usando Zod
   */
  private validateContainer(data: ProcessedRow, lineNumber: number): z.ZodIssue[] {
    const errors = [];

    try {
      ContainerSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(zodError => {
          errors.push(ErrorFactory.createFieldError(
            zodError.path[0] as string,
            zodError.message,
            lineNumber,
            data.originalRow
          ));
        });
      }
    }

    return errors;
  }

  /**
   * Valida restricciones globales (duplicados, jerarquía, secuencias)
   */
  private validateGlobalConstraints(data: ProcessedRow[]): z.ZodIssue[] {
    const errors = [];

    // Validar duplicados
    errors.push(...this.validateDuplicates(data));

    // Validar jerarquía
    errors.push(...this.validateHierarchy(data));

    // Validar secuencias
    errors.push(...this.validateSequences(data));

    return errors;
  }

  /**
   * Valida IDs duplicados
   */
  private validateDuplicates(data: ProcessedRow[]): z.ZodIssue[] {
    const errors = [];
    const seen = new Map<string, ProcessedRow>();

    for (const item of data) {
      if (!item.id) continue;

      if (seen.has(item.id)) {
        errors.push(ErrorFactory.createDuplicateError(item.id, item.originalRow));
      } else {
        seen.set(item.id, item);
      }
    }

    return errors;
  }

  /**
   * Valida la jerarquía de elementos
   */
  private validateHierarchy(data: ProcessedRow[]): z.ZodIssue[] {
    const errors = [];
    const items = data.filter(item => item.normalizedLevel === 'partida');
    const existingIds = new Set(data.map(item => item.id));

    for (const item of items) {
      if (!item.id) continue;

      const hierarchyError = this.validateItemHierarchy(item, existingIds);
      if (hierarchyError) {
        errors.push(hierarchyError);
      }
    }

    return errors;
  }

  /**
   * Valida la jerarquía de un item específico
   */
  private validateItemHierarchy(item: ProcessedRow, existingIds: Set<string | undefined>): z.ZodIssue | null {
    if (!item.id) return null;

    const depth = CSVUtils.getHierarchyDepth(item.id);

    if (depth > (this.config.maxHierarchyDepth || 4)) {
      return ErrorFactory.createHierarchyError(
        `Error jerárquico en ID ${item.id}: profundidad inválida (${depth} niveles, máximo ${this.config.maxHierarchyDepth || 4}). Descarga plantilla: /tarifa-plantilla.csv`,
        item.lineNumber,
        item.originalRow
      );
    }

    const requiredAncestors = CSVUtils.getRequiredAncestors(item.id);
    const missing = requiredAncestors.filter(ancestor => !existingIds.has(ancestor.id));

    if (missing.length > 0) {
      // Construir mensaje detallado
      const parentId = CSVUtils.getParentId(item.id);
      const parts = item.id.split('.');

      let message = `Error jerárquico en ID ${item.id}: falta el contenedor padre `;

      if (parts.length === 2) {
        message += `(debe existir ${parts[0]} antes de ${item.id})`;
      } else if (parts.length === 3) {
        message += `(debe existir ${parts[0]} y ${parts.slice(0, 2).join('.')} antes de ${item.id})`;
      } else if (parts.length === 4) {
        message += `(debe existir ${parts[0]}, ${parts.slice(0, 2).join('.')} y ${parts.slice(0, 3).join('.')} antes de ${item.id})`;
      } else {
        message += `(faltan: ${missing.map(m => m.id).join(', ')})`;
      }

      message += `. Descarga plantilla: /tarifa-plantilla.csv`;

      return ErrorFactory.createHierarchyError(
        message,
        item.lineNumber,
        item.originalRow
      );
    }

    return null;
  }

  /**
   * Valida secuencias numéricas
   */
  private validateSequences(data: ProcessedRow[]): z.ZodIssue[] {
    const errors = [];
    const byLevel: Record<number, Record<string, Array<{ sequence: number; item: ProcessedRow }>>> = {};

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
            const item = items[i].item;
            const levelName = item.normalizedLevel === 'capitulo' ? 'capítulo' :
                            item.normalizedLevel === 'subcapitulo' ? 'subcapítulo' :
                            item.normalizedLevel === 'apartado' ? 'apartado' : 'partida';

            const parentStr = parentId ? ` dentro de ${parentId}` : '';

            errors.push(ErrorFactory.createSequenceError(
              `Advertencia fila ${item.lineNumber}: Secuencia de IDs no consecutiva${parentStr}. Se esperaba ${levelName} '${expected}' pero se encontró '${actual}'. Esto no impide la importación, pero verifica que no falten elementos.`,
              item.lineNumber,
              item.originalRow
            ));
          }
        }
      }
    }

    return errors;
  }
}