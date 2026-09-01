import { ApiClientError } from "@/api/types";
import { AuthRoleMismatchError } from "@/context/AuthContext";

/**
 * Maps a login failure to the i18n key its screen should show.
 * Shared by ClientLoginScreen and prestataire/sign-in — both catch the same
 * `login()` errors and previously duplicated this mapping inline.
 */
export function getLoginErrorKey(error: unknown, roleMismatchKey: string): string {
  if (error instanceof ApiClientError) {
    return error.status === 429 ? "auth.login.error429" : "auth.login.error";
  }
  if (error instanceof AuthRoleMismatchError) return roleMismatchKey;
  return "auth.error.generic";
}
