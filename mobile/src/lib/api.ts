import * as SecureStore from "expo-secure-store";
import { fetch } from "expo/fetch";
import type { Report } from "../../../shared/report";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "farmer" | "officer";
};

export type Session = { token: string; user: User };

function normalizeBase(value: string) {
  return value.trim().replace(/\/$/, "").replace(/\/api$/i, "");
}

let configured = normalizeBase(process.env.EXPO_PUBLIC_API_URL ?? "");

export const apiBase = () => normalizeBase(configured);

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function loadAPIAddress() {
  const saved = await SecureStore.getItemAsync("cropcare_api_address");
  if (saved) configured = normalizeBase(saved);
}

export async function setAPIAddress(value: string) {
  const u = new URL(value.trim());
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash
  )
    throw new Error("Enter an http or https backend address.");
  const address = normalizeBase(value);
  await SecureStore.setItemAsync("cropcare_api_address", address);
  configured = address;
}

export async function request<T>(
  route: string,
  token?: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  if (!apiBase())
    throw new APIError("Set your backend address in Connection settings.", 0);
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiBase() + route, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });
    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new APIError(
        "The backend returned an unexpected response.",
        response.status,
      );
    }
    if (!response.ok)
      throw new APIError(data.message ?? "Request failed.", response.status);
    return data as T;
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError(
      controller.signal.aborted
        ? "Connection timed out. Your saved reports can retry safely."
        : "Cannot reach the backend. Check its address and your connection.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const login = (email: string, password: string) =>
  request<Session>("/api/auth/login", undefined, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });

export const getCurrentUser = async (token: string) =>
  (await request<{ user: User }>("/api/auth/me", token)).user;

export const getReports = async (token: string) =>
  (await request<{ reports: Report[] }>("/api/reports", token)).reports;

export const getReportCount = async (token: string) =>
  (await getReports(token)).length;

export const imageSource = (id: string, token: string, original = false) => ({
  uri: `${apiBase()}/api/reports/${encodeURIComponent(id)}/${original ? "original" : "image"}`,
  headers: { Authorization: `Bearer ${token}` },
});

export const register = (
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
) =>
  request<Session>("/api/auth/register", undefined, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
      passwordConfirmation,
    }),
  });