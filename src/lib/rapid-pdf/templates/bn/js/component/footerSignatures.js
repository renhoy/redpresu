// FooterSignatures adaptado para recibir objeto element
// {"_META_file_path_": "template/bn/js/component/footerSignatures.js"}

class FooterSignatures {
  constructor(element) {
    this.element = element;
  }

  render() {
    return `<div class="footer-signatures">
      <div class="client-signature">
        <div class="label">
          El cliente ha leido y acepta los precios de los productos y servicios y firma este presupuesto
        </div>
        <div class="client">
          <span>FIRMA DEL CLIENTE: </span>${this.element.signature_client_name || ''}, ${this.element.signature_client_nif_nie || ''}
        </div>
      </div>
      <div class="company-signature">
        <div class="company-logo">
          <img src="${this.element.signature_company_logo || ''}" alt="${this.element.signature_company_name || ''}">
        </div>
        <div class="company-data">
          <div class="company-name">${this.element.signature_company_name || ''}</div>
          <div class="company-nif">${this.element.signature_company_nif || ''}</div>
          <div class="company-address">${this.element.signature_company_address || ''}</div>
          <div class="company-contact">${this.element.signature_company_contact || ''}</div>
        </div>
      </div>
    </div>`;
  }

  static async create(budgetData, structureData, section = null) {
    const clientData = budgetData[section].client;
    const companyData = budgetData.company;

    return new FooterSignatures({
      signature_client_name: clientData.name,
      signature_client_nif_nie: clientData.nif_nie,
      signature_company_name: companyData.name,
      signature_company_nif: companyData.nif,
      signature_company_address: companyData.address,
      signature_company_contact: companyData.contact,
      signature_company_logo: companyData.logo
    });
  }

  static async createFromElement(element) {
    return new FooterSignatures(element);
  }
}

module.exports = FooterSignatures;