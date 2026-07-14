"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/supabaseBrowser";

interface SampleStatus {
  needsOnboarding: boolean;
  departementLock: string | null;
  sampleRemaining: number;
  sampleDepartement: string | null;
  subscriptionActive: boolean;
}

export default function SampleBanner() {
  const [status, setStatus] = useState<SampleStatus | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/sample", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStatus(await res.json());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (!status) return null;

  if (status.needsOnboarding) return null;

  if (status.subscriptionActive) return null;

  if (status.sampleRemaining > 0 && status.departementLock) {
    return (
      <div className="card mb-6 border-solar/30 bg-solar/5 p-4 text-sm text-slate-300">
        <strong className="text-solar">Échantillon gratuit</strong>
        {" — "}
        département <strong className="text-white">{status.departementLock}</strong>
        {" · "}
        <strong className="text-white">{status.sampleRemaining}</strong> lead
        {status.sampleRemaining > 1 ? "s" : ""} offert{status.sampleRemaining > 1 ? "s" : ""} restant
        {status.sampleRemaining > 1 ? "s" : ""}. Contacts masqués jusqu&apos;à la rédemption.
      </div>
    );
  }

  if (status.sampleRemaining === 0 && status.sampleDepartement) {
    return (
      <div className="card mb-6 border-white/10 p-4 text-sm text-slate-400">
        Échantillon utilisé — catalogue France entière. Les prochains leads sont payants ou via{" "}
        <a href="/pack-territoire" className="text-solar underline">Pack Territoire</a>.
      </div>
    );
  }

  return null;
}
