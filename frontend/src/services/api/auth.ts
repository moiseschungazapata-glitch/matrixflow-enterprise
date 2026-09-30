import axios from "axios";
import type { Role } from "../../types";
import { apiClient } from "./client";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface IdentityProfile {
  name: string;
  maskedDni: string;
  nationality: string;
  role: Role;
}

interface LoginResponse {
  accessToken: string;
  tokenType: "bearer";
  user: AuthenticatedUser;
}

interface ApiValidationIssue {
  msg?: string;
}

interface ApiErrorResponse {
  detail?: string | ApiValidationIssue[];
}

export async function authenticate(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function identifyByDni(dni: string): Promise<IdentityProfile> {
  const response = await apiClient.post<IdentityProfile>("/auth/identify", { dni });
  return response.data;
}

export function getIdentificationErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "No se pudo consultar el DNI.";
  }

  if (!error.response) {
    return "No se pudo conectar con el servidor. Inténtalo nuevamente.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) => issue.msg)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join(" ");
  }

  return "No se encontró una cuenta activa con ese DNI.";
}

export function getAuthenticationErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "No se pudo iniciar sesión.";
  }

  if (!error.response) {
    return "No se pudo conectar con el servidor. Verifica que el backend esté encendido.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) => issue.msg)
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join(" ");
  }

  return "No se pudo iniciar sesión.";
}
