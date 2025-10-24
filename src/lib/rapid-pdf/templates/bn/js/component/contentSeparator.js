// Componente para separador horizontal adaptado para recibir objeto element
// {"_META_file_path_": "template/bn/js/component/contentSeparator.js"}

class ContentSeparator {
  constructor(element) {
    this.element = element;
  }

  render() {
    let style = '';
    
    if (this.element.color) {
      style += `background-color: ${this.element.color};`;
    }
    
    if (this.element.height) {
      style += `height: ${this.element.height}px;`;
    }

    return `<div class="content-separator"${style ? ` style="${style}"` : ''}></div>`;
  }

  static async create(budgetData, structureData, section = null) {
    return new ContentSeparator({});
  }

  static async createFromElement(element) {
    return new ContentSeparator(element);
  }
}

module.exports = ContentSeparator;