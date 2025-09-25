# Tareas - MÓDULO: Common

## MÓDULO ACTIVO: Common
**Tareas Activas:** 0/4

## BACKLOG
### Críticas (obligatorias para completar módulo):
1. **Validadores CSV** - 1 día
   - Validador estructura CSV tarifas
   - Esquemas Zod para validación datos
   - Transformación CSV a JSON

2. **Utilidades cálculo** - 1 día
   - Helpers matemáticos para presupuestos
   - Cálculos de descuentos y ofertas
   - Funciones agregación de totales

3. **Helpers formato** - 0.5 días
   - Formateo moneda y números
   - Formateo fechas localizadas
   - Normalización strings y emails

4. **Constantes** - 0.5 días
   - Constantes del sistema centralizadas
   - Configuraciones por defecto
   - Mensajes de error y validación

### Alta (importantes pero no críticas):
1. **Utilidades generales** - 0.5 días
   - Helpers para arrays y objetos
   - Funciones de debounce/throttle
   - Utilitarios para URLs

## ARCHIVOS DE ESTE MÓDULO:
- src/lib/utils/*
- src/lib/validators/*
- src/lib/helpers/*
- src/lib/constants/*

## CRITERIOS COMPLETADO COMMON:
- [ ] Validadores CSV funcionando
- [ ] Helpers de cálculo testeados
- [ ] Formateo consistente implementado
- [ ] Constantes centralizadas
- [ ] Tests básicos pasando

## NOTAS TÉCNICAS:
- **Validadores**: Usar Zod para esquemas robustos
- **Cálculos**: Precisión decimal con library dedicada
- **Formato**: Internacionalización preparada
- **Constantes**: TypeScript const assertions

## TESTING MÍNIMO:
- Validación CSV con datos reales
- Cálculos matemáticos precisos
- Formateo en diferentes locales
- Constantes accesibles desde otros módulos