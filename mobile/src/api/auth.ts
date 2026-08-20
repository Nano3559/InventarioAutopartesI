import { request } from './client';
import type { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function me(token: string) {
  return request<User>('/auth/me', {}, token);
}