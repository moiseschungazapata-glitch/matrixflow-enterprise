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
  faceEnrolled: boolean;
}

export interface AuthenticationSession {
  accessToken: string;
  tokenType: "bearer";
  user: AuthenticatedUser;
}

export interface FaceLivenessSession {
  verificationId: string;
  sessionId: string;
  region: string;
  expiresAt: string;
}

interface FaceLoginResponse extends AuthenticationSession {
  verified: true;
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
): Promise<AuthenticationSession> {
  const response = await apiClient.post<AuthenticationSession>("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function createFaceLivenessSession(
  dni: string,
): Promise<FaceLivenessSession> {
  const response = await apiClient.post<FaceLivenessSession>("/auth/face/sessions", { dni });
  return response.data;
}

export async function completeFaceLivenessSession(
  verificationId: string,
): Promise<FaceLoginResponse> {
  const response = await apiClient.post<FaceLoginResponse>(
    `/auth/face/sessions/${verificationId}/complete`,
  );
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

export function getFaceVerificationErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "No se pudo completar la verificación facial.";
  }

  if (!error.response) {
    return "No se pudo conectar con el servicio de verificación.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;

  return "La verificación facial no pudo completarse. Inicia un intento nuevo.";
}
