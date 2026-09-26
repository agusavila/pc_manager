# Manual de Usuario: Seguridad Criptográfica y Consentimiento de Permisos

Este documento describe los mecanismos de protección que PC Manager implementa para garantizar que toda extensión o módulo instalado en el sistema sea seguro, auténtico y esté debidamente autorizado.

---

## 1. ¿Por qué PC Manager audita los módulos?
PC Manager es un software de escritorio para Windows que interactúa directamente con el hardware del equipo (unidades de almacenamiento, procesador, adaptadores de red). Para proteger la integridad del sistema operativo y evitar la ejecución de código no autorizado o malicioso, ningún módulo se instala de manera oculta ni silenciosa.

---

## 2. El Proceso de Instalación Segura

Al arrastrar o seleccionar un paquete `.pcm` en el **Gestor de Módulos**, el sistema ejecuta una inspección criptográfica previa y presenta el **Modal de Seguridad y Auditoría de Permisos**.

### 2.1 Insignias de Verificación Criptográfica

En la parte superior del diálogo se mostrará uno de los siguientes tres estados:

1. **Firma Criptográfica Verificada (Verde)**:
   - Indica que el módulo ha sido firmado digitalmente mediante el algoritmo asimétrico **Ed25519** con la clave oficial del Núcleo.
   - El sistema valida que la totalidad de los archivos internos (.js, .json, .ps1) coinciden de manera exacta con el manifiesto inmutable **SHA-256**.
   - La instalación se considera segura y respaldada por el ecosistema del Core.

2. **Firma Válida - Autor Externo No Oficial (Amarillo)**:
   - La firma digital y los hashes de integridad son válidos (los archivos no han sido manipulados), pero la clave pública del autor no figura en la lista de confianza predeterminada del Core.
   - El usuario puede inspeccionar los datos del autor y decidir explícitamente si acepta los riesgos e instala la extensión.

3. **Alerta de Seguridad: Paquete Alterado o Corrupto (Rojo)**:
   - Se detectó que uno o más archivos dentro del archivo comprimido han sido modificados, reemplazados o dañados tras la firma original.
   - **El botón de instalación se bloquea por completo**. PC Manager no permitirá instalar módulos corruptos o alterados bajo ninguna circunstancia.

---

## 3. Consentimiento Granular de Permisos

Cada módulo declara formalmente qué accesos requiere para operar. En el diálogo de instalación, el usuario encontrará casillas de verificación para cada permiso solicitado:

- **Ejecución de Scripts de Telemetría (`system:execute`)**:
  - Permite al módulo ejecutar scripts de bajo nivel para recopilar métricas o realizar diagnósticos (como consultas a controladores de disco o buses de hardware).
  - Todos los comandos ejecutados son analizados en tiempo real por el filtro de contención de PC Manager para bloquear comandos destructivos.
- **Supervisión de Almacenamiento Físico (`system:storage`)**:
  - Concede acceso para consultar información de unidades físicas, tablas de partición y contadores de desgaste SMART.
- **Telemetría de Red (`system:network`)**:
  - Concede acceso para monitorear el rendimiento de adaptadores locales de red.

> **Nota**: El usuario tiene el control de desmarcar permisos si así lo desea, aunque esto podría limitar funciones específicas del módulo que dependan de ese permiso.

---

## 4. Requerimiento del Servicio de Windows (Host de Fondo)

Algunos módulos de diagnóstico profundo (como la lectura de desgaste de celdas SSD o telemetría de hardware antes del inicio de sesión) requieren que el **Servicio de Windows de PC Manager** esté instalado y en ejecución.

- Si el módulo lo requiere, el diálogo lo informará de manera transparente indicando la **justificación técnica**.
- El usuario podrá iniciar o configurar el servicio directamente desde el modal pulsando el botón *"Instalar y Arrancar Servicio"*.
- El servicio de Windows opera bajo el principio de mínimo privilegio y únicamente procesa lecturas tipadas de telemetría de hardware; **nunca ejecuta scripts arbitrarios en segundo plano**.

---

## 5. Integridad en Tiempo de Ejecución
 
PC Manager no solo verifica el módulo al momento de la instalación: cada vez que un módulo intenta ejecutar un script o proveer un servicio, el Core recalcula los hashes de los archivos en disco. Si algún archivo fue modificado externamente de forma sospechosa, el módulo se suspende de inmediato para salvaguardar el sistema.

---

## 6. Instalación Transaccional y Reversión Automática (Rollback)

Para evitar estados inconsistentes o módulos corruptos a medio instalar:
- Todo paquete `.pcm` se descomprime primero en una zona temporal aislada (`.staging`).
- Si se trata de una actualización, la versión previa se respalda automáticamente (`.backup`).
- Se validan la existencia física del punto de entrada (`entrypoint`) y la integridad estructural.
- Solo tras superar todas las validaciones se promueve atómicamente a la carpeta definitiva de módulos.
- Ante cualquier error o interrupción, el instalador revierte los cambios automáticamente, restaurando la versión anterior sin dejar residuos.
