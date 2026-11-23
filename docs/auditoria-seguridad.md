# Auditoría Integral de Seguridad — AutoParts Pro

> **Fecha de ejecución:** 22/11/2026 · **Rama de auditoría:** `feature/auditoria-seguridad`  
> **Alcance:** Backend (NestJS 11 + TypeORM), Frontend Web (React 19 + Vite), App Móvil (Expo 57), Base de Datos (PostgreSQL en Supabase) y Dependencias.  
> **Clasificación de riesgo:** Basado en estándar CVSS / OWASP Top 10 (2021) y OWASP API Security Top 10 (2023).

---

## 1. Resumen Ejecutivo

Se ha llevado a cabo una auditoría de seguridad integral sobre el repositorio **AutoParts Pro / InventarioAutopartesI**. El sistema cuenta con una arquitectura base sólida (RBAC estructurado con decoradores `@Roles`, uso sistemático de `Parameterized Queries` en TypeORM, buckets privados en Supabase con URLs firmadas para datos biométricos y uso de `SecureStore` en dispositivos móviles nativos).

No obstante, se han detectado **3 vulnerabilidades Críticas**, **2 Altas**, **3 Medias** y **1 Baja/Informativa** que comprometen la privacidad de datos biométricos/personales, la integridad financiera en ventas y la resiliencia del servicio ante ataques de denegación de servicio o falsificación de identidad.

### Matriz de Hallazgos

| ID | Severidad | Categoría OWASP | Descripción del Hallazgo | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRÍTICA** | API3:2023 Broken Object Property Level Authorization | **Fuga de contraseñas (bcrypt) y biometría (ArcFace 512 floats)** en `leftJoinAndSelect` de Ventas, Movimientos, Devoluciones y Solicitudes. | Pendiente parche |
| **SEC-02** | **CRÍTICA** | API6:2023 Unrestricted Access to Sensitive Business Flows | **Manipulación de precios de venta:** el cliente envía `precio` arbitrario sin validación contra catálogo o margen mínimo. | Pendiente parche |
| **SEC-03** | **CRÍTICA** | API2:2023 Broken Authentication | **Clave secreta JWT con fallback público** (`'unifranz-inventario-secret'`) predecible en código fuente. | Pendiente parche |
| **SEC-04** | **ALTA** | API8:2023 Security Misconfiguration | **Subida de archivos sin validación de tipo ni límite de tamaño** en módulo de Costos (`/facturas`). Riesgo de DoS y ejecución/XSS. | Pendiente parche |
| **SEC-05** | **ALTA** | API2:2023 Broken Authentication | **Sesiones JWT no revocables:** `JwtStrategy` no valida si el usuario fue dado de baja (`activo: false`) en la base de datos. | Pendiente parche |
| **SEC-06** | **MEDIA** | API8:2023 Security Misconfiguration | **CORS permisivo (`origin: *`)** y ausencia de cabeceras HTTP de seguridad (`helmet`) y limitador de tasa (`throttler`). | Pendiente parche |
| **SEC-07** | **MEDIA** | API6:2023 Unrestricted Access to Sensitive Business Flows | **Devoluciones sin validación de ventas previas** y sin control de devoluciones duplicadas sobre el mismo ítem. | Pendiente parche |
| **SEC-08** | **MEDIA** | A03:2021 Injection / XSS | **Almacenamiento de tokens de autenticación en `localStorage`** en el cliente web. | Pendiente parche |
| **SEC-09** | **MEDIA** | A06:2021 Vulnerable and Outdated Components | **Vulnerabilidades en dependencias:** `xlsx` (Prototype Pollution / ReDoS) y `proxy-addr` (IP spoofing). | Pendiente parche |

---

## 2. Detalle de Vulnerabilidades y Evidencia Técnica

### SEC-01. Fuga de Hashes de Contraseña y Vectores Biométricos en Joins (CRÍTICA)

* **Vulnerabilidad:** Fuga de datos sensibles (PII / Datos Biométricos bajo Ley 26935).
* **Archivos afectados:**
  - `backend/src/entities/user.entity.ts`
  - `backend/src/sales/sales.service.ts` (líneas 246 y 288)
  - `backend/src/movimientos/movimientos.service.ts` (línea 32)
  - `backend/src/devoluciones/devoluciones.service.ts` (línea 41)
  - `backend/src/solicitudes/solicitudes.service.ts` (línea 34)

#### Evidencia del Código
En `user.entity.ts`, las propiedades `password` y `embedding` no cuentan con la opción `{ select: false }`:
```typescript
@Column()
password: string;

@Column({ type: 'jsonb', nullable: true })
embedding: number[] | null;
```
Cuando servicios como `sales.service.ts` realizan:
```typescript
qb.leftJoinAndSelect('s.usuario', 'usuario')
```
TypeORM recupera **todas** las columnas de la tabla `users`. El endpoint `GET /api/sales` y `GET /api/sales/:id` retorna directamente la entidad completa, exponiendo:
1. El hash `bcrypt` de la contraseña del vendedor.
2. El vector biométrico de 512 valores de punto flotante de su rostro.

#### Remediación Propuesta
1. Declarar `{ select: false }` tanto en `password` como en `embedding` en `User.entity.ts`:
   ```typescript
   @Column({ select: false })
   password: string;

   @Column({ type: 'jsonb', nullable: true, select: false })
   embedding: number[] | null;
   ```
2. En las consultas con `leftJoin`, seleccionar explícitamente solo las columnas públicas del operador (`id`, `nombre`, `apellido`, `email`, `rol`).

