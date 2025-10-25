// Componente para mostrar datos del cliente adaptado para recibir objeto element
// {"_META_file_path_": "template/color/js/component/contentClient.js"}

class ContentClient {
  constructor(element) {
    this.element = element;
  }

  render() {
    return `<div class="content-client">
      <div class="tag-budget-number">
        <div class="tag">Presupuesto:</div>
      </div>
      <div class="data">
        <div class="budget-number">${
          this.element.budget_number || "Sin Número"
        }</div>
      </div>

      <div class="tag-client">
        <div class="tag">Cliente:</div>
      </div>
      <div class="data">
        <div class="name">${this.element.client_name || "Sin nombre"}</div>
        <div class="nif_nie">${
          this.element.client_nif_nie || "Sin NIF/NIE"
        }</div>
        <div class="address">${
          this.element.client_address || "Sin dirección"
        }</div>
        <div class="contact">${
          this.element.client_contact || "Sin contacto"
        }</div>
      </div>
    </div>`;
  }
}

module.exports = ContentClient;
