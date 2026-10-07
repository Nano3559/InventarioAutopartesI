#!/usr/bin/env python3
"""
Spike autónomo: reconocimiento facial con SCRFD (detección + alineación) + ArcFace.

Historia corta: "ArcFace no reconoce quién es quién" porque el pipeline anterior
recortaba un cuadrado sin alinear. ArcFace se entrenó con caras ALINEADAS (ojos a la
altura horizontal, cara centrada, 112x112): sin esa alineación el mismo rostro varía
mucho según el encuadre, dos personas se solapan y el umbral 0.8 es inalcanzable
(rango medido "misma persona" sin alinear: 0.28-0.45).

Pipeline que arregla eso (plan acordado en `Plan Hito 3.md`):

  1. SCRFD detecta los rostros y devuelve los 5 landmarks (ojos, nariz, boca).
     YOLO a secas detecta pero NO da landmarks, así que SCRFD lo reemplaza como
     detector por defecto (es de la misma familia de one-stage detectors).
  2. Se alinea cada rostro con la plantilla ArcFace 112x112 mediante un warp
     de similitud (rotación + escala + traslación) resuelto con los 2 ojos y la nariz.
  3. ArcFace int8 (onnxmodelzoo/arcfaceresnet100-11-int8, Apache-2.0) calcula el
     embedding de 512 dims sobre la cara ya alineada, normalizado a norma 1.
  4. Similitud coseno contra `users.embedding` de la tabla `users` (JSONB).
     >= umbral (default 0.8 = UMBRAL_CONFIANZA_FACIAL) → "Reconocido: <nombre>".
     Si no → "Usuario no registrado".

Para que la comparación sea válida, los embeddings de la BD deben calcularse con
el MISMO preprocesado alineado: usá el modo `--registrar` para recalcularlos.

Uso:
  pip install -r requirements.txt
  # recalcular el embedding de un usuario con fotos alineadas:
  python reconocer_rostro.py --registrar 1 ../fotos/brian/*.jpg --modelo-scrfd ../models/scrfd_2.5g_bnkps.onnx
  # consultar quién es la foto:
  python reconocer_rostro.py ../fotos/yo.jpg [--modelo-scrfd ../models/scrfd_2.5g_bnkps.onnx]
            [--umbral 0.8] [--x X --y Y --tamano N] [--todas] [--modelo-yolo yolov8n-face.pt]

Conexión a BD: lee backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
DB_SSL). Solo se leen columnas explícitas, nunca password.

Modelos (en backend/spike/models/):
  - ArcFace: arcfaceresnet100-11-int8.onnx (63 MB). Bajar con
    `node scripts/ensure-arcface-model.mjs` o desde onnxmodelzoo.
  - SCRFD: scrfd_2.5g_bnkps.onnx (Apache-2.0, del proyecto scrfd, releases del
    repo deepinsight/insightface). Da caja + 5 landmarks + score.
  - YOLO (opcional, solo detección sin alinear, para comparar): yolov8n-face.pt
    (repo akanametov/yolov8-face) + `pip install ultralytics`.

Este script no toca la API en producción.
"""

import argparse
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parents[2]  # backend/

ARCFACE_ENTRADA = 112
ARCFACE_MEDIA = 127.5
ARCFACE_DESVIACION = 128
ARCFACE_DIMENSION = 512
RECORTE_MINIMO = 32

# Plantilla ArcFace 112x112 (los mismos 5 puntos que asumió el entreno: los 2 ojos
# y la nariz alcanzan para el warp de similitud; el orden de ojos es estable si se
# ordena la menor x como "ojo izquierdo", lo que vuelve robusto al etiquetado de
# SCRFD, que exporta [ojo_der, ojo_izq, nariz, ...]).
PLANTILLA_ARCFACE = np.float32(
    [
        [38.2946, 51.6963],  # ojo izquierdo del sujeto
        [73.5318, 51.5014],  # ojo derecho del sujeto
        [56.0252, 71.7366],  # nariz
    ]
)


