# Regla de Preservación de Funciones e Interfaces Operativas (Prohibición Estricta de Regresiones)

## 1. Principio Fundamental
En **PC Manager**, todo lo que ya funciona, tiene una geometría definida, un layout aprobado o una interacción resuelta es un **activo intocable e inmutable** frente a cambios arbitrarios. Queda terminantemente prohibido alterar, encoger, comprimir, deformar o romper interfaces y funciones que ya operan correctamente.

---

## 2. Directivas Obligatorias

### 2.1. Regla de Oro: "No Romper lo que Funciona"
- Si un componente visual (tarjeta de dashboard, tarjeta de configuraciones, menú lateral, barra superior, panel de widgets, drawer o diálogo modal) ya posee proporciones aprobadas, diseño fluido y funcionalidad correcta:
  - **Prohibido modificar su disposición espacial**: No cambiar anchos (ej. de ancho completo a columnas apretadas), no reducir alturas ni alterar tamaños de tipografía o espaciados que compriman el contenido.
  - **Prohibido introducir efectos secundarios no deseados**: Un cambio en la vista de notificaciones o perfiles jamás debe impactar las dimensiones del dashboard, ni de las configuraciones, ni de las tarjetas existentes.

### 2.2. Protocolo Obligatorio al Modificar Componentes Preexistentes
Si por fuerza mayor técnica, integración de una nueva característica arquitectónica o resolución de un bug crítico es **estrictamente indispensable** intervenir un componente, vista o layout que ya estaba funcionando:
1. **Documentación Previa y Exhaustiva**: Registrar el cambio en [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md) detallando:
   - Motivo técnico exacto por el cual no fue posible implementar la novedad sin tocar el componente existente.
   - Archivos y líneas precisas intervenidas.
   - Análisis de impacto dimensional y funcional.
2. **Garantía Anti-Regresión**: Validar que el componente conserve su ergonomía, legibilidad, tamaño de botones, márgenes, padding y capacidad operativa sin recortes ni compresiones.
3. **Comunicación Transparente**: Informar al usuario en el reporte de entrega qué se tocó y por qué, demostrando que no se generaron daños colaterales.

---

## 3. Dimensiones Canónicas del Sistema (Referencia Histórica Aprobada)
- **Dashboard Grid**:
  - `grid-template-columns`: 10 columnas (`repeat(10, minmax(0, 1fr))`).
  - `grid-auto-rows`: `90px;` (altura base uniforme y equilibrada).
  - `gap`: `14px;`.
  - Tarjetas con clases de tamaño canónicas (`card-size-1x1`, `card-size-2x1`, `card-size-2x2`, etc.) con espaciado interior (`padding: 16px;`) y cabeceras legibles sin truncar.
- **Configuraciones del Sistema**:
  - `.settings-content-stack`: `display: flex; flex-direction: column; gap: 20px; width: 100%;` (ancho completo 100% holgado y despejado, prohibido comprimir en cuadrículas estrechas de múltiples columnas que apiñen interruptores o textos).
