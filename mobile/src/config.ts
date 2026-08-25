const DEFAULT_API_URL = 'http://localhost:3000/api';

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
};