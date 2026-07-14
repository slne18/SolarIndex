"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";

async function lookupSiret(siret: string) {
  const res = await fetch(`/api/siret?siret=${encodeURIComponent(siret)}`);
  return res.json();
}

function NouveauRfpForm() {
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState("");
  const [siret, setSiret] = useState("");

  useEffect(() => {
    if (sp.get("verified") === "1") {
      setMsg("Email confirmé — votre demande est en file de modération (publication sous 48 h).");
    } else if (sp.get("error")) {
      setMsg("Lien de confirmation invalide ou expiré.");
    }
  }, [sp]);

  async function onSiretBlur() {
    if (siret.replace(/\s/g, "").length < 14) return;
    const data = await lookupSiret(siret);
    if (data.ok && data.entreprise) setEntreprise(data.entreprise);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const token = await getAccessToken();
    if (!token) {
      window.location.href = "/login?mode=signup&next=/appels-offres/nouveau";
      return;
    }

    const fd = new FormData(e.currentTarget);
    const body = {
      entreprise,
      siret: fd.get("siret"),
      contact_nom: fd.get("contact_nom"),
      contact_fonction: fd.get("contact_fonction"),
      contact_email: fd.get("contact_email"),
      contact_telephone: fd.get("contact_telephone"),
      adresse: fd.get("adresse"),
      surface_estimee_m2: Number(fd.get("surface_estimee_m2")) || undefined,
      deja_equipe_partiel: fd.get("deja_equipe_partiel") === "on",
      derogation_pente: fd.get("derogation_pente") === "on",
      derogation_abf: fd.get("derogation_abf") === "on",
      budget_indicatif: fd.get("budget_indicatif"),
      delai_souhaite: fd.get("delai_souhaite"),
      notes_particulieres: fd.get("notes_particulieres"),
      consentement_rgpd: fd.get("consentement_rgpd") === "on",
    };

    try {
      const res = await fetch("/api/rfp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/login?mode=signup&next=/appels-offres/nouveau";
        return;
      }
      if (!res.ok) {
        setMsg(data.error || "Échec envoi.");
        return;
      }
      setMsg(
        data.verify_url_dev
          ? `${data.message} (dev: ${data.verify_url_dev})`
          : data.message,
      );
      e.currentTarget.reset();
      setEntreprise("");
      setSiret("");
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="card mt-8 space-y-5 p-6 text-sm">
        <Field label="SIRET (14 chiffres)" required>
          <input
            name="siret"
            required
            className="input"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            onBlur={onSiretBlur}
            placeholder="44306184100047"
          />
        </Field>
        <Field label="Entreprise (auto SIRENE)">
          <input className="input" value={entreprise} readOnly placeholder="Raison sociale" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du contact" required>
            <input name="contact_nom" required className="input" />
          </Field>
          <Field label="Fonction">
            <input name="contact_fonction" className="input" placeholder="Directeur site" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required>
            <input name="contact_email" type="email" required className="input" />
          </Field>
          <Field label="Téléphone" required>
            <input name="contact_telephone" required className="input" />
          </Field>
        </div>
        <Field label="Adresse du parking" required>
          <input name="adresse" required className="input" placeholder="Adresse complète" />
        </Field>
        <Field label="Surface estimée (m²)">
          <input name="surface_estimee_m2" type="number" min={1500} className="input" />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="deja_equipe_partiel" /> Parking déjà équipé partiellement
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="derogation_pente" /> Terrain en pente / dérogation possible
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="derogation_abf" /> Zone ABF / contrainte patrimoniale
        </label>
        <Field label="Budget indicatif (optionnel)">
          <input name="budget_indicatif" className="input" placeholder="Ex. 800 k€ – 1,2 M€" />
        </Field>
        <Field label="Délai souhaité">
          <input name="delai_souhaite" className="input" placeholder="Ex. Mise en service 2027" />
        </Field>
        <Field label="Particularités">
          <textarea name="notes_particulieres" rows={3} className="input" />
        </Field>
        <label className="flex gap-2 text-xs text-slate-400">
          <input type="checkbox" name="consentement_rgpd" required className="mt-1" />
          J&apos;accepte que mes coordonnées soient communiquées aux installateurs solaires qui achèteront
          l&apos;accès à cette demande.
        </label>
        <button type="submit" disabled={loading} className="btn-solar w-full">
          {loading ? "Envoi…" : "Soumettre l'appel d'offres"}
        </button>
      </form>
      {msg ? <p className="mt-4 text-sm text-solar-400">{msg}</p> : null}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function NouveauRfpPageContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = "/login?mode=signup&next=/appels-offres/nouveau";
        return;
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <p className="mt-8 text-slate-400">Vérification du compte…</p>;
  }

  return (
    <>
      <p className="pill mt-3 w-fit border-white/10 bg-white/[0.04] text-slate-300">Compte requis</p>
      <h1 className="mt-3 text-3xl font-bold">Soumettre un appel d&apos;offres</h1>
      <p className="mt-2 text-slate-400">
        Déposez votre projet parking. Après vérification email et modération, les installateurs pourront
        acheter l&apos;accès à vos coordonnées.
      </p>
      <Suspense fallback={<p className="mt-8 text-slate-400">Chargement…</p>}>
        <NouveauRfpForm />
      </Suspense>
    </>
  );
}

export default function NouveauRfpPage() {
  return (
    <div className="surface-light min-h-[50vh]">
      <div className="container-x py-10">
      <Link href="/appels-offres" className="back-link text-sm">
        ← Appels d&apos;offres
      </Link>
      <div className="mx-auto mt-6 max-w-2xl">
        <NouveauRfpPageContent />
      </div>
      </div>
    </div>
  );
}
