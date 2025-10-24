// HeaderTitle adaptado para recibir objeto element
// {"_META_file_path_": "template/color/js/component/headerTitle.js"}

class HeaderTitle {
  constructor(element) {
    this.element = element;
  }

  render() {
    return `<div class="header-title">
      <h1 class="title">${this.element.title || 'Presupuesto'}</h1>
    </div>`;
  }

  static async create(budgetData, structureData, section = null) {
    return new HeaderTitle({
      title: budgetData[section]?.title || "Presupuesto"
    });
  }

  static async createFromElement(element) {
    return new HeaderTitle(element);
  }
}

module.exports = HeaderTitle;