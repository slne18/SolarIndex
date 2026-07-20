import { onboardingPathForNext } from "@/lib/auth-redirect";

/** Redirige vers l'onboarding si le profil n'est pas complété. Retourne false si redirection. */
export async function ensureProfileComplete(nextPath: string, token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return true;
    const data = await res.json();
    if (data.profile_completed) return true;
    window.location.href = onboardingPathForNext(nextPath);
    return false;
  } catch {
    return true;
  }
}
