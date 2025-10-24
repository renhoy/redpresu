// Componente para notas adaptado para recibir objeto element
// {"_META_file_path_": "template/bn/js/component/contentNote.js"}

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
    return html.replace(/<[^>]+>/g, '').trim();
  }

  /**
   * Convierte enlaces Markdown [texto](url) a HTML <a href="url">texto</a>
   */
  convertMarkdownLinks(text) {
    // Convertir [texto](url) a <a href="url">texto</a>
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  /**
   * Procesa el contenido: HTML o texto plano
   */
  processContent(content) {
    if (!content || content.trim() === '' || content === '<p></p>') {
      return '';
    }

    // Convertir enlaces Markdown a HTML SIEMPRE (antes de cualquier otra cosa)
    let processedContent = this.convertMarkdownLinks(content);

    // Si ya contiene HTML, retornar como está (ya procesados los enlaces)
    if (this.isHTML(content)) {
      return processedContent;
    }

    // Si es texto plano, envolver en <p>
    return `<p>${processedContent}</p>`;
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

  static async create(budgetData, structureData, section = null, paragraph = null) {
    return new ContentNote({
      paragraphData: paragraph,
      section: section
    });
  }

  static async createFromElement(element) {
    return new ContentNote(element);
  }
}

module.exports = ContentNote;