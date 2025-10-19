---
id: README
title: Guía para crear artículos de ayuda
category: General
visible: superadmin
---

Este directorio contiene los artículos de ayuda en formato Markdown que se muestran en `/help`.

## Formato de Archivos

Cada artículo debe ser un archivo `.md` con el siguiente formato:

```markdown
---
id: nombre-del-articulo
title: Título del Artículo
category: Categoría (ej: Primeros pasos, Tarifas, Presupuestos)
tourId: nombre-del-tour (opcional)
visible: all
---

# Título del Artículo

Contenido del artículo en Markdown...
```

## Frontmatter (Metadatos)

- **id**: Identificador único del artículo (debe coincidir con el nombre del archivo)
- **title**: Título que se mostrará en el índice y en la página del artículo
- **category**: Categoría para agrupar artículos relacionados
- **tourId**: (Opcional) ID del tour interactivo asociado. Debe existir en `tours.json`
- **visible**: Control de visibilidad por rol de usuario. Valores posibles:
  - `all`: Visible para todos los usuarios autenticados (default)
  - `vendedor`: Visible para vendedores, admins y superadmins
  - `admin`: Visible para admins y superadmins
  - `superadmin`: Solo visible para superadmins

## Tours Interactivos

Si deseas añadir un tour interactivo:

1. Crea la configuración del tour en `tours.json`
2. Añade el `tourId` al frontmatter del artículo
3. Mapea la ruta objetivo en `/help/[slug]/page.tsx` (constante `tourTargetPaths`)

## Ejemplo de Configuración de Tour

Archivo `tours.json`:

```json
{
  "crear-tarifa": {
    "steps": [
      {
        "element": "#btn-nueva-tarifa",
        "popover": {
          "title": "Paso 1: Nueva tarifa",
          "description": "Haz clic en el botón 'Nueva Tarifa'"
        }
      },
      {
        "element": "#campo-nombre",
        "popover": {
          "title": "Paso 2: Nombre",
          "description": "Introduce el nombre de la tarifa"
        }
      }
    ]
  }
}
```

## Añadir Nuevo Artículo

1. Crea un archivo `.md` en este directorio (ej: `mi-articulo.md`)
2. Añade el frontmatter necesario
3. Escribe el contenido en Markdown
4. ¡Los cambios son visibles inmediatamente sin rebuild!

## Categorías Sugeridas

- **Primeros pasos**: Introducción y configuración inicial
- **Tarifas**: Gestión de tarifas
- **Presupuestos**: Creación y gestión de presupuestos
- **Usuarios**: Administración de usuarios
- **Configuración**: Ajustes del sistema
- **Avanzado**: Funcionalidades avanzadas

## Soporte Markdown

Se soportan las siguientes características de Markdown:

- Encabezados (`# ## ###`)
- Negrita y cursiva (`**negrita** *cursiva*`)
- Listas ordenadas y desordenadas
- Bloques de código (`` ` ``` ``)
- Enlaces (`[texto](url)`)
- Imágenes (`![alt](url)`)
- Citas (`>`)
- Tablas

## Actualización de Contenido

Los artículos se leen dinámicamente desde este directorio. Para actualizar:

1. Edita el archivo `.md` correspondiente
2. Guarda los cambios
3. Recarga la página en el navegador

**No se requiere rebuild de la aplicación.**
