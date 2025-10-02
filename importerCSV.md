# Flujo de Importación y Validación CSV

## 📋 Resumen Ejecutivo

Este documento explica el proceso completo de importación de archivos CSV de tarifas, desde que el usuario selecciona el archivo hasta que se genera la estructura JSON o se muestran errores de validación.

**Objetivo:** Convertir archivos CSV con estructura jerárquica de presupuestos (capítulos → subcapítulos → apartados → partidas) en un formato JSON estructurado y validado.

---

## 🔄 1. FLUJO GENERAL

```
┌──────────────────────┐
│ Usuario selecciona   │
│ archivo CSV          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ FASE 1: LECTURA      │
│ - Leer archivo       │
│ - Detectar encoding  │
│ - Limpiar BOM        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ FASE 2: PARSEO       │
│ - Detectar separador │
│ - Parsear filas      │
│ - Manejar comillas   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ FASE 3: VALIDACIÓN   │
│ DE ESTRUCTURA        │
│ - Cabeceras          │
│ - Campos requeridos  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ FASE 4: VALIDACIÓN   │
│ DE DATOS             │
│ - Por nivel          │
│ - Por tipo           │
│ - Jerarquía          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ FASE 5:              │
│ TRANSFORMACIÓN       │
│ - Normalización      │
│ - Formato números    │
│ - Estructura JSON    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ RESULTADO:           │
│ ✅ JSON guardado     │
│ ❌ Errores mostrados │
└──────────────────────┘
```

---

## ✅ 2. VALIDACIONES DETALLADAS

### 2.1. Validación de Estructura CSV

#### **¿Qué valida?**
- Presencia de cabeceras (primera fila)
- Existencia de al menos una fila de datos
- Campos obligatorios completos
- Formato de delimitadores consistente

#### **¿Por qué es necesaria?**
Garantiza que el archivo tiene la estructura mínima para ser procesado, evitando errores en fases posteriores.

#### **Mensaje si falla:**
```
"CSV debe tener cabeceras y al menos una fila de datos"
```

#### **Ejemplo:**
✅ **Válido:**
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Capítulo,1,Instalaciones,,,
```

❌ **Inválido:**
```csv
Nivel,ID,Nombre
```
*(Faltan campos obligatorios)*

---

### 2.2. Validación de Cabeceras

#### **¿Qué valida?**
- Presencia de 7 campos obligatorios (en español o inglés)
- Variaciones de nomenclatura permitidas

#### **Campos obligatorios (español):**
- `Nivel` o `Level`
- `ID`
- `Nombre` o `Name`
- `Descripción` o `Description`
- `Ud` o `Unit` (Unidad)
- `%IVA` o `iva_percentage`
- `PVP` (Precio de Venta Público)

#### **¿Por qué es necesaria?**
Asegura que el CSV contiene toda la información necesaria para crear partidas presupuestarias completas.

#### **Mensaje si falla:**
```
"Faltan campos esenciales: nivel, id, nombre, descripcion, ud, %iva, pvp"
```

#### **Ejemplo:**
✅ **Válido (español):**
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
```

✅ **Válido (inglés):**
```csv
Level,ID,Name,Description,Unit,iva_percentage,pvp
```

❌ **Inválido:**
```csv
Nivel,ID,Nombre,PVP
```
*(Faltan descripción, unidad e IVA)*

---

### 2.3. Validación de Nivel Jerárquico

#### **¿Qué valida?**
- El campo `Nivel` contiene un valor válido
- Normalización de mayúsculas/minúsculas/tildes

#### **Valores válidos:**
| Nivel permitido | Variaciones aceptadas |
|----------------|----------------------|
| **Capítulo** | Capitulo, CAPÍTULO, chapter, CHAPTER |
| **Subcapítulo** | Subcapitulo, SUBCAPÍTULO, subchapter |
| **Apartado** | APARTADO, section, Section |
| **Partida** | PARTIDA, item, Item |

#### **¿Por qué es necesaria?**
Define la jerarquía del presupuesto (4 niveles máximo) y determina qué campos son obligatorios.

#### **Mensaje si falla:**
```
"Nivel inválido: 'Subsección'. Debe ser: Capítulo, Subcapítulo, Apartado o Partida"
```

