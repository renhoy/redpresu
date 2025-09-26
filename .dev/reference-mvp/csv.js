// Aplicación web que usa el módulo CSV2JSON
// {"_META_file_path_": "csv.js"}

class CSVApp {
  constructor() {
    this.converter = new CSV2JSONConverter();
    this.jsonData = [];
    this.currentItemIndex = 0;
    this.initialize();
  }

  initialize() {
    this.initializeEventListeners();
    this.initializeColorControls();
  }

  initializeEventListeners() {
    const csvFileInput = document.getElementById('csvFile');
    const downloadJsonBtn = document.getElementById('downloadJson');
    const downloadCsvBtn = document.getElementById('downloadCsv');

    csvFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    downloadJsonBtn.addEventListener('click', () => this.downloadFile('json'));
    downloadCsvBtn.addEventListener('click', () => this.downloadFile('csv'));
  }

  initializeColorControls() {
    const primaryInput = document.getElementById('primaryColor');
    const secondaryInput = document.getElementById('secondaryColor');

    primaryInput.addEventListener('input', (e) => 
      this.updateColor('primary', e.target.value)
    );
    secondaryInput.addEventListener('input', (e) => 
      this.updateColor('secondary', e.target.value)
    );
  }

  updateColor(type, color) {
    const property = type === 'primary' ? '--primary-color' : '--secondary-color';
    document.documentElement.style.setProperty(property, color);
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => this.processCSV(e.target.result);
    reader.readAsText(file);
  }

  async processCSV(csvContent) {
    const result = await this.converter.convertCSVToJSON(csvContent);
    
    if (result.success) {
      this.jsonData = result.data;
      this.displayResults();
    } else {
      this.showErrorsInJsonPanel(result.errors);
    }
  }

  displayResults() {
    document.getElementById('jsonOutput').textContent = JSON.stringify(
      this.jsonData, null, 2
    );
    this.displayHierarchy();
    document.getElementById('downloadJson').disabled = false;
    document.getElementById('downloadCsv').disabled = false;
  }

  showErrorsInJsonPanel(errors) {
    // Convertir objetos de error a strings legibles
    const errorMessages = errors.map(error => {
      if (typeof error === 'object') {
        let message = error.message || 'Error desconocido';
        
        // Mostrar contenido de la línea si existe
        if (error.originalRow) {
          const csvLine = error.originalRow.map(field => `"${field}"`).join(',');
          message = `${csvLine} ← ${message}`;
        } else if (error.line) {
          message = `Línea ${error.line}: ${message}`;
        }
        
        return message;
      }
      return error.toString();
    });

    const errorHtml = `
<div class="error-container">
  <h3>❌ El archivo no es válido</h3>
  <p>El archivo CSV contiene errores. Pulse <strong>Copiar Errores</strong> para copiar el informe de errores al portapapeles.</p>
  <div class="error-details">
    <strong>Errores encontrados:</strong>
    <ul class="error-list">
      ${errorMessages.map(error => `<li>${error}</li>`).join('')}
    </ul>
  </div>
  <div class="error-actions">
    <button class="copy-error-btn" onclick="csvApp.copyErrorsToClipboard()">
      📋 Copiar Errores
    </button>
    <button class="download-template-btn" onclick="csvApp.downloadTemplate()">
      📄 Descargar Plantilla
    </button>
  </div>
</div>`;
    
    document.getElementById('jsonOutput').innerHTML = errorHtml;
    document.getElementById('hierarchyOutput').innerHTML = '<p class="placeholder">Corrige los errores para ver la estructura jerárquica</p>';
    document.getElementById('downloadJson').disabled = true;
    document.getElementById('downloadCsv').disabled = true;
  }

  displayHierarchy() {
    const container = document.getElementById('hierarchyOutput');
    container.innerHTML = this.buildHierarchyHTML(this.jsonData);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    this.initializeAccordions();
    this.initializeItemNavigation();
  }

