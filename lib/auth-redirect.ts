/** Après connexion : onboarding si profil incomplet, sinon destination demandée. */
export function onboardingPathForNext(next: string): string {
  const safeNext = next.startsWith("/") ? next : "/leads";
  if (safeNext.startsWith("/onboarding")) return safeNext;
  return `/onboarding?next=${encodeURIComponent(safeNext)}`;
}

export async function resolvePostAuthRedirect(
  token: string,
  requestedNext: string,
): Promise<string> {
  const safeNext = requestedNext.startsWith("/") ? requestedNext : "/leads";
  try {
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return safeNext;
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.profile_completed) {
      return onboardingPathForNext(safeNext);
    }
    return safeNext;
  } catch {
    return onboardingPathForNext(safeNext);
  }
}

export function authConfirmRedirectUrl(next: string): string {
  if (typeof window === "undefined") return "/auth/confirm";
  const origin = window.location.origin;
  const safeNext = next.startsWith("/") ? next : "/onboarding";
  return `${origin}/auth/confirm?next=${encodeURIComponent(safeNext)}`;
}