def cargar_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BASE / ".env")
    except ImportError:
        pass


def umbral_por_defecto() -> float:
    try:
        v = float(os.getenv("UMBRAL_CONFIANZA_FACIAL", "0.8"))
    except ValueError:
        v = 0.8
    return v if 0 < v <= 1 else 0.8


def abrir_imagen_np(foto: Path) -> np.ndarray:
    img = Image.open(foto)
    return np.asarray(ImageOps.exif_transpose(img).convert("RGB"))


def detectar_scrfd(img_np: np.ndarray, sesion, tam: int = 640, conf: float = 0.5):
    h, w = img_np.shape[:2]
    escala = tam / max(h, w)
    nw, nh = max(1, int(round(w * escala))), max(1, int(round(h * escala)))
    imagen = cv2.resize(img_np, (nw, nh), interpolation=cv2.INTER_AREA)
    blob = np.transpose(imagen.astype(np.float32), (2, 0, 1))[np.newaxis, ...]
    blob = (blob - ARCFACE_MEDIA) / ARCFACE_DESVIACION
    entrada = sesion.get_inputs()[0].name
    scores, boxes, kps = sesion.run(None, {entrada: blob})
    scores, boxes, kps = scores[0], boxes[0], kps[0]
    rostros = []
    for i in range(len(scores)):
        if float(scores[i]) < conf:
            continue
        x1, y1, x2, y2 = [float(v) / escala for v in boxes[i]]
        landmarks = kps[i].reshape(-1, 2) / escala
        rostros.append(
            {
                "caja": (x1, y1, x2, y2),
                "landmarks": landmarks,
                "conf": float(scores[i]),
            }
        )
    return rostros


def detectar_rostros_yolo(foto: Path, modelo_yolo: str, yolo_conf: float):
    from ultralytics import YOLO

    resultados = YOLO(modelo_yolo)(str(foto))[0]
    cajas = []
    for box in resultados.boxes:
        if float(box.conf[0]) < yolo_conf:
            continue
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
        cajas.append((x1, y1, x2, y2, float(box.conf[0])))
    return cajas


def cuadrar_y_centrar(w: int, h: int, caja, factor: float = 1.2):
    x1, y1, x2, y2, _ = caja
    lado = int(round(max(x2 - x1, y2 - y1) * factor))
    tam = min(lado, w, h)
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0 - tam * 0.05
    x = int(round(cx - tam / 2.0))
    y = int(round(cy - tam / 2.0))
    x = max(0, min(x, w - tam))
    y = max(0, min(y, h - tam))
    return x, y, tam


def alinear_arcface(img_np: np.ndarray, landmarks) -> np.ndarray:
    kp = np.asarray(landmarks, dtype=np.float32)
    if kp.shape != (5, 2):
        raise ValueError(f"se esperaban 5 landmarks y llegaron {kp.shape}")
    ojos = kp[:2]
    ojo_izq, ojo_der = ojos[np.argsort(ojos[:, 0])]
    nariz = kp[2]
    fuente = np.float32([ojo_izq, ojo_der, nariz])
    matriz, _ = cv2.estimateAffinePartial2D(fuente, PLANTILLA_ARCFACE)
    if matriz is None:
        raise ValueError("no se pudo estimar la transformación de alineación")
    return cv2.warpAffine(
        img_np,
        matriz,
        (ARCFACE_ENTRADA, ARCFACE_ENTRADA),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )


