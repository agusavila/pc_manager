# Estándares de Producción White-Label

## 1. Declaración de Principios
PC Manager es un software de grado de producción diseñado bajo la premisa de **Marca Blanca (White Label)**. Todo código fuente, archivo de configuración, interfaz visual, mensaje de registro y documentación debe ser completamente agnóstico, pulcro, elegante y comercializable sin rastro de entornos privados o marcas propietarias.

---

## 2. Reglas de Nomenclatura y Terminología

### 2.1. Cero Datos de Usuario o Identidad Local (PII)
- **Prohibido**: Rutas absolutas que contengan nombres de perfil personal (ej. `C:\Users\juan\...`, `C:\Users\admin\...`).
  - *Uso correcto*: Resolver rutas de forma dinámica a través de variables de entorno del sistema o APIs estandarizadas (`%USERPROFILE%`, `%APPDATA%`, `%TEMP%`, `Path.home()`, `os.environ`).
- **Prohibido**: Incluir en código o comentarios el nombre del desarrollador, su máquina (`DESKTOP-XXXX`), dirección IP local o datos de red específicos.

### 2.2. Neutralidad de Hardware y Fabricantes
- La aplicación no asume ni hardcodea soporte exclusivo o condicional para fabricantes concretos (ej. "Solo para Intel Core", "Optimizador Nvidia").
- Los componentes de hardware deben denominarse de forma conceptual y técnica:
  - **Procesador** o **Unidad Central de Procesamiento (CPU)** (en vez de marcas comerciales).
  - **Memoria Principal** o **Memoria del Sistema (RAM)**.
  - **Almacenamiento Local** o **Unidades de Almacenamiento**.
  - **Acelerador Gráfico** o **Unidad de Procesamiento Gráfico (GPU)**.
  - **Adaptador de Red**.
- La información de fabricantes (Intel, AMD, Nvidia, Kingston, etc.) solo puede mostrarse si es obtenida en tiempo de ejecución directamente a través de consultas WMI/CIM/APIs del sistema como cadena de lectura neutral.

### 2.3. Tono y Lenguaje Profesional
- **Estilo formal**: Usar un vocabulario sobrio, claro y de producción enterprise.
  - Evitar términos posesivos informales: *No usar* "Tu PC", "Tus archivos", "Limpia tu computadora".
  - *Usar*: "Estado del Sistema", "Archivos Temporales", "Optimización de Recursos", "Almacenamiento Local".
- Todo mensaje de error para el usuario debe ser constructivo, limpio y respetuoso, sin tecnicismos crudos ni jerga interna.

---

## 3. Parametrización de Marca (Branding Desacoplado)
- El nombre del producto, logotipos, colores corporativos y textos descriptivos no deben estar dispersos en el código fuente.
- Deben gestionarse desde un archivo de configuración de marca (`branding.json` o similar) que permita renombrar la aplicación o cambiar su esquema visual de manera instantánea sin tocar la lógica de negocio ni el Core.

---

## 4. Checklist de Cumplimiento White-Label
Antes de dar por completado un cambio o módulo, la IA o el desarrollador deben verificar:
- [ ] ¿Hay alguna ruta fija a directorios de usuario? (Debe ser NO).
- [ ] ¿Existen referencias a marcas o productos comerciales no neutrales? (Debe ser NO).
- [ ] ¿Se utiliza un tono elegante, neutro y formal en todas las cadenas visibles? (Debe ser SÍ).
- [ ] ¿Los nombres de logs y eventos son técnicos y estandarizados? (Debe ser SÍ).
