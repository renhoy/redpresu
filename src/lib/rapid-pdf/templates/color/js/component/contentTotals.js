// ContentTotals adaptado para recibir objeto element y manejar IRPF/RE
// {"_META_file_path_": "template/color/js/component/contentTotals.js"}

// Funciones de formateo de números
function formatSpanishNumber(value, decimals = 2) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0' + (decimals > 0 ? ',' + '0'.repeat(decimals) : '');
  const parts = Math.abs(num).toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1] || '';
  const result = decimals > 0 ? `${integerPart},${decimalPart}` : integerPart;
  return num < 0 ? `-${result}` : result;
}

function formatCurrency(value) {
  return formatSpanishNumber(value, 2) + ' €';
}

class ContentTotals {
  constructor(element) {
    this.element = element;
  }

  render() {
    const ivas = this.element.ivas || [];
    const re = this.element.re || [];
    const hasSubtotal = !!this.element.subtotal;
    const hasIRPF = !!this.element.irpf;
    const hasRE = re.length > 0;

    let html = `<div class="content-totals">
      <div class="totals-mizq"></div>
      <div class="totals">`;

      
      // Base Imponible
      html += `<div class="base">
      <div class="name">${this.element.base_name || ''}</div>
      <div class="amount">${formatCurrency(this.element.base_amount || 0)}</div>
      </div>`;
      
      // IVAs
      if (ivas.length > 0) {
        html += '<div class="ivas">';
        ivas.forEach((iva, index) => {
          html += `<div class="iva${index + 1}">
          <div class="name">${iva.name}</div>
          <div class="amount">${formatCurrency(iva.amount || 0)}</div>
          </div>`;
        });
        html += '</div>';
      }
    
      // Subtotal (opcional - solo si hay IRPF o RE)
      if (hasSubtotal) {
        html += `<div class="subtotal">
            <div class="name">${this.element.subtotal_name || ''}</div>
            <div class="amount">${formatCurrency(this.element.subtotal_amount || 0)}</div>
          </div>`;
      }

    // IRPF (opcional - retención negativa)
    if (hasIRPF) {
      html += `<div class="irpf">
          <div class="name">${this.element.irpf_name || ''}</div>
          <div class="amount irpf-negative">${formatCurrency(this.element.irpf_amount || 0)}</div>
        </div>`;
    }

    // Recargo de Equivalencia (opcional - array de recargos por IVA)
    if (hasRE) {
      html += '<div class="recargos">';
      re.forEach((recargo, index) => {
        html += `<div class="re${index + 1}">
          <div class="name">${recargo.name}</div>
          <div class="amount">${formatCurrency(recargo.amount || 0)}</div>
        </div>`;
      });
      html += '</div>';
    }

    // Total a Pagar
    html += `<div class="total">
          <div class="name">${this.element.total_name || ''}</div>
          <div class="amount">${formatCurrency(this.element.total_amount || 0)}</div>
        </div>
      </div>
    </div>`;

    return html;
  }

  static async create(budgetData, structureData, section = null) {
    const totalsData = budgetData[section].totals;

    // Preparar objeto base
    const elementData = {
      base: totalsData.base,
      ivas: totalsData.ivas,
      total: totalsData.total,
      base_name: totalsData.base.name,
      base_amount: totalsData.base.amount,
      total_name: totalsData.total.name,
      total_amount: totalsData.total.amount
    };

    // Añadir subtotal si existe (casos con IRPF o RE)
    if (totalsData.subtotal) {
      elementData.subtotal = totalsData.subtotal;
      elementData.subtotal_name = totalsData.subtotal.name;
      elementData.subtotal_amount = totalsData.subtotal.amount;
    }

    // Añadir IRPF si existe (casos autónomo → empresa/autónomo)
    if (totalsData.irpf) {
      elementData.irpf = totalsData.irpf;
      elementData.irpf_name = totalsData.irpf.name;
      elementData.irpf_amount = totalsData.irpf.amount;
    }

    // Añadir RE si existe (casos cliente autónomo con RE)
    if (totalsData.re && Array.isArray(totalsData.re)) {
      elementData.re = totalsData.re;
    }

    return new ContentTotals(elementData);
  }

  static async createFromElement(element) {
    return new ContentTotals(element);
  }
}

module.exports = ContentTotals;