#### **Ejemplo:**
✅ **Válido:**
```csv
Capítulo,1,Obra Civil,,,
SUBCAPITULO,1.1,Cimientos,,,
apartado,1.1.1,Excavación,,,
PARTIDA,1.1.1.1,Excavación manual,Excavación a mano,m³,21,45.50
```

❌ **Inválido:**
```csv
Sección,1.1.1,Datos,,,,
```
*(Nivel no reconocido)*

---

### 2.4. Validación de ID Jerárquico

#### **¿Qué valida?**
- Formato numérico con puntos
- Coherencia jerárquica (padres existen)
- Sin duplicados
- Secuencia lógica (opcional, genera warning)

#### **Formato esperado:**
| Nivel | Formato ID | Ejemplo |
|-------|-----------|---------|
| Capítulo | `N` | `1`, `2`, `3` |
| Subcapítulo | `N.N` | `1.1`, `1.2`, `2.1` |
| Apartado | `N.N.N` | `1.1.1`, `1.1.2` |
| Partida | `N.N.N.N` | `1.1.1.1`, `1.1.1.2` |

#### **¿Por qué es necesaria?**
Mantiene la estructura jerárquica del presupuesto y permite navegación entre niveles.

#### **Mensajes si falla:**
```
"ID debe tener formato válido (números separados por puntos)"
"ID duplicado: 1.1.1 (también aparece en otra línea)"
"Padre no encontrado para ID 1.2.1 (debe existir 1.2)"
"Secuencia incorrecta: esperado 1.2, encontrado 1.3" (WARNING)
```

#### **Ejemplo:**
✅ **Válido:**
```csv
Capítulo,1,Construcción,,,
Subcapítulo,1.1,Estructura,,,
Apartado,1.1.1,Cimientos,,,
Partida,1.1.1.1,Excavación,Desc,m³,21,30.00
Partida,1.1.1.2,Hormigonado,Desc,m³,21,75.00
```

❌ **Inválido (padre faltante):**
```csv
Capítulo,1,Construcción,,,
Partida,1.1.1.1,Excavación,Desc,m³,21,30.00
```
*(Falta 1.1 y 1.1.1)*

❌ **Inválido (duplicado):**
```csv
Capítulo,1,Construcción,,,
Capítulo,1,Instalaciones,,,
```
*(ID 1 repetido)*

---

### 2.5. Validación de Campos por Tipo

#### **Para PARTIDAS (items) - Todos obligatorios:**
| Campo | Validación | Ejemplo válido | Ejemplo inválido |
|-------|-----------|---------------|------------------|
| **Nivel** | "Partida" | `Partida` | `Capítulo` |
| **ID** | Formato N.N.N.N | `1.1.1.1` | `1.1` |
| **Nombre** | No vacío | `Cable UTP` | ` ` |
| **Descripción** | Opcional | `Cat 6` | *(vacío ok)* |
| **Ud** | No vacío | `m`, `ud`, `m²` | ` ` |
| **%IVA** | 0-100 | `21`, `10`, `4` | `150`, `abc` |
| **PVP** | > 0 | `15.50`, `1200` | `-10`, `gratis` |

#### **Para CONTENEDORES (capítulo/subcapítulo/apartado) - Solo 3 obligatorios:**
| Campo | ¿Obligatorio? | Ejemplo |
|-------|--------------|---------|
| **Nivel** | ✅ Sí | `Capítulo` |
| **ID** | ✅ Sí | `1.1` |
| **Nombre** | ✅ Sí | `Instalaciones` |
| **Descripción** | ❌ No | *(opcional)* |
| **Ud** | ❌ No | *(ignorado)* |
| **%IVA** | ❌ No | *(ignorado)* |
| **PVP** | ❌ No | *(ignorado)* |

#### **¿Por qué es necesaria?**
Las partidas son los elementos facturables y necesitan toda la información. Los contenedores solo organizan.

#### **Mensajes si falla:**
```
"Partida 1.1.1.1: Unidad no puede estar vacía"
"Partida 2.3.1.5: %IVA debe estar entre 0 y 100, recibido: 150"
"Partida 3.2.1.1: PVP debe ser un número válido mayor que 0"
```

---

### 2.6. Validación de Formato Numérico

#### **¿Qué valida?**
- Acepta formato español (coma decimal) y inglés (punto decimal)
- Convierte a formato inglés internamente
- Valida rangos según el campo

