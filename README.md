# PC Manager

[![Versión](https://img.shields.io/badge/version-0.0.1--alpha-blue.svg)](https://github.com/agusavila/pc_manager)
[![Arquitectura](https://img.shields.io/badge/architecture-core--modular-emerald.svg)](#arquitectura-core-modular)
[![Diseño](https://img.shields.io/badge/design-material--expressive-violet.svg)](#sistema-de-diseño)
[![Marca Blanca](https://img.shields.io/badge/standard-white--label-neutral.svg)](#directivas-de-marca-blanca)

**PC Manager** es una plataforma centralizada, modular y extensible de alto rendimiento para la monitorización, telemetría y administración del sistema operativo bajo una filosofía estricta de **Marca Blanca (White-Label)**.

---

## 🏛️ Arquitectura Core-Modular

El sistema opera bajo un modelo de **Microkernel Desacoplado**:
- **Core (Carcasa Base)**: Administra el ciclo de vida, descubrimiento de extensiones, bus de eventos interno (`EventBus`), registro de servicios compartidos (`ServiceRegistry`) y el motor de temas visuales (`ThemeEngine`).
- **Módulos (Plugins Independientes)**: Cada funcionalidad (telemetría de hardware, control de ventilación, optimización de almacenamiento, administración de red) se ejecuta como un plugin autónomo y removible.

---

## 📚 Tríada de Documentación Canónica

El proyecto mantiene actualizada de forma obligatoria su documentación en tres niveles:

| Nivel | Documento | Audiencia y Enfoque |
| :--- | :--- | :--- |
| **Usuario** | [Manual de Usuario](file:///c:/Proyectos/pc_manager/docs/user/core_user_manual.md) | Operación intuitiva, modos visuales, gestión de módulos y preguntas frecuentes. |
| **IA** | [Especificación para IA](file:///c:/Proyectos/pc_manager/docs/ai/core_ai_spec.md) | Esquemas de datos, invariantes arquitectónicas y contratos para agentes. |
| **Ingeniería** | [Guía de Desarrollador](file:///c:/Proyectos/pc_manager/docs/developer/core_developer_guide.md) | Diagramas de secuencia, interfaces formales, ciclo de vida y sandboxing. |

---

## 🎨 Sistema de Diseño (Material Expressive)

- **Modos de Visualización**: Selector dual de modo (*Claro* / *Oscuro*) y variantes ambientales de fondo (*Carbon Black*, *Midnight Navy*, *Oscuro Profundo*, *Blanco Puro*, *Azul Suave*, etc.).
- **Paleta Dinámica de Acentos**: Selección en caliente de 10 colores primarios de acento.
- **Iconografía Pura**: Gráficos vectoriales SVG sin uso de emojis.
- **Dashboard Reactivo**: Disposición mediante cuadrícula fluida con arrastre dinámico (*Drag & Drop*) y botón canónico flotante de auto-organización inteligente (`btn-fab`).

---

## 🛡️ Principios White-Label y Seguridad

1. **Neutralidad Absoluta**: Ausencia total de rutas absolutas locales fijas (`C:\Users\...`) y nombres de usuario.
2. **Abstracción de Fabricantes**: El Core no se acopla a marcas comerciales de hardware; toda telemetría se reporta mediante descriptores universales de componentes.
3. **Modo Seguro (Dry-Run)**: Toda operación de modificación en disco o servicios requiere una simulación previa con reporte de impacto antes de su confirmación.
4. **Ciclo de Vida Integrado**: Soporte para ejecución en bandeja del sistema (*System Tray*), inicio con Windows y modo servicio para operaciones pre-logon. Al ordenar el cierre definitivo, se garantiza la detención total de todos los procesos y colectores en memoria.

---

## 📂 Estructura del Repositorio

```text
pc_manager/
├── .agents/                 # Directivas, reglas e instrucciones para agentes de IA
│   ├── rules/               # Reglas modulares del workspace
│   └── skills/              # Habilidades especializadas (scaffolder, auditor, docs-sync)
├── docs/                    # Tríada de documentación obligatoria
│   ├── user/                # Manuales de usuario final
│   ├── ai/                  # Especificaciones técnicas para modelos de IA
│   └── developer/           # Guías de ingeniería, diagramas y contratos
├── src/                     # Código fuente del Core Runtime
│   └── core/                # Módulos del microkernel (EventBus, Registry, Lifecycle, etc.)
├── core_shell.html          # Interfaz visual del Core Limpio (sin módulos)
├── index.html               # Interfaz interactiva de demostración con módulos cargados
├── AGENTS.md                # Directivas maestras del proyecto
└── README.md                # Portada principal del repositorio
```

---

## 📄 Licencia y Versión

- **Versión Actual**: `0.0.1-alpha`
- Diseñado para despliegues independientes y distribución limpia en entornos Windows.
