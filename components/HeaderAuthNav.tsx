"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient, getAccessToken } from "@/lib/supabaseBrowser";
import { MON_ESPACE_PATH } from "@/lib/paths";
import { useTranslations } from "@/components/LocaleProvider";

export default function HeaderAuthNav() {
  const t = useTranslations();
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

  if (authed === null) {
    return (
      <span className="nav-link hidden sm:inline-flex cursor-default opacity-40" aria-hidden>
        …
      </span>
    );
  }

  if (authed) {
    return (
      <Link href={MON_ESPACE_PATH} className="nav-link inline-flex font-medium text-slate-200">
        {t("header.mySpace")}
      </Link>
    );
  }

  return (
    <Link href={`/login?next=${encodeURIComponent(MON_ESPACE_PATH)}`} className="nav-link hidden sm:inline-flex">
      {t("header.signIn")}
    </Link>
  );
}
