// FooterPagination adaptado para recibir objeto element
// {"_META_file_path_": "template/bn/js/component/footerPagination.js"}

class FooterPagination {
  constructor(element) {
    this.element = element;
  }

  render() {
    let printDate, validityDate;
    
    if (this.element.pagination_budget_date) {
      const [day, month, year] = this.element.pagination_budget_date.split("-");
      const baseDate = new Date(`${year}-${month}-${day}`);
      printDate = `${parseInt(day)}/${parseInt(month)}/${year}`;
      
      const validityDays = this.element.pagination_validity ? parseInt(this.element.pagination_validity) : 30;
      const validityDateObj = new Date(baseDate);
      validityDateObj.setDate(validityDateObj.getDate() + validityDays);
      validityDate = `${validityDateObj.getDate()}/${validityDateObj.getMonth() + 1}/${validityDateObj.getFullYear()}`;
    } else {
      const today = new Date();
      printDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      
      const validityDateObj = new Date(today);
      validityDateObj.setDate(validityDateObj.getDate() + 30);
      validityDate = `${validityDateObj.getDate()}/${validityDateObj.getMonth() + 1}/${validityDateObj.getFullYear()}`;
    }

    return `<div class="footer-pagination">
      <div class="print-date">Impreso el ${printDate}</div>
      <div class="validity">Este presupuesto es válido hasta el ${validityDate}</div>
      <div class="pages paginas">Página ${this.element.current_page || 1} de ${this.element.total_pages || 1}</div>
    </div>`;
  }

  static async create(budgetData, structureData, section = null, componentData = null, pageInfo = null) {
    const sections = Object.keys(structureData.document.sections || {});
    let budget_date = null;
    let validity_days = null;

    for (const sectionKey of sections) {
      const clientData = budgetData[sectionKey]?.client;
      if (clientData?.budget_date) {
        budget_date = clientData.budget_date;
        validity_days = clientData.validity ? parseInt(clientData.validity) : 30;
        break;
      }
    }

    return new FooterPagination({
      pagination_budget_date: budget_date,
      pagination_validity: validity_days,
      current_page: pageInfo?.currentPage || 1,
      total_pages: pageInfo?.totalPages || 1
    });
  }

  static async createFromElement(element) {
    return new FooterPagination(element);
  }
}

module.exports = FooterPagination;