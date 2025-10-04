# Plantillas PDF - Previews

Este directorio contiene las imágenes de preview de las plantillas PDF disponibles.

## Plantillas actuales:

- **modern-preview.png** - Plantilla Moderna (diseño limpio y minimalista)
- **classic-preview.png** - Plantilla Clásica (diseño tradicional profesional)
- **elegant-preview.png** - Plantilla Elegante (diseño sofisticado con detalles)
- **placeholder.png** - Imagen fallback cuando no existe preview

## Especificaciones:

- Tamaño recomendado: 800x1200px (ratio A4 vertical)
- Formato: PNG con transparencia
- Peso máximo: 200KB por imagen
- Se muestran en tooltips con ancho fijo de 256px

## Cómo agregar una nueva plantilla:

1. Diseñar el PDF template en rapid-pdf
2. Capturar screenshot del resultado
3. Redimensionar a 800x1200px
4. Guardar como `{template-id}-preview.png`
5. Actualizar config en BD con nuevo template ID
