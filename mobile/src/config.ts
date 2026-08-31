import { Platform } from 'react-native';

const DEFAULT_PORT = 3000;

function baseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  let host = 'localhost';
  if (Platform.OS === 'android') {
    // En el emulador Android, "localhost" apunta al propio dispositivo.
    // 10.0.2.2 es la dirección del host (la PC) desde el emulador.
    host = '10.0.2.2';
  }

  return `http://${host}:${DEFAULT_PORT}`;
}

export const config = {
  apiUrl: `${baseUrl()}/api`,
};
