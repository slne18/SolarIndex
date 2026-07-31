import HomeChooserLink from "@/components/HomeChooserLink";
import type { ReactNode } from "react";

export default function LegalPageShell({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="surface-light min-h-[60vh] py-14 sm:py-20">
      <article className="container-x mx-auto max-w-3xl">
        <HomeChooserLink href="/" className="text-sm text-slate-500 transition hover:text-slate-800">
          ← Accueil
        </HomeChooserLink>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {updatedAt ? (
          <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {updatedAt}</p>
        ) : null}
        <div className="legal-prose mt-10">{children}</div>
      </article>
    </div>
  );
}
