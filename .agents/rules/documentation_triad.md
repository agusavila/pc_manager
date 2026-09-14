# Regla de Documentación: La Tríada Obligatoria

## 1. Declaración del Estándar
Para que el software sea verdaderamente abierto, escalable, mantenible y transferible, **toda funcionalidad, componente del Core o nuevo Módulo debe documentarse en tres niveles independientes y coordinados**.

```text
docs/
├── user/         # Nivel 1: Manual de Usuario
├── ai/           # Nivel 2: Especificación de Contexto para Modelos de IA
└── developer/    # Nivel 3: Guía de Arquitectura e Ingeniería de Software
```

---

## 2. Nivel 1: Manual de Usuario (`docs/user/`)
- **Público Objetivo**: Usuario final del sistema, personal técnico de soporte o administradores de estaciones de trabajo.
- **Tono y Lenguaje**: Accesible, claro, libre de tecnicismos complejos, estructurado en torno a casos de uso y beneficios.
- **Contenido Requerido**:
  1. **Propósito**: ¿Qué problema resuelve esta función o módulo?
  2. **Guía Paso a Paso**: Instrucciones claras de navegación, botones y acciones en la interfaz.
  3. **Comportamiento Esperado**: Qué ocurre al activar una acción (ej. qué esperar durante un escaneo de almacenamiento).
  4. **Preguntas Frecuentes y Resolución de Problemas**: Respuestas a dudas comunes y códigos de error comprensibles.
  5. **Garantías de Seguridad**: Explicación de cómo el software cuida los datos del usuario.

---

## 3. Nivel 2: Especificación para IA (`docs/ai/`)
- **Público Objetivo**: Modelos de Lenguaje (LLMs), agentes autónomos de codificación y asistentes conversacionales.
- **Tono y Formato**: Altamente estructurado, determinista, basado en esquemas (JSON Schema / YAML / Markdown técnico conciso).
- **Contenido Requerido**:
  1. **Capacidades y Límites (Capabilities & Boundaries)**: Qué puede y qué NO debe intentar hacer el agente con este módulo.
  2. **Contratos de Entrada y Salida**: Esquemas exactos de payloads, eventos escuchados y emitidos.
  3. **Invariantes y Reglas de Validación**: Restricciones lógicas que el modelo debe respetar al generar o modificar código.
  4. **Ejemplos de Prompt y Casos de Uso del Agente**: Secuencias de herramientas o llamadas de función recomendadas.
  5. **Comandos de Verificación Rápida**: Instrucciones directas de testing para que la IA valide su propio trabajo sin intervención humana.

---

## 4. Nivel 3: Guía de Desarrollador (`docs/developer/`)
- **Público Objetivo**: Ingenieros de software y contribuidores del proyecto.
- **Tono y Lenguaje**: Técnico riguroso, profesional, enfocado en arquitectura, rendimiento y tipado estricto.
- **Contenido Requerido**:
  1. **Diseño y Patrones**: Diagramas de secuencia/flujo (Mermaid), patrones de diseño utilizados (Microkernel, Observer, Factory, etc.).
  2. **Interfaces y Tipos**: Definición exhaustiva de interfaces (`IModule`, `IEventBus`, `ConfigService`).
  3. **Manejo del Ciclo de Vida**: Cómo se inicializa, ejecuta y finaliza el componente.
  4. **Estrategia de Testing**: Guía para escribir pruebas unitarias, de integración y mocks de sistema.
  5. **Pasos de Compilación, Empaquetado y Despliegue**: Instrucciones reproducibles para compilar y ejecutar en local.

---

## 5. Política de Sincronización
- Un cambio de código, nuevo módulo o refactorización del Core **no se considera terminado ni aceptable** si no incluye la actualización correspondiente en las tres vertientes de la tríada.
