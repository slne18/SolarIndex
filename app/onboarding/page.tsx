"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabaseBrowser";

export default function OnboardingPage() {
  const router = useRouter();
  const [departement, setDepartement] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = "/login?next=/onboarding";
        return;
      }
      try {
        const res = await fetch("/api/sample", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.needsOnboarding && data.sampleDepartement) {
            router.replace(`/leads?departement=${data.sampleDepartement}`);
            return;
          }
          if (data.subscriptionActive) {
            router.replace("/leads");
            return;
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/sample/department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ departement }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Impossible d'enregistrer le département.");
        return;
      }
      router.replace(`/leads?departement=${data.departement}`);
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-x py-16 text-center text-slate-400">
        Chargement…
      </div>
    );
  }

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Accueil</Link>
        <div className="card mt-4 p-7">
          <h1 className="text-2xl font-bold tracking-tight">Votre échantillon gratuit</h1>
          <p className="mt-2 text-sm text-slate-400">
            Choisissez le département que vous souhaitez explorer. Vous recevrez{" "}
            <strong className="text-slate-200">1 lead offert</strong> dans ce département
            (contacts débloqués à la rédemption). Ce choix est définitif pour l&apos;échantillon.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                Département
              </span>
              <input
                required
                pattern="\d{2,3}"
                maxLength={3}
                value={departement}
                onChange={(e) => setDepartement(e.target.value.replace(/\D/g, ""))}
                className="input"
                placeholder="33"
              />
            </label>
            <button type="submit" disabled={submitting} className="btn-solar w-full">
              {submitting ? "…" : "Accéder au catalogue"}
            </button>
          </form>

          {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
