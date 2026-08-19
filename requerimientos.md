# Ejercicio: Desarrollo de un Sistema Web de Inventario y Ventas

## 1. Objetivo del ejercicio
Desarrollar una aplicación web para gestionar el inventario, ventas, movimientos de mercadería, precios, clientes y reportes de una empresa dedicada a la comercialización de repuestos y accesorios para vehículos.

El sistema deberá permitir consultar los productos disponibles, realizar ventas desde las tiendas, administrar el inventario de almacenes y tiendas, registrar movimientos de productos y generar diferentes reportes.

La aplicación deberá contemplar diferentes permisos dependiendo del tipo de usuario.

---

## 2. Roles del sistema
El sistema tendrá, como mínimo, los siguientes tipos de usuarios:

### **Administrador**
Tendrá acceso completo al sistema. Podrá:
* Administrar productos.
* Editar información del inventario.
* Gestionar precios.
* Registrar y revisar facturas.
* Administrar costos.
* Gestionar ventas por mayor.
* Gestionar movimientos entre almacenes y tiendas.
* Consultar reportes.
* Administrar inventario.
* Consultar información de todas las tiendas y almacenes.

### **Usuario de tienda**
Su función principal será vender productos y consultar disponibilidad. Podrá:
* Buscar productos.
* Consultar stock.
* Seleccionar productos para una venta.
* Seleccionar cantidad.
* Seleccionar precio.
* Registrar pagos.
* Registrar datos para factura.
* Registrar devoluciones.
* Solicitar productos a almacén cuando no exista stock.

*Las tiendas tendrán usuarios independientes.*

### **Encargado de inventario**
Será responsable de controlar físicamente la mercadería y registrar los movimientos. Podrá:
* Recibir solicitudes de las tiendas.
* Ver qué tienda necesita un producto.
* Registrar salida de mercadería.
* Registrar ingreso de mercadería.
* Registrar movimientos entre ubicaciones.
* Corroborar productos recibidos.
* Informar al administrador.

---

## 3. Módulo de inventario
Este será uno de los módulos principales.

La tabla de productos deberá contener como mínimo:

| Campo | Descripción |
| :--- | :--- |
| **ID** | Número de ítem o código personalizado |
| **Fabricante** | Toyota, Nissan, Mazda, etc. |
| **Empresa fabricante** | Producto |
| **Marca** | Marca del vehículo |
| **Modelo** | Modelo del vehículo |
| **Año** | Año o rango de años |
| **Detalle** | Color, medidas, características, etc. |
| **Código OEM** | Código original de la pieza |
| **Código fábrica** | Código utilizado por el fabricante/proveedor |
| **Imagen** | Imagen o enlace de imagen |
| **Precio 1** | Primer precio |
| **Precio 2** | Segundo precio |
| **Stock total** | Stock disponible |

> **Importante:**
> El stock total deberá representar la suma del inventario disponible en:
> * Almacén 1
> * Almacén 2
> * Almacén 3
> * Almacén 4
> * Tienda 1
> * Tienda 2
> * Tienda 3
> 
> Sin embargo, el administrador deberá poder consultar posteriormente el stock específico de cada ubicación.

---

## 4. Ejercicio 1 - Crear la página de inventario

### **Objetivo**
Crear una pantalla donde el administrador pueda visualizar y administrar todos los productos.

La página debe contener:
* **Parte superior:**
  * Logo/nombre del sistema.
  * Usuario conectado.
  * Botón de cerrar sesión.
  * Menú de navegación.
* **Menú lateral:**
  * Dashboard
  * Inventario
  * Ventas
  * Ventas por mayor
  * Movimientos
  * Precios
  * Costos
  * Reportes
  * Configuración
* **Área principal:**
  * Buscador de productos.
  * Filtros por:
    * Marca
    * Fabricante
    * Producto
    * Modelo
    * Año
    * Código OEM
    * Código fábrica
  * Botón **Nuevo producto**.
  * **Tabla de inventario:**
    * Debe mostrar: `ID` | `Fabricante` | `Producto` | `Marca` | `Modelo` | `Año` | `Código OEM` | `Código Fábrica` | `Imagen` | `Precio 1` | `Precio 2` | `Stock`
    * Cada fila deberá tener acciones como: **Ver**, **Editar**, **Eliminar**, **Ver stock por ubicación**.

---

## 5. Ejercicio 2 - Crear el módulo de venta
El usuario de tienda deberá poder realizar una venta desde la aplicación.

