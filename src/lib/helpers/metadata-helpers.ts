/**
 * Metadata Helpers
 *
 * Funciones para generar metadata dinámica con app_name desde BD
 */

import type { Metadata } from "next";
import { getAppName } from "@/lib/helpers/config-helpers";

/**
 * Genera metadata dinámica para una página
 *
 * @param pageTitle - Título específico de la página (ej: "Gestión de Usuarios")
 * @param description - Descripción opcional de la página
 * @returns Metadata object con app_name dinámico
 *
 * @example
 * ```typescript
 * export async function generateMetadata(): Promise<Metadata> {
 *   return generatePageMetadata("Gestión de Usuarios");
 * }
 * ```
 */
export async function generatePageMetadata(
  pageTitle: string,
  description?: string
): Promise<Metadata> {
  const appName = await getAppName();

  return {
    title: `${pageTitle} - ${appName}`,
    description:
      description ||
      "Sistema de gestión de presupuestos profesionales para empresas y autónomos",
  };
}

/**
 * Genera metadata para la página principal
 *
 * @returns Metadata object para home/dashboard
 */
export async function generateHomeMetadata(): Promise<Metadata> {
  const appName = await getAppName();

  return {
    title: `${appName} - Gestión de Presupuestos Profesionales`,
    description:
      "Sistema de gestión de presupuestos profesionales para empresas y autónomos",
  };
}

/**
 * Genera metadata para páginas de autenticación
 *
 * @param authType - Tipo de página de auth ("Login", "Registro", "Recuperar Contraseña")
 * @returns Metadata object
 */
export async function generateAuthMetadata(
  authType: string
): Promise<Metadata> {
  const appName = await getAppName();

  return {
    title: `${authType} - ${appName}`,
    description: `${authType} en ${appName}`,
  };
}
