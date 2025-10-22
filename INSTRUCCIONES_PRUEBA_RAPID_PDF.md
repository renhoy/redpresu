# 🧪 Instrucciones de Prueba - Migración Rapid-PDF

## 📋 Resumen de la Migración

Se ha completado la migración de Rapid-PDF de API externa a módulo interno de Next.js. Ambos sistemas están disponibles y se puede cambiar entre ellos mediante una variable de entorno.

## 🔧 Configuración Inicial

### 1. Añadir Variable de Entorno

Editar `.env.local`:

```bash
# Controla qué sistema usar para generar PDFs
USE_RAPID_PDF_MODULE=true    # true = módulo interno, false = API externa
```

### 2. Verificar Instalación de Dependencias

```bash
cd /Users/josius/Documents/proy/jeyca-presu
npm install
```

Dependencias instaladas:
- `puppeteer` (24.10.0+)
- `jsdom` (26.1.0+)
- `pdf-lib` (1.17.1+)
- `@types/jsdom` (dev)

## 🧪 Pruebas Paso a Paso

### PRUEBA 1: Verificar con API Externa (Sistema Actual)

**Objetivo**: Asegurar que el sistema actual sigue funcionando.

```bash
# En .env.local
USE_RAPID_PDF_MODULE=false
```

1. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ir a `/budgets` en el navegador

3. Seleccionar un presupuesto existente

4. Hacer clic en "Generar PDF"

5. **Resultado esperado**:
   - ✅ PDF se descarga correctamente
   - ✅ En logs aparece: `📡 Usando API externa Rapid-PDF...`

---

### PRUEBA 2: Activar Módulo Interno (Sistema Nuevo)

**Objetivo**: Probar el módulo interno.

```bash
# En .env.local
USE_RAPID_PDF_MODULE=true
```

1. Reiniciar servidor:
   ```bash
   # Ctrl+C para detener
   npm run dev
   ```

2. Ir a `/budgets` en el navegador

3. Seleccionar el mismo presupuesto

4. Hacer clic en "Generar PDF"

5. **Resultado esperado**:
   - ✅ PDF se descarga correctamente
   - ✅ En logs aparece: `🆕 Usando módulo interno Rapid-PDF...`
   - ✅ Tiempo de generación reportado en logs

---

### PRUEBA 3: Comparar PDFs Generados

**Objetivo**: Verificar que ambos sistemas generan PDFs equivalentes.

1. Generar PDF con API externa (USE_RAPID_PDF_MODULE=false)
   - Descargar como `presupuesto_api.pdf`

2. Generar PDF con módulo interno (USE_RAPID_PDF_MODULE=true)
   - Descargar como `presupuesto_modulo.pdf`

3. **Comparación visual**:
   - ✅ Contenido idéntico
   - ✅ Formato de tablas
   - ✅ Logos e imágenes
   - ✅ Totales correctos
   - ✅ Paginación correcta

---

### PRUEBA 4: Verificar Logs de Generación

**Terminal donde corre `npm run dev`:**

**Con módulo interno** debe aparecer:

```
[generateBudgetPDF] 🆕 Usando módulo interno Rapid-PDF...
[generatePDF] Iniciando generación...
[generatePDF] Template: default
[generatePDF] Modo: produccion
=== GENERANDO ELEMENTS DATA ===
Procesando sección: summary
  Generando elementos para: company
  Generando elementos para: title
  ...
RenderEngine: Inicializando Puppeteer...
RenderEngine: PDF generado correctamente con metadatos
[generatePDF] ✅ Completado en XXXX ms
[generateBudgetPDF] PDF generado exitosamente en XXXX ms
[generateBudgetPDF] PDF leído: XXXXX bytes
```

---

### PRUEBA 5: Modo Desarrollo (HTML)

**Objetivo**: Verificar generación de HTML para debugging.

1. Modificar temporalmente `src/app/actions/budgets.ts` línea ~1228:

```typescript
const result = await generatePDF(payload, {
  outputPath: tempFilePath,
  mode: 'desarrollo',  // Cambiar a 'desarrollo'
})
```

2. Ejecutar generación de PDF

