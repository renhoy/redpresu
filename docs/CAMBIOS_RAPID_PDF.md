# Cambios para Rapid-PDF

## Rich Text Editor - HTML en Notas

**Fecha:** 2025-01-13
**Versión:** 2.1
**Tipo:** Mejora funcional

### Descripción

Se ha implementado un editor de texto enriquecido (Tiptap) para los campos de notas en las tarifas:
- `summary_note` - Nota resumen PDF
- `conditions_note` - Condiciones PDF
- `legal_note` - Notas legales formulario

### Cambios en el Payload

Los campos de notas ahora contienen **HTML** en lugar de texto plano:

```json
{
  "header": {
    "notes": {
      "note": "<p>Texto con <strong>negrita</strong> y <em>cursiva</em></p>"
    }
  },
  "footer": {
    "notes": {
      "note": "<ul><li>Item 1</li><li>Item 2</li></ul>"
    }
  }
}
```

### HTML Soportado

El editor genera HTML básico con las siguientes etiquetas:

- `<p>` - Párrafos
- `<strong>` - Negrita
- `<em>` - Cursiva
- `<ul>` + `<li>` - Listas con viñetas
- `<ol>` + `<li>` - Listas numeradas

### Requerimientos para Rapid-PDF

Rapid-PDF debe:

1. **Detectar HTML**: Si el texto contiene etiquetas `<` y `>`, tratarlo como HTML
2. **Renderizar HTML básico**: Soportar las etiquetas mencionadas arriba
3. **Fallback**: Si no puede renderizar HTML, mostrar texto sin formato (strip tags)

### Ejemplo de Procesamiento

**Input (payload):**
```json
{
  "note": "<p>Presupuesto válido <strong>30 días</strong>.</p><ul><li>IVA incluido</li><li>Pago: 50% anticipo</li></ul>"
}
```

**Output esperado (PDF):**
```
Presupuesto válido **30 días**.

• IVA incluido
• Pago: 50% anticipo
```

### Compatibilidad hacia atrás

- Tarifas antiguas sin HTML siguen funcionando (texto plano)
- El campo puede estar vacío o contener solo `<p></p>` (editor vacío)
- No hay cambios en la estructura del payload, solo en el contenido de los campos `note`

### Testing

Casos de prueba recomendados:

1. Texto plano sin HTML → renderizar normalmente
2. HTML con `<strong>` y `<em>` → aplicar estilos
3. Lista con viñetas `<ul>` → renderizar como lista
4. Lista numerada `<ol>` → renderizar con números
5. Múltiples párrafos `<p>` → saltos de línea correctos
6. Campo vacío o `<p></p>` → no mostrar nada

---

**Documento:** Cambios Rapid-PDF - Rich Text Editor
**Autor:** Sistema jeyca-presu
**Estado:** Implementado