  buildHierarchyHTML(data) {
    let html = '';
    let i = 0;

    while (i < data.length) {
      const item = data[i];
      const children = this.getDirectChildren(data, i);

      const containerClass = item.level === 'item' 
        ? 'level-container level-item' 
        : `level-container level-${item.level}`;
      
      html += `<div class="${containerClass}">`;
      html += `<div class="level-header" data-level="${item.level}" data-id="${item.id}">`;
      html += `<span class="level-toggle collapsed">▼</span>`;
      html += `<span>${item.name}</span>`;
      html += `</div>`;

      if (item.level === 'item') {
        const ivaFormatted = this.formatNumberForDisplay(item.iva_percentage);
        const pvpFormatted = this.formatNumberForDisplay(item.pvp);

        html += `<div class="collapsible" data-item-id="${item.id}">`;
        html += `<div class="level-item-details">`;
        html += `<button class="description-btn" data-description="${this.encodeDescription(item.description)}" data-lucide="file-text"></button>`;
        html += `<span>${item.unit}</span>`;
        html += `<span>%IVA: ${ivaFormatted}</span>`;
        html += `<span class="item-price">PVP: ${pvpFormatted} €</span>`;
        html += `</div>`;
        html += `</div>`;
      }

      if (children.items.length > 0) {
        html += `<div class="collapsible" data-parent-id="${item.id}">`;
        html += `<div class="level-children">`;
        html += this.buildHierarchyHTML(children.items);
        html += `</div>`;
        html += `</div>`;
        i = children.nextIndex;
      } else {
        i++;
      }

      html += `</div>`;
    }

    return html;
  }

  getDirectChildren(data, parentIndex) {
    const parentItem = data[parentIndex];
    const children = [];
    let i = parentIndex + 1;

    while (i < data.length) {
      const currentItem = data[i];

      if (this.isDirectChild(parentItem, currentItem)) {
        const childWithDescendants = this.getItemWithDescendants(data, i);
        children.push(...childWithDescendants.items);
        i = childWithDescendants.nextIndex;
      } else {
        break;
      }
    }

    return { items: children, nextIndex: i };
  }

  getItemWithDescendants(data, startIndex) {
    const items = [data[startIndex]];
    const parentItem = data[startIndex];
    let i = startIndex + 1;

    while (i < data.length && this.isDescendant(parentItem, data[i])) {
      items.push(data[i]);
      i++;
    }

    return { items: items, nextIndex: i };
  }

  isDirectChild(parent, potential) {
    const parentId = parent.id;
    const potentialId = potential.id;
    return (
      potentialId.startsWith(parentId + '.') &&
      potentialId.split('.').length === parentId.split('.').length + 1
    );
  }

  isDescendant(ancestor, potential) {
    const ancestorId = ancestor.id;
    const potentialId = potential.id;
    return (
      potentialId.startsWith(ancestorId + '.') &&
      potentialId.split('.').length > ancestorId.split('.').length
    );
  }

  initializeAccordions() {
    document.querySelectorAll('.level-header').forEach(header => {
      header.addEventListener('click', (e) => 
        this.handleAccordionClick(e.currentTarget)
      );
    });
    this.initializeDescriptionButtons();
    this.initializeModal();
  }