def obtener_caras(
    img_np: np.ndarray,
    foto: Path,
    sesion_scrfd,
    modelo_yolo: str | None,
    yolo_conf: float,
    recorte_manual,
    todas: bool,
):
    h, w = img_np.shape[:2]
    if recorte_manual is not None:
        x, y, tam = recorte_manual
        if tam >= RECORTE_MINIMO and x >= 0 and y >= 0 and x + tam <= w and y + tam <= h:
            return [(img_np[y : y + tam, x : x + tam], "recorte manual (sin alinear)")]
        print(f"[aviso] recorte manual inválido para {w}x{h}; uso la foto completa", file=sys.stderr)
        return [(img_np, "foto completa (sin alinear)")]

    if sesion_scrfd is not None:
        try:
            rostros = detectar_scrfd(img_np, sesion_scrfd)
        except Exception as exc:
            print(f"[aviso] SCRFD falló ({exc}); pruebo el siguiente detector", file=sys.stderr)
            rostros = []
        if rostros:
            rostros.sort(
                key=lambda r: (r["caja"][2] - r["caja"][0]) * (r["caja"][3] - r["caja"][1]),
                reverse=True,
            )
            if not todas:
                rostros = rostros[:1]
            caras = []
            for r in rostros:
                try:
                    caras.append((alinear_arcface(img_np, r["landmarks"]), f"SCRFD alineado (conf {r['conf']:.2f})"))
                except Exception as exc:
                    x1, y1, x2, y2 = [max(0, int(v)) for v in r["caja"]]
                    x2, y2 = min(w, x2), min(h, y2)
                    tile = img_np[y1:y2, x1:x2] if x2 > x1 and y2 > y1 else img_np
                    caras.append((tile, f"SCRFD sin alinear (conf {r['conf']:.2f}) — {exc}"))
            return caras
        print("[aviso] SCRFD no detectó rostros; pruebo la foto completa", file=sys.stderr)

    if modelo_yolo:
        try:
            cajas = detectar_rostros_yolo(foto, modelo_yolo, yolo_conf)
        except Exception as exc:
            print(f"[aviso] YOLO falló ({exc}); uso la foto completa", file=sys.stderr)
            cajas = []
        if cajas:
            cajas.sort(key=lambda c: (c[2] - c[0]) * (c[3] - c[1]), reverse=True)
            if not todas:
                cajas = cajas[:1]
            caras = []
            for c in cajas:
                x, y, tam = cuadrar_y_centrar(w, h, c)
                caras.append((img_np[y : y + tam, x : x + tam], f"YOLO sin alinear (conf {c[4]:.2f})"))
            return caras
        print("[aviso] YOLO no detectó rostros; uso la foto completa", file=sys.stderr)

    return [(img_np, "foto completa (sin alinear)")]


def a_tensor_arcface(arr: np.ndarray) -> np.ndarray:
    if arr.shape[:2] != (ARCFACE_ENTRADA, ARCFACE_ENTRADA):
        arr = cv2.resize(arr, (ARCFACE_ENTRADA, ARCFACE_ENTRADA), interpolation=cv2.INTER_AREA)
    tensor = np.transpose(arr.astype(np.float32), (2, 0, 1))
    tensor = (tensor - ARCFACE_MEDIA) / ARCFACE_DESVIACION
    return tensor[np.newaxis, ...]


def embedding_arcface(sesion, tensor: np.ndarray) -> list[float]:
    entrada = sesion.get_inputs()[0].name
    salida = sesion.get_outputs()[0].name
    vector = sesion.run([salida], {entrada: tensor})[0][0]
    v = np.asarray(vector, dtype=np.float64)
    norma = float(np.linalg.norm(v))
    if norma == 0:
        raise ValueError("el modelo devolvió un embedding de norma 0")
    return (v / norma).tolist()


def conectar():
    import psycopg2

    usar_ssl = os.getenv("DB_SSL", "false").strip().lower() in ("1", "true", "yes", "on")
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "AutopartesDB"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        sslmode="require" if usar_ssl else "prefer",
        connect_timeout=10,
    )


def cargar_rostros(conn):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, nombre, apellido, email, rol, embedding "
            "FROM users WHERE embedding IS NOT NULL AND activo = true"
        )
        rostros = []
        for id_usuario, nombre, apellido, email, rol, embedding in cur.fetchall():
            emb = list(embedding or [])
            if len(emb) != ARCFACE_DIMENSION:
                print(
                    f"[aviso] user {id_usuario} tiene embedding de {len(emb)} dims; se ignora",
                    file=sys.stderr,
                )
                continue
            rostros.append(
                {
                    "id": id_usuario,
                    "nombre": nombre,
                    "apellido": apellido or "",
                    "email": email,
                    "rol": rol,
                    "embedding": emb,
                }
            )
        return rostros