---

### SEC-02. Manipulación Arbitraria de Precios de Venta (CRÍTICA)

* **Vulnerabilidad:** Fraude financiero / Ausencia de guardrails de precios en transacciones comerciales.
* **Archivo afectado:** `backend/src/sales/sales.service.ts` (líneas 122–154)

#### Evidencia del Código
Al registrar una venta (`POST /api/sales`):
```typescript
if (!Number.isFinite(it.precio) || it.precio < 0) {
  throw new BadRequestException('El precio no puede ser negativo');
}
...
const subtotal = it.cantidad * it.precio;
total += subtotal;
```
El backend toma ciegamente `it.precio` enviado por el cliente. Si un usuario o atacante envía:
```json
{
  "items": [{ "productId": 10, "cantidad": 5, "precio": 0.50 }],
  "pagos": [{ "metodo": "Efectivo", "monto": 2.50 }]
}
```
El sistema descuenta el stock de 5 unidades de un repuesto de Bs. 400 aceptando un cobro total de Bs. 2.50, porque `totalPagos === total`.

#### Remediación Propuesta
1. El backend debe consultar el precio oficial del producto (`product.precio1` o `product.precio2` si es mayorista).
2. Si se admite un descuento o precio especial, debe aplicarse un límite máximo porcentual (ej. no menor a `product.costo * 1.15` o requerir autorización de rol `admin`).

---

### SEC-03. Clave Secreta JWT con Fallback Inseguro en Código (CRÍTICA)

* **Vulnerabilidad:** Forjado de Tokens JWT con privilegios de Administrador.
* **Archivos afectados:**
  - `backend/src/auth/auth.module.ts` (línea 15)
  - `backend/src/auth/jwt.strategy.ts` (línea 18)

#### Evidencia del Código
```typescript
secret: process.env.JWT_SECRET || 'unifranz-inventario-secret',
```
Si la variable `JWT_SECRET` no está configurada o se omite en el archivo de entorno de producción, el sistema firma y valida tokens usando `'unifranz-inventario-secret'`. Un atacante puede crear un token con payload `{ "sub": 1, "rol": "admin" }` y obtener acceso administrativo total.

#### Remediación Propuesta
1. Exigir obligatoriamente `JWT_SECRET` en producción; lanzar un error fatal en el arranque si no está definida o si coincide con la clave por defecto.
2. Generar una clave criptográfica de al menos 256 bits (32 bytes aleatorios en base64) exclusiva para el entorno de producción.

---

### SEC-04. Subida de Archivos Sin Validación en Módulo de Costos (ALTA)

* **Vulnerabilidad:** Denegación de servicio (DoS) / Subida de archivos no restringida.
* **Archivos afectados:**
  - `backend/src/costos/costos.controller.ts` (línea 47)
  - `backend/src/costos/costos.service.ts` (líneas 100–108)