3. **Resultado esperado**:
   - ✅ Se genera archivo HTML en `temp/pdfs/`
   - ✅ HTML contiene estructura del documento
   - ✅ Se puede abrir en navegador para visualizar

4. **Revertir cambio** a `mode: 'produccion'`

---

## 🐛 Problemas Conocidos y Soluciones

### Problema 1: "Template 'default' no encontrado"

**Causa**: Template no copiado correctamente.

**Solución**:
```bash
ls -la /Users/josius/Documents/proy/jeyca-presu/src/lib/rapid-pdf/templates/default/

# Debe mostrar:
# - css/
# - js/
# - json/
# - assets/
```

Si falta algún directorio, ejecutar:
```bash
cd /Users/josius/Documents/proy/rapid_pdf
cp -r template/color/* /Users/josius/Documents/proy/jeyca-presu/src/lib/rapid-pdf/templates/default/
```

---

### Problema 2: Error de Puppeteer

**Error**: `Failed to launch the browser process`

**Solución**: Puppeteer está incluido en las dependencias. Si persiste:

```bash
# Reinstalar Puppeteer
npm uninstall puppeteer
npm install puppeteer
```

---

### Problema 3: Componentes de Template No Renderizados

**Síntoma**: PDF generado pero con contenido placeholder.

**Causa**: Los componentes del template están en JavaScript y necesitan adaptación.

**Status**: Conocido - requiere Fase 6 completa (conversión de componentes JS a TS).

**Workaround temporal**: Usar API externa (USE_RAPID_PDF_MODULE=false).

---

### Problema 4: CSS No Aplicado

**Síntoma**: PDF sin estilos.

**Verificar**:
```bash
ls /Users/josius/Documents/proy/jeyca-presu/src/lib/rapid-pdf/templates/default/css/
# Debe tener archivos .css
```

**Solución**: Verificar que `loadAllCSS()` en `render-engine.ts` encuentra los archivos.

---

## 📊 Checklist de Validación

### Funcionalidad Básica
- [ ] Módulo rapid-pdf se importa sin errores TypeScript
- [ ] `generatePDF()` se ejecuta sin excepciones
- [ ] PDF se genera en < 15 segundos
- [ ] Archivo PDF es válido y se abre correctamente

### Formato y Contenido
- [ ] Logo aparece (si está configurado)
- [ ] Datos de empresa correctos
- [ ] Datos de cliente correctos
- [ ] Tabla de presupuesto con jerarquía
- [ ] Totales correctos
- [ ] Formato español: 1.234,56 €
- [ ] IRPF se muestra si aplica
- [ ] Recargo Equivalencia se muestra si aplica

### Integración
- [ ] Server Action llama al módulo correctamente
- [ ] PDF se sube a Supabase Storage
- [ ] `pdf_url` se actualiza en BD
- [ ] Usuario recibe signed URL válida
- [ ] Archivo temporal se limpia

### Performance
- [ ] Generación < 15 segundos
- [ ] Sin errores de memoria
- [ ] Logs claros y útiles

---

## 🔄 Cambio de Sistema en Producción

### Opción 1: Rollback a API Externa

Si el módulo interno tiene problemas:

```bash
# En .env.local (o variables de entorno de producción)
USE_RAPID_PDF_MODULE=false

# Reiniciar aplicación
```

### Opción 2: Activar Módulo Interno

Cuando esté validado:

```bash
# En .env.local (o variables de entorno de producción)
USE_RAPID_PDF_MODULE=true

# Reiniciar aplicación
```

---

## 📝 Reportar Problemas

Si encuentras problemas, reportar con:

1. **Variable de entorno**: USE_RAPID_PDF_MODULE=true/false
2. **Logs completos** de la terminal
3. **Payload** usado (si es posible - ver logs en modo desarrollo)
4. **PDF generado** (si se generó)
5. **Errores específicos** de consola del navegador

---

## ✅ Siguiente Fase (Post-Validación)

Una vez validado el módulo interno:

1. Convertir componentes JS del template a TypeScript
2. Implementar renderizado real en `generateComponentHTML()`
3. Añadir tests automatizados
4. Optimizar performance
5. Eliminar código legacy de API externa

---

**Documento creado**: 2025-01-22
**Autor**: Claude Code
**Estado**: Listo para pruebas