### **Flujo**
* **Paso 1: Buscar producto**
  * El vendedor busca por: Código, Nombre, Marca, Modelo, Código OEM.
* **Paso 2: Agregar producto**
  * Seleccionar: Producto, Cantidad, Precio.
  * El sistema deberá calcular automáticamente:
    $$\text{Subtotal} = \text{cantidad} \times \text{precio}$$
    $$\text{Total} = \sum \text{Subtotales}$$
* **Paso 3: Confirmar venta**
  * Antes de finalizar deberá mostrarse un resumen con: Producto, Cantidad, Precio, Subtotal y TOTAL.
* **Paso 4: Registrar pago**
  * El sistema deberá permitir: **Efectivo**, **QR**, **Crédito**, **Efectivo + QR** *(Una venta puede tener más de un método de pago)*.
* **Paso 5: Facturación**
  * Preguntar: *¿Requiere factura?*
  * Si responde **Sí**, solicitar: CI/NIT, Nombre, Celular.

---

## 6. Ejercicio 3 - Devolución
Crear una pantalla para registrar devoluciones. El usuario deberá seleccionar:
1. Producto.
2. Motivo de devolución.
3. Cantidad.
4. Monto a devolver.
5. Método de devolución.

El sistema deberá registrar la devolución y actualizar el inventario correspondiente.

---

## 7. Ejercicio 4 - Solicitud de productos a almacén
Cuando una tienda necesite un producto que no tenga disponible, deberá existir un botón: **"Solicitar a almacén"**.

La solicitud deberá registrar:
* Producto.
* Cantidad.
* Tienda solicitante.
* Usuario.
* Fecha.
* Estado (*Estados sugeridos: Pendiente, En preparación, Enviado, Recibido, Cancelado*).

Los encargados de inventario deberán recibir la notificación indicando qué tienda necesita el producto.

---

## 8. Ejercicio 5 - Movimientos de inventario
El sistema deberá manejar **4 almacenes + 3 tiendas**. Cada ubicación tendrá su propio inventario.

Cuando se mueva un producto, deberá registrarse:
* Producto
* Cantidad
* Ubicación origen
* Ubicación destino
* Usuario responsable
* Fecha
* Observación

> **Ejemplo:**
> * **Producto:** Parachoque Toyota Hilux
> * **Cantidad:** 2
> * **Origen:** Almacén 2
> * **Destino:** Tienda 1
> * **Responsable:** Juan Pérez
> * **Fecha:** 18/08/2026

---

## 9. Ejercicio 6 - Gestión de costos
Crear una pantalla exclusiva para el administrador. El administrador deberá poder:
* Subir facturas.
* Registrar proveedor.
* Registrar tipo de cambio.
* Registrar porcentaje.
* Agregar nuevos productos.
* Actualizar automáticamente el inventario.

Las facturas deben estar asociadas a un **Proveedor Bolivia**, dato utilizado posteriormente para calcular costos y generar reportes.

---

## 10. Ejercicio 7 - Gestión de precios
Crear una sección llamada **"Precios"**. El sistema deberá permitir calcular precios partiendo del costo.

Se deberán mostrar diferentes porcentajes:
* Costo
* +20%
* +30%
* +40%
* +50%
* +60%
* +70%
* +80%
* Precio por mayor *(podrá ser ingresado manualmente)*.

Posteriormente, el administrador deberá poder exportar la lista a Excel con:
* Código fábrica
* Producto
* Marca
* Modelo
* Años
* Detalle
* Precio por mayor

---

## 11. Ejercicio 8 - Venta por mayor
Crear una pantalla para ventas por mayor. El pedido podrá hacerse de dos maneras:
* **Opción A:** Ingresar manualmente los productos.
* **Opción B:** Importar un archivo Excel.
  * Columnas del Excel: `Código fábrica`, `Descripción`, `Producto`, `Marca`, `Modelo`, `Años`, `Detalle`, `Precio por mayor`.

El sistema deberá considerar el stock disponible antes de confirmar el pedido.

---

## 12. Datos del cliente
Para una venta por mayor se deberá solicitar:
* Nombre.
* Para quién es el pedido.
* Lugar de entrega (*Cochabamba u otra ubicación*).
* Datos para factura.
* Forma de pago.

---

## 13. Ejercicio 9 - Pagos
El sistema debe permitir registrar uno o varios pagos.

> **Ejemplo:**
> * **TOTAL:** Bs. 5.000
> * **Efectivo:** Bs. 1.000
> * **Transferencia:** Bs. 2.000
> * **QR:** Bs. 2.000
> * **TOTAL PAGADO:** Bs. 5.000

