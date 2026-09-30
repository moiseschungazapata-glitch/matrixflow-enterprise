import axios from "axios";
import type { Role, UserRecord } from "../../types";
import { apiClient } from "./client";

type UserStatus = UserRecord["status"];

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: UserStatus;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  status?: UserStatus;
}

interface ApiValidationIssue {
  msg?: string;
}

interface ApiErrorResponse {
  detail?: string | ApiValidationIssue[];
}

export async function listUsers(): Promise<UserRecord[]> {
  const response = await apiClient.get<UserRecord[]>("/users", {
    params: { offset: 0, limit: 500 },
  });
  return response.data;
}

export async function createUser(data: CreateUserInput): Promise<UserRecord> {
  const response = await apiClient.post<UserRecord>("/users", data);
  return response.data;
}

export async function updateUser(userId: number, data: UpdateUserInput): Promise<UserRecord> {
  const response = await apiClient.patch<UserRecord>(`/users/${userId}`, data);
  return response.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}

export function getUserApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "No se pudo completar la operación con el usuario.";
  }

  if (!error.response) {
    return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
  }

  if (error.response.status === 401) {
    return "Tu sesión expiró. Cierra sesión y vuelve a ingresar.";
  }

  if (error.response.status === 403) {
    return "Solo un administrador puede gestionar usuarios.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) => issue.msg)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join(" ");
  }

  return "No se pudo completar la operación con el usuario.";
}