def similitud(a: list[float], b: list[float]) -> float:
    return float(sum(x * y for x, y in zip(a, b)))


def reconocer(
    sesion_arcface,
    foto: Path,
    sesion_scrfd,
    modelo_yolo: str | None,
    yolo_conf: float,
    umbral: float,
    recorte_manual,
    rostros,
    todas: bool,
) -> bool:
    img_np = abrir_imagen_np(foto)
    h, w = img_np.shape[:2]
    print(f"\n== {foto.name} ({w}x{h}) ==")
    caras = obtener_caras(img_np, foto, sesion_scrfd, modelo_yolo, yolo_conf, recorte_manual, todas)
    reconocido = False

    for i, (cara, etiqueta) in enumerate(caras):
        if len(caras) > 1:
            print(f"   [face {i + 1} — {etiqueta}]")
        emb = embedding_arcface(sesion_arcface, a_tensor_arcface(cara))
        emparejados = sorted(
            ((similitud(emb, r["embedding"]), r) for r in rostros),
            key=lambda p: p[0],
            reverse=True,
        )
        s, mejor = emparejados[0]
        nombre = f"{mejor['nombre']} {mejor['apellido']}".strip()
        if s >= umbral:
            reconocido = True
            print(f"   Reconocido: {nombre} ({mejor['email']}) — similitud {s:.4f} (umbral {umbral:.2f})")
        else:
            print(
                f"   Usuario no registrado — mejor similitud {s:.4f} con {nombre} "
                f"< umbral {umbral:.2f}"
            )
            for s2, r2 in emparejados[1:4]:
                n2 = f"{r2['nombre']} {r2['apellido']}".strip()
                print(f"      próximo: {n2} ({r2['email']}) — {s2:.4f}")
    return reconocido