#### Evidencia del Código
```typescript
@UseInterceptors(FileInterceptor('archivo')) // <-- Sin límites ni filtro MIME
...
const ext = path.extname(file.originalname) || '.pdf';
const filename = `factura-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
```
No hay validación del tipo MIME real ni límite de tamaño (`limits.fileSize`). Un usuario con rol `admin` puede subir archivos de gigabytes agotando el espacio en disco, o archivos con extensiones peligrosas.

#### Remediación Propuesta
1. Configurar `FileInterceptor` con `multer` restringido a PDF y formatos de imagen (`application/pdf`, `image/jpeg`, `image/png`).
2. Limitar el tamaño máximo a 5 MB o 10 MB.
3. Almacenar las facturas en un bucket privado de Supabase en lugar de guardarlas localmente en el servidor.

---

### SEC-05. Falta de Revocación de Sesiones JWT en Baja Lógica (ALTA)

* **Vulnerabilidad:** Persistencia de credenciales tras baja o cambio de privilegios.
* **Archivo afectado:** `backend/src/auth/jwt.strategy.ts` (líneas 22–29)

#### Evidencia del Código
```typescript
validate(payload: JwtPayload) {
  return {
    id: payload.sub,
    email: payload.email,
    rol: payload.rol,
    tiendaId: payload.tiendaId,
  };
}
```
`JwtStrategy` no verifica el estado actual del usuario en la base de datos. Si un administrador desactiva a un empleado (`activo = false`) mediante `PATCH /api/users/:id`, el token JWT del empleado sigue siendo válido hasta que expiren las 8 horas configuradas.

#### Remediación Propuesta
Consultar en `validate()` el flag `user.activo`:
```typescript
const user = await this.usersService.findById(payload.sub);
if (!user || !user.activo) {
  throw new UnauthorizedException('Sesión inválida o usuario dado de baja');
}
```

---

### SEC-06. Ausencia de Helmet, Throttler y CORS Restrictivo (MEDIA)

* **Vulnerabilidad:** Ausencia de defensas perimetrales y cabeceras de endurecimiento HTTP.
* **Archivo afectado:** `backend/src/main.ts` (línea 9)

#### Evidencia del Código
```typescript
app.enableCors(); // <-- Permite cualquier origen sin restricción
```
No se incluye `helmet` (para cabeceras `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`) ni `@nestjs/throttler` para mitigar ataques de fuerza bruta al endpoint `POST /api/auth/login`.

#### Remediación Propuesta
1. Configurar CORS con lista blanca (`origin: [process.env.FRONTEND_URL, ...]`).
2. Instalar e invocar `app.use(helmet())`.
3. Implementar `ThrottlerModule` con regla de 10 peticiones/minuto en `POST /auth/login`.

---

### SEC-07. Devoluciones Sin Trazabilidad de Venta ni Control de Duplicidad (MEDIA)

* **Vulnerabilidad:** Riesgo de fuga de inventario y efectivo en caja.
* **Archivo afectado:** `backend/src/devoluciones/devoluciones.service.ts` (líneas 128–153)

#### Evidencia del Código
`ventaId` es opcional. Un operador puede registrar devoluciones sin asociarlas a una venta real. Si se provee `saleItemId`, valida `cantidad <= saleItem.cantidad`, pero no descuenta las cantidades ya devueltas en transacciones anteriores sobre el mismo ítem.

#### Remediación Propuesta
1. Exigir obligatoriamente `ventaId` y `saleItemId` para cualquier devolución con reembolso monetario.
2. Calcular la suma histórica devuelta: `SUM(cantidadDevueltaPrevia) + nuevaCantidad <= saleItem.cantidad`.

---

### SEC-08. Almacenamiento de Tokens en `localStorage` (MEDIA)

* **Vulnerabilidad:** Exposición de tokens ante ataques de Cross-Site Scripting (XSS).
* **Archivo afectado:** `frontend/src/context/AuthContext.tsx` (línea 37)

#### Evidencia del Código
```typescript
localStorage.setItem('auth_token', response.token);
```
Aunque el equipo mitiga esto borrando el token al recargar la página (`useEffect` en montaje), durante la sesión el token reside en `localStorage`, accesible por cualquier script inyectado en el contexto del DOM.

#### Remediación Propuesta
Migrar a cookies `HttpOnly` y `SameSite=Strict` para el transporte del token JWT entre cliente y servidor.

---

### SEC-09. Vulnerabilidades en Dependencias de Terceros (MEDIA)

* **Vulnerabilidad:** CVEs en paquetes NPM.
* **Dependencias identificadas por `npm audit`:**
  - `xlsx` (todas las versiones): Vulnerable a *Prototype Pollution* (GHSA-4r6h-8v6p-xvw6) y *ReDoS* (GHSA-5pgg-2g8v-p4x9). No existe parche oficial en la versión libre.
  - `proxy-addr` (< 2.0.8): Vulnerable a *IP Spoofing* vía IPv4-mapped IPv6 subnets.
  - `undici` / `body-parser`: Vulnerables a Denegación de Servicio (solucionables con `npm audit fix`).

#### Remediación Propuesta
1. Ejecutar `npm audit fix` en `backend/` para actualizar dependencias transitivas seguras.
2. Evaluar la migración de `xlsx` a `exceljs` para la lectura y exportación de archivos Excel sin contaminación de prototipos.

---

## 3. Aspectos Positivos y Buenas Prácticas Encontradas

Durante la auditoría también se confirmaron defensas de seguridad correctamente implementadas:

1. **RBAC Integral a Nivel de Controlador:**  
   Todos los controladores del sistema (`Attendance`, `Products`, `Sales`, `Costos`, `Users`, etc.) tienen decoradores `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase. Ninguna ruta operativa queda expuesta sin autenticación.
2. **Consultas SQL Parametrizadas:**  
   No se encontraron concatenaciones directas de cadenas en cláusulas SQL (`where`, `andWhere`); todas las búsquedas dinámicas utilizan parámetros vinculados (`:prod`, `:s`, `:id`).
3. **Protección de Datos Biométricos en el Almacenamiento:**  
   Las fotografías faciales se almacenan en un bucket privado de Supabase (`faces`) y se sirven únicamente mediante URLs firmadas con tiempo de expiración corto (`urlFirmadaRostro`). Nunca se publican de forma abierta.
4. **Almacenamiento Seguro en Móvil:**  
   La app Expo utiliza `expo-secure-store` en dispositivos físicos (respaldado por KeyStore en Android y Keychain en iOS).
5. **Control de Puerta de Administrador en Kiosco (Tiqueador):**  
   El componente `AdminPasswordGate` valida la contraseña del administrador contra `POST /auth/login` y **descarta intencionalmente el nuevo token**, previniendo la corrupción de la sesión persistente del kiosco.
6. **Aislamiento Multisede de Tiendas:**  
   Los operadores con rol `tienda` tienen restringida la creación de ventas a su propia sede (`user.tiendaId === locationId`).

---

## 4. Plan de Acción y Prioridades de Corrección

```mermaid
flowchart TD
    A["Auditoría de Seguridad Completada"] --> B{"Prioridad Inmediata (Fase 1)"}
    B --> C["SEC-01: Ocultar password y embedding en User Entity y Joins"]
    B --> D["SEC-02: Validar precios de venta en SalesService contra catálogo"]
    B --> E["SEC-03: Prohibir JWT_SECRET por defecto en producción"]
    
    A --> F{"Prioridad Alta (Fase 2)"}
    F --> G["SEC-04: Límites de tamaño y filtro MIME en Costos/Facturas"]
    F --> H["SEC-05: Validar usuario activo en JwtStrategy"]
    F --> I["SEC-07: Validar devoluciones contra ventas históricas"]
    
    A --> J{"Endurecimiento Perimetral (Fase 3)"}
    J --> K["SEC-06: Helmet + Throttler + CORS estricto"]
    J --> L["SEC-09: npm audit fix y evaluar sustitución de xlsx"]
```

