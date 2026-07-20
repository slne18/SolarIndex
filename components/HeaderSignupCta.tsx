"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient, getAccessToken } from "@/lib/supabaseBrowser";

export default function HeaderSignupCta() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();

    (async () => {
      const token = await getAccessToken();
      setAuthed(!!token);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.access_token);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed !== false) return null;

  return (
    <Link href="/login?mode=signup&next=/leads" className="btn-solar shrink-0 !px-3.5 !py-2 text-xs sm:text-sm">
      Créer un espace
    </Link>
  );
}
