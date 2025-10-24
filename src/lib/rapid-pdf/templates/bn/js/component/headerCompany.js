// HeaderCompany con estilo inline hardcodeado y top dinámico
// {"_META_file_path_": "template/bn/js/component/headerCompany.js"}

class HeaderCompany {
  constructor(element, yPosition = 40) {
    this.element = element;
    this.yPosition = yPosition;
  }

  render() {
    return `<div class="header-company" style="position: absolute; left: 0px; top: ${this.yPosition}px; width: 100%;">
  <div class="logo"><img src="${this.element.logo || ''}" alt="${this.element.name || ''}">
  </div>
  <div class="data">
    <div class="name">${this.element.name || ''}</div>
    <div class="nif">${this.element.nif || ''}</div>
    <div class="address">${this.element.address || ''}</div>
    <div class="contact">${this.element.contact || ''}</div>
  </div>
</div>`;
  }

  static async create(budgetData, structureData, section = null, componentData = null, pageInfo = null) {
    const yPosition = pageInfo?.yPosition || 40;
    
    return new HeaderCompany({
      name: budgetData.company.name,
      nif: budgetData.company.nif,
      address: budgetData.company.address,
      contact: budgetData.company.contact,
      logo: budgetData.company.logo,
      templateId: budgetData.company.template
    }, yPosition);
  }

  static async createFromElement(element, yPosition = 40) {
    return new HeaderCompany(element, yPosition);
  }
}

module.exports = HeaderCompany;