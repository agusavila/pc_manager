# Especificación para Modelos de IA: PC Manager Core (Alpha 0.0.1)

Esta especificación proporciona las directivas formales, esquemas de datos, contratos y restricciones que cualquier agente o modelo de IA debe respetar al generar, modificar o auditar código del Core o sus extensiones.

---

## 1. Resumen Contextual y Alcance

**PC Manager Core** es una carcasa modular (microkernel) desacoplada responsable de:
1. Administrar el ciclo de vida de la aplicación (`LifecycleManager`).
2. Publicar y consumir servicios compartidos (`ServiceRegistry`).
3. Registrar y mediar extensiones (`ModuleManager`).
4. Orquestar comunicación asíncrona no acoplada (`EventBus`).
5. Proveer el sistema de diseño reactivo y temas (`ThemeEngine`).

Cualquier lógica específica de dominio (ej. lectura de sensores térmicos, control de ventiladores, telemetría de red) debe residir estrictamente dentro de un módulo independiente y nunca incrustarse en el Core.

---

## 2. Esquema de Datos y Eventos

### 2.1. Bus de Eventos (`EventBus`)

Todos los eventos deben tener la estructura de carga útil estandarizada:

```typescript
interface CoreEvent<T = unknown> {
  id: string;          // UUID v4
  timestamp: number;   // Epoch ms
  source: string;      // ID del emisor (ej. "core", "module.telemetry")
  topic: string;       // Formato jerárquico: "<dominio>.<entidad>.<accion>"
  data: T;             // Payload tipado
}
```

#### Eventos Estándar del Ciclo de Vida:
| Tópico | Payload | Descripción |
| :--- | :--- | :--- |
| `core.lifecycle.starting` | `{ version: string }` | Notificación de arranque del runtime. |
| `core.lifecycle.ready` | `{ activeModules: string[] }` | Sistema y servicios inicializados. |
| `core.lifecycle.stopping` | `{ reason: string }` | Detención de procesos y limpieza de memoria. |
| `module.registered` | `{ moduleId: string, metadata: object }` | Nuevo módulo cargado dinámicamente. |
| `module.unregistered` | `{ moduleId: string }` | Módulo descargado y recursos liberados. |
| `theme.changed` | `{ mode: string, style: string, accent: string }` | Actualización de variables de diseño. |

### 2.2. Registro de Servicios Compartidos (`ServiceRegistry`)

Contrato formal para la exportación y consumo de servicios:

```typescript
interface ServiceDefinition<T = unknown> {
  id: string;             // Formato: "domain:service_name" (ej. "telemetry:hardware")
  version: string;        // SemVer "x.y.z"
  provider: string;       // ModuleId del proveedor
  instance: T;            // Objeto o API ejecutable
  metadata?: Record<string, unknown>;
}
```

---

## 3. Restricciones Críticas e Invariantes de Código

Al generar o modificar código para este repositorio, el modelo debe cumplir incondicionalmente:

1. **Aislamiento Total y Marca Blanca (White-Label)**:
   - PROHIBIDO el uso de rutas absolutas locales (`C:\Users\...`, `/home/...`). Usar siempre resolución en runtime.
   - PROHIBIDO asociar lógica fija a marcas comerciales de hardware (ej. cadenas "Intel", "AMD", "Kingston").
   - PROHIBIDO el uso de posesivos ("tu PC", "tus archivos"). Usar redacción técnica neutral ("Sistema", "Archivos Temporales").
2. **Sistema de Diseño (Material Expressive)**:
   - PROHIBIDO incluir emojis como iconos de interfaz. Todo icono debe ser un SVG vectorial limpio con clase de soporte.
   - PROHIBIDO hardcodear colores HEX/RGB en componentes. Consumir exclusivamente variables CSS semánticas:
     - Fondos: `var(--bg-primary)`, `var(--bg-surface)`, `var(--bg-elevated)`.
     - Textos: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`.
     - Bordes y Acentos: `var(--border-subtle)`, `var(--accent-primary)`, `var(--accent-hover)`.
3. **Integridad de Interfaz**:
   - Títulos y contenidos de tarjetas en el Dashboard nunca deben truncarse con elipsis si ocultan información funcional relevante.
   - Ningún botón, interruptor o selector puede carecer de manejador de eventos o lógica operativa.
4. **Gestión de Grupos de Módulos**:
   - El grupo **"General"** es el grupo predeterminado e inborrable.
   - Si se elimina un grupo personalizado, los módulos huérfanos se reubican en "General".
   - Si un grupo queda sin módulos activos, su encabezado en el menú lateral debe ocultarse automáticamente.

---

## 4. Verificación Automática

Comandos que la IA debe invocar para certificar cambios:

```bash
# 1. Auditoría estricta de White-Label (cero PII, cero marcas fijas)
# Verifica que no existan referencias a rutas locales o posesivos
git grep -E "C:\\\\Users|[tT]u (PC|equipo|disco)" -- ":!docs/ai/"

# 2. Validación de consistencia sintáctica de código
node --check src/core/*.js
```
