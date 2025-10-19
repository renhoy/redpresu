import 'server-only';
import matter from 'gray-matter';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import type { HelpArticle, HelpArticleMeta } from './markdown-types';

// Re-export types for convenience
export type { HelpArticle, HelpArticleMeta } from './markdown-types';

/**
 * Lee un archivo de ayuda Markdown desde /public/help/
 * @param slug - nombre del archivo sin extensión (ej: "crear-tarifa")
 * @returns Artículo parseado con frontmatter y HTML
 */
export async function getHelpArticle(slug: string): Promise<HelpArticle | null> {
  try {
    const helpDir = path.join(process.cwd(), 'public', 'help');
    const filePath = path.join(helpDir, `${slug}.md`);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`[getHelpArticle] Archivo no encontrado: ${filePath}`);
      return null;
    }

    // Leer archivo
    const fileContents = fs.readFileSync(filePath, 'utf8');

    // Parsear frontmatter
    const { data, content } = matter(fileContents);

    // Convertir Markdown a HTML
    const htmlContent = await marked(content);

    return {
      id: data.id || slug,
      title: data.title || 'Sin título',
      category: data.category || 'General',
      tourId: data.tourId,
      visible: data.visible || 'all', // Default: visible para todos
      content,
      htmlContent,
    };
  } catch (error) {
    console.error('[getHelpArticle] Error leyendo archivo:', error);
    return null;
  }
}

/**
 * Lista todos los artículos de ayuda disponibles
 * @returns Array de metadatos de artículos (sin contenido completo)
 */
export async function getAllHelpArticles(): Promise<HelpArticleMeta[]> {
  try {
    const helpDir = path.join(process.cwd(), 'public', 'help');

    // Verificar si el directorio existe
    if (!fs.existsSync(helpDir)) {
      console.warn('[getAllHelpArticles] Directorio /public/help no existe');
      return [];
    }

    // Leer todos los archivos .md
    const files = fs.readdirSync(helpDir).filter((file) => file.endsWith('.md'));

    const articles: HelpArticleMeta[] = [];

    for (const file of files) {
      const filePath = path.join(helpDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      const slug = file.replace(/\.md$/, '');

      articles.push({
        id: data.id || slug,
        title: data.title || 'Sin título',
        category: data.category || 'General',
        tourId: data.tourId,
        visible: data.visible || 'all', // Default: visible para todos
      });
    }

    return articles;
  } catch (error) {
    console.error('[getAllHelpArticles] Error listando artículos:', error);
    return [];
  }
}

// Re-export utilities for convenience
export { groupArticlesByCategory, filterArticlesByRole, canUserViewArticle } from './markdown-types';
