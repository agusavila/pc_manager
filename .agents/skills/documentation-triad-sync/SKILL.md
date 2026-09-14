---
name: documentation-triad-sync
description: >-
  Coordina, valida y genera la tríada obligatoria de documentación (Manual de Usuario, Especificación para IA
  y Guía de Desarrollador) para el Core o cualquier Módulo del proyecto PC Manager. Utilizar esta habilidad
  cada vez que se agregue o modifique una funcionalidad, módulo o servicio del sistema.
---

# Habilidad: Sincronización de la Tríada de Documentación

Esta habilidad asegura que ninguna funcionalidad de **PC Manager** quede incompleta a nivel documental, garantizando que el proyecto sea 100% comprensible para usuarios finales, modelos de IA y desarrolladores.

---

## 1. Estructura de Salida Requerida
Cada módulo debe proyectar su documentación en las tres subcarpetas de `docs/`:

```text
docs/
├── user/
│   └── <modulo>.md       # Manual de Usuario
├── ai/
│   └── <modulo>.md       # Especificación para Modelos de IA
└── developer/
    └── <modulo>.md       # Guía de Ingeniería y Arquitectura
```

---

## 2. Plantillas Estándar por Nivel

### Nivel 1: Manual de Usuario (`docs/user/<modulo>.md`)
Debe incluir obligatoriamente:
- **Resumen Ejecutivo**: ¿Qué hace este componente y qué beneficio ofrece al usuario?
- **Instrucciones de Uso**: Pasos visuales e intuitivos para interactuar con la funcionalidad.
- **Modo Seguro / Simulación**: Explicación clara de cómo revisar los cambios antes de aplicarlos.
- **Preguntas Frecuentes**: Respuestas a dudas comunes sin tecnicismos innecesarios.

### Nivel 2: Especificación para IA (`docs/ai/<modulo>.md`)
Debe incluir obligatoriamente:
- **Resumen Contextual y Objetivo**: Descripción concisa en tercera persona para que el LLM comprenda el alcance.
- **Esquema de Datos y Eventos**:
  - Eventos que emite (Payload schema).
  - Eventos que escucha.
- **Restricciones de Generación de Código**: Invariantes que la IA no debe romper bajo ninguna circunstancia.
- **Verificación Automática**: Comandos CLI exactos para probar que el módulo funciona.

### Nivel 3: Guía de Desarrollador (`docs/developer/<modulo>.md`)
Debe incluir obligatoriamente:
- **Diagrama de Flujo o Secuencia**: Flujo de ejecución y ciclo de vida.
- **Contratos e Interfaces Implementadas**: Clases, métodos y tipos de datos.
- **Manejo de Errores y Casos Límite**: Estrategia de contención de fallos.
- **Guía de Pruebas**: Cómo ejecutar y ampliar la cobertura de pruebas unitarias asociadas.

---

## 3. Protocolo de Ejecución

1. **Analizar el Componente**: Identificar entradas, salidas, eventos y pantallas asociadas.
2. **Generar los Tres Documentos**: Redactar simultáneamente los tres archivos en sus respectivas rutas.
3. **Verificación Cruzada**: Comprobar que los nombres de métodos, eventos y descripciones sean consistentes entre las tres guías.
4. **Auditoría White-Label**: Aplicar la habilidad `white-label-auditor` para corroborar que no se hayan filtrado rutas absolutas o marcas comerciales en la documentación.
