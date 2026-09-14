---
name: white-label-auditor
description: >-
  Audita, escanea y verifica que el código fuente, archivos de configuración, textos de interfaz,
  logs y documentación cumplan estrictamente con los estándares de Marca Blanca (White-Label).
  Utilizar esta habilidad antes de cerrar cualquier tarea, PR, refactorización o generación de módulos.
---

# Habilidad: Auditor de Marca Blanca (White-Label Auditor)

Esta habilidad proporciona una guía sistemática para verificar que ningún archivo del proyecto contenga datos privados, marcas propietarias de hardware o terminología no apta para distribución comercial limpia.

---

## 1. Puntos Críticos de Inspección

### A. Detección de Rutas Absolutas y Datos de Usuario (PII)
- **Patrones Prohibidos**:
  - `C:\Users\` o `/home/` o `/Users/`
  - Nombres de cuentas de usuario, correos electrónicos o identificadores de máquina.
- **Acción Correctiva**:
  - Reemplazar por funciones estándar del lenguaje que resuelvan rutas en tiempo de ejecución (ej. `Path.home()`, `tempfile.gettempdir()`, variables de entorno como `%APPDATA%` o `%LOCALAPPDATA%`).

### B. Neutralidad de Hardware y Fabricantes
- **Patrones Prohibidos**:
  - Referencias fijas en código a marcas comerciales (ej. `if "Intel" in cpu: ...`, `"Optimizador para discos Kingston"`).
- **Acción Correctiva**:
  - Utilizar abstracciones y términos funcionales universales: `Unidad de Procesamiento Central (CPU)`, `Memoria del Sistema (RAM)`, `Unidades de Almacenamiento`, `Acelerador Gráfico (GPU)`.
  - La marca comercial solo se tolera cuando proviene de la lectura en vivo de la API del hardware y se muestra como un campo de datos dinámico.

### C. Lenguaje y Tono de Producción
- **Patrones Prohibidos**:
  - Términos posesivos o coloquiales: "tu equipo", "tus archivos", "limpia tu disco", "mi PC".
- **Acción Correctiva**:
  - Sustituir por: "Estado del Sistema", "Archivos Temporales", "Espacio de Almacenamiento", "Rendimiento Global".

---

## 2. Procedimiento de Auditoría Paso a Paso

1. **Búsqueda por Patrones (Grep / Regex)**:
   Ejecutar búsquedas en el espacio de trabajo para detectar cadenas prohibidas:
   - Buscar rutas: `Users\\` o `C:\\`
   - Buscar posesivos: `tu ` o `tus ` o `mi `
2. **Revisión de Archivos de Configuración y Manifiestos**:
   Verificar que `manifest.json`, archivos de tema y configuraciones no contengan metadatos privados del desarrollador.
3. **Revisión de la Interfaz Visual y Mensajes**:
   Comprobar que los textos mostrados en pantalla provengan del sistema de internacionalización o configuración de marca (`branding`).
4. **Validación de la Documentación**:
   Asegurar que los ejemplos y capturas en `docs/` utilicen rutas genéricas y nombres ficticios neutrales.
