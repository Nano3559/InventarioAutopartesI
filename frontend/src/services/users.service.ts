import { api } from '../api/client';
import type { UserItem, CreateUserDto, UpdateUserDto } from '../types/user.types';

export const usersService = {
  /** Lista todos los usuarios de la base de datos */
  async getUsers(): Promise<UserItem[]> {
    const data = await api.get<UserItem[]>('/users');
    return Array.isArray(data) ? data : [];
  },

  /** Lista el personal con rostros registrados (incluye fotoUrl firmada del bucket faces) */
  async getUsersWithFaces(): Promise<UserItem[]> {
    const data = await api.get<UserItem[]>('/users/rostros');
    return Array.isArray(data) ? data : [];
  },

  /** Crea un nuevo usuario en el sistema */
  async createUser(dto: CreateUserDto): Promise<UserItem> {
    return api.post<UserItem>('/users', dto);
  },

  /** Actualiza datos de un usuario */
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserItem> {
    return api.patch<UserItem>(`/users/${id}`, dto);
  },

  /** Elimina un usuario */
  async deleteUser(id: number): Promise<{ ok: boolean }> {
    return api.delete<{ ok: boolean }>(`/users/${id}`);
  },

  /**
   * Ejerce el derecho de supresión de datos biométricos (Ley 26935 Bolivia):
   * Borra el embedding, la foto del bucket privado y quita al usuario del índice de IA.
   */
  async eliminarDatosFaciales(id: number): Promise<UserItem> {
    return api.patch<UserItem>(`/users/${id}`, { eliminarEmbedding: true });
  },

  /** Alterna el estado activo/inactivo de una cuenta */
  async toggleActivo(id: number, activoActual: boolean): Promise<UserItem> {
    return api.patch<UserItem>(`/users/${id}`, { activo: !activoActual });
  },
};
