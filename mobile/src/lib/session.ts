import * as SecureStore from "expo-secure-store";
import type { Session } from "./api";

const SESSION_KEY = "cropcare_session";

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);

  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    if (
      typeof parsed?.token !== "string" ||
      typeof parsed?.user?.id !== "string" ||
      typeof parsed?.user?.name !== "string" ||
      typeof parsed?.user?.email !== "string" ||
      !["farmer", "officer"].includes(parsed?.user?.role)
    ) {
      throw new Error("Invalid saved session");
    }

    return parsed as Session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