#### **Formatos aceptados:**

| Campo | Formato español | Formato inglés | Resultado interno |
|-------|----------------|---------------|-------------------|
| **%IVA** | `21`, `10,5`, `4` | `21`, `10.5`, `4` | `21.00`, `10.50`, `4.00` |
| **PVP** | `1.234,56`, `15` | `1234.56`, `15` | `1234.56`, `15.00` |

#### **¿Por qué es necesaria?**
Permite usar CSV generados en Excel España (coma decimal) o Excel internacional (punto decimal).

#### **Mensaje si falla:**
```
"PVP inválido: '1.234.56' (usar formato 1234.56 o 1.234,56)"
"%IVA fuera de rango: 150 (debe estar entre 0 y 100)"
```

#### **Ejemplo:**
✅ **Válidos:**
```csv
Partida,1.1.1.1,Cable,Desc,m,21,15.50      # Inglés
Partida,1.1.1.2,Tubo,Desc,m,10,12,30       # Español
Partida,1.1.1.3,Caja,Desc,ud,21,1234.56    # Inglés con miles
Partida,1.1.1.4,Placa,Desc,ud,10,"1.234,56" # Español con miles
```

❌ **Inválidos:**
```csv
Partida,1.1.1.1,Cable,Desc,m,21,15.50.00   # Doble punto
Partida,1.1.1.2,Tubo,Desc,m,150,12.30      # IVA > 100
Partida,1.1.1.3,Caja,Desc,ud,21,-50        # Precio negativo
```

---

### 2.7. Validación de Jerarquía Global

#### **¿Qué valida?**
- Todos los niveles inferiores tienen su contenedor padre
- Profundidad máxima: 4 niveles
- No hay "saltos" en la jerarquía

#### **Reglas:**
1. **Partida** `1.1.1.1` requiere:
   - Apartado `1.1.1`
   - Subcapítulo `1.1`
   - Capítulo `1`

2. **Apartado** `2.3.1` requiere:
   - Subcapítulo `2.3`
   - Capítulo `2`

3. **Subcapítulo** `3.2` requiere:
   - Capítulo `3`

#### **¿Por qué es necesaria?**
Garantiza que la estructura jerárquica es navegable y se puede renderizar correctamente en el presupuesto.

#### **Mensaje si falla:**
```
"Padre no encontrado para ID 2.1.1 (debe existir capítulo 2 y subcapítulo 2.1)"
"Jerarquía inválida: ID 1.1.1.1.1 excede profundidad máxima (4 niveles)"
```

#### **Ejemplo:**
✅ **Válido:**
```csv
Capítulo,1,Obra,,,
Subcapítulo,1.1,Albañilería,,,
Apartado,1.1.1,Muros,,,
Partida,1.1.1.1,Ladrillo,Desc,m²,10,25.00
```

❌ **Inválido:**
```csv
Capítulo,1,Obra,,,
Apartado,1.1.1,Muros,,,          # ❌ Falta 1.1
Partida,1.1.1.1,Ladrillo,Desc,m²,10,25.00
```

---

## 🔄 3. TRANSFORMACIONES

### 3.1. Normalización de Texto

#### **Proceso:**
1. **Eliminar espacios extra**: `"  Cable  UTP  "` → `"Cable UTP"`
2. **Capitalizar nombres**: `"cable utp"` → `"Cable Utp"`
3. **Normalizar tildes**: Compatible con/sin tildes

#### **Campos afectados:**
- `Nombre`: Capitalizado y limpio
- `Descripción`: Limpia, puede estar vacía
- `Unidad`: Normalizada (m, ud, m², etc.)

#### **Ejemplo:**
```
Entrada:  "  cable   UTP cat6  "
Salida:   "Cable Utp Cat6"
```

---

### 3.2. Conversión de Números (Español → Inglés)

#### **Proceso:**
1. Detectar formato (español usa `,` para decimales)
2. Limpiar separadores de miles
3. Convertir a formato inglés con 2 decimales

#### **Tabla de conversión:**

| Entrada (CSV) | Formato detectado | Salida (JSON) |
|--------------|-------------------|---------------|
| `21` | Entero | `"21.00"` |
| `21,5` | Español | `"21.50"` |
| `21.5` | Inglés | `"21.50"` |
| `1.234,56` | Español | `"1234.56"` |
| `1,234.56` | Inglés | `"1234.56"` |
| `1234` | Entero | `"1234.00"` |

