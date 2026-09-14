---
name: core-module-scaffolder
description: >-
  Guía y automatiza la creación, estructuración y registro de un nuevo módulo en la arquitectura
  Core-Modular de PC Manager. Utilizar esta habilidad siempre que el usuario o un agente necesite
  agregar una nueva funcionalidad modular, crear una extensión de la carcasa o implementar un plugin desacoplado.
---

# Habilidad: Andamiaje de Módulos (Core-Modular Scaffolder)

Esta habilidad define el procedimiento estandarizado para diseñar, generar y acoplar de forma segura un nuevo módulo dentro de la arquitectura Core-Modular de **PC Manager**.

---

## 1. Principios de Diseño del Módulo
Antes de escribir código para un nuevo módulo, verificar:
1. **Desacoplamiento Absoluto**: El módulo no debe importar directamente otros módulos. La comunicación debe realizarse a través del bus de eventos o servicios expuestos por el Core.
2. **Resiliencia ante Fallos**: Una excepción en el módulo nunca debe tumbar la carcasa central (Core).
3. **Estándar White-Label**: Todas las cadenas visibles y nombres deben ser completamente neutrales.
4. **Vinculación Estricta al Sistema de Diseño**: La interfaz del módulo (tarjetas y vistas) debe consumir exclusivamente las variables semánticas (`var(--bg-*)`, `var(--text-*)`, `var(--accent-*)`) y los componentes estándar del Core para heredar temas y coherencia visual en tiempo real.

---

## 2. Estructura Requerida de un Módulo
Cada módulo debe residir en su propia subcarpeta dentro de `modules/<module_name>/`:

```text
modules/<module_name>/
├── manifest.json         # Metadatos descriptivos, versión y capacidades
├── module.py / .ts       # Implementación de la interfaz IModule
├── handlers/             # Lógica de negocio específica del módulo
├── tests/                # Pruebas unitarias aisladas
└── docs/                 # Documentación inicial para la Tríada
```

---

## 3. Especificación del Manifiesto (`manifest.json`)
El archivo de manifiesto identifica el módulo ante el Core, sus dependencias y los servicios que ofrece:

```json
{
  "id": "cooler-controller",
  "name": "Controlador de Refrigeración",
  "version": "1.0.0",
  "description": "Monitorea y ajusta la pantalla del disipador utilizando telemetría compartida.",
  "author": "Core Engine",
  "group": "Periféricos",
  "entrypoint": "module.py",
  "permissions": [
    "system:hardware"
  ],
  "dependencies": [
    "hardware-telemetry"
  ],
  "requires_services": [
    "hardware.telemetry"
  ],
  "provides_services": [
    "cooler.display"
  ]
}
```

> **Nota de Gobernanza de Grupos**: Si `"group"` no se especifica o el grupo asignado es eliminado en el futuro por el usuario, el Core reasignará automáticamente el módulo al grupo inmutable `"General"`.

---

## 4. Contrato de Ciclo de Vida (`IModule`) y Servicios Compartidos
El módulo interactúa con el Core a través del contexto provisto:

1. **`on_load(context)`**:
   - Recibe la instancia de contexto del Core (`context.events`, `context.logger`, `context.config`, `context.services`).
   - **Consumo de Servicios**: Obtiene servicios compartidos declarados en sus dependencias (ej. `telemetry = context.services.get("hardware.telemetry")`).
   - **Publicación de Servicios**: Si el módulo provee servicios a otros, los registra aquí: `context.services.register("cooler.display", self.display_service)`.
2. **`on_enable()`**:
   - Inicia tareas en segundo plano o servicios activos si corresponde.
3. **`on_disable()`**:
   - Detiene tareas activas, cancela subscripciones de eventos y libera descriptores.
4. **`get_status()`**:
   - Retorna un diccionario estructurado con métricas de salud y estado operativo.

---

## 5. Procedimiento Paso a Paso

1. **Definir el Alcance**: Determinar la responsabilidad única del módulo y los eventos que emitirá/consumirá.
2. **Crear el Manifiesto**: Configurar `manifest.json` con metadatos neutrales.
3. **Implementar el Contrato**: Escribir la clase del módulo heredando de la interfaz base del Core.
4. **Escribir Pruebas Unitarias**: Validar ciclo de vida y casos de error con mocks del contexto del Core.
5. **Generar la Tríada de Documentación**: Invocar la habilidad `documentation-triad-sync` para crear las guías de Usuario, IA y Desarrollador.
