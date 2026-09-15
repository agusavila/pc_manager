# Regla: Compilación Continua Obligatoria y Commits Atómicos

Esta directiva establece los estándares de calidad de compilación nativa y versionado continuo para todo agente o desarrollador que opere en el repositorio de **PC Manager**.

---

## 1. Principio Fundamental: Validación por Compilación Nativa

PC Manager es un software de escritorio nativo para Windows (`Rust + Tauri`). Los assets del frontend (`HTML`, `CSS`, `JS`) son compilados e incrustados físicamente dentro del ejecutable binario en tiempo de construcción.

Por lo tanto:
1. **Compilación Incondicional tras Modificaciones**:
   - Todo cambio funcional, ajuste de interfaz, solución de bugs o actualización de dependencias debe ser validado ejecutando la compilación nativa en Rust:
     ```powershell
     cd src-tauri
     cargo build
     ```
   - No se considera terminada ninguna tarea sin haber verificado que la compilación concluyó exitosamente (`Finished dev [unoptimized + debuginfo] target(s)`).
2. **Prohibición de Delegación al Usuario**:
   - Queda terminantemente prohibido pedirle al usuario que compile por su cuenta o que pruebe el software abriendo archivos HTML en el navegador.
   - El ejecutable `src-tauri/target/debug/pc_manager.exe` debe quedar siempre actualizado y listo para su ejecución inmediata en Windows.

---

## 2. Commits Atómicos y Sincronización Continua

1. **Unidad Lógica de Trabajo**:
   - Cada corrección de error (`BUG-XXX`), funcionalidad o refactorización debe quedar documentada y consolidada en un commit atómico.
2. **Sincronización con el Repositorio Remoto**:
   - Tras validar la compilación y registrar los cambios en la bitácora (`BUG_TRACKER.md`), se debe ejecutar de inmediato:
     ```powershell
     git add .
     git commit -m "tipo(alcance): descripción clara"
     git push origin main
     ```