#### **Ejemplo completo:**
```csv
# CSV Español:
Partida,1.1.1.1,Cable,Desc,m,21,"1.234,56"

# JSON resultante:
{
  "level": "item",
  "id": "1.1.1.1",
  "name": "Cable",
  "iva_percentage": "21.00",
  "pvp": "1234.56"
}
```

---

### 3.3. Estructura Jerárquica (IDs → Árbol)

#### **Proceso:**
El sistema convierte IDs planos en una estructura jerárquica navegable.

#### **Entrada CSV (plano):**
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Capítulo,1,Instalaciones,,,
Subcapítulo,1.1,Eléctricas,,,
Partida,1.1.1,Cable UTP,Cat 6,m,21,15.50
Capítulo,2,Fontanería,,,
Partida,2.1,Tubería PEX,Agua fría,m,10,12.30
```

#### **Salida JSON (jerárquico):**
```json
[
  {
    "level": "chapter",
    "id": "1",
    "name": "Instalaciones",
    "amount": "0.00"
  },
  {
    "level": "subchapter",
    "id": "1.1",
    "name": "Eléctricas",
    "amount": "0.00"
  },
  {
    "level": "item",
    "id": "1.1.1",
    "name": "Cable Utp",
    "description": "Cat 6",
    "unit": "m",
    "quantity": "0.00",
    "iva_percentage": "21.00",
    "pvp": "15.50",
    "amount": "0.00"
  },
  {
    "level": "chapter",
    "id": "2",
    "name": "Fontanería",
    "amount": "0.00"
  },
  {
    "level": "item",
    "id": "2.1",
    "name": "Tubería Pex",
    "description": "Agua fría",
    "unit": "m",
    "quantity": "0.00",
    "iva_percentage": "10.00",
    "pvp": "12.30",
    "amount": "0.00"
  }
]
```

---

### 3.4. Campos Calculados

#### **Inicialización automática:**
| Campo | Valor inicial | Cuándo cambia |
|-------|--------------|---------------|
| `quantity` | `"0.00"` | Al crear presupuesto |
| `amount` | `"0.00"` | Al calcular (quantity × pvp) |

#### **Cálculo de totales (no en importación):**
```
amount = quantity × pvp
subtotal = Σ amount (por nivel)
iva_amount = subtotal × (iva_percentage / 100)
total = subtotal + iva_amount
```

---

## 📝 4. ESTRUCTURA CSV ESPERADA

### 4.1. Cabeceras Obligatorias

```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
```

**o en inglés:**

```csv
Level,ID,Name,Description,Unit,iva_percentage,pvp
```

---

### 4.2. Ejemplos de Filas por Nivel

#### **Capítulo (Chapter):**
```csv
Capítulo,1,Instalaciones Eléctricas,,,
```
- Solo requiere: Nivel, ID, Nombre
- Descripción, Ud, %IVA, PVP: **opcionales/ignorados**

#### **Subcapítulo (Subchapter):**
```csv
Subcapítulo,1.1,Cableado Estructurado,Instalación de red,,
```
- Solo requiere: Nivel, ID, Nombre
- Descripción: opcional
- Ud, %IVA, PVP: **ignorados**

#### **Apartado (Section):**
```csv
Apartado,1.1.1,Cableado de Baja Tensión,,,
```
- Solo requiere: Nivel, ID, Nombre
- Resto: **opcional/ignorado**

#### **Partida (Item):**
```csv
Partida,1.1.1.1,Cable UTP Cat6,Instalación de cable categoría 6,m,21,15.50
```
- **Todos los campos obligatorios**
- Descripción: opcional pero recomendada
- Ud, %IVA, PVP: **obligatorios con valores válidos**

---

### 4.3. Ejemplo CSV Completo

```csv
"Nivel","ID","Nombre","Descripción","Ud","%IVA","PVP"
"Capítulo",1,"Instalaciones Eléctricas",,,,
"Subcapítulo","1.1","Cableado Estructurado",,,,
"Apartado","1.1.1","Cableado de Baja Tensión",,,,
"Partida","1.1.1.1","Cable UTP Cat6","Instalación de cable UTP categoría 6","m",21,15.50
"Partida","1.1.1.2","Canaleta PVC","Canaleta PVC 40x25mm","m",21,8.30
"Subcapítulo","1.2","Puntos de Red",,,,
"Partida","1.2.1","Roseta RJ45","Roseta empotrable RJ45 Cat6","ud",21,12.00
"Capítulo",2,"Fontanería",,,,
"Subcapítulo","2.1","Tuberías de Agua",,,,
"Partida","2.1.1","Tubería PEX 16mm","Instalación de tubería PEX","m",10,12.30
"Partida","2.1.2","Codo PEX 90º","Codo de 90 grados para PEX","ud",10,3.50
"Capítulo",3,"Pintura",,,,
"Partida","3.1","Pintura Plástica","Aplicación de pintura plástica lisa","m²",21,8.50
```

---

## ❌ 5. ERRORES POSIBLES

### 5.1. Errores FATALES (detienen el proceso)

| Código | Causa | Mensaje | Solución |
|--------|-------|---------|----------|
| **PARSE_ERROR** | Archivo corrupto o encoding incorrecto | "Error al parsear CSV: archivo inválido" | Verificar que es un CSV válido, guardar con UTF-8 |
| **STRUCTURE_ERROR** | Faltan cabeceras o columnas | "Faltan campos esenciales: nivel, id, nombre..." | Añadir todas las columnas obligatorias |
| **STRUCTURE_ERROR** | Archivo vacío | "CSV debe tener cabeceras y al menos una fila de datos" | Añadir al menos una fila de datos |

---

### 5.2. Errores de VALIDACIÓN (por fila)

| Error | Causa | Mensaje | Ejemplo inválido | Solución |
|-------|-------|---------|------------------|----------|
| **Nivel inválido** | Nivel no reconocido | "Nivel inválido: 'Sección'" | `Sección,1.1,Datos` | Usar: Capítulo, Subcapítulo, Apartado, Partida |
| **ID inválido** | Formato incorrecto | "ID debe tener formato válido" | `1.A.1`, `1-1-1` | Usar solo números y puntos: `1.1.1` |
| **Campo vacío** | Campo obligatorio vacío | "Nombre no puede estar vacío" | `Partida,1.1,,Desc,m,21,10` | Completar el campo vacío |
| **Número inválido** | Formato numérico incorrecto | "PVP inválido: 'abc'" | `Partida,1.1,Item,Desc,m,21,abc` | Usar números válidos: `15.50` |
| **Rango inválido** | Valor fuera de rango | "%IVA fuera de rango: 150" | `Partida,1.1,Item,Desc,m,150,10` | IVA entre 0-100 |
| **Precio negativo** | PVP menor o igual a 0 | "PVP debe ser mayor que 0" | `Partida,1.1,Item,Desc,m,21,-10` | Usar precio positivo |

---

### 5.3. Errores de JERARQUÍA

| Error | Causa | Mensaje | Ejemplo | Solución |
|-------|-------|---------|---------|----------|
| **Padre faltante** | No existe el contenedor padre | "Padre no encontrado para ID 1.2.1" | Partida `1.2.1` sin apartado `1.2` | Añadir el apartado `1.2` antes |
| **ID duplicado** | Mismo ID en dos filas | "ID duplicado: 1.1" | Dos filas con ID `1.1` | Cambiar uno de los IDs |
| **Profundidad excedida** | Más de 4 niveles | "ID excede profundidad máxima" | `1.1.1.1.1` (5 niveles) | Reducir a máximo 4 niveles |

---

### 5.4. ADVERTENCIAS (no detienen el proceso)

| Advertencia | Causa | Mensaje | Impacto |
|-------------|-------|---------|---------|
| **Secuencia incorrecta** | IDs no consecutivos | "Esperado 1.2, encontrado 1.3" | Solo informativo, no afecta |
| **Descripción vacía** | Partida sin descripción | *(No genera mensaje)* | Campo opcional, puede estar vacío |

---

### 5.5. Tabla Resumen de Severidades

| Severidad | Símbolo | Significado | Acción del sistema |
|-----------|---------|-------------|-------------------|
| **FATAL** | 🔴 | Error crítico, archivo inválido | Detiene proceso, no genera JSON |
| **ERROR** | 🟠 | Error de validación | Acumula errores, muestra todos |
| **WARNING** | 🟡 | Advertencia, no crítico | Muestra aviso, continúa proceso |

---

## ✨ 6. RESULTADO FINAL

### 6.1. Estructura JSON Generada

```json
[
  {
    "level": "chapter",
    "id": "1",
    "name": "Instalaciones Eléctricas",
    "amount": "0.00"
  },
  {
    "level": "subchapter",
    "id": "1.1",
    "name": "Cableado Estructurado",
    "amount": "0.00"
  },
  {
    "level": "item",
    "id": "1.1.1",
    "name": "Cable Utp Cat6",
    "description": "Instalación de cable UTP categoría 6",
    "unit": "m",
    "quantity": "0.00",
    "iva_percentage": "21.00",
    "pvp": "15.50",
    "amount": "0.00"
  }
]
```

---

### 6.2. Campos del JSON por Nivel

#### **Todos los niveles (chapter, subchapter, section, item):**
| Campo | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| `level` | string | `"chapter"` | Nivel jerárquico en inglés |
| `id` | string | `"1.1.1"` | Identificador jerárquico |
| `name` | string | `"Cable Utp"` | Nombre normalizado |
| `amount` | string | `"0.00"` | Total calculado (inicialmente 0) |

#### **Solo para PARTIDAS (item):**
| Campo | Tipo | Ejemplo | Descripción |
|-------|------|---------|-------------|
| `description` | string | `"Cat 6"` | Descripción detallada (opcional) |
| `unit` | string | `"m"` | Unidad de medida |
| `quantity` | string | `"0.00"` | Cantidad (se define en presupuesto) |
| `iva_percentage` | string | `"21.00"` | Porcentaje IVA (0-100) |
| `pvp` | string | `"15.50"` | Precio unitario |

---

### 6.3. Dónde se Guarda

1. **Base de datos:**
   - Tabla: `tariffs`
   - Campo: `json_tariff_data` (tipo: `JSONB`)
   - Registro completo con metadatos:
     ```json
     {
       "id": "uuid-tariff",
       "title": "Tarifa TPVs 2024",
       "description": "Tarifas para instalación TPVs",
       "status": "Activa",
       "json_tariff_data": [...],  // Array con estructura
       "empresa_id": "uuid-empresa",
       "created_at": "2024-10-02T10:30:00Z"
     }
     ```

2. **Visualización:**
   - Vista previa jerárquica en la interfaz
   - Formulario de presupuestos con acordeones
   - Exportación a PDF estructurado

---

## 📊 7. RESUMEN DE VALIDACIONES POR FASE

```
FASE 1: LECTURA
├─ ✓ Archivo legible
├─ ✓ Encoding UTF-8
└─ ✓ BOM eliminado

