// Componente para mostrar datos del cliente adaptado para recibir objeto element
// {"_META_file_path_": "template/bn/js/component/contentClient.js"}

class ContentClient {
  constructor(element) {
    this.element = element;
  }

  render() {
    return `<div class="content-client">
      <div class="tag-client">
        <div class="tag">Cliente:</div>
      </div>
      <div class="data">
        <div class="name">${this.element.client_name || 'Sin nombre'}</div>
        <div class="nif_nie">${this.element.client_nif_nie || 'Sin NIF/NIE'}</div>
        <div class="address">${this.element.client_address || 'Sin dirección'}</div>
        <div class="contact">${this.element.client_contact || 'Sin contacto'}</div>
      </div>
    </div>`;
  }

  static async create(budgetData, structureData, section = null, componentData = null, pageInfo = null) {
    // Para compatibilidad con el sistema anterior
    return new ContentClient({
      client_name: budgetData[section]?.client?.name,
      client_nif_nie: budgetData[section]?.client?.nif_nie,
      client_address: budgetData[section]?.client?.address,
      client_contact: budgetData[section]?.client?.contact
    });
  }

  static async createFromElement(element) {
    return new ContentClient(element);
  }
}

module.exports = ContentClient;