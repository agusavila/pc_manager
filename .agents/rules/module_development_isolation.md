# Directiva de Regla 13: Aislamiento de Desarrollo Modular (Carpetas Dedicadas y Commits Independientes)

## Propósito y Alcance
Esta directiva establece los estándares obligatorios para el desarrollo, evolución, refactorización y control de versiones de módulos en **PC Manager**. Su objetivo es garantizar que la arquitectura Core-Modular mantenga un desacoplamiento absoluto y que el historial de control de versiones (Git) sea limpio, auditable e independiente por cada componente funcional.

---

## Directivas Obligatorias

### 1. Directorio Dedicado por Módulo
- Cada módulo o extensión debe residir de forma autocontenida en su propia carpeta bajo `modules/<id-del-modulo>/`.
- La carpeta del módulo debe contener la totalidad de sus recursos:
  1. `manifest.json`: Manifiesto formal del módulo (metadatos, vistas, widgets, meta-opciones, servicios exportados/consumidos).
  2. `module.js`: Lógica del frontend y controladores de vistas/widgets.
  3. `collector.ps1` (o scripts nativos de telemetría/recolección en el host).
  4. Tríada de documentación o README local del módulo.
  5. Firma criptográfica (`signature.sig`) o llaves de verificación cuando sea empaquetado como `.pcm`.
- **Prohibido**: Alojar lógica, estilos específicos o scripts de un módulo dentro de carpetas del Core (`ui/js/app.js`, `src/core/`, etc.).

### 2. Commits Atómicos y Exclusivos por Módulo
- **Prohibición de Commits Mixtos**: Queda terminantemente prohibido incluir en un mismo commit cambios al Core y cambios a un módulo, o cambios a múltiples módulos a la vez.
- **Convención de Commits Semánticos por Módulo**:
  - `feat(module-<id>): <descripción>` para nuevas funcionalidades del módulo.
  - `fix(module-<id>): <descripción>` para correcciones de bugs en el módulo.
  - `refactor(module-<id>): <descripción>` para refactorizaciones internas del módulo.
  - `docs(module-<id>): <descripción>` para documentación del módulo.
- **Secuencia ante Cambios Coordinados**: Si una funcionalidad requiere extender el Core (ej. un nuevo endpoint o servicio de eventos) y luego actualizar el módulo para consumirlo:
  1. **Commit 1 (Core)**: Se implementa, testea y commitea la extensión del Core (`feat(core): ...` o `refactor(core): ...`).
  2. **Commit 2 (Módulo)**: Se actualiza el módulo en su propia carpeta y se commitea de forma independiente (`feat(module-<id>): ...`).

### 3. Autonomía de Empaquetado y Verificación
- Cada módulo debe poder empaquetarse de forma independiente como archivo `.pcm` utilizando la herramienta de firma criptográfica del sistema (`package_module`).
- La integridad de un módulo no debe depender de que otro módulo esté presente en disco, salvo dependencias formales declaradas y verificadas por el Core en su manifiesto (`dependencies`).