FASE 2: PARSEO
├─ ✓ Delimitador detectado (,;|\t)
├─ ✓ Comillas manejadas
└─ ✓ Filas válidas extraídas

FASE 3: ESTRUCTURA
├─ ✓ Cabeceras presentes
├─ ✓ 7 campos obligatorios
└─ ✓ Al menos 1 fila de datos

FASE 4: DATOS
├─ ✓ Nivel válido (capítulo/subcapítulo/apartado/partida)
├─ ✓ ID formato jerárquico (N.N.N.N)
├─ ✓ Campos obligatorios por tipo
├─ ✓ Números en rango
├─ ✓ Jerarquía completa (padres existen)
└─ ✓ Sin duplicados

FASE 5: TRANSFORMACIÓN
├─ ✓ Texto normalizado
├─ ✓ Números formato inglés
├─ ✓ Estructura JSON creada
└─ ✓ Campos calculados inicializados
```

---

## 🎯 8. CASOS DE USO COMUNES

### Caso 1: CSV Correcto (éxito total)
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Capítulo,1,Instalaciones,,,
Partida,1.1,Cable UTP,Cat 6,m,21,15.50
```
**Resultado:** ✅ JSON generado correctamente

---

### Caso 2: Falta padre (error jerarquía)
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Capítulo,1,Instalaciones,,,
Partida,1.1.1,Cable UTP,Cat 6,m,21,15.50  ← Falta 1.1
```
**Resultado:** ❌ Error "Padre no encontrado para ID 1.1.1"

---

### Caso 3: Número español (transformación exitosa)
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Partida,1.1,Cable,"Cat 6",m,21,"1.234,56"  ← Formato español
```
**Resultado:** ✅ Convertido a `"1234.56"` en JSON

