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

**Datos Tarifa**

- **Título**: Nombre identificativo de la tarifa (ej: "Servicios 2025")
- **Descripción**: Breve descripción de qué incluye esta tarifa
- **Validez (días)**: Por defecto 30 días.
- **Estado**: Activa o Inactiva.

**Datos Empresa**
Estos datos se mostrarán en las páginas de Creación de Formularios (Datos de Cliente y Datos de Presupuesto) y en el Documento PDF.

- **Logo de la empresa**: Sube un logotipo o introduce una URL. El logotipo se mostrará c
- **Nombre**: Nombre de tu empresa o autónomo
- **NIF/CIF**: Número de identificación fiscal
- **Dirección fiscal completa**: Calle, Número, CP, Localidad, Provincia
- **Teléfono, email, web**: Datos de contacto, se recomienda poner el Teléfono y el email, la web (opcional)

**Configuración Visual**
Estos datos se mostrarán en las páginas de Creación de Formularios (Datos de Cliente y Datos de Presupuesto) y en el Documento PDF.

- **Plantilla**: Es la plantilla que se usará para generar el Documento PDF., Se recomiendo por defecto la plantilla de Color.
- **Color Primario**: Color primario que se utilizará en la página web de creación de presupuestos y en el Documento PDF.
- **Color Secundario**: Color secundario que se utilizará en la página web de creación de presupuestos y en el Documento PDF.

**Notas PDF**

- **Texto resumen PDF**: Texto que se mostrará en la página de Resumen del presupuesto, se recomienda colocar aquí la Aceptación y Formas de pago. Datos bancarios y protección de datos.
- **Texto condiciones PDF**: Colocar aquí las demás condiciones.generales.

**Notas Formulario**

- **Notas legales página presupuesto**: aparecerá en la página de creación de presupuesto debajo de los Datos del Cliente.

### 4. Personaliza el diseño

Puedes configurar:

- **Colores**: Color primario y secundario para el PDF
- **Logo**: Sube el logotipo de tu empresa
- **Plantilla PDF**: Selecciona una de las plantillas disponibles

### 5. Sube el archivo CSV

El corazón de la tarifa es un archivo CSV con la estructura jerárquica de tus servicios.

**Ejemplo de CSV:**

```csv
"Nivel","ID","Nombre","Descripción","Ud","%IVA","PVP"
"Capítulo",1,"Instalaciones Eléctricas",,,,
"Subcapítulo","1.1","Cableado Estructurado",,,,
"Apartado","1.1.1","Cableado de Baja Tensión",,,,
"Partida","1.1.1.1","Instalación de Cable UTP Cat6","Instalación de cable UTP categoría 6 para redes de datos incluye conectores y canalización.","m",5,15
"Capítulo",2,"Fontanería",,,,
"Subcapítulo","2.1","Tuberías de Agua",,,,
"Partida","2.1.1","Instalación de Tubería PEX","Instalación de tuberías PEX para suministro de agua potable incluye accesorios y mano de obra.","m",10,10
"Capítulo",3,"Pintura",,,,
"Partida","3.1","Pintura de Paredes Interiores","Aplicación de pintura plástica en paredes interiores incluye preparación de superficie.","m²",21,6
```

**Estructura jerárquica de contenedores y partidas**

La estructura de organización se basa en **contenedores** y **partidas**, con los siguientes niveles jerárquicos permitidos:

**Niveles de contenedores**
1. **Capítulo** (Nivel 1, Ejemplo: ID = 1)
2. **Capítulo > Subcapítulo** (Nivel 2, Ejemplo: ID = 1.2)
3. **Capítulo > Subcapítulo > Apartado** (Nivel 3, Ejemplo: ID = 1.2.3)

**Niveles de partidas**
Las partidas pueden ubicarse en los siguientes niveles:
1. **Capítulo > Partida** (Nivel 2, Ejemplo: ID = 1.2)
2. **Capítulo > Subcapítulo > Partida** (Nivel 3, Ejemplo: ID = 1.2.3)
3. **Capítulo > Subcapítulo > Apartado > Partida** (Nivel 4, Ejemplo: ID = 1.2.3.4)

**Nota**: Cualquier estructura que no siga estos niveles generará un error y el archivo CSV no podrá importarse.

**Ejemplo práctico**
Imagina los contenedores como carpetas y las partidas como archivos:
- **Capítulo**: Carpeta principal (Ej.: "Construcción").
- **Subcapítulo**: Subcarpeta dentro de un capítulo (Ej.: "Construcción > Cimentación").
- **Apartado**: Subcarpeta dentro de un subcapítulo (Ej.: "Construcción > Cimentación > Zapatas").
- **Partida**: Archivo dentro de una carpeta (Ej.: "Construcción > Cimentación > Zapatas > Hormigón armado").

**Resumen**: Las partidas pueden estar dentro de un **Capítulo**, un **Subcapítulo** o un **Apartado**, siempre respetando los niveles jerárquicos definidos.



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
