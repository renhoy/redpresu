---
id: crear-tarifa
title: Cómo crear una tarifa
category: Primeros pasos
tourId: crear-tarifa
visible: all
---

Las tarifas son la base de tu sistema de presupuestos. Una tarifa contiene todos los servicios y productos que ofreces con sus precios, organizados jerárquicamente.

## Pasos para crear una tarifa

### 1. Accede a la sección de Tarifas

Desde el menú principal, haz clic en **"Tarifas"** para ver el listado de tarifas existentes.

### 2. Inicia la creación

Haz clic en el botón **"Nueva Tarifa"** ubicado en la parte superior derecha.

### 3. Completa los datos básicos

Deberás ingresar la siguiente información:

- **Título**: Nombre identificativo de la tarifa (ej: "Servicios 2025")
- **Descripción**: Breve descripción de qué incluye esta tarifa
- **Nombre comercial**: Nombre de tu empresa
- **NIF/CIF**: Número de identificación fiscal
- **Dirección fiscal completa**: Calle, CP, Localidad, Provincia
- **Contacto**: Teléfono, email y sitio web (opcional)

### 4. Personaliza el diseño

Puedes configurar:

- **Colores**: Color primario y secundario para el PDF
- **Logo**: Sube el logotipo de tu empresa
- **Plantilla PDF**: Selecciona una de las plantillas disponibles

### 5. Sube el archivo CSV

El corazón de la tarifa es un archivo CSV con la estructura jerárquica de tus servicios.

**Formato del CSV:**

```csv
level,code,name,description,unit,pvp,iva_percentage
chapter,1,Capítulo 1,Descripción del capítulo,,0,0
subchapter,1.1,Subcapítulo 1.1,Descripción,,0,0
section,1.1.1,Sección 1.1.1,Descripción,,0,0
item,1.1.1.1,Partida individual,Descripción detallada,ud,100.00,21
```

**Niveles jerárquicos:**

- `chapter`: Capítulo (nivel 1)
- `subchapter`: Subcapítulo (nivel 2)
- `section`: Sección (nivel 3)
- `item`: Partida (nivel 4 - elemento facturable)

### 6. Añade notas adicionales (opcional)

Puedes incluir:

- **Texto resumen**: Aparecerá al inicio del PDF
- **Condiciones**: Condiciones comerciales o de pago
- **Notas legales**: Información legal relevante

### 7. Guarda la tarifa

Haz clic en **"Crear Tarifa"** para guardar.

## Consejos útiles

- **Marca una tarifa como plantilla**: Si activas la opción "Usar como plantilla", los datos de esta tarifa se pre-cargarán al crear nuevas tarifas, ahorrando tiempo.

- **Revisa la jerarquía**: Asegúrate de que tu CSV tenga una estructura coherente. Cada nivel debe tener un padre válido.

- **Usa códigos consistentes**: Los códigos deben reflejar la jerarquía (ej: 1, 1.1, 1.1.1, 1.1.1.1).

## Próximos pasos

Una vez creada la tarifa:

1. Previsualiza la estructura jerárquica
2. Edita la tarifa si necesitas corregir algo
3. Usa la tarifa para [generar presupuestos](/help/generar-presupuesto)

---

¿Necesitas ayuda? Usa el botón **"Iniciar Tour Interactivo"** para seguir una guía paso a paso.
