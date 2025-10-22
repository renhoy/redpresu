/**
 * PageManager - Gestión de paginación y configuración
 * Migrado desde: js/core/PageManager.js
 */

import type { PageConfig } from "../types";

export class PageManager {
  private Y_content_bottom: number = 0;
  private margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } = { top: 0, bottom: 0, left: 0, right: 0 };
  private general_margin: number = 0;
  private totalPages: number = 0;

  public pagination = {
    currentPage: 1,
    totalPages: 1,
  };

  /**
   * Configura los parámetros de página
   */
  config(pageConfig: PageConfig): void {
    this.Y_content_bottom = pageConfig.content_bottom;
    this.margins = pageConfig.margins;
    this.general_margin = pageConfig.general_margin;
    this.totalPages = 0;

    console.log("PageManager configurado:", {
      content_bottom: this.Y_content_bottom,
      margins: this.margins,
      general_margin: this.general_margin,
    });
  }

  /**
   * Crea una nueva página
   */
  createNewPage(): { pageNum: number; marginTop: number } {
    this.totalPages++;

    this.pagination.currentPage = this.totalPages;
    this.pagination.totalPages = this.totalPages;

    console.log(`PageManager: Página ${this.totalPages} creada`);

    return {
      pageNum: this.totalPages,
      marginTop: this.margins.top,
    };
  }

  /**
   * Obtiene la posición Y del salto de página
   */
  getYPageBreak(): number {
    return this.Y_content_bottom;
  }

  /**
   * Obtiene los márgenes configurados
   */
  getMargins(): typeof this.margins {
    return this.margins;
  }

  /**
   * Obtiene el margen general
   */
  getGeneralSpace(): number {
    return this.general_margin;
  }

  /**
   * Obtiene el total de páginas
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * Actualiza la información de paginación
   */
  updatePagination(): void {
    this.pagination.totalPages = this.totalPages;

    console.log(
      `PageManager: Paginación actualizada - ${this.totalPages} páginas totales`
    );
  }

  /**
   * Verifica si un elemento cabe en la página actual
   */
  canFitInPage(elementHeight: number, currentHeight: number): boolean {
    return currentHeight + elementHeight <= this.Y_content_bottom;
  }
}
