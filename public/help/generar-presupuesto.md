---
id: generar-presupuesto
title: Cómo generar un presupuesto
category: Primeros pasos
tourId: generar-presupuesto
visible: all
---

Los presupuestos se generan a partir de las tarifas creadas. Puedes personalizar cada presupuesto seleccionando las partidas específicas y cantidades que necesita cada cliente.

## Requisitos previos

Antes de crear un presupuesto, asegúrate de:

1. Tener al menos una [tarifa creada](/help/crear-tarifa)
2. Conocer los datos fiscales del cliente
3. Saber qué partidas incluir en el presupuesto

## Pasos para generar un presupuesto

### 1. Selecciona la tarifa base

Desde el listado de **Presupuestos**, haz clic en **"Nuevo Presupuesto"** y selecciona la tarifa que quieres usar como base.

### 2. Completa los datos del cliente

Deberás introducir:

**Datos básicos:**

- **Tipo de cliente**: Empresa, Autónomo o Particular
- **Nombre o razón social**
- **NIF/NIE**

**Datos de contacto:**

- **Teléfono**
- **Email**
- **Sitio web** (opcional)

**Dirección fiscal:**

- **Dirección completa**
- **Código postal**
- **Localidad**
- **Provincia**

### 3. Configura las fechas

- **Fecha inicio**: Fecha de emisión del presupuesto
- **Días de validez**: Días que el presupuesto permanecerá válido

El sistema calculará automáticamente la **fecha fin** basándose en estos datos.

### 4. Selecciona las partidas

Navega por la estructura jerárquica de la tarifa y:

1. **Expande** capítulos, subcapítulos y secciones
2. **Introduce cantidades** en las partidas que quieres incluir
3. El sistema calcula automáticamente los subtotales

**Navegación:**

- Solo se muestra **un elemento activo** a la vez
- Los **ancestros** del elemento activo permanecen visibles
- Esto mantiene el contexto sin saturar la pantalla

### 5. Configura IRPF (si aplica)

Si eres **autónomo** y el cliente es **empresa u otro autónomo**, el sistema aplicará automáticamente el IRPF configurado.

El IRPF se **descuenta** del total final.

### 6. Aplica Recargo de Equivalencia (si necesario)

Si el cliente es **autónomo acogido al recargo de equivalencia**:

1. Marca la casilla **"Aplicar Recargo de Equivalencia"**
2. El sistema mostrará una tabla con los IVAs detectados
3. Introduce los porcentajes de RE correspondientes (o usa los valores por defecto)

### 7. Revisa los totales

El sistema calcula automáticamente:

- **Subtotal** (suma de todas las partidas sin IVA)
- **Base imponible** (subtotal sin IVA ni RE)
- **IVA por tipo** (21%, 10%, 4%)
- **IRPF** (si aplica - se resta)
- **Recargo de Equivalencia** (si aplica - se suma)
- **Total a pagar**

### 8. Guarda el presupuesto

Haz clic en **"Guardar Presupuesto"**.

El presupuesto se guarda en estado **"Borrador"** hasta que decidas cambiarle el estado.

## Gestión de estados

Después de crear el presupuesto, puedes cambiar su estado:

- **Borrador**: En preparación, no se puede generar PDF
- **Pendiente**: Listo para enviar, esperando aprobación
- **Enviado**: Ya enviado al cliente
- **Aprobado**: Cliente ha aceptado el presupuesto
- **Rechazado**: Cliente ha rechazado el presupuesto
- **Caducado**: Ha pasado la fecha de validez

## Generar PDF

Una vez el presupuesto no esté en estado "Borrador", podrás:

1. **Generar PDF**: Crea el documento PDF para enviar al cliente
2. **Ver PDF**: Si ya fue generado, abre el PDF en nueva pestaña

## Consejos útiles

- **Duplica presupuestos**: Si necesitas crear un presupuesto similar para otro cliente, usa la función "Duplicar" desde el listado.

- **Añade notas**: Usa el sistema de notas para llevar un seguimiento del historial comercial (llamadas, reuniones, negociaciones).

- **Crea versiones**: Si el cliente pide modificaciones, crea una nueva versión del presupuesto en lugar de editar el original.

## Próximos pasos

- [Gestionar estados de presupuestos](/help/estados-presupuesto)
- [Sistema de versiones](/help/versiones-presupuesto)
- [Añadir notas comerciales](/help/notas-presupuesto)

---

¿Necesitas ayuda visual? Usa el botón **"Iniciar Tour Interactivo"** para seguir una guía paso a paso.
