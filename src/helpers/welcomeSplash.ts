/**
 * Hand-off for the post-sign-in "Bienvenue <prénom>" splash, per role:
 * - client → `(auth)/loading` (Figma Loading-page_3), which then opens `returnTo`;
 * - prestataire → `(auth)/prestataire/loading` ("EBEN PARTNERS"), which then
 *   opens the dashboard.
 *
 * `login()` sets the session before its promise resolves, so the root layout
 * guard sees an authenticated user still on the sign-in route and would replace
 * to the app, skipping the splash. The sign-in screen arms this hand-off BEFORE
 * calling `login()`; whichever of the guard or the sign-in screen reacts first
 * claims the single redirect to the splash, the other one waits. The splash
 * disarms it when it mounts. A cold-open (restored) session never arms it, so it
 * never lands on the splash.
 */
import type { Href } from "expo-router";
import type { Role } from "@/context/AuthContext";

interface PendingWelcome {
  role: Role;
  splash: Href;
  redirected: boolean;
}

let pending: PendingWelcome | null = null;

/**
 * Sign-in screen, before `login()`: the next `role` session plays its splash.
 * `returnTo` is the client destination after the splash (client home by default).
 */
export function armWelcomeSplash(role: Role, returnTo?: Href): void {
  pending = { role, splash: welcomeSplashHref(role, returnTo), redirected: false };
}

/** True while an interactive sign-in (for `role`, or any role) is heading to (or waiting for) its splash. */
export function isWelcomeSplashArmed(role?: Role | "guest"): boolean {
  return pending !== null && (role === undefined || pending.role === role);
}

/**
 * Claims the one redirect to the splash: returns the splash route the first
 * time, null when nothing is armed or the redirect was already issued.
 */
export function claimWelcomeSplashRedirect(): Href | null {
  if (!pending || pending.redirected) return null;
  pending.redirected = true;
  return pending.splash;
}

/** Splash mounted, sign-in failed, or the user reached the app another way. */
export function disarmWelcomeSplash(): void {
  pending = null;
}

function welcomeSplashHref(role: Role, returnTo: Href | undefined): Href {
  if (role === "prestataire") return "/(auth)/prestataire/loading";
  return {
    pathname: "/(auth)/loading",
    params: { returnTo: String(returnTo ?? "/(client)") },
  } as Href;
}
