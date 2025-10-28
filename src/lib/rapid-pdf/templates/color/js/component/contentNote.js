// Componente para notas adaptado para recibir objeto element
// {"_META_file_path_": "template/color/js/component/contentNote.js"}

class ContentNote {
  constructor(element) {
    this.element = element;
  }

  /**
   * Detecta si el texto contiene HTML
   */
  isHTML(text) {
    return /<[^>]+>/.test(text);
  }

  /**
   * Limpia HTML a texto plano (fallback)
   */
  stripHTML(html) {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  /**
   * Convierte enlaces Markdown [texto](url) a HTML <a href="url">texto</a>
   */
  convertMarkdownLinks(text) {
    // Convertir [texto](url) a <a href="url">texto</a>
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  /**
   * Limpia clases CSS innecesarias (especialmente Tailwind)
   */
  cleanCSSClasses(html) {
    // Eliminar clases de Tailwind y otras clases innecesarias de listas y elementos
    return html
      .replace(/\s*class=["'][^"']*["']/g, "") // Eliminar todos los atributos class
      .replace(/\s+>/g, ">") // Limpiar espacios antes de >
      .replace(/\s{2,}/g, " "); // Normalizar espacios múltiples
  }

  /**
   * Procesa el contenido: HTML o texto plano
   * - Convierte párrafos vacíos en espacios visibles
   * - Mantiene listas con bullets
   * - Respeta separación entre párrafos
   * - Limpia clases CSS innecesarias
   */
  processContent(content) {
    if (!content || content.trim() === "") {
      return "";
    }

    // Convertir enlaces Markdown a HTML SIEMPRE (antes de cualquier otra cosa)
    let processedContent = this.convertMarkdownLinks(content);

    // Si NO contiene HTML, envolver texto plano en <p>
    if (!this.isHTML(content)) {
      return `<p>${processedContent}</p>`;
    }

    // PASO 1: Limpiar clases CSS (especialmente de Tailwind)
    processedContent = this.cleanCSSClasses(processedContent);

    // PASO 1.5: Añadir padding-bottom a todos los párrafos para espaciado
    // IMPORTANTE: Usar padding-bottom en lugar de margin-bottom porque offsetHeight SÍ incluye padding
    processedContent = processedContent.replace(
      /<p([^>]*)>/g,
      (match, attributes) => {
        // Si ya tiene style, añadir padding-bottom al final
        if (attributes.includes("style=")) {
          return match.replace(
            /style="([^"]*)"/g,
            'style="$1; padding-bottom: 5px;"'
          );
        } else {
          // Si no tiene style, añadirlo
          return `<p${attributes} style="padding-bottom: 5px;">`;
        }
      }
    );

    // PASO 2: Reemplazar párrafos vacíos por párrafos con espacio no rompible
    // Esto asegura que se rendericen las líneas en blanco entre párrafos
    processedContent = processedContent
      .replace(/<p><\/p>/g, "<p>&nbsp;</p>") // <p></p> → <p>&nbsp;</p>
      .replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, "<p>&nbsp;</p>") // <p><br></p> → <p>&nbsp;</p>
      .replace(/<p>\s+<\/p>/g, "<p>&nbsp;</p>"); // <p>   </p> → <p>&nbsp;</p>

    // PASO 3: Normalizar estructura de listas
    // Asegurar que las listas tengan estructura correcta sin clases
    // El CSS ya maneja los bullets automáticamente (list-style-type: disc/decimal)

    // PASO 4: Limpiar espacios innecesarios pero mantener estructura
    processedContent = processedContent
      .replace(/>\s+</g, "><") // Eliminar espacios entre tags
      .trim();

    // PASO 5: Verificar que no quedó completamente vacío después del procesamiento
    const tempDiv = processedContent.replace(/<[^>]+>/g, "").trim();
    if (tempDiv === "" || tempDiv === "&nbsp;") {
      return "";
    }

    return processedContent;
  }

  render() {
    if (!this.element || !this.element.paragraphData) {
      return '<div class="content-note"></div>';
    }

    const processedContent = this.processContent(this.element.paragraphData);

    if (!processedContent) {
      return '<div class="content-note"></div>';
    }

    return `<div class="content-note">
      <div class="note-content">${processedContent}</div>
    </div>`;
  }

  static async create(
    budgetData,
    structureData,
    section = null,
    paragraph = null
  ) {
    return new ContentNote({
      paragraphData: paragraph,
      section: section,
    });
  }

  static async createFromElement(element) {
    return new ContentNote(element);
  }
}

module.exports = ContentNote;