*Métodos:* Efectivo, Transferencia, QR, Crédito.
El sistema deberá conservar el historial de los métodos utilizados.

---

## 14. Ejercicio 10 - Nota de venta
Después de confirmar una venta por mayor, el sistema deberá generar una nota de venta con:
* Datos del cliente.
* Productos.
* Cantidades.
* Precios.
* Total.
* Método(s) de pago.
* Datos de entrega.

Esta nota deberá poder enviarse/adjuntarse al cliente.

---

## 15. Ejercicio 11 - Dashboard y reportes
Crear un dashboard para el administrador con:

* **Inventario:** Total de productos, productos sin stock, productos con stock bajo, stock por tienda, stock por almacén.
* **Ventas:** Ventas del día, ventas del mes, ventas por tienda, ventas por marca, ventas por vehículo.
* **Reportes (Filtros):** Marca, Auto/modelo, Mes, Tienda, Proveedor, Producto.

*Incluye reportes mensuales por tienda con costo para tiendas y reportes generales por proveedor.*

---

## 16. Ejercicio 12 - Reposición automática
Implementar una regla:
* El **stock mínimo** de un producto es **1**.
* Cuando una tienda venda su última unidad y el stock llegue a cero, el sistema deberá **generar automáticamente una solicitud al almacén** para reposición al día siguiente.

---

## 17. Ejercicio 13 - Búsqueda mediante imagen
Funcionalidad adicional: **"Buscar producto mediante imagen"**.
* Tomar o subir una fotografía desde el celular.
* Analizar la imagen e intentar identificar el producto buscando coincidencias en la base de datos (por similitud de imagen o por descripción).
* Si encuentra coincidencia, mostrar: `Producto`, `Marca`, `Modelo`, `Código`, `Stock`, `Precio`.

---

## 18. Resultado esperado del ejercicio
Al finalizar, el estudiante/equipo deberá entregar una aplicación web funcional que permita realizar este flujo:

```text
                     SISTEMA
                        │
       ┌────────────────┴────────────────┐
 ADMINISTRADOR                        TIENDA
       │                                 │
 ┌─────┼─────────────┐             ┌─────┴─────┐
Inventario Precios Reportes      Venta     Devolución
 │
 ├── Costos
 ├── Movimientos
 ├── Almacenes
 └── Productos
        │
        ▼
   4 ALMACENES
        │
        ▼
    3 TIENDAS
        │
        ▼
     VENTAS
        │
        ▼
    REPORTES
```

---

## 19. Requisitos mínimos de la interfaz
La página deberá ser:
* Responsive (computadora y celular).
* Tener navegación clara.
* Utilizar tablas para inventario.
* Utilizar formularios para altas y modificaciones.
* Mostrar mensajes de confirmación/error.
* Utilizar modales cuando sea conveniente.
* Manejar diferentes permisos según el usuario.

---

## 20. Entregables

* **Parte 1: Diseño**
  * Wireframe.
  * Diseño de dashboard, inventario, ventas y reportes.
* **Parte 2: Frontend**
  * Implementar las pantallas: Login, Dashboard, Inventario, Detalle de producto, Venta, Devolución, Solicitud a almacén, Movimientos, Costos, Precios, Venta por mayor, Reportes.
* **Parte 3: Backend**
  * Implementar: Usuarios, Roles, Productos, Inventarios, Tiendas, Almacenes, Ventas, Detalle de ventas, Pagos, Devoluciones, Movimientos, Clientes, Proveedores, Costos, Precios, Reportes.
* **Parte 4: Funcionalidades adicionales**
  * Importación/Exportación de Excel.
  * Generación de nota de venta.
  * Búsqueda mediante imagen.
  * Reposición automática.
  * Notificaciones.

---

## 21. Criterio principal del ejercicio
El objetivo es convertir los procesos en una aplicación funcional interconectada.

$$\text{1. Inventario} \longrightarrow \text{2. Ventas} \longrightarrow \text{3. Movimientos} \longrightarrow \text{4. Precios y costos} \longrightarrow \text{5. Reportes}$$

**Ejemplo de flujo completo:**
> Una venta en **Tienda 1** $\rightarrow$ disminuye el stock de Tienda 1 $\rightarrow$ registra el pago $\rightarrow$ registra al vendedor $\rightarrow$ actualiza las ventas $\rightarrow$ si el stock llega a 0, genera solicitud a almacén $\rightarrow$ aparece posteriormente en los reportes.
