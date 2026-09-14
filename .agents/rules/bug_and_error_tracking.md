# Regla de Workspace: Registro Obligatorio de Errores y Bug Fixes por Commit

Esta regla establece el procedimiento estricto y continuo para auditar, documentar y registrar todas las incidencias, bugs resueltos, errores de ejecución y fallos corregidos en el proyecto **PC Manager**.

---

## 1. Principio Fundamental

Cada vez que se detecte, depure o corrija un error (sea funcional, sintáctico, de interfaz, de concurrencia o de integración de herramientas), es **obligatorio** registrar la incidencia en el archivo canónico [`BUG_TRACKER.md`](file:///c:/Proyectos/pc_manager/BUG_TRACKER.md) antes o en conjunto con el commit correspondiente.

---

## 2. Archivo Canónico de Registro: `BUG_TRACKER.md`

El archivo reside en la raíz del repositorio y actúa como bitácora permanente de control de calidad y resiliencia.

### Estructura Obligatoria de Cada Entrada:
Para cada bug corregido se debe registrar:
- **ID de Incidencia**: `BUG-XXX` (numérico correlativo).
- **Fecha y Hora**: Timestamp local o UTC de la corrección.
- **Commit Hash**: Hash abreviado del commit de Git donde se incorporó la corrección.
- **Versión / Tag**: Versión semántica del sistema (ej. `v0.0.1-alpha`).
- **Severidad**: `CRÍTICA`, `ALTA`, `MEDIA`, `BAJA`.
- **Componente Afectado**: Módulo, archivo o subsistema (`Core`, `EventBus`, `ModuleManager`, `UI`, `Git/Tooling`, etc.).
- **Descripción del Fallo**: Síntoma observado o error arrojado.
- **Causa Raíz**: Explicación técnica del porqué ocurría el problema.
- **Solución Implementada**: Explicación precisa de cómo se corrigió y archivos modificados.
- **Estado**: `RESUELTO`, `VERIFICADO`.

---

## 3. Momentos de Aplicación Obligatoria

1. **Correcciones durante el Desarrollo**:
   - Si un script, prueba unitaria o componente arroja una excepción y requiere un fix, debe quedar asentado en `BUG_TRACKER.md`.
2. **Corrección de Problemas de Herramientas o IDE**:
   - Bloqueos de procesos en background, fallos de comandos o problemas de entorno reportados por el usuario o detectados en la sesión.
3. **Refactorizaciones Reactivas**:
   - Ajustes derivados de violaciones a las reglas de White-Label o sistema de diseño.

---

## 4. Política de Commits

- Todo commit cuyo propósito sea la resolución de uno o más errores debe referenciar en su mensaje el identificador del bug (ej. `fix(core): resolver bloqueo de tareas en segundo plano (BUG-001)`).
- El archivo `BUG_TRACKER.md` debe formar parte del mismo commit o de un commit inmediato de trazabilidad.
