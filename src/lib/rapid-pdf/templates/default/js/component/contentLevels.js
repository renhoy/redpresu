// Componente para mostrar diferentes niveles adaptado para recibir objeto element
// {"_META_file_path_": "template/color/js/component/contentLevels.js"}

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

class ContentLevels {
  constructor(element) {
    this.element = element;
  }

  render() {
    if (!this.element || !this.element.levelData) {
      return '<div class="content-levels"></div>';
    }

    const item = this.element.levelData;
    const level = item.level;

    if (level === "chapter") {
      return this.renderChapter(item);
    } else if (level === "subchapter") {
      return this.renderSubchapter(item);
    } else if (level === "section") {
      return this.renderSection(item);
    } else if (level === "item") {
      return this.renderItem(item);
    }

    return '<div class="content-levels"></div>';
  }

  renderChapter(chapter) {
    return `<div class="content-levels">
      <div class="content-chapter">
        <div class="chapter-l1">
          <div class="chapter-name">${chapter.name || ""}</div>
          <div class="chapter-amount">${formatCurrency(chapter.amount || 0)}</div>
        </div>
      </div>
    </div>`;
  }

  renderSubchapter(subchapter) {
    return `<div class="content-levels">
      <div class="content-subchapter">
        <div class="subchapter-l1">
          <div class="subchapter-name">${subchapter.name || ""}</div>
          <div class="subchapter-amount">${formatCurrency(subchapter.amount || 0)}</div>
        </div>
      </div>
    </div>`;
  }

  renderSection(section) {
    return `<div class="content-levels">
      <div class="content-section">
        <div class="section-l1">
          <div class="section-name">${section.name || ""}</div>
          <div class="section-amount">${formatCurrency(section.amount || 0)}</div>
        </div>
      </div>
    </div>`;
  }

  renderItem(item) {
    let html = `<div class="content-levels">
      <div class="content-item">
        <div class="item-l1">
          <div class="item-name">${item.name || ""}</div>
          <div class="item-amount">${formatCurrency(item.amount || 0)}</div>
        </div>
        <div class="item-l2">
          <div class="item-unit"><span>Unidad: </span>${item.unit || ""}</div>
          <div class="item-quantity"><span>Cantidad: </span>${formatSpanishNumber(item.quantity || 0)}</div>
          <div class="item-pvp"><span>Precio: </span>${formatCurrency(item.pvp || 0)}</div>
          <div class="item-iva_percentage"><span>IVA: </span>${formatSpanishNumber(item.iva_percentage || 21)} %</div>
        </div>`;

    if (item.description) {
      html += `<div class="item-l3">
          <div class="item-description">${item.description}</div>
        </div>`;
    }

    html += `</div>
    </div>`;

    return html;
  }

  static async create(budgetData, structureData, section = null, levelData = null) {
    // Para compatibilidad con el sistema anterior
    return new ContentLevels({
      levelData: levelData,
      section: section
    });
  }

  static async createFromElement(element) {
    return new ContentLevels(element);
  }
}

module.exports = ContentLevels;