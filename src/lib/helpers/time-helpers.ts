/**
 * Time Helpers - Sistema de Mock Time para Testing
 *
 * Centraliza la obtención de fecha/hora actual para permitir simulación de fechas
 * en entorno de testing sin afectar producción.
 *
 * SEGURIDAD:
 * - Mock time solo funciona en NODE_ENV !== 'production'
 * - Logs de auditoría cuando se activa
 * - Indicadores visuales en UI
 */

import { getConfigValue } from './config-helpers'

// Store en memoria para mock time (solo proceso actual)
let mockTimeInMemory: Date | null = null

/**
 * Obtiene la fecha/hora actual (real o mockeada)
 *
 * Orden de prioridad:
 * 1. Mock time en memoria (setMockTime)
 * 2. Mock time en BD (config 'mock_time')
 * 3. Fecha real del sistema (new Date())
 */
export async function getCurrentTime(): Promise<Date> {
  // En producción, siempre retornar fecha real
  if (process.env.NODE_ENV === 'production') {
    return new Date()
  }

  // Prioridad 1: Mock en memoria
  if (mockTimeInMemory !== null) {
    return new Date(mockTimeInMemory)
  }

  // Prioridad 2: Mock en BD
  try {
    const mockTimeConfig = await getConfigValue('mock_time')
    if (mockTimeConfig && mockTimeConfig !== 'null') {
      const mockDate = new Date(mockTimeConfig as string)
      if (!isNaN(mockDate.getTime())) {
        console.log('[getCurrentTime] Usando mock time desde BD:', mockTimeConfig)
        return mockDate
      }
    }
  } catch (error) {
    console.error('[getCurrentTime] Error leyendo mock_time desde BD:', error)
  }

  // Fallback: Fecha real
  return new Date()
}

/**
 * Versión síncrona de getCurrentTime (solo usa memoria, no BD)
 * Usar solo cuando no se puede await (ej: middleware, edge functions)
 */
export function getCurrentTimeSync(): Date {
  if (process.env.NODE_ENV === 'production') {
    return new Date()
  }

  if (mockTimeInMemory !== null) {
    return new Date(mockTimeInMemory)
  }

  return new Date()
}

/**
 * Establece fecha/hora simulada en memoria
 * Solo funciona en entorno NO producción
 *
 * @param date - Fecha a simular (Date | string ISO | null para limpiar)
 * @throws Error si se intenta usar en producción
 */
export function setMockTime(date: Date | string | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[setMockTime] Mock time no permitido en producción')
  }

  if (date === null) {
    console.log('[setMockTime] Limpiando mock time')
    mockTimeInMemory = null
    return
  }

  const mockDate = new Date(date)
  if (isNaN(mockDate.getTime())) {
    throw new Error(`[setMockTime] Fecha inválida: ${date}`)
  }

  console.log('[setMockTime] Mock time activado:', mockDate.toISOString())
  mockTimeInMemory = mockDate
}

/**
 * Limpia mock time de memoria
 */
export function clearMockTime(): void {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[clearMockTime] Ignorado en producción')
    return
  }

  console.log('[clearMockTime] Mock time limpiado')
  mockTimeInMemory = null
}

/**
 * Verifica si mock time está activo (memoria o BD)
 */
export async function isMockTimeActive(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // Check en memoria
  if (mockTimeInMemory !== null) {
    return true
  }

  // Check en BD
  try {
    const mockTimeConfig = await getConfigValue('mock_time')
    return mockTimeConfig !== null && mockTimeConfig !== 'null'
  } catch {
    return false
  }
}

/**
 * Versión síncrona de isMockTimeActive (solo memoria)
 */
export function isMockTimeActiveSync(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  return mockTimeInMemory !== null
}

/**
 * Obtiene el mock time actual (si está activo)
 * @returns Date mockeada o null si no está activa
 */
export async function getMockTime(): Promise<Date | null> {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  if (mockTimeInMemory !== null) {
    return new Date(mockTimeInMemory)
  }

  try {
    const mockTimeConfig = await getConfigValue('mock_time')
    if (mockTimeConfig && mockTimeConfig !== 'null') {
      const mockDate = new Date(mockTimeConfig as string)
      if (!isNaN(mockDate.getTime())) {
        return mockDate
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Avanza el mock time N días
 * Solo funciona si mock time ya está activo
 *
 * @param days - Número de días a avanzar (puede ser negativo para retroceder)
 */
export async function advanceMockTime(days: number): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[advanceMockTime] No permitido en producción')
  }

  const currentMock = await getMockTime()
  if (!currentMock) {
    throw new Error('[advanceMockTime] Mock time no está activo. Usa setMockTime() primero.')
  }

  const newDate = new Date(currentMock)
  newDate.setDate(newDate.getDate() + days)

  setMockTime(newDate)
  console.log(`[advanceMockTime] Avanzado ${days} días → ${newDate.toISOString()}`)
}

/**
 * Formatea fecha para display en UI
 * Usa getCurrentTime() si date no se provee
 *
 * @param date - Fecha a formatear (opcional, default: getCurrentTime())
 * @param options - Opciones de formato Intl.DateTimeFormat
 */
export async function formatCurrentDate(
  date?: Date,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): Promise<string> {
  const dateToFormat = date || await getCurrentTime()
  return new Intl.DateTimeFormat('es-ES', options).format(dateToFormat)
}

/**
 * Calcula días hasta una fecha (positivo = futuro, negativo = pasado)
 *
 * @param targetDate - Fecha objetivo
 * @returns Número de días (entero)
 */
export async function daysUntil(targetDate: Date | string): Promise<number> {
  const now = await getCurrentTime()
  const target = new Date(targetDate)

  if (isNaN(target.getTime())) {
    throw new Error(`[daysUntil] Fecha inválida: ${targetDate}`)
  }

  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Verifica si una fecha ya pasó (teniendo en cuenta mock time)
 *
 * @param date - Fecha a verificar
 * @returns true si la fecha ya pasó
 */
export async function isPast(date: Date | string): Promise<boolean> {
  const now = await getCurrentTime()
  const target = new Date(date)

  if (isNaN(target.getTime())) {
    throw new Error(`[isPast] Fecha inválida: ${date}`)
  }

  return target < now
}

/**
 * Verifica si una fecha está en el futuro (teniendo en cuenta mock time)
 *
 * @param date - Fecha a verificar
 * @returns true si la fecha está en el futuro
 */
export async function isFuture(date: Date | string): Promise<boolean> {
  const now = await getCurrentTime()
  const target = new Date(date)

  if (isNaN(target.getTime())) {
    throw new Error(`[isFuture] Fecha inválida: ${date}`)
  }

  return target > now
}

/**
 * Añade N días a una fecha
 *
 * @param date - Fecha base
 * @param days - Número de días a añadir (puede ser negativo)
 * @returns Nueva fecha con los días añadidos
 */
export async function addDays(date: Date | string, days: number): Promise<Date> {
  const baseDate = new Date(date)

  if (isNaN(baseDate.getTime())) {
    throw new Error(`[addDays] Fecha inválida: ${date}`)
  }

  const result = new Date(baseDate)
  result.setDate(result.getDate() + days)

  return result
}

/**
 * Resta N días a una fecha
 *
 * @param date - Fecha base
 * @param days - Número de días a restar
 * @returns Nueva fecha con los días restados
 */
export async function subtractDays(date: Date | string, days: number): Promise<Date> {
  return addDays(date, -days)
}