---

### Caso 4: IVA fuera de rango (error validación)
```csv
Nivel,ID,Nombre,Descripción,Ud,%IVA,PVP
Partida,1.1,Cable,Cat 6,m,150,15.50  ← IVA > 100
```
**Resultado:** ❌ Error "%IVA fuera de rango: 150"

---

## 📚 9. GLOSARIO

| Término | Definición |
|---------|-----------|
| **BOM** | Byte Order Mark - caracteres especiales al inicio de archivos UTF-8 |
| **Delimitador** | Carácter separador de campos (coma, punto y coma, tabulador) |
| **Jerarquía** | Estructura de 4 niveles: Capítulo → Subcapítulo → Apartado → Partida |
| **Normalización** | Proceso de limpieza y estandarización de datos |
| **Parser** | Componente que analiza y extrae datos del CSV |
| **Slug** | Versión simplificada de texto para comparación (sin tildes, minúsculas) |
| **Validación fatal** | Error que impide continuar el proceso |
| **Validación de datos** | Comprobación de valores individuales |
| **Validación estructural** | Comprobación de formato y cabeceras del CSV |

---

## 🔗 10. DIAGRAMA DE DECISIÓN

```
¿Archivo CSV válido?
    │
    ├─ NO → 🔴 FATAL: "Archivo inválido"
    │
    ├─ SÍ → ¿Tiene cabeceras?
            │
            ├─ NO → 🔴 FATAL: "Faltan cabeceras"
            │
            ├─ SÍ → ¿Tiene 7 campos obligatorios?
                    │
                    ├─ NO → 🔴 FATAL: "Faltan campos esenciales"
                    │
                    ├─ SÍ → ¿Tiene al menos 1 fila de datos?
                            │
                            ├─ NO → 🔴 FATAL: "Sin datos"
                            │
                            ├─ SÍ → Validar cada fila:
                                    │
                                    ├─ ¿Nivel válido? → NO → 🟠 ERROR: "Nivel inválido"
                                    ├─ ¿ID formato correcto? → NO → 🟠 ERROR: "ID inválido"
                                    ├─ ¿Campos obligatorios completos? → NO → 🟠 ERROR: "Campo vacío"
                                    ├─ ¿Números válidos? → NO → 🟠 ERROR: "Número inválido"
                                    ├─ ¿Jerarquía correcta? → NO → 🟠 ERROR: "Padre faltante"
                                    ├─ ¿Sin duplicados? → NO → 🟠 ERROR: "ID duplicado"
                                    │
                                    └─ TODO OK → ✅ Generar JSON
```

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de importar un CSV, verificar:

- [ ] **Archivo correcto**
  - [ ] Extensión `.csv`
  - [ ] Codificación UTF-8
  - [ ] Delimitador consistente (`,` `;` `|` o tab)

- [ ] **Cabeceras completas**
  - [ ] Nivel / Level
  - [ ] ID
  - [ ] Nombre / Name
  - [ ] Descripción / Description
  - [ ] Ud / Unit
  - [ ] %IVA / iva_percentage
  - [ ] PVP

- [ ] **Estructura jerárquica**
  - [ ] Todos los capítulos numerados (1, 2, 3...)
  - [ ] Subcapítulos dentro de capítulos (1.1, 1.2...)
  - [ ] Apartados dentro de subcapítulos (1.1.1, 1.1.2...)
  - [ ] Partidas dentro de apartados (1.1.1.1...)

- [ ] **Datos de partidas**
  - [ ] Todas tienen Unidad (m, ud, m², etc.)
  - [ ] Todas tienen %IVA (0-100)
  - [ ] Todas tienen PVP (> 0)
  - [ ] Números en formato válido (español o inglés)

- [ ] **Sin errores comunes**
  - [ ] No hay IDs duplicados
  - [ ] No hay niveles inventados
  - [ ] No hay "saltos" en jerarquía (todos los padres existen)
  - [ ] Números sin letras ni caracteres especiales

---

**FIN DEL DOCUMENTO**

*Versión: 1.0*
*Fecha: 2024-10-02*
*Proyecto: jeyca-presu*