---
*Documento elaborado como parte del ciclo de calidad y seguridad de AutoParts Pro.*

---

## Revisión independiente AUD-REV-03-20261122

> **Fecha:** 22/11/2026  
> **Tipo:** Revisión independiente, documental y estática  
> **Relación con la auditoría anterior:** esta sección **amplía y corrige** la auditoría precedente sin borrarla, sustituirla ni alterar su valor como registro histórico. Los dictámenes siguientes reflejan el código, la documentación y el índice de Git observados durante esta revisión.  
> **Estado común de los hallazgos:** **Pendiente**. Una corrección solo debe cerrarse después de pruebas, revisión de seguridad y actualización documental en el mismo commit.

### A. Hallazgos de seguridad consolidados

| ID | Dictamen | Severidad / prioridad | Evidencia | Retroalimentación y corrección requerida | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD3-SEG-001** | **El conteo del resumen no coincide con la matriz original.** La matriz contiene 3 críticas, 2 altas, 4 medias y 0 bajas/informativas, no 3 medias y 1 baja. | Media · P1 documental | `docs/auditoria-seguridad.md:13`; `docs/auditoria-seguridad.md:19-27` | Corregir el resumen manteniendo constancia de la cifra original. No reclasificar un hallazgo solo para hacer coincidir el total. | Pendiente |
| **AUD3-SEG-002** | **CVSS no fue aplicado realmente.** Se menciona “CVSS / OWASP”, pero no existen versión, vector, puntuación ni supuestos por hallazgo. OWASP es una taxonomía, no una escala de severidad. | Alta · P1 | `docs/auditoria-seguridad.md:5`; `docs/auditoria-seguridad.md:17-27` | Añadir por hallazgo CVSS v3.1 o v4.0, vector, score y alcance; si no se calcula, declarar “priorización cualitativa con mapeo OWASP orientativo”. | Pendiente |
| **AUD3-SEG-003** | **SEC-01 confirmado y ampliado.** `password`, `embedding` y la ruta privada `facePhoto` se seleccionan por defecto y los joins de ventas, movimientos, devoluciones y solicitudes serializan la entidad `User`. La ruta del objeto facial no equivale a una URL pública, pero continúa siendo metadato biométrico innecesario. | Crítica · P0 | `backend/src/entities/user.entity.ts:22-23`; `backend/src/entities/user.entity.ts:39-45`; `backend/src/sales/sales.service.ts:243-250`; `backend/src/sales/sales.service.ts:284-296`; `backend/src/movimientos/movimientos.service.ts:26-34`; `backend/src/devoluciones/devoluciones.service.ts:36-44`; `backend/src/solicitudes/solicitudes.service.ts:28-39` | Aplicar `select: false` a secretos/biometría y reemplazar cada join de usuario por columnas explícitas o DTO de salida. Añadir pruebas de regresión que comprueben ausencia de `password`, `embedding` y `facePhoto`. Corregir las afirmaciones contrarias en API/arquitectura. | Pendiente |
| **AUD3-SEG-004** | **SEC-02 confirmado y ampliado a creación, edición, importación y clientes web/móvil.** El backend acepta precios no negativos enviados por el cliente; `update` repite la misma regla y el Excel permite `Precio Mayor` arbitrario, incluso cero. La UI no constituye control de seguridad. | Crítica · P0 | `backend/src/sales/sales.service.ts:109-153`; `backend/src/sales/sales.service.ts:355-400`; `backend/src/sales/sales.service.ts:620-645`; `frontend/src/pages/ventas/SalesPage.tsx:290`; `mobile/src/screens/VentaMayorScreen.tsx:237` | Resolver precio y descuentos en servidor desde catálogo/reglas autorizadas; registrar precio base, descuento, autorizador y motivo. Aplicar el mismo contrato a create/update/import. Probar manipulación directa de API, no solo UI. | Pendiente |
| **AUD3-SEG-005** | **SEC-03 confirmado.** El fallback JWT público permite firmar tokens si falta `JWT_SECRET`. | Crítica · P0 | `backend/src/auth/auth.module.ts:15`; `backend/src/auth/jwt.strategy.ts:14-19` | Validar configuración al arranque y fallar de forma segura si falta el secreto o es débil/conocido. Rotar claves si el fallback fue usado en algún entorno y documentar estrategia de rotación. | Pendiente |
| **AUD3-SEG-006** | **SEC-04 es correcto solo parcialmente y está mal categorizado.** Costos y los dos endpoints Excel usan `FileInterceptor` sin límites/filtro; otras imágenes sí tienen 10 MiB, aunque varias confían únicamente en MIME declarado. El mapeo principal es OWASP API4:2023 Unrestricted Resource Consumption. | Alta · P0 | `backend/src/costos/costos.controller.ts:45-50`; `backend/src/sales/sales.controller.ts:80-93`; `backend/src/common/image-upload.ts:12-19`; `backend/src/attendance/attendance.controller.ts:69-78`; `backend/src/part-recognition/part-recognition.controller.ts:30-33` | Imponer bytes, archivos, campos, partes, extensión y contenido real a facturas/Excel; limitar filas, hojas, celdas y tiempo de parseo. Mantener API8 como categoría secundaria solo si se justifica configuración insegura. | Pendiente |
| **AUD3-SEG-007** | **SEC-05 confirmado.** La estrategia confía en claims emitidos y no revalida `activo`, rol, tienda ni versión de sesión; una baja o cambio de privilegio no revoca el JWT vigente. | Alta · P0 | `backend/src/auth/jwt.strategy.ts:22-29`; `backend/src/auth/auth.service.ts:32-38`; `ai-service/README.md:121` | Revalidar estado/rol/tienda o implementar `tokenVersion`/revocación. Definir efecto de cambio de contraseña, baja y cambio de rol. Añadir pruebas con token emitido antes del cambio. | Pendiente |
| **AUD3-SEG-008** | **SEC-06 confirmado.** CORS se habilita sin allowlist y no se observan Helmet ni rate limiting global/específico para login. | Media · P1 | `backend/src/main.ts:6-16`; `backend/package.json:32-55` | Configurar orígenes por entorno, Helmet y límites por IP/cuenta/ruta. Considerar proxy de Render al determinar IP y evitar bloqueos globales que afecten al kiosco. | Pendiente |
| **AUD3-SEG-009** | **SEC-07 debe elevarse a Alta.** La venta y el ítem son opcionales, no se acumulan devoluciones previas, el monto/método vienen del cliente y el guardado de devolución y reposición de stock no es atómico. | Alta · P0 | `backend/src/devoluciones/devoluciones.service.ts:88-124`; `backend/src/devoluciones/devoluciones.service.ts:126-173`; `backend/src/entities/devolucion.entity.ts:28-48` | Exigir trazabilidad para reembolso, validar suma histórica, monto máximo y método contra la venta/pagos; usar transacción y bloqueo. Definir excepción administrativa auditada para devoluciones sin comprobante. | Pendiente |
| **AUD3-SEG-010** | **SEC-08 describe exposición, pero está mal categorizado como A03/XSS.** `localStorage` no crea una XSS; amplifica su impacto. Migrar a cookie entre Vercel y Render exige resolver contexto cross-site, CORS con credenciales y CSRF: `SameSite=Strict` no funcionará sin dominio/proxy same-site. | Media · P1 | `frontend/src/context/AuthContext.tsx:19-22`; `frontend/src/context/AuthContext.tsx:31-39`; `frontend/src/api/client.ts:26-36`; `mobile/src/storage/token.ts:4-11` | Clasificar como manejo de sesión/autenticación. Preferir BFF/proxy same-site o cookie `HttpOnly; Secure` con política `SameSite` explícita y defensa CSRF. Mantener SecureStore nativo; documentar que Expo Web usa `localStorage`. | Pendiente |
| **AUD3-SEG-011** | **SEC-09 estaba incompleto.** Con `npm audit --omit=dev` se observaron: backend **1 crítica, 6 altas, 1 moderada**; frontend **0**; mobile **1 crítica, 12 altas, 9 moderadas**. Los totales deben distinguir dependencias de runtime de tooling y comprobar alcanzabilidad. | Crítica · P0 triage | `backend/package-lock.json`; `frontend/package-lock.json`; `mobile/package-lock.json`; `backend/package.json:32-55`; `mobile/package.json:5-33` | Conservar salida JSON, fecha, versión npm y lockfile; hacer triage por ruta explotable. Priorizar runtime (`xlsx`, `multer` y transitivas efectivamente empaquetadas); actualizar con pruebas y no aplicar `audit fix --force` sin revisar cambios mayores. | Pendiente |
| **AUD3-SEG-012** | **El tiqueador salta ArcFace por diseño actual.** La app siempre envía `usuarioId` tras seleccionar/buscar carnet; el backend registra manualmente y no analiza la foto cuando recibe ese campo. Por tanto, la cámara no prueba identidad en ese flujo. | Crítica · P0 | `mobile/src/screens/AttendanceScreen.tsx:273-310`; `backend/src/attendance/attendance.controller.ts:62-68`; `backend/src/attendance/attendance.service.ts:536-567`; `backend/src/attendance/attendance.service.ts:662-696` | Separar explícitamente “marcaje biométrico” y “marcaje manual autorizado”. El kiosco normal no debe enviar `usuarioId`; cualquier bypass manual debe exigir autorización reforzada, motivo y auditoría visible. | Pendiente |
| **AUD3-SEG-013** | **Los carnets son locales, sembrados y reasignables.** Se aceptan IDs directos y prefijos de email; cualquier valor puede asociarse localmente a un usuario sin validación central, unicidad ni prueba del documento. | Crítica · P0 | `mobile/src/storage/carnets.ts:5-26`; `mobile/src/storage/carnets.ts:28-68`; `mobile/src/storage/carnets.ts:71-100`; `mobile/src/screens/AttendanceScreen.tsx:235-255` | No tratar este mapa como identidad. Si el carnet pertenece al alcance, modelarlo en backend con unicidad, permisos administrativos, auditoría y verificación; eliminar semillas/lookup por ID/email del flujo productivo. | Pendiente |
| **AUD3-SEG-014** | **Faltan transacciones y bloqueo de concurrencia en operaciones críticas.** Create/update/import de ventas, movimientos, despacho de solicitudes, devoluciones y el read-modify-write de stock pueden dejar estados parciales o vender stock concurrentemente. | Crítica · P0 | `backend/src/sales/sales.service.ts:192-203`; `backend/src/sales/sales.service.ts:409-478`; `backend/src/sales/sales.service.ts:720-772`; `backend/src/movimientos/movimientos.service.ts:65-94`; `backend/src/solicitudes/solicitudes.service.ts:108-147`; `backend/src/devoluciones/devoluciones.service.ts:155-173`; `backend/src/products/products.service.ts:542-579` | Ejecutar cada operación completa en una transacción con el mismo `EntityManager`; usar actualización atómica o bloqueo pesimista/optimista sobre inventario. Definir idempotencia y pruebas de fallo intermedio/concurrencia. | Pendiente |
| **AUD3-SEG-015** | **BOLA/IDOR y filtros multisede incompletos en ventas.** El listado filtra tienda, pero `GET /sales/:id` no recibe al actor y `update` carga por ID antes de validar únicamente la ubicación destino. | Alta · P0 | `backend/src/sales/sales.controller.ts:31-55`; `backend/src/sales/sales.service.ts:258-281`; `backend/src/sales/sales.service.ts:284-300`; `backend/src/sales/sales.service.ts:320-327` | Autorizar cada objeto por sede/rol en servicio, incluidos detalle, nota y edición. No confiar en `locationId` del body para decidir si el actor puede tocar la venta original. Revisar devoluciones y reportes con la misma matriz. | Pendiente |
| **AUD3-SEG-016** | **Existe superficie de XSS en notas/impresión.** El HTML de nota interpola campos de cliente/venta y varias páginas escriben HTML en una ventana con `document.write`; no se evidencia escape/sanitización contextual. | Alta · P0 | `backend/src/sales/sales.service.ts:520`; `frontend/src/pages/ventas/HistorialVentasPage.tsx:91-93`; `frontend/src/pages/ventas/VentaMayorPage.tsx:337-339`; `frontend/src/pages/ventas/SalesPage.tsx:328-330`; `frontend/src/pages/reportes/ReportesPage.tsx:105-107` | Escapar toda entrada en servidor, generar documentos con plantillas seguras y evitar `document.write`. Añadir CSP/Helmet y pruebas con payloads HTML en nombre, CI/NIT, observaciones y campos de venta. | Pendiente |
| **AUD3-SEG-017** | **Hay secretos versionados.** `mobile/credentials.json` contiene credenciales de keystore y `usuario_cliente_modelo.txt` contiene credenciales de cuenta. No se reproducen sus valores en esta revisión. | Crítica · P0 | `mobile/credentials.json:1-10`; `usuario_cliente_modelo.txt:1-5`; `docs/entornos.md:3-6`; `docs/git-convention.md:93` | Rotar/revocar antes de retirar archivos; eliminar del índice y evaluar purga coordinada del historial. Invalidar la cuenta de prueba y revisar accesos. Agregar controles de secret scanning/pre-commit/CI. | Pendiente |
| **AUD3-SEG-018** | **No existe prueba de vida facial ni protección anti-replay.** El endpoint recibe una imagen estática, detecta/alinea el rostro y compara el embedding, pero no exige desafío temporal, secuencia, parpadeo, profundidad ni otra señal que permita distinguir a una persona presente de una fotografía o pantalla. | Alta · P0 | `backend/src/attendance/attendance.controller.ts:69-100`; `backend/src/attendance/attendance.service.ts:567-613`; `mobile/src/components/FaceCamera.tsx:125-147` | Incorporar una estrategia de liveness proporcional al riesgo y pruebas contra fotografía impresa, pantalla y video. Hasta entonces, no presentar el rostro como factor fuerte de autenticación presencial. | Pendiente |
| **AUD3-SEG-019** | **Uploads y Excel requieren endurecimiento adicional.** Las facturas se escriben síncronamente al filesystem y los Excel se reciben en memoria sin límites declarados. | Alta · P0 | `backend/src/costos/costos.service.ts:18`; `backend/src/costos/costos.service.ts:100-107`; `backend/src/costos/costos.controller.ts:45-50`; `backend/src/sales/sales.controller.ts:80-93` | Usar almacenamiento privado, nombres no controlados, análisis real de formato y límites de recursos. Evitar `writeFileSync` en request y aplicar política de retención/eliminación. | Pendiente |
| **AUD3-SEG-020** | **`DB_SYNC` cae a `true` por defecto.** Un entorno mal configurado puede alterar esquema al arrancar. | Alta · P0 | `backend/src/app.module.ts:48-50`; `docs/entornos.md:41-47` | Default seguro `false`; habilitar sincronización solo mediante configuración local explícita. En producción usar migraciones versionadas y validación de entorno al arranque. | Pendiente |
| **AUD3-SEG-021** | **TLS de base de datos desactiva validación de certificado.** `rejectUnauthorized: false` cifra, pero no autentica correctamente al servidor. | Alta · P1 | `backend/src/app.module.ts:30-46`; `docs/entornos.md:45-47` | Configurar CA verificable y `rejectUnauthorized: true` donde el proveedor lo permita. Documentar excepción temporal, amenaza MITM y entorno concreto si debe conservarse. | Pendiente |
| **AUD3-SEG-022** | **Los DTOs y la validación de entrada son débiles.** Varios controllers reciben `any` o interfaces TypeScript sin validación runtime; `forbidNonWhitelisted` está deshabilitado. | Alta · P1 | `backend/src/main.ts:10-15`; `backend/src/users/users.controller.ts:80-87`; `backend/src/products/products.controller.ts:104-111`; `backend/src/movimientos/movimientos.controller.ts:21-22`; `backend/src/solicitudes/solicitudes.controller.ts:29-30`; `backend/src/devoluciones/devoluciones.controller.ts:26-27`; `backend/src/sales/sales.service.ts:42-50` | Crear DTOs con `class-validator`, límites de longitud/rango/enums y rechazo de propiedades desconocidas. No usar tipos compile-time como frontera de confianza. | Pendiente |
| **AUD3-SEG-023** | **La supresión biométrica no es completa ni verificable.** La acción explícita `eliminarEmbedding` borra embedding y foto actual, pero `remove(id)` elimina al usuario sin borrar el objeto facial del bucket. Además, permanecen asistencias, confianza, método, confirmante y posibles respaldos sin política documentada de retención. | Alta · P0 privacidad | `backend/src/users/users.service.ts:112-132`; `backend/src/entities/asistencia.entity.ts`; `docs/api.md:66`; `docs/arquitectura.md:245-248` | Borrar o retener legalmente la foto mediante una política explícita también al eliminar usuarios; definir base legal, retención, respaldos y anonimización histórica. Entregar evidencia auditable de supresión y distinguir baja laboral de borrado biométrico. | Pendiente |
| **AUD3-SEG-024** | **El kiosco conserva un token administrativo completo.** El bloqueo es de UI; la tablet mantiene una credencial con privilegios amplios y solo vuelve a pedir la contraseña para entrar/salir del modo. | Crítica · P0 | `mobile/src/components/AdminPasswordGate.tsx:40-52`; `mobile/src/components/AdminPasswordGate.tsx:78-103`; `AGENTS.md:103` | Emitir una sesión/rol de terminal con alcance mínimo, sede fija, expiración/rotación y revocación independiente. No usar una cuenta admin compartida como credencial de operación diaria. | Pendiente |
| **AUD3-SEG-025** | **Varias cargas de imagen confían en MIME declarado.** `image/*` no comprueba magic bytes ni formato real en producto, rostro y asistencia; el módulo de reconocimiento de autopartes sí ofrece un patrón más robusto con Sharp. | Alta · P1 | `backend/src/common/image-upload.ts:22-32`; `backend/src/attendance/attendance.controller.ts:71-77`; `backend/src/part-recognition/part-recognition.service.ts:89-127` | Decodificar y re-encodear formatos permitidos, limitar píxeles/páginas y rechazar inconsistencias MIME/contenido antes de persistir o inferir. | Pendiente |
| **AUD3-SEG-026** | **Hay facturas/uploads versionados pese a tratarse como datos runtime.** El índice contiene 42 archivos bajo `backend/uploads/`, incluidos PDFs de factura; `.gitignore` no elimina archivos ya rastreados. | Alta · P0 privacidad | `.gitignore:41-43`; `backend/uploads/factura-1787856657831-549.pdf`; `backend/src/costos/costos.service.ts:100-107` | Clasificar contenido, retirar documentos reales del índice, revisar historial y posibles datos personales/comerciales. Mantener solo fixtures explícitamente sintéticos fuera de la ruta runtime. | Pendiente |
| **AUD3-SEG-027** | **`schema.sql` está desincronizado y contiene semántica obsoleta.** Declara `/face/embed`, describe `facePhoto` como URL y no incluye `factura_items`, aunque las entidades/código actuales difieren. | Alta · P1 | `backend/schema.sql:1-6`; `backend/schema.sql:38-42`; `docs/arquitectura.md:52-53`; `backend/src/entities/user.entity.ts:39-45` | Regenerar/verificar el esquema contra las entidades o retirarlo como DDL ejecutable. Corregir comentarios y añadir comprobación CI de drift/migraciones. | Pendiente |
| **AUD3-SEG-028** | **La afirmación original de cobertura RBAC es absoluta e inexacta.** El controller raíz es público y Auth tiene rutas públicas por diseño; debe hablarse de controladores de negocio revisados y excepciones intencionales. | Media · P2 documental | `docs/auditoria-seguridad.md:241-242`; `backend/src/app.controller.ts:4-10`; `backend/src/auth/auth.controller.ts:11-25` | Inventariar rutas públicas/autenticadas por método y probar 401/403. Evitar “todos”/“ninguna” sin evidencia automatizada. | Pendiente |
| **AUD3-SEG-029** | **No existe readiness integral del sistema.** `GET /api` solo devuelve un saludo y el health de reconocimiento comprueba un upstream concreto; no acredita base de datos, almacenamiento, ArcFace, modelo de demanda ni capacidad de completar flujos críticos. | Media · P1 | `backend/src/app.controller.ts:4-10`; `backend/src/part-recognition/part-recognition.controller.ts:51-52`; `mobile/src/api/client.ts:95-120` | Crear health, liveness y readiness diferenciados, mínimos y no sensibles, con timeouts. No considerar cualquier respuesta HTTP menor a 600 como prueba de servicio saludable. | Pendiente |
| **AUD3-SEG-030** | **Eliminar una factura de compra no revierte sus efectos ni elimina el archivo.** La creación incrementa inventario y actualiza costos, pero `remove` solo borra la entidad principal. | Alta · P0 integridad | `backend/src/costos/costos.service.ts:180-194`; `backend/src/costos/costos.service.ts:229-232` | Definir si las facturas deben anularse en vez de eliminarse. Si procede reversión, realizarla transaccionalmente, preservar trazabilidad contable y gestionar el archivo según retención. | Pendiente |
| **AUD3-SEG-031** | **El seed contiene credenciales conocidas y las imprime.** Si se ejecutó sin rotación fuera de un entorno descartable, crea cuentas previsibles. | Alta · P0 si alcanzó producción | `backend/src/seed.ts:121-159`; `backend/src/seed.ts:970-975` | Limitar el seed a desarrollo, generar secretos no previsibles, evitar imprimir contraseñas y forzar rotación de cualquier cuenta sembrada en entornos compartidos. | Pendiente |
| **AUD3-SEG-032** | **Los importes monetarios usan punto flotante.** Ventas, ítems y pagos almacenan valores susceptibles a errores de representación y comparaciones frágiles. | Media · P1 integridad | `backend/src/entities/sale.entity.ts:31-32`; `backend/src/entities/sale-item.entity.ts:33-37`; `backend/src/entities/payment.entity.ts:25-26` | Migrar dinero a `numeric/decimal` con escala definida o unidades enteras menores; centralizar redondeo y añadir pruebas de sumas/pagos límite. | Pendiente |
| **AUD3-SEG-033** | **El mínimo privilegio financiero y multisede es insuficiente.** Roles operativos pueden consultar costos, márgenes, reportes y movimientos globales que exceden su sede o función. | Alta · P0 | `backend/src/costos/costos.controller.ts:29-42`; `backend/src/precios/precios.controller.ts:22-28`; `backend/src/reportes/reportes.controller.ts:10-18`; `backend/src/movimientos/movimientos.controller.ts:9-17` | Definir una matriz de capacidades por rol y filtrar en backend por sede. Separar precios comerciales de costos/márgenes internos y probar respuestas por rol. | Pendiente |
| **AUD3-SEG-034** | **El registro facial puede dejar foto y embedding desincronizados ante un fallo.** La foto nueva se sube antes de guardar la entidad; si falla la persistencia, el objeto puede quedar asociado al estado anterior. | Alta · P1 privacidad | `backend/src/users/users.service.ts:281-301` | Usar objeto temporal y promoción/compensación, o borrar la nueva foto si falla el guardado. Versionar el pipeline del embedding y probar fallos de almacenamiento y base de datos. | Pendiente |

