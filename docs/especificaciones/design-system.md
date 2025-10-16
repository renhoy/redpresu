# Sistema de Diseño - Redpresu

**Versión:** 1.0
**Última actualización:** 2025-01-14
**Estado:** Activo (Fase 2)

---

## 📋 Índice

1. [Identidad Visual](#identidad-visual)
2. [Tipografía](#tipografía)
3. [Sistema de Colores](#sistema-de-colores)
4. [Componentes UI](#componentes-ui)
5. [Patrones de Layout](#patrones-de-layout)
6. [Estructura de Páginas](#estructura-de-páginas)
7. [Responsive Design](#responsive-design)
8. [Iconografía](#iconografía)
9. [Animaciones y Transiciones](#animaciones-y-transiciones)
10. [Accesibilidad](#accesibilidad)

---

## 🎨 Identidad Visual

### Marca

- **Nombre:** Redpresu
- **Tagline:** Gestión de Presupuestos Profesionales
- **Logo:** Icono de FileText en contenedor verde lima

### Paleta de Colores Primaria

La aplicación usa un esquema de colores basado en **verde lima** con acentos neutros:

```css
/* Color principal de marca */
Primary: #84e44b (Verde Lima)
Background base: #f7fee7 (Lima muy claro)
```

---

## 🔤 Tipografía

### Fuentes

La aplicación utiliza la familia **Geist** de Vercel:

- **Geist Sans**: Fuente principal para UI y contenido
- **Geist Mono**: Fuente monoespaciada para código y datos técnicos

```typescript
// Configuración en layout.tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### Escalas Tipográficas

```css
/* Títulos */
h1: text-3xl font-bold (30px, 700)
h2: text-xl font-bold (20px, 700)
h3: text-lg font-semibold (18px, 600)

/* Textos de UI */
Base: text-sm (14px)
Small: text-xs (12px)
Muted: text-sm text-muted-foreground (14px, gris)

/* Componentes específicos */
Buttons: text-sm font-medium
Labels: text-sm font-medium
Card Title: leading-none font-semibold
Card Description: text-sm text-muted-foreground
```

---

## 🎨 Sistema de Colores

### Metodología

La aplicación usa **variables CSS con valores HSL** para un sistema de temas consistente. Configurado en `globals.css`:

### Colores Base (Light Mode)

```css
:root {
  /* Fondos y bordes */
  --background: 0 0% 100%;           /* Blanco */
  --foreground: 0 0% 3.9%;           /* Negro casi puro */
  --border: 0 0% 89.8%;              /* Gris muy claro */
  --input: 0 0% 89.8%;               /* Gris muy claro */

  /* Colores semánticos */
  --primary: 84 81% 44%;             /* Verde Lima (HSL) */
  --primary-foreground: 0 0% 100%;   /* Blanco */

  --secondary: 84 60% 96%;           /* Lima muy claro */
  --secondary-foreground: 84 81% 20%; /* Verde oscuro */

  --muted: 84 30% 96%;               /* Gris lima */
  --muted-foreground: 0 0% 45.1%;    /* Gris medio */

  --accent: 84 60% 90%;              /* Lima claro */
  --accent-foreground: 84 81% 20%;   /* Verde oscuro */

  --destructive: 0 84.2% 60.2%;      /* Rojo */
  --destructive-foreground: 0 0% 98%; /* Blanco */

  /* Componentes */
  --card: 0 0% 100%;                 /* Blanco */
  --card-foreground: 0 0% 3.9%;      /* Negro */

  --popover: 0 0% 100%;              /* Blanco */
  --popover-foreground: 0 0% 3.9%;   /* Negro */

  --ring: 84 81% 44%;                /* Verde Lima (focus) */

  /* Border Radius */
  --radius: 0.5rem;                  /* 8px */
}
```

### Background Principal

```css
body {
  background: #f7fee7; /* Verde lima muy claro */
}
```

### Colores de Estado (Budgets)

```typescript
const statusColors = {
  borrador: 'bg-black text-neutral-200',
  pendiente: 'bg-orange-100 text-yellow-800',
  enviado: 'bg-slate-100 text-cyan-600',
  aprobado: 'bg-emerald-50 text-green-600',
  rechazado: 'bg-pink-100 text-rose-600',
  caducado: 'bg-neutral-200 text-black'
}
```

### Colores Adicionales Específicos

```typescript
// Navegación Header
Tarifas (especial): bg-cyan-600 hover:bg-cyan-700
Otros botones nav: bg-lime-500 hover:bg-lime-600
Activo: text-lime-700 bg-lime-50

// Alertas y warnings
Warning: bg-yellow-50 border-yellow-300 text-yellow-800
Success: text-green-600
Error: text-red-600

// Backgrounds de páginas
Dashboard: bg-lime-50
Tariffs: bg-lime-50
Budgets: bg-lime-50
```

### Border Radius

```css
lg: 0.5rem (8px)          /* Default cards, buttons */
md: calc(0.5rem - 2px)    /* Inputs, selects */
sm: calc(0.5rem - 4px)    /* Badges, pills */
xl: 0.75rem (12px)        /* Cards especiales */
```

---

## 🧩 Componentes UI

### Configuración shadcn/ui

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "baseColor": "neutral",
  "cssVariables": true,
  "iconLibrary": "lucide"
}
```

### Button

**Variantes:**

```typescript
default: bg-lime-500 text-white hover:bg-lime-600
destructive: bg-destructive text-white hover:bg-destructive/90
outline: border border-lime-500 bg-white text-lime-600 hover:bg-lime-50
secondary: bg-white text-lime-600 hover:bg-lime-50 border border-lime-200
ghost: hover:bg-lime-50 hover:text-lime-700
link: text-lime-600 underline-offset-4 hover:underline
```

**Tamaños:**

```typescript
default: h-9 px-4 py-2
sm: h-8 px-3
lg: h-10 px-6
icon: size-9 (36×36px)
```

**Características:**

- Focus ring de 3px con color `ring-lime-500/50`
- Transiciones suaves con `transition-all`
- Gap de 2 entre icono y texto
- SVG automáticamente size-4

### Card

**Estructura:**

```tsx
<Card>             {/* rounded-xl border shadow-sm */}
  <CardHeader>     {/* px-6 gap-1.5 */}
    <CardTitle>    {/* font-semibold */}
    <CardDescription> {/* text-sm text-muted-foreground */}
    <CardAction>   {/* Opcional: actions en header */}
  </CardHeader>
  <CardContent>    {/* px-6 */}
  <CardFooter>     {/* px-6 */}
</Card>
```

**Uso común:**

- Background: `bg-card` (blanco)
- Padding vertical: `py-6`
- Gap entre secciones: `gap-6`
- Border radius: `rounded-xl`

### Input

**Estados:**

```typescript
Default: border-input bg-transparent
Focus: border-ring ring-ring/50 ring-[3px]
Error: border-destructive ring-destructive/20
Disabled: opacity-50 pointer-events-none
```

**Características:**

- Altura: `h-9` (36px)
- Padding: `px-3 py-1`
- Font size: `text-base` en mobile, `text-sm` en desktop
- Border radius: `rounded-md`
- Shadow: `shadow-xs`

### Table

**Estructura:**

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>   {/* font-medium */}
  </TableHeader>
  <TableBody>
    <TableRow>      {/* hover:bg-muted/50 */}
      <TableCell>   {/* p-2 */}
  </TableBody>
</Table>
```

**Características:**

- Container: `overflow-x-auto` (scroll horizontal en mobile)
- Rows: Border bottom, hover state
- Whitespace: `whitespace-nowrap` por defecto
- Cell padding: `p-2`

### Badge

**Variantes:**

```typescript
default: bg-primary text-primary-foreground
secondary: bg-secondary text-secondary-foreground
destructive: bg-destructive text-white
outline: border text-foreground
```

**Tamaño:**

- Padding: `px-2 py-0.5`
- Font: `text-xs font-medium`
- Border radius: `rounded-md`

### Alert Dialog

**Uso:**

Confirmaciones de acciones destructivas o importantes.

**Características:**

- Overlay oscuro semi-transparente
- Dialog centrado con animación fade-in
- Botones: Cancel (outline) + Action (destructive o primary)
- Max width: `sm:max-w-[500px]`

### Tooltip

**Configuración:**

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      {/* Elemento trigger */}
    </TooltipTrigger>
    <TooltipContent>
      <p>{text}</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Uso común:**

- Botones de solo icono en mobile
- Información adicional en hover
- Shortcuts de teclado

### Select

**Características:**

- Trigger: Similar a Input con chevron
- Content: Background blanco, shadow, border
- Item: Padding `py-2 px-3`, hover `bg-accent`
- Selected: Background `bg-accent`

### Checkbox

**Características:**

- Size: `h-4 w-4`
- Border: `border-primary`
- Checked: `bg-primary text-primary-foreground`
- Focus ring: `ring-ring/50`

---

## 📐 Patrones de Layout

### Container

Patrón universal en todas las páginas:

```tsx
<div className="container mx-auto px-4 py-6">
  {/* Contenido */}
</div>
```

**Características:**

- `container`: Max width responsivo (1400px en 2xl)
- `mx-auto`: Centrado horizontal
- `px-4`: Padding lateral consistente
- `py-6` o `py-8`: Padding vertical según página

### Grid Layouts

**Dashboard Stats (2x2):**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Stats cards */}
</div>
```

**Form Layouts (columnas proporcionales):**

```tsx
// Nombre (75%) + NIF (25%)
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-3">{/* Nombre */}</div>
  <div className="col-span-1">{/* NIF */}</div>
</div>

// Teléfono (25%) + Email (50%) + Web (25%)
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-1">{/* Tel */}</div>
  <div className="col-span-2">{/* Email */}</div>
  <div className="col-span-1">{/* Web */}</div>
</div>
```

**Listados (2 columnas en lg):**

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Últimos presupuestos | Próximos a caducar */}
</div>
```

### Spacing

**Stack vertical:**

```tsx
// Secciones grandes
<div className="space-y-8">

// Contenido dentro de cards
<div className="space-y-6">

// Form fields
<div className="space-y-4">

// Items de lista
<div className="space-y-3">

// Labels + inputs
<div className="space-y-2">
```

**Stack horizontal:**

```tsx
// Botones principales
<div className="flex gap-3">

// Form inline
<div className="flex items-center gap-2">

// Stats
<div className="flex justify-between items-center gap-4">
```

### Páginas de Fondo Completo

Todas las páginas autenticadas usan:

```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto px-4 py-6">
    {/* Contenido */}
  </div>
</div>
```

---

## 🏗️ Estructura de Páginas

### Header Común (Todas las páginas autenticadas)

**Ubicación:** `src/components/layout/Header.tsx`

**Características:**

```tsx
<header className="sticky top-0 z-50 bg-white shadow-sm border-b">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      {/* Logo + Brand */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-lime-500 rounded-lg">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold">Redpresu</span>
      </div>

      {/* Navigation Desktop */}
      <nav className="hidden lg:flex items-center space-x-4">
        {/* Botones nav */}
      </nav>

      {/* Navigation Mobile (solo iconos) */}
      <nav className="flex lg:hidden items-center gap-2">
        {/* Iconos con tooltips */}
      </nav>

      {/* User info + Logout */}
      <div className="flex items-center gap-3">
        {/* Desktop: Avatar + nombre + rol */}
        {/* Mobile: Solo icono con tooltip */}
      </div>
    </div>
  </div>
</header>
```

**Navegación según rol:**

```typescript
const navigation = [
  { name: 'Inicio', href: '/dashboard', icon: Home },
  { name: 'Tarifas', href: '/tariffs', icon: FileText },
  { name: 'Presupuestos', href: '/budgets', icon: Receipt },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Configuración', href: '/settings', icon: Settings, show: isSuperadmin }
]
```

**Botones navegación Desktop:**

- Activo: `text-lime-700 bg-lime-50`
- Tarifas (especial): `bg-cyan-600 hover:bg-cyan-700`
- Normal: `bg-lime-500 hover:bg-lime-600`
- Tamaño: `px-3 py-2 text-sm font-medium`

**Botones navegación Mobile:**

- Activo: `text-lime-700 bg-lime-50 border-lime-500`
- Normal: `text-green-600 bg-white border-green-600`
- Tamaño: `p-2` (solo icono)
- Con tooltips

### Header No Autenticado

```tsx
{/* Logo */}
<Link href="/">
  <div>{/* Logo */}</div>
  <span>Redpresu</span>
</Link>

{/* Botones auth */}
<div className="flex items-center gap-4">
  <Button variant="outline">Iniciar Sesión</Button>
  <Button className="bg-lime-500">Registro</Button>
</div>
```

### Dashboard (`/dashboard`)

**Layout:**

```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto px-4 py-8 space-y-8">
    {/* Header con filtro período */}
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold text-lime-700">Dashboard</h1>
      <Select>{/* Filtro período */}</Select>
    </div>

    {/* Stats Grid 2x2 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total, Valor, Mes, Conversión */}
    </div>

    {/* Accesos Rápidos */}
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Botones grandes (h-16) */}
      </div>
    </Card>

    {/* Listados 2 columnas */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Últimos | Próximos a caducar */}
    </div>
  </div>
</div>
```

**Stats Cards:**

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Label</CardTitle>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-xl font-bold">{value}</div>
  </CardContent>
</Card>
```

### Tarifas (`/tariffs`)

**Layout:**

```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto px-4 py-6">
    <TariffList {...props} />
  </div>
</div>
```

**TariffList contiene:**

- Header con título + botones de acción (Crear, Import, Export)
- Filtros (usuario, búsqueda)
- Tabla con columnas: Nombre, Creador, Validez, Template, Acciones
- Estados visuales (tarifa por defecto destacada)

### Presupuestos (`/budgets`)

**Layout similar a Tarifas:**

```tsx
<div className="min-h-screen bg-lime-50">
  <div className="container mx-auto px-4 py-6">
    <BudgetsTable budgets={budgets} />
  </div>
</div>
```

**BudgetsTable contiene:**

- Header con botones Crear + Export
- Tabla con columnas: Cliente, Tarifa, Estado, Total, Validez, Acciones
- Badges de estado con colores específicos
- Acciones: Ver PDF, Editar, Duplicar, Eliminar

### Formulario Presupuesto (`/budgets/create`)

**Layout especial:**

```tsx
<div className="max-w-4xl mx-auto relative">
  {/* Indicador guardado (fixed top-4 right-4) */}

  {/* Company Header Card */}
  <Card className="mb-6">
    {/* Logo + Datos empresa */}
  </Card>

  {/* Botones navegación */}
  <div className="flex justify-between items-center mb-6">
    <div className="flex gap-3">{/* Botones izq */}</div>
    <div className="flex gap-3">{/* Botones der */}</div>
  </div>

  {/* Step 1: Datos Cliente */}
  <Card className="gap-0">
    <CardHeader style={{ backgroundColor: tariff.primary_color }}>
      {/* Header con color de tarifa */}
    </CardHeader>
    <CardContent>
      {/* Formulario grid */}
    </CardContent>
  </Card>

  {/* Step 2: Datos Presupuesto */}
  <Card className="gap-0">
    <CardHeader style={{ backgroundColor: tariff.primary_color }}>
    <CardContent>
      <BudgetHierarchyForm />
    </CardContent>
  </Card>

  {/* AlertDialogs para confirmaciones */}
</div>
```

**Botones con tooltips:**

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" style={{ backgroundColor: tariff.primary_color }}>
        <Icon className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Formulario Tarifa (`/tariffs/create`)

Similar estructura a presupuesto pero con contenido diferente.

### Usuarios (`/users`)

Tabla con CRUD, similar a tarifas/presupuestos.

### Configuración (`/settings`)

Solo para superadmin, gestión de configuración global.

---

## 📱 Responsive Design

### Breakpoints

```typescript
// Tailwind default
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1400px (customizado en container)
```

### Patrones Responsive Comunes

**Grid responsivo:**

```tsx
// 1 col mobile → 2 col tablet → 3 col desktop
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

// 1 col mobile → 2 col desktop
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

// 1 col mobile → 4 col desktop (stats)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Header responsive:**

```tsx
// Desktop: texto completo
<div className="hidden lg:flex">
  <Button>
    <Icon />
    Texto completo
  </Button>
</div>

// Mobile: solo iconos
<div className="flex lg:hidden">
  <Tooltip>
    <Button size="icon">
      <Icon />
    </Button>
  </Tooltip>
</div>
```

**Flex direction:**

```tsx
// Stack vertical en mobile, horizontal en desktop
<div className="flex flex-col sm:flex-row gap-4">
```

**Text size:**

```tsx
// Input: base en mobile, sm en desktop
className="text-base md:text-sm"
```

**Spacing adaptativo:**

```tsx
// Padding vertical adaptativo
py-6  // Mobile
py-8  // Desktop (en algunos casos)
```

### Mobile-First

La aplicación sigue filosofía **mobile-first**:

1. Estilos base para mobile
2. Media queries para desktop (`md:`, `lg:`)
3. Tooltips para compensar falta de hover en mobile
4. Touch-friendly (botones mínimo 36×36px)

---

## 🎨 Iconografía

### Librería: Lucide React

```bash
npm install lucide-react
```

### Iconos Comunes

```typescript
// Navegación
Home, FileText, Receipt, Users, Settings, CircleUser

// Acciones
PlusCircle, Trash2, Save, FileStack, ArrowLeft, ArrowRight
Edit, Copy, Download, Upload, X, Check

// Estados
AlertCircle, CheckCircle, Clock, XCircle, Loader2

// UI
Calendar, Euro, TrendingUp, ChevronDown, Search
```

### Tamaños Estándar

```tsx
// Iconos en botones
<Icon className="w-4 h-4" />

// Iconos en navegación
<Icon className="w-5 h-5" />

// Iconos decorativos
<Icon className="h-4 w-4 text-muted-foreground" />

// Logo
<Icon className="h-5 w-5 text-white" />

// Loading spinner
<Loader2 className="h-4 w-4 animate-spin" />
```

### Colores de Iconos

```tsx
// Muted (decorativo)
text-muted-foreground

// Color de marca
text-green-600, text-lime-700

// Estado
text-orange-600 (warning)
text-red-600 (error)
text-green-600 (success)

// Blanco (en botones primary)
text-white
```

---

## ✨ Animaciones y Transiciones

### Transiciones Estándar

```typescript
// Botones
transition-all

// Elementos hover
transition-colors

// Accordion (shadcn/ui)
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
}
```

### Loading States

```tsx
// Skeleton loader
<Skeleton className="h-6 w-16" />

// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Pulse (tailwind default)
<div className="animate-pulse">
```

### Focus States

```typescript
// Ring estándar
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]

// Outline (evitar)
outline-none
```

### Hover States

```tsx
// Botones
hover:bg-lime-600

// Cards/Rows
hover:bg-muted/50

// Links
hover:bg-lime-50 hover:text-lime-700

// Tablas
hover:bg-gray-50
```

---

## ♿ Accesibilidad

### Prácticas Implementadas

**Semántica HTML:**

- Headers `<h1>`, `<h2>`, etc. en orden jerárquico
- Buttons verdaderos (no `<div>` clickeables)
- Labels para todos los inputs
- Roles ARIA cuando necesario

**Teclado:**

- Todos los elementos interactivos accesibles con Tab
- Focus visible con ring
- Enter/Space para activar botones
- Escape para cerrar modales

**Color y Contraste:**

- Textos cumplen WCAG AA
- Focus ring visible (3px, color contrastado)
- Estados no dependientes solo de color (iconos + texto)

**Formularios:**

```tsx
<Label htmlFor="field_id">Label text</Label>
<Input id="field_id" aria-invalid={!!error} />
{error && <p className="text-sm text-destructive">{error}</p>}
```

**Tooltips:**

- No información crítica solo en tooltip
- Alternativas para touch (modal en mobile si necesario)

**ARIA Attributes:**

```tsx
// Estados de error
aria-invalid={!!error}

// Loading
aria-busy={isLoading}

// Expandidos
aria-expanded={isOpen}

// Describir elemento
aria-label="Descripción"
aria-describedby="description-id"
```

### Mejoras Pendientes (Fase 3)

- [ ] Skip to content link
- [ ] Landmarks ARIA más completos
- [ ] Screen reader testing
- [ ] Reducción de movimiento (prefers-reduced-motion)
- [ ] Modo alto contraste

---

## 📦 Componentes Específicos del Proyecto

### Company Header (Presupuestos)

```tsx
<Card className="mb-6">
  <CardContent className="py-3 px-6">
    <div className="grid grid-cols-[auto_1fr] gap-6">
      {/* Logo */}
      <img src={logo} className="w-24 h-24 object-contain" />

      {/* Datos empresa */}
      <div className="space-y-0.5">
        <h2 style={{ color: primaryColor }}>{name}</h2>
        <p className="text-sm text-muted-foreground">{nif}</p>
        <p className="text-sm text-muted-foreground">{address}</p>
        <p className="text-sm text-muted-foreground">{contact}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Indicador de Guardado (Presupuestos)

```tsx
<div className="fixed top-4 right-4 z-50">
  <div className="bg-white border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
    {saving ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Guardando...</span>
      </>
    ) : (
      <>
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-600">Guardado</span>
      </>
    )}
  </div>
</div>
```

### Badges de Estado

Definir colores claros según estado del presupuesto:

```typescript
const statusColors = {
  borrador: 'bg-black text-neutral-200',
  pendiente: 'bg-orange-100 text-yellow-800',
  enviado: 'bg-slate-100 text-cyan-600',
  aprobado: 'bg-emerald-50 text-green-600',
  rechazado: 'bg-pink-100 text-rose-600',
  caducado: 'bg-neutral-200 text-black'
}

<Badge className={statusColors[status]}>{status}</Badge>
```

### Recargo Equivalencia Section

```tsx
<div className="space-y-3 p-4 border rounded-lg bg-amber-50">
  <Checkbox id="aplica_re" />
  <Label>Aplicar Recargo de Equivalencia</Label>

  {aplicaRE && (
    <div className="space-y-3 pt-2">
      {/* Inputs para cada IVA */}
      <div className="flex items-center gap-4 p-3 rounded border">
        <Label>21,00% IVA</Label>
        <Input type="text" />
        <span>% RE</span>
      </div>
    </div>
  )}
</div>
```

---

## 🔧 Utilidades y Helpers

### Formateo de Moneda

```typescript
// src/lib/helpers/format.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
```

### Formateo de Fechas

```typescript
// Dashboard y listados
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
```

### Clases Condicionales (cn)

```typescript
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === "primary" && "primary-classes"
)} />
```

---

## 📝 Convenciones de Código

### Naming

- Componentes: `PascalCase.tsx`
- Funciones: `camelCase()`
- Tipos: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- CSS vars: `--kebab-case`

### Estructura de Archivos

```
src/
├── app/
│   ├── (auth)/          # Rutas autenticación
│   ├── dashboard/
│   ├── tariffs/
│   ├── budgets/
│   └── users/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Header, Footer, etc.
│   ├── dashboard/
│   ├── tariffs/
│   └── budgets/
└── lib/
    ├── helpers/         # Formateo, cálculos
    ├── types/
    └── utils/
```

### Imports

Orden:

1. External packages (react, next, etc.)
2. Internal components (@/components)
3. Internal lib (@/lib)
4. Types
5. Styles (si aplica)

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/helpers/format'
import type { Budget } from '@/lib/types/database'
```

---

## 🚀 Performance

### Optimizaciones Implementadas

**Imágenes:**

- Next.js Image component donde sea posible
- Logo tarifas: `object-contain` para mantener aspect ratio
- Lazy loading automático

**Componentes:**

- Server Components por defecto
- Client Components solo cuando necesario (`'use client'`)
- Suspense para loading states

**Fonts:**

- Geist fonts optimizadas por Vercel
- Variable fonts para menos peso
- Preload automático

**CSS:**

- Tailwind JIT para CSS mínimo
- PurgeCSS automático en producción
- Variables CSS para temas rápidos

---

## 📚 Recursos y Referencias

### Documentación Oficial

- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)
- [Next.js](https://nextjs.org/)

### Herramientas Útiles

- **Color Picker HSL:** [hslpicker.com](https://hslpicker.com/)
- **Contrast Checker:** [WebAIM](https://webaim.org/resources/contrastchecker/)
- **Icon Search:** [Lucide Dev](https://lucide.dev/icons/)

### Inspiración

- shadcn/ui examples
- Vercel Design System
- Stripe Dashboard

---

## 🔄 Changelog del Sistema de Diseño

### v1.0 (2025-01-14)

- Documentación inicial del sistema de diseño
- Colores base verde lima definidos
- Componentes UI shadcn/ui configurados
- Header responsive implementado
- Páginas principales estructuradas

### Próximas versiones

**v1.1 - Fase 2 Usuarios:**

- [ ] Nuevos componentes para gestión usuarios
- [ ] Forms de registro/login refinados

**v1.2 - Fase 2 Responsive:**

- [ ] Mobile cards para tarifas/presupuestos
- [ ] Navegación mobile mejorada

**v2.0 - Fase 3 Dark Mode:**

- [ ] Variables CSS dark mode
- [ ] Toggle theme
- [ ] Persistencia preferencia

---

**Documento mantenido por:** Equipo de desarrollo
**Próxima revisión:** Fin de Fase 2
**Contacto:** [Equipo Tech Lead]