  initializeDescriptionButtons() {
    document.querySelectorAll('.description-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const description = this.decodeDescription(button.dataset.description);
        this.showDescription(description);
      });
    });
  }

  initializeModal() {
    const modal = document.getElementById('descriptionModal');
    const closeBtn = document.querySelector('.close-modal');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    
    window.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    modal.querySelector('.modal-content').addEventListener('click', (e) => e.stopPropagation());
  }

  handleAccordionClick(headerElement) {
    const container = headerElement.parentElement;
    const content = container.querySelector('.collapsible');
    const itemLevel = headerElement.dataset.level;
    const itemId = headerElement.dataset.id;

    const isCurrentlyOpen = content && content.classList.contains('active');

    if (isCurrentlyOpen) {
      this.handleClosing(itemLevel, itemId);
    } else {
      this.handleOpening(itemLevel, itemId);
    }
  }

  handleOpening(itemLevel, itemId) {
    if (itemLevel === 'item') {
      this.navigateToItem('specific', itemId);
    } else {
      this.navigateToItem('firstInContainer', itemId);
    }
  }

  handleClosing(itemLevel, itemId) {
    if (itemLevel === 'item') {
      this.navigateToItem('next', itemId);
    } else {
      this.navigateToItem('nextContainer', itemId, itemLevel);
    }
  }

  navigateToItem(type, itemId, itemLevel = null) {
    const items = this.getItemsOnly();

    switch (type) {
      case 'specific':
        const targetIndex = items.findIndex(item => item.id === itemId);
        if (targetIndex !== -1) {
          this.currentItemIndex = targetIndex;
          this.openCurrentItem();
        }
        break;

      case 'firstInContainer':
        for (let i = 0; i < items.length; i++) {
          if (items[i].id.startsWith(itemId + '.')) {
            this.currentItemIndex = i;
            this.openCurrentItem();
            return;
          }
        }
        this.currentItemIndex = 0;
        this.openCurrentItem();
        break;

      case 'next':
        const currentIndex = items.findIndex(item => item.id === itemId);
        this.currentItemIndex = (currentIndex + 1) % items.length;
        this.openCurrentItem();
        break;

      case 'nextContainer':
        const nextContainerId = this.findNextContainer(itemLevel, itemId);
        if (nextContainerId) {
          this.navigateToItem('firstInContainer', nextContainerId);
        } else {
          const firstContainerId = this.findFirstContainer(itemLevel, itemId);
          if (firstContainerId) {
            this.navigateToItem('firstInContainer', firstContainerId);
          } else {
            this.currentItemIndex = 0;
            this.openCurrentItem();
          }
        }
        break;
    }
  }

  findNextContainer(containerLevel, currentContainerId) {
    const currentParts = currentContainerId.split('.');

    for (let item of this.jsonData) {
      if (item.level === containerLevel) {
        const itemParts = item.id.split('.');

        if (itemParts.length === currentParts.length) {
          let sameAncestors = true;
          for (let i = 0; i < currentParts.length - 1; i++) {
            if (currentParts[i] !== itemParts[i]) {
              sameAncestors = false;
              break;
            }
          }

          if (sameAncestors && item.id > currentContainerId) {
            return item.id;
          }
        }
      }
    }
    return null;
  }

  findFirstContainer(containerLevel, currentContainerId) {
    const currentParts = currentContainerId.split('.');

    for (let item of this.jsonData) {
      if (item.level === containerLevel) {
        const itemParts = item.id.split('.');

        if (itemParts.length === currentParts.length) {
          let sameAncestors = true;
          for (let i = 0; i < currentParts.length - 1; i++) {
            if (currentParts[i] !== itemParts[i]) {
              sameAncestors = false;
              break;
            }
          }

          if (sameAncestors) return item.id;
        }
      }
    }
    return null;
  }

  initializeItemNavigation() {
    this.collapseAll();
    this.currentItemIndex = 0;
    this.openCurrentItem();
  }

  collapseAll() {
    document.querySelectorAll('.collapsible').forEach(collapsible => {
      collapsible.classList.remove('active');
    });

    document.querySelectorAll('.level-toggle').forEach(toggle => {
      if (!toggle.style.opacity) {
        toggle.classList.add('collapsed');
      }
    });
  }

  openCurrentItem() {
    const items = this.getItemsOnly();
    if (items.length === 0) return;

    const currentItem = items[this.currentItemIndex];
    if (!currentItem) return;

    this.collapseAll();
    this.openAncestorsPath(currentItem.id);
    this.openItemById(currentItem.id);
    this.updateActiveItemState(currentItem.id);
  }

  openAncestorsPath(itemId) {
    const idParts = itemId.split('.');
    for (let i = 1; i < idParts.length; i++) {
      const ancestorId = idParts.slice(0, i).join('.');
      this.openItemById(ancestorId);
    }
  }

  openItemById(id) {
    const header = document.querySelector(`[data-id="${id}"]`);
    if (header) {
      const container = header.parentElement;
      const content = container.querySelector('.collapsible');
      const toggle = header.querySelector('.level-toggle');

      if (content) {
        content.classList.add('active');
        if (toggle && !toggle.style.opacity) {
          toggle.classList.remove('collapsed');
        }
      }
    }
  }

  updateActiveItemState(activeItemId) {
    document.querySelectorAll('.level-header').forEach(header => {
      header.classList.remove('active-item');
    });

    const activePath = this.getActiveItemPath(activeItemId);
    activePath.forEach(itemId => {
      const element = document.querySelector(`[data-id="${itemId}"]`);
      if (element) {
        const container = element.parentElement;
        const content = container.querySelector('.collapsible');
        if (!content || content.classList.contains('active')) {
          element.classList.add('active-item');
        }
      }
    });
  }

  getActiveItemPath(itemId) {
    const parts = itemId.split('.');
    const path = [];
    for (let i = 1; i <= parts.length; i++) {
      path.push(parts.slice(0, i).join('.'));
    }
    return path;
  }

  showDescription(description) {
    const modal = document.getElementById('descriptionModal');
    const modalDescription = document.getElementById('modalDescription');

    const descriptionText = description || 'No hay descripción disponible';
    const formattedDescription = descriptionText
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>');

    modalDescription.innerHTML = formattedDescription;
    modal.style.display = 'block';
  }

  encodeDescription(text) {
    if (!text) return '';
    return btoa(encodeURIComponent(text));
  }

  decodeDescription(encodedText) {
    if (!encodedText) return '';
    try {
      return decodeURIComponent(atob(encodedText));
    } catch (e) {
      return 'Error al cargar la descripción';
    }
  }

  formatNumberForDisplay(value) {
    return value.replace('.', ',');
  }

  downloadFile(type) {
    if (type === 'json') {
      const jsonString = JSON.stringify(this.jsonData, null, 2);
      this.createDownload(jsonString, 'converted_data.json', 'application/json');
    } else {
      const csvContent = this.jsonToCSV(this.jsonData);
      this.createDownload(csvContent, 'converted_data.csv', 'text/csv;charset=utf-8;');
    }
  }

  createDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  jsonToCSV(jsonData) {
    if (!jsonData || jsonData.length === 0) return '';

    const levelMap = {
      chapter: 'Capítulo',
      subchapter: 'Subcapítulo',
      section: 'Apartado',
      item: 'Partida'
    };

    const headers = ['Nivel', 'ID', 'Nombre', 'Descripción', 'Ud', '%IVA', 'PVP'];
    const rows = [headers];

    jsonData.forEach(item => {
      const row = [
        levelMap[item.level] || '',
        item.id || '',
        item.name || '',
        item.description || '',
        item.unit || '',
        item.iva_percentage ? item.iva_percentage.replace('.', ',') : '',
        item.pvp ? item.pvp.replace('.', ',') : ''
      ];
      rows.push(row);
    });

    return rows.map(row => 
      row.map(field => {
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return '"' + stringField.replace(/"/g, '""') + '"';
        }
        return stringField;
      }).join(',')
    ).join('\n');
  }

  copyErrorsToClipboard() {
    const errorContainer = document.querySelector('.error-container');
    if (errorContainer) {
      const errors = Array.from(errorContainer.querySelectorAll('li')).map(li => li.textContent);
      const errorText = errors.join('\n');
      
      navigator.clipboard.writeText(errorText).then(() => {
        const copyBtn = document.querySelector('.copy-error-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copiado!';
        copyBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.backgroundColor = '#f59e0b';
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar:', err);
      });
    }
  }

  downloadTemplate() {
    const templateContent = `"Nivel","ID","Nombre","Descripción","Ud","%IVA","PVP"
"Capítulo",1,"Instalaciones Eléctricas",,,,
"Subcapítulo","1.1","Cableado Estructurado",,,,
"Apartado","1.1.1","Cableado de Baja Tensión",,,,
"Partida","1.1.1.1","Instalación de Cable UTP Cat6","Instalación de cable UTP categoría 6","m",21,15.50
"Capítulo",2,"Fontanería",,,,
"Subcapítulo","2.1","Tuberías de Agua",,,,
"Partida","2.1.1","Instalación de Tubería PEX","Instalación de tuberías PEX","m",10,12.30
"Capítulo",3,"Pintura",,,,
"Partida","3.1","Pintura de Paredes","Aplicación de pintura plástica","m²",21,8.50`;
    
    this.createDownload(templateContent, 'plantilla_presupuesto.csv', 'text/csv;charset=utf-8;');
  }

  getItemsOnly() {
    return this.jsonData.filter(item => item.level === 'item');
  }
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
  window.csvApp = new CSVApp();
});