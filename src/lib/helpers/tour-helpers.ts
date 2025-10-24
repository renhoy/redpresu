import { driver, DriveStep, Config as DriverConfig } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface TourConfig {
  steps: DriveStep[];
}

export interface ToursData {
  [tourId: string]: TourConfig;
}

const TOUR_STORAGE_KEY = 'pending_tour';

/**
 * Lee la configuración de tours desde /public/help/tours.json
 * @returns Objeto con configuraciones de todos los tours
 */
export async function loadToursConfig(): Promise<ToursData> {
  try {
    const response = await fetch('/help/tours.json');
    if (!response.ok) {
      console.error('[loadToursConfig] Error cargando tours.json:', response.statusText);
      return {};
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[loadToursConfig] Error parseando tours.json:', error);
    return {};
  }
}

/**
 * Guarda un tourId en sessionStorage para ejecutarlo después de redirección
 * @param tourId - ID del tour a ejecutar
 */
export function setPendingTour(tourId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TOUR_STORAGE_KEY, tourId);
  }
}

/**
 * Obtiene el tourId pendiente desde sessionStorage
 * @returns tourId si existe, null si no
 */
export function getPendingTour(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(TOUR_STORAGE_KEY);
  }
  return null;
}

/**
 * Limpia el tour pendiente de sessionStorage
 */
export function clearPendingTour(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(TOUR_STORAGE_KEY);
  }
}

/**
 * Inicia un tour de Driver.js
 * @param tourId - ID del tour a ejecutar
 * @param toursData - Configuración de todos los tours
 */
export async function startTour(tourId: string, toursData?: ToursData): Promise<void> {
  try {
    // Cargar configuración si no se proveyó
    if (!toursData) {
      toursData = await loadToursConfig();
    }

    const tourConfig = toursData[tourId];

    if (!tourConfig) {
      console.error(`[startTour] Tour no encontrado: ${tourId}`);
      return;
    }

    // Configuración de Driver.js
    const driverConfig: DriverConfig = {
      showProgress: true,
      steps: tourConfig.steps,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      progressText: '{{current}} de {{total}}',
      popoverClass: 'driver-popover-lime',
      onDestroyStarted: () => {
        // Limpiar tour pendiente al finalizar
        clearPendingTour();
        driverObj.destroy();
      },
    };

    const driverObj = driver(driverConfig);
    driverObj.drive();
  } catch (error) {
    console.error('[startTour] Error iniciando tour:', error);
  }
}

/**
 * Verifica si hay un tour pendiente y lo ejecuta automáticamente
 * @param toursData - Configuración de todos los tours (opcional)
 */
export async function checkAndStartPendingTour(toursData?: ToursData): Promise<void> {
  const pendingTourId = getPendingTour();

  if (pendingTourId) {
    console.log('[checkAndStartPendingTour] Tour pendiente detectado:', pendingTourId);

    // Esperar un momento para que el DOM se renderice completamente
    setTimeout(async () => {
      await startTour(pendingTourId, toursData);
    }, 500);
  }
}
