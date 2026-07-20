import { onboardingPathForNext } from "@/lib/auth-redirect";

/** Redirige vers l'onboarding si le profil n'est pas complété. Retourne false si redirection. */
export async function ensureProfileComplete(nextPath: string, token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return true;
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.profile_completed) {
      window.location.href = onboardingPathForNext(nextPath);
      return false;
    }
    return true;
  } catch {
    window.location.href = onboardingPathForNext(nextPath);
    return false;
  }
}
