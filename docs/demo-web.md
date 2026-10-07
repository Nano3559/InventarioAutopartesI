# Guía de Demostración Web · Hito 3

> **Documento de cierre del Hito 3 (Tarea M8)**  
> **Alcance:** Flujo completo de Código de Barras e Impresión + Gestión de Personal, Historial y Dashboard de Asistencia con Reconocimiento Facial IA.  
> **Plataforma:** Frontend Web SPA React 19 + Vite (`/personal`, `/asistencia`, `/asistencia/dashboard`, `/inventario`).

---

## 1. Resumen del Alcance Demostrado

La interfaz web de administración (**AutoRepuestos PRO Admin**) cubre integralmente los dos grandes flujos asistidos por visión por computadora del Hito 3:

1. **Flujo A (Códigos de Barras Code128):** Generación masiva de códigos `AP-<id>-<codigoFabrica>`, visualización de etiquetas de solo barras (`includetext: false`) e impresión en hojas A4 para escaneo móvil.
2. **Flujo B (Asistencia Facial con IA ArcFace):** Panel de control de personal con fotos firmadas seguras, auditoría detallada de marcajes y dashboard en tiempo real de presencia por sucursal.

---

## 2. Guión Paso a Paso para la Demostración

### Escenario 1: Códigos de Barras e Impresión Masiva (`/inventario`)
*Objetivo: Demostrar la trazabilidad de productos con etiquetas Code128 listas para escáner físico.*

1. **Acceso al Catálogo:** Navegar a **Inventario Global** (`/inventario`) con rol `admin`.
2. **Identificador Code128:**
   - Observar en la tabla la columna **Código de barras**. Cada autoparte cuenta con su chip identificador (ej. `AP-0001-DAI309005`).
3. **Etiqueta Unitaria:**
   - Hacer clic en el icono de código de barras de cualquier producto.
   - Se despliega el modal unitario con el renderizado de barras Code128, dimensiones estándar y opción de descarga PNG o impresión individual.
4. **Impresión Masiva A4:**
   - En la barra superior de acciones, presionar **"Imprimir Etiquetas"** (o *"Generar Códigos Masivos"* si faltara alguno por indexar).
   - Se abre el modal con la grilla de etiquetas masivas en formato hoja A4 con `@media print`, configuradas **solo en barras sin texto** (`includetext: false`) para máxima legibilidad por la cámara del celular.

---

### Escenario 2: Gestión de Personal y Privacidad Biométrica (`/personal`)
*Objetivo: Demostrar la administración de trabajadores, integración de fotos seguras y cumplimiento legal de protección de datos.*

1. **Acceso al Módulo:** Ingresar a **Gestión Personal** (`/personal`) desde el menú lateral.
2. **Métricas KPI:**
   - Revisar las tarjetas superiores: *Total Personal*, *Rostros Registrados*, *Personal Activo* y *Pendientes de Rostro*.
3. **Listado de Personal y Fotos Oficiales:**
   - Los empleados con registro facial muestran un avatar con borde esmeralda e indicador de *Rostro Registrado*.
   - Al hacer clic en el avatar, se abre la previsualización modal de la fotografía facial oficial, servida mediante una **URL firmada temporal de 1 hora** del bucket privado `faces` de Supabase (cumplimiento de confidencialidad).
4. **Alta y Edición de Personal:**
   - Presionar **"Nuevo Personal"**: formulario para ingresar nombre, apellido, correo, contraseña, rol (`admin`, `tienda`, `inventario`) y sucursal asignada.
5. **Supresión Biométrica (Ley 26935 Bolivia):**
   - Para cualquier empleado con rostro registrado, hacer clic en el botón de escudo/supresión biométrica.
   - Confirmar en el modal de advertencia legal: se elimina el embedding matemático del índice en memoria de NestJS y se borra la fotografía del bucket privado sin dar de baja la cuenta laboral.

---

### Escenario 3: Historial y Corrección de Asistencia (`/asistencia`)
*Objetivo: Demostrar la auditoría completa de marcajes, discriminación entre IA/Manual y capacidad de ajuste administrativo.*

1. **Acceso al Historial:** Navegar a **Historial Asistencia** (`/asistencia`).
2. **Filtrado Multicriterio:**
   - Filtrar por rango de fechas (*Desde / Hasta*), por tipo (*Entrada / Salida*), por método (*ArcFace IA / Manual*) y por sucursal física.
3. **Análisis de Confianza ArcFace:**
   - En la columna *Método & Reconocimiento*, los marcajes automáticos muestran el badge de IA y el chip de similitud coseno (ej. `82% match`).
4. **Corrección Manual:**
   - Hacer clic en el icono de lápiz sobre cualquier marcaje.
   - El modal de corrección permite cambiar el tipo (Entrada/Salida), hora exacta o tienda asignada. Al guardar, el registro se sella con el administrador responsable y anula la confianza matemática.
5. **Paginación:** Navegación fluida por páginas con indicador de totales.

---

### Escenario 4: Dashboard de Asistencia Diaria en Tiempo Real (`/asistencia/dashboard`)
*Objetivo: Demostrar la visión ejecutiva del día de operaciones para las 7 sucursales.*

1. **Acceso al Dashboard:** Presionar el botón **"Dashboard en Vivo"** o entrar por el menú lateral a `/asistencia/dashboard`.
2. **KPIs Consolidados del Día:**
   - *Personal Activo*
   - *Presentes Hoy* (al menos 1 marcaje registrado en la jornada)
   - *Ausentes Hoy* (personal que aún no ha marcado entrada)
   - *Dentro del Local* (su último marcaje fue entrada)
   - *Fuera / Salidas*
   - *Biometría ArcFace IA* (marcajes validados por el modelo)
3. **Selector de Fecha:**
   - Selector interactivo para auditar días pasados o presionar el botón rápido **"Hoy"**.
4. **Paneles de Sucursal (Tiendas 1 a 7):**
   - Cada tienda presenta una tarjeta con su código y contadores rápidos (*pres.*, *dentro*, *aus.*).
   - **Pestaña "Presentes":** Lista de quiénes llegaron, primer horario de ingreso, última salida y estado actual (`DENTRO` en verde o `SALIDA` en amarillo).
   - **Pestaña "Ausentes":** Lista del personal faltante con badge de si tienen rostro registrado o pendiente en la app móvil.
5. **Últimos Marcajes en Vivo:**
   - Lista en tiempo real de los 10 últimos eventos registrados con avatar, empleado, tienda, hora exacta y método.

---

## 3. Matriz de Rutas y Accesos Web

| Ruta | Nombre en Menú | Rol Permitido | Finalidad |
| :--- | :--- | :--- | :--- |
| `/inventario` | Inventario Global | `admin` | Catálogo e impresión de códigos Code128 |
| `/personal` | Gestión Personal | `admin` | Empleados, fotos firmadas y baja biométrica |
| `/asistencia` | Historial Asistencia | `admin` | Auditoría de marcajes y corrección manual |
| `/asistencia/dashboard` | Dashboard Asistencia | `admin` | Monitoreo en vivo de presencia por tienda |

---

## 4. Verificación de Calidad

- **Auditoría de Linter:** `npm run lint` (`oxlint`) → **0 advertencias, 0 errores**.
- **Compilación de Producción:** `npm run build` (`tsc -b && vite build`) → **Exitoso**.
- **Diseño Responsive:** Auditado en resoluciones móviles (<480px), tablets (768px) y escritorio (1080p+).