def registrar_rostro(
    conn,
    sesion_arcface,
    sesion_scrfd,
    usuario_id: int,
    fotos: list[Path],
    modelo_yolo: str | None,
    yolo_conf: float,
    todas: bool,
) -> None:
    from psycopg2.extras import Json

    with conn.cursor() as cur:
        cur.execute("SELECT id, nombre, apellido FROM users WHERE id = %s AND activo = true", (usuario_id,))
        fila = cur.fetchone()
        if not fila:
            sys.exit(f"Usuario {usuario_id} no existe o está inactivo")
        id_usuario, nombre, apellido = fila

        embeddings = []
        for foto in fotos:
            img_np = abrir_imagen_np(foto)
            caras = obtener_caras(img_np, foto, sesion_scrfd, modelo_yolo, yolo_conf, None, todas)
            cara, etiqueta = caras[0]
            emb = embedding_arcface(sesion_arcface, a_tensor_arcface(cara))
            embeddings.append(emb)
            print(f"   {foto.name}: {etiqueta} → embedding")
        if not embeddings:
            sys.exit("No se pudo calcular ningún embedding")

        promedio = np.mean(np.asarray(embeddings), axis=0)
        norma = float(np.linalg.norm(promedio))
        if norma == 0:
            sys.exit("El embedding promedio tiene norma 0")
        promedio = (promedio / norma).tolist()

        cur.execute(
            "UPDATE users SET embedding = %s, faceRegisteredAt = NOW() WHERE id = %s",
            (Json(promedio), id_usuario),
        )
        conn.commit()
        print(f"Registrado: {nombre} {apellido or ''} (id {id_usuario}) — "
              f"{len(embeddings)} fotos, embedding 512d normalizado con alineación.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reconocimiento facial SCRFD (alineación) + ArcFace contra users.embedding"
    )
    parser.add_argument("foto", nargs="*", type=Path, help="foto(s) o directorios para consulta")
    parser.add_argument("--registrar", type=int, metavar="USUARIO_ID", help="recalcular el embedding de ese usuario con las fotos dadas")
    parser.add_argument("--modelo-arcface", type=Path, default=BASE / "spike" / "models" / "arcfaceresnet100-11-int8.onnx")
    parser.add_argument("--modelo-scrfd", type=Path, default=BASE / "spike" / "models" / "scrfd_2.5g_bnkps.onnx", help="detector + landmarks (alineación); si no existe, se avisa y se usa YOLO/foto completa")
    parser.add_argument("--modelo-yolo", default=None, help="pesos YOLO de detección (fallback sin alinear, requiere ultralytics)")
    parser.add_argument("--yolo-conf", type=float, default=0.25)
    parser.add_argument("--umbral", type=float, default=None, help="similitud mínima (default: 0.8 o UMBRAL_CONFIANZA_FACIAL)")
    parser.add_argument("--x", "--crop-x", type=int, dest="x")
    parser.add_argument("--y", "--crop-y", type=int, dest="y")
    parser.add_argument("--tamano", type=int)
    parser.add_argument("--todas", action="store_true", help="evaluar todos los rostros detectados, no solo el más grande")
    args = parser.parse_args()

    cargar_env()
    umbral = args.umbral if args.umbral is not None else umbral_por_defecto()
    modelo_arcface = args.modelo_arcface
    if not modelo_arcface.is_file():
        sys.exit(
            f"Modelo ArcFace no encontrado en {modelo_arcface}. Bajalo con "
            "`node scripts/ensure-arcface-model.mjs` (backend/) o ponelo a mano en ese path."
        )

    modelo_scrfd = None
    if args.modelo_scrfd.is_file():
        modelo_scrfd = str(args.modelo_scrfd)
    else:
        print(f"[aviso] SCRFD no encontrado en {args.modelo_scrfd}: sin alineación la precisión cae", file=sys.stderr)

    try:
        import onnxruntime as ort

        sesion_arcface = ort.InferenceSession(str(modelo_arcface), providers=["CPUExecutionProvider"])
        sesion_scrfd = ort.InferenceSession(modelo_scrfd, providers=["CPUExecutionProvider"]) if modelo_scrfd else None
    except ImportError as exc:
        sys.exit(f"Faltan dependencias: {exc}. Corré `pip install -r requirements.txt`")

    recorte_manual = (args.x, args.y, args.tamano) if None not in (args.x, args.y, args.tamano) else None

    try:
        conn = conectar()
    except Exception as exc:
        sys.exit(f"No se pudo conectar a la BD: {exc}")

    fotos: list[Path] = []
    for p in args.foto:
        if p.is_dir():
            fotos.extend(sorted(p.glob("*.jpg")) + sorted(p.glob("*.jpeg")) + sorted(p.glob("*.png")))
        elif p.is_file():
            fotos.append(p)
        else:
            print(f"[aviso] no existe: {p}", file=sys.stderr)
    if not fotos:
        sys.exit("No se encontraron fotos para evaluar.")

    if args.registrar is not None:
        print(f"Registro facial (alineado) de user {args.registrar} — {len(fotos)} fotos")
        registrar_rostro(conn, sesion_arcface, sesion_scrfd, args.registrar, fotos, args.modelo_yolo, args.yolo_conf, args.todas)
        conn.close()
        return 0

    rostros = cargar_rostros(conn)
    conn.close()
    print(f"Umbral: {umbral:.2f} · ArcFace: {modelo_arcface.name} · SCRFD: {Path(modelo_scrfd).name if modelo_scrfd else 'ausente'} · rostros en la BD: {len(rostros)}")

    if not rostros:
        print("Usuario no registrado: aún no hay nadie con rostro registrado en la BD.")
        return 1

    reconocio_alguno = any(
        reconocer(sesion_arcface, f, sesion_scrfd, args.modelo_yolo, args.yolo_conf, umbral, recorte_manual, rostros, args.todas)
        for f in fotos
    )
    return 0 if reconocio_alguno else 1


if __name__ == "__main__":
    sys.exit(main())