/**
 * Tipos y utilidades compartidas para el sistema de ayuda Markdown
 * Este archivo NO contiene código server-only y puede ser importado desde cliente
 */

/**
 * Roles de visibilidad para artículos de ayuda
 * - all: Visible para todos los usuarios autenticados
 * - superadmin: Solo visible para superadmins
 * - admin: Visible para admins y superadmins
 * - vendedor: Visible para vendedores, admins y superadmins
 */
export type ArticleVisibility = 'all' | 'superadmin' | 'admin' | 'vendedor';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  tourId?: string;
  visible: ArticleVisibility;
  content: string;
  htmlContent: string;
}

export interface HelpArticleMeta {
  id: string;
  title: string;
  category: string;
  tourId?: string;
  visible: ArticleVisibility;
}

/**
 * Verifica si un usuario puede ver un artículo según su rol
 * @param articleVisibility - Nivel de visibilidad del artículo
 * @param userRole - Rol del usuario actual
 * @returns true si el usuario puede ver el artículo
 */
export function canUserViewArticle(
  articleVisibility: ArticleVisibility,
  userRole: string
): boolean {
  // Si el artículo es visible para todos
  if (articleVisibility === 'all') {
    return true;
  }

  // Si el artículo es solo para superadmin
  if (articleVisibility === 'superadmin') {
    return userRole === 'superadmin';
  }

  // Si el artículo es para admin y superiores
  if (articleVisibility === 'admin') {
    return userRole === 'admin' || userRole === 'superadmin';
  }

  // Si el artículo es para vendedor y superiores
  if (articleVisibility === 'vendedor') {
    return userRole === 'vendedor' || userRole === 'admin' || userRole === 'superadmin';
  }

  return false;
}

/**
 * Filtra artículos según el rol del usuario
 * @param articles - Array de metadatos de artículos
 * @param userRole - Rol del usuario actual
 * @returns Array filtrado de artículos que el usuario puede ver
 */
export function filterArticlesByRole(
  articles: HelpArticleMeta[],
  userRole: string
): HelpArticleMeta[] {
  return articles.filter(article => canUserViewArticle(article.visible, userRole));
}

/**
 * Agrupa artículos por categoría
 * @param articles - Array de metadatos de artículos
 * @returns Objeto con categorías como keys y arrays de artículos como values
 */
export function groupArticlesByCategory(
  articles: HelpArticleMeta[]
): Record<string, HelpArticleMeta[]> {
  return articles.reduce((acc, article) => {
    const category = article.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(article);
    return acc;
  }, {} as Record<string, HelpArticleMeta[]>);
}
