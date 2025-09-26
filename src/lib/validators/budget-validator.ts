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
import { REQUIRED_FIELDS, LEVEL_MAP } from '../constants/csv';

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
        'CSV debe tener cabeceras y al menos una fila de datos'
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
   * Mapea los campos de las cabeceras a índices
   */
  private mapFields(headers: string[]): { success: boolean; data?: FieldMap; errors: any[] } {
    const slugHeaders = headers.map(h => CSVUtils.createSlug(h));
    const spanishSlugs = REQUIRED_FIELDS.spanish.map(f => CSVUtils.createSlug(f));
    const englishSlugs = REQUIRED_FIELDS.english.map(f => CSVUtils.createSlug(f));

    const hasSpanish = spanishSlugs.every(slug => slugHeaders.includes(slug));
    const hasEnglish = englishSlugs.every(slug => slugHeaders.includes(slug));

    if (!hasSpanish && !hasEnglish) {
      return {
        success: false,
        errors: [ErrorFactory.createStructureError(
          'Faltan campos esenciales: nivel, id, nombre, descripcion, ud, %iva, pvp'
        )]
      };
    }

    const fieldMap: FieldMap = {};
    const fieldsToMap = hasSpanish ? REQUIRED_FIELDS.spanish : REQUIRED_FIELDS.english;

    fieldsToMap.forEach(field => {
      const slug = CSVUtils.createSlug(field);
      const index = slugHeaders.indexOf(slug);
      if (index !== -1) {
        fieldMap[field] = index;
      }
    });

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
        continue;
      }

      if (rowResult.data) {
        processedData.push(rowResult.data);
      }
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

  /**
   * Procesa una fila individual
   */
  private processRow(
    values: string[],
    fieldMap: FieldMap,
    lineNumber: number
  ): { data: ProcessedRow | null; errors: any[] } {
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
          'nivel',
          `inválido: "${data.nivel}"`,
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
  private validateItem(data: ProcessedRow, lineNumber: number): any[] {
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

    // Validaciones adicionales de números
    if (data['%iva']) {
      const ivaValidation = CSVUtils.validateNumber(data['%iva'], 0, 100);
      if (!ivaValidation.isValid) {
        errors.push(ErrorFactory.createFieldError(
          '%IVA',
          ivaValidation.error!,
          lineNumber,
          data.originalRow
        ));
      }
    }

    if (data.pvp) {
      const pvpValidation = CSVUtils.validateNumber(data.pvp, 0, null);
      if (!pvpValidation.isValid) {
        errors.push(ErrorFactory.createFieldError(
          'PVP',
          pvpValidation.error!,
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
  private validateContainer(data: ProcessedRow, lineNumber: number): any[] {
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
  private validateGlobalConstraints(data: ProcessedRow[]): any[] {
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
  private validateDuplicates(data: ProcessedRow[]): any[] {
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
  private validateHierarchy(data: ProcessedRow[]): any[] {
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
  private validateItemHierarchy(item: ProcessedRow, existingIds: Set<string | undefined>): any {
    if (!item.id) return null;

    const depth = CSVUtils.getHierarchyDepth(item.id);

    if (depth > (this.config.maxHierarchyDepth || 4)) {
      return ErrorFactory.createHierarchyError(
        `Partida ${item.id}: profundidad inválida (${depth} niveles)`,
        item.lineNumber,
        item.originalRow
      );
    }

    const requiredAncestors = CSVUtils.getRequiredAncestors(item.id);
    const missing = requiredAncestors.filter(ancestor => !existingIds.has(ancestor.id));

    if (missing.length > 0) {
      const missingList = missing.map(m => `${m.name}: ${m.id}`).join(', ');
      return ErrorFactory.createHierarchyError(
        `Partida ${item.id}: faltan ancestros: ${missingList}`,
        item.lineNumber,
        item.originalRow
      );
    }

    return null;
  }

  /**
   * Valida secuencias numéricas
   */
  private validateSequences(data: ProcessedRow[]): any[] {
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
            errors.push(ErrorFactory.createSequenceError(
              expected,
              actual,
              items[i].item.originalRow
            ));
          }
        }
      }
    }

    return errors;
  }
}