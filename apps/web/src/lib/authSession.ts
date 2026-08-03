import { store } from "@/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

/** Clears the server-side session so the next login on this device does not conflict. */
export async function revokeServerSession(): Promise<void> {
  const token = store.getState().auth.token;
  if (!token) return;

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Best effort — local logout still proceeds.
  }
}
