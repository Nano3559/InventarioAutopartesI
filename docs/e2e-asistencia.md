# E2E — Asistencia facial y códigos de barras (R5)

Prueba de extremo a extremo en **dispositivo físico** (celular/tablet con cámara) contra el
backend de producción. Valida el flujo completo del Hito 3: registrar rostros una sola vez,
escanear etiquetas y marcar asistencia con reconocimiento facial. La parte que se puede
automatizar (contrato del API en Render) **ya quedó verificada el 06/10/2026** — ver §4.

> **Objetivo de R5:** anotar **scores reales** (similitud coseno que devuelve ArcFace) y
> detectar **falsos positivos/negativos**. Esos números recalibran `UMBRAL_CONFIANZA_FACIAL`
> (hoy 0.35 en `backend/src/common/constants.ts`). Más referencias: `docs/arquitectura.md` §3.2
> y `docs/despliegue.md` §1.1 (cold start 52.7 s → despertar Render antes de probar).

## Pre-requisitos verificados (06/10/2026)

> ⛔ **BLOQUEANTE — PENDIENTE (acción manual, 06/10):** el registro facial en producción
> responde **400** `new row violates row-level security policy (bucket: faces)` porque
> `SUPABASE_KEY` en el entorno de **Render** quedó con la clave **`anon`**. Corregir antes
> de la sección A: dashboard de Render → Web Service → Environment → `SUPABASE_KEY` = clave
> `service_role` de Supabase (la misma del secret del ping en GitHub Actions) → Save →
> `Manual Deploy → Deploy latest commit`. Sin esto **A falla** (ver `docs/despliegue.md` §1
> y `docs/entornos.md` §Backend).

- Backend de producción: `https://inventarioautopartesi.onrender.com` respondiendo.
- `GET /face/status` (admin): `indiceCompleto: true`, `modelo.disponible: true`, bucket
  `faces` presente. `rostrosEnBase` empieza en **0** (nadie registrado todavía).
- `POST /face/warmup`: modelo ArcFace carga en **2.84 s** (el primer disparo del día es lento).
- Usuarios de prueba con `apellido` cargado, `activo: true`, sin rostro:

  | id | Nombre completo | email | rol |
  | :-- | :--- | :--- | :--- |
  | 1 | Brian Barrientos | admin@importadoras.com | admin |
  | 2 | Raul Zuleta | inventario@importadoras.com | inventario |
  | 3 | Marco Condori | tienda1@importadoras.com | tienda |
  | 4 | Carla Mendoza | tienda2@importadoras.com | tienda |
  | 5 | Diego Rojas | tienda3@importadoras.com | tienda |

- `GET /products/by-barcode/AP-<id>-<codigoFabrica>` resuelve (probado con `AP-0037-RJLRENSAN030`)
  y devuelve 404 para un código inexistente.
- `mobile/.env` apunta a `EXPO_PUBLIC_API_URL=https://inventarioautopartesi.onrender.com`.
- App instalada en el dispositivo; **despertar Render** (`GET /api` un par de minutos antes)
  para no medir el cold start de 52.7 s como si fuera parte de la app.

## A. Registro facial (una sola vez, rol admin)

1. Login en la app como `admin@importadoras.com / admin123`.
2. Abrir **Registro facial** (item del drawer admin).
3. Elegir a la persona **de la lista** (la pantalla lista el personal sin rostro y manda
   `usuarioId`). Validar la fila correcta por nombre + email, no solo por nombre (homónimos).
4. Marcar el **consentimiento** (Ley 26935, obligatorio: sin él la cámara está bloqueada).
5. Tomar **5 fotos** del rostro (guía oval; contar `FOTOS_RECOMENDADAS = 5`, tope 10, mínimo 1).
   Variar ángulo/iluminación en cada una.
6. Confirmar registro → esperar progreso → **resultado con nombre completo**.
7. Repetir para **2-3 personas** (ej. ids 1, 2 y 3).

Hecho → verificar:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://inventarioautopartesi.onrender.com/api/face/status
# rostrosEnBase == indiceEnMemoria (rehidratación del índice en producción)
```

## B. Escáner de códigos de barras (los 3 roles)

1. Abrir **Escáner** con la cuenta de prueba.
2. Apuntar a una etiqueta impresa (`AP-<id>-<codigoFabrica>`, solo barras Code128).
3. Esperado: **ficha del producto** (nombre, código, precio, stock total y por tienda, imagen).
4. Apuntar a un código **inexistente** → mensaje **"código no registrado"** (nunca pantalla en
   blanco ni crash).

## C. Marcaje de asistencia (rol admin)

1. Abrir **Marcaje** con la cuenta admin.
2. Elegir la **tienda** del dispositivo (Te1/Te2/Te3).
3. Apuntar la cámara a la cara del primer usuario registrado.
4. Esperado: **nombre completo + hora exacta + tienda** del marcaje de **entrada**.
5. Repetir con el mismo rostro más tarde / al día hábil siguiente → debe alternar a **salida**.
6. Registrar puntas de marcaje: ingreso del turno, con el rostro de otra persona registrada.

### Flujo "no reconocido" (baja confianza)

- Apuntar con poca luz o un ángulo extremo → el backend **no inserta nada**, devuelve
  candidatos y la app deja elegir a mano. Verificar que aparece la ficha de candidatos y que
  al elegir se registra con `metodo: manual` (confianza `null`).

## D. Verificación de lo registrado

```bash
# Historial + dashboard del día (admin)
curl -H "Authorization: Bearer $TOKEN" "https://inventarioautopartesi.onrender.com/api/attendance?fecha=2026-10-06"
curl -H "Authorization: Bearer $TOKEN" "https://inventarioautopartesi.onrender.com/api/attendance/dashboard?fecha=2026-10-06"
```

## Tabla de scores (rellenar durante C)

Para cada intento de marcaje anotar: la persona real, la similitud coseno que devolvió el
backend (`similitud` en la respuesta de `POST /attendance/check`), si fue reconocido, y la
categoría (VP/VN/FP/FN).

| Intento | Persona real | Similitud | Reconocido | Categoría | Notas (luz, ángulo) |
| :---: | :--- | :---: | :---: | :--- | :--- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

- **VP** (verdadero positivo): reconoce a quien es → marcaje correcto, `reconocido: true`.
- **VN**: desconocido/no registrado → `reconocido: false` sin candidato falso.
- **FP**: reconoce a otra persona como registrada → marcaje incorrecto.
- **FN**: no reconoce a quien SÍ está registrado → `requiereConfirmacion` o candidatos.

> **Recalibración:** si aparecen FN en condiciones normales de luz → **bajar** el umbral
> (rango típico coseno 0.28–0.45). Si aparecen FP → **subirlo**. Hoy está en 0.35 y sale tanto
> en `GET /face/status` como en cada respuesta de `POST /attendance/check`.

## Cierre de la prueba

- [ ] 2-3 rostros registrados (una sola vez) y visibles en `GET /face/status`.
- [ ] Escáner: ficha real + mensaje de código inexistente.
- [ ] Marcaje entrada (y salida) con nombre + hora + tienda correctos.
- [ ] Tabla de scores completa con al menos 5 intentos.
- [ ] Umbral rechazado/ajustado según los FP/FN anotados.
- [ ] `dashboard?fecha=` muestra lo marcado.