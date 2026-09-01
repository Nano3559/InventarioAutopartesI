# Guía de Despliegue — AutoPartes Pro (Móvil)

## Prerrequisitos

- Node.js instalado
- Cuenta en [expo.dev](https://expo.dev)
- Cuenta en [Google Play Console](https://play.google.com/console) (para subir a tienda)
- Brian ya desplegó el backend en Render y te dio la URL

---

## 1. Instalar EAS CLI

```bash
npm install -g eas-cli
```

## 2. Login en Expo

```bash
cd mobile
eas login
```

## 3. Configurar el proyecto (solo la primera vez)

```bash
eas build:configure
```

> Esto genera el archivo `eas.json` si no existe. Ya lo creamos manualmente, así que solo verificar que esté correcto.

## 4. Crear variable de entorno del backend

Reemplazá `https://TU-BACKEND.onrender.com` con la URL real que te dio Brian:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value "https://TU-BACKEND.onrender.com"
```

Para verificar que se creó:
```bash
eas secret:list
```

## 5. Build de prueba (APK)

```bash
eas build --platform android --profile preview
```

Esto genera un APK que podés instalar directamente en tu celular para probar.

Para descargar el APK, EAS te da un link cuando termine el build.

## 6. Build de producción (AAB para Google Play)

```bash
eas build --platform android --profile production -- --aab
```

## 7. Subir a Google Play

### Opción A — Automática
```bash
eas submit --platform android
```
> Requiere configurar credenciales de Google Play en EAS. Sigue las instrucciones que te da el comando.

### Opción B — Manual
1. Descargá el `.aab` desde el link que te da EAS
2. Andá a [Google Play Console](https://play.google.com/console)
3. Creá una app nueva o usá una existente
4. Subí el `.aab` en internal testing o producción

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL del backend NestJS | `https://backend-autopartes.onrender.com` |

> Esta variable se inyecta en el build, no queda en el código fuente.

---

## Comandos útiles

```bash
# Ver builds activos
eas build:list

# Verificar configuración
eas build:inspect --platform android --profile production

# Limpiar builds antiguos
eas build:cancel <BUILD_ID>

# Ver secrets
eas secret:list
```

---

## Troubleshooting

### "No se pudo conectar con el servidor"
- Verificá que `EXPO_PUBLIC_API_URL` esté bien configurado
- Pedile a Brian que verifique que el backend esté corriendo en Render
- Render Free se duerme después de 15 min de inactividad, puede tardar ~30s en despertar

### Build falla con error de dependencias
```bash
cd mobile
rm -rf node_modules
npm install
eas build --platform android --profile production
```

### "usesCleartextTraffic" warning en Android
Esto es normal en desarrollo. En producción con HTTPS no afecta.