### B. Aspectos positivos confirmados en AUD-REV-03

1. **Sanitización explícita en Users/Auth:** las respuestas directas de usuarios eliminan `password` y `embedding` (`backend/src/users/users.service.ts:33-50`; `backend/src/auth/auth.service.ts:49-63`). Esto no corrige los joins de AUD3-SEG-003.
2. **Protecciones robustas en reconocimiento de autopartes:** límite de bytes/píxeles, verificación MIME/formato real, control de concurrencia, timeout, redirects rechazados y respuesta acotada (`backend/src/part-recognition/part-recognition.service.ts:21-27`; `backend/src/part-recognition/part-recognition.service.ts:89-140`; `backend/src/part-recognition/part-recognition.service.ts:184-255`).
3. **Bucket facial diseñado como privado:** se almacenan rutas y se emiten URLs firmadas; la intención de privacidad está documentada (`backend/src/entities/user.entity.ts:43-45`; `docs/arquitectura.md:133-135`). Debe verificarse también en infraestructura real.
4. **SecureStore en móvil nativo:** token, terminal y mapas locales usan almacenamiento nativo protegido; la excepción web se identifica expresamente (`mobile/src/storage/token.ts:4-11`; `mobile/src/storage/carnets.ts:28-35`).
5. **Consentimiento facial presente en UI:** el registro inicial se bloquea hasta marcar el consentimiento (`mobile/src/screens/FaceRegisterScreen.tsx:78-110`; `mobile/src/screens/FaceRegisterScreen.tsx:791-804`). No obstante, el reentrenamiento lo activa automáticamente y falta persistir evidencia/versión del consentimiento en servidor.
6. **Consultas revisadas mayormente parametrizadas:** los filtros observados usan parámetros TypeORM; debe conservarse esta práctica y evitar convertirla en una garantía absoluta sobre todo el repositorio.

### C. Plan priorizado de remediación de seguridad

| Fase | Prioridad | Acciones mínimas de salida |
| :--- | :--- | :--- |
| **0 — Contención inmediata** | P0 | Rotar secretos y keystore; retirar credenciales/documentos runtime del índice; eliminar fallback JWT; deshabilitar marcaje por `usuarioId` en kiosco; sustituir token admin por sesión de terminal; evaluar explotación de joins e IDOR. |
| **1 — Integridad transaccional** | P0 | Transacciones y bloqueo de inventario en create/update/import, movimientos, solicitudes y devoluciones; precio decidido en servidor; trazabilidad y límite acumulado de devoluciones. |
| **2 — Fronteras de entrada** | P0/P1 | DTOs runtime, límites de Excel/uploads, verificación real de imágenes, sanitización de notas/impresión, rate limiting y CORS/Helmet. |
| **3 — Sesiones e infraestructura** | P1 | Revocación/versionado de JWT, estrategia segura de cookies si se adopta, health/readiness, `DB_SYNC=false`, TLS verificable y migraciones. |
| **4 — Dependencias y privacidad** | P1 | Triage de `npm audit --omit=dev`, actualización controlada, política de supresión/retención biométrica, pruebas de ausencia de campos sensibles. |
| **5 — Cierre verificable** | P1/P2 | E2E de autorización multisede, concurrencia y seguridad; actualizar API/arquitectura/entornos; conservar evidencia de comandos y volver a puntuar CVSS. |

### D. Criterio de cierre de esta revisión

Ningún hallazgo de esta sección pasa a “Corregido” solo por cambiar documentación o UI. Se requiere evidencia del control en backend/infraestructura, pruebas reproducibles, revisión de efectos laterales y actualización documental coordinada. Los resultados de `npm audit` son una fotografía dependiente de fecha y lockfile, no una demostración automática de explotabilidad.
