"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RfpLegalNotice from "@/components/RfpLegalNotice";
import { getAccessToken } from "@/lib/supabaseBrowser";
import {
  RFP_DEPOSANT_CHECKLIST,
  RFP_DEPOSANT_DECLARATIONS,
  RFP_PUBLIC_ENTITY_BLOCK_MESSAGE,
  type RfpDeposantChecklistId,
  rfpPublicEntityMailto,
} from "@/lib/rfp-legal";

async function lookupSiret(siret: string) {
  const res = await fetch(`/api/siret?siret=${encodeURIComponent(siret)}`);
  return res.json();
}

type PublicEntityAnswer = "" | "non" | "oui";

function NouveauRfpForm() {
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState("");
  const [siret, setSiret] = useState("");
  const [adresse, setAdresse] = useState("");
  const [surfaceEstimee, setSurfaceEstimee] = useState("");
  const [derogPente, setDerogPente] = useState(false);
  const [derogAbf, setDerogAbf] = useState(false);
  const [notesParticulieres, setNotesParticulieres] = useState("");
  const [estPersonnePublique, setEstPersonnePublique] = useState<PublicEntityAnswer>("");
  const [checklist, setChecklist] = useState<Record<RfpDeposantChecklistId, boolean>>({
    comparer_devis: false,
    qualifications: false,
    urbanisme: false,
    aper: false,
    concession: false,
  });
  const [declarations, setDeclarations] = useState({
    acceptation_non_marche_public: false,
    acceptation_mise_en_relation: false,
    acceptation_multi_installateurs: false,
    acceptation_exactitude: false,
    acceptation_sans_garantie: false,
    acceptation_cgv_deposant: false,
    consentement_rgpd: false,
  });

  const blockedPublic = estPersonnePublique === "oui";

  const allLegalChecked = useMemo(() => {
    if (blockedPublic) return false;
    const checklistOk = RFP_DEPOSANT_CHECKLIST.every((item) => checklist[item.id]);
    const declarationsOk = Object.values(declarations).every(Boolean);
    return checklistOk && declarationsOk && estPersonnePublique === "non";
  }, [blockedPublic, checklist, declarations, estPersonnePublique]);

  useEffect(() => {
    if (sp.get("verified") === "1") {
      setMsg("Email confirmé — votre demande est en file de modération (publication sous 48 h).");
    } else if (sp.get("error")) {
      setMsg("Lien de confirmation invalide ou expiré.");
    }
    const qAdresse = sp.get("adresse");
    if (qAdresse) setAdresse(qAdresse);
    const qSurface = sp.get("surface_estimee_m2");
    if (qSurface) setSurfaceEstimee(qSurface);
    const qNotes = sp.get("notes_particulieres");
    if (qNotes) setNotesParticulieres(qNotes);
    if (sp.get("derogation_pente") === "1") setDerogPente(true);
    if (sp.get("derogation_abf") === "1") setDerogAbf(true);
  }, [sp]);

  async function onSiretBlur() {
    if (siret.replace(/\s/g, "").length < 14) return;
    const data = await lookupSiret(siret);
    if (data.ok && data.entreprise) setEntreprise(data.entreprise);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (blockedPublic || !allLegalChecked) {
      setMsg("Veuillez compléter toutes les déclarations ou corriger votre statut.");
      return;
    }

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
      est_personne_publique: false,
      ...declarations,
      checklist,
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
      setEstPersonnePublique("");
      setChecklist({
        comparer_devis: false,
        qualifications: false,
        urbanisme: false,
        aper: false,
        concession: false,
      });
      setDeclarations({
        acceptation_non_marche_public: false,
        acceptation_mise_en_relation: false,
        acceptation_multi_installateurs: false,
        acceptation_exactitude: false,
        acceptation_sans_garantie: false,
        acceptation_cgv_deposant: false,
        consentement_rgpd: false,
      });
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <RfpLegalNotice variant="deposant" />

      <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-6 text-sm">
        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
            Statut de votre structure *
          </legend>
          <p className="text-xs leading-relaxed text-slate-400">
            Collectivité, hôpital public, université, office HLM, établissement public, etc.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="est_personne_publique"
              required
              className="mt-1"
              checked={estPersonnePublique === "non"}
              onChange={() => setEstPersonnePublique("non")}
            />
            <span>Non — acteur privé (entreprise, foncière, centre commercial, syndic pro…)</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="est_personne_publique"
              required
              className="mt-1"
              checked={estPersonnePublique === "oui"}
              onChange={() => setEstPersonnePublique("oui")}
            />
            <span>Oui — personne publique ou établissement soumis au Code de la commande publique</span>
          </label>
          {blockedPublic ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
              <p className="font-semibold text-red-100">Dépôt non disponible pour les personnes publiques</p>
              <p className="mt-2">{RFP_PUBLIC_ENTITY_BLOCK_MESSAGE}</p>
              <p className="mt-2">
                <a href={rfpPublicEntityMailto()} className="text-solar underline">
                  Nous contacter
                </a>
              </p>
            </div>
          ) : null}
        </fieldset>

        <Field label="SIRET (14 chiffres)" required>
          <input
            name="siret"
            required
            disabled={blockedPublic}
            className="input"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            onBlur={onSiretBlur}
            placeholder="44306184100047"
          />
        </Field>
        <Field label="Entreprise (auto SIREN)">
          <input className="input" value={entreprise} readOnly placeholder="Raison sociale" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du contact" required>
            <input name="contact_nom" required disabled={blockedPublic} className="input" />
          </Field>
          <Field label="Fonction">
            <input name="contact_fonction" disabled={blockedPublic} className="input" placeholder="Directeur site" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required>
            <input name="contact_email" type="email" required disabled={blockedPublic} className="input" />
          </Field>
          <Field label="Téléphone" required>
            <input name="contact_telephone" required disabled={blockedPublic} className="input" />
          </Field>
        </div>
        <Field label="Adresse du parking" required>
          <input
            name="adresse"
            required
            disabled={blockedPublic}
            className="input"
            placeholder="Adresse complète"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
          />
        </Field>
        <Field label="Surface estimée (m²)">
          <input
            name="surface_estimee_m2"
            type="number"
            min={1500}
            disabled={blockedPublic}
            className="input"
            value={surfaceEstimee}
            onChange={(e) => setSurfaceEstimee(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="deja_equipe_partiel" disabled={blockedPublic} /> Parking déjà équipé
          partiellement
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="derogation_pente"
            disabled={blockedPublic}
            checked={derogPente}
            onChange={(e) => setDerogPente(e.target.checked)}
          />{" "}
          Terrain en pente / dérogation possible
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="derogation_abf"
            disabled={blockedPublic}
            checked={derogAbf}
            onChange={(e) => setDerogAbf(e.target.checked)}
          />{" "}
          Zone ABF / contrainte patrimoniale
        </label>
        <Field label="Budget indicatif (optionnel)">
          <input name="budget_indicatif" disabled={blockedPublic} className="input" placeholder="Ex. 800 k€ – 1,2 M€" />
        </Field>
        <Field label="Délai souhaité">
          <input name="delai_souhaite" disabled={blockedPublic} className="input" placeholder="Ex. Mise en service 2027" />
        </Field>
        <Field label="Particularités">
          <textarea
            name="notes_particulieres"
            rows={3}
            disabled={blockedPublic}
            className="input"
            value={notesParticulieres}
            onChange={(e) => setNotesParticulieres(e.target.value)}
          />
        </Field>

        {!blockedPublic ? (
          <>
            <fieldset className="space-y-3 rounded-lg border border-white/10 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Checklist déposant *
              </legend>
              <p className="text-xs text-slate-500">
                Bonnes pratiques avant de recevoir des propositions d&apos;installateurs.
              </p>
              {RFP_DEPOSANT_CHECKLIST.map((item) => (
                <label key={item.id} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 shrink-0"
                    checked={checklist[item.id]}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border border-white/10 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Déclarations et consentements *
              </legend>
              {Object.values(RFP_DEPOSANT_DECLARATIONS).map((item) => (
                <label key={item.id} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 shrink-0"
                    checked={declarations[item.id as keyof typeof declarations]}
                    onChange={(e) =>
                      setDeclarations((prev) => ({
                        ...prev,
                        [item.id]: e.target.checked,
                      }))
                    }
                  />
                  {item.id === "acceptation_cgv_deposant" ? (
                    <>
                      J&apos;ai lu et j&apos;accepte les{" "}
                      <Link href="/legal/cgv#rfp-deposants" className="text-solar underline" target="_blank">
                        conditions applicables aux dépôts de projets (CGV §6)
                      </Link>
                      .
                    </>
                  ) : item.id === "consentement_rgpd" ? (
                    <>
                      J&apos;accepte que mes coordonnées professionnelles soient communiquées aux installateurs
                      solaires qui achètent l&apos;accès à cette demande, conformément à la{" "}
                      <Link href="/legal/confidentialite" className="text-solar underline" target="_blank">
                        Politique de confidentialité
                      </Link>
                      .
                    </>
                  ) : (
                    item.label
                  )}
                </label>
              ))}
            </fieldset>
          </>
        ) : null}

        <button
          type="submit"
          disabled={loading || blockedPublic || !allLegalChecked}
          className="btn-solar w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Envoi…" : "Soumettre ma demande de consultation"}
        </button>
      </form>
      {msg ? (
        <p className={`mt-4 text-sm ${msg.includes("Échec") || msg.includes("invalid") ? "text-red-400" : "text-solar-400"}`}>
          {msg}
        </p>
      ) : null}
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
      <p className="pill mt-3 w-fit border-white/10 bg-white/[0.04] text-slate-300">Compte requis · acteurs privés</p>
      <h1 className="mt-3 text-3xl font-bold">Déposer un projet parking</h1>
      <p className="mt-2 text-slate-400">
        Consultation installateurs solaires — mise en relation commerciale privée, hors marchés publics.
        Après vérification email et modération, des installateurs professionnels pourront acheter l&apos;accès à
        vos coordonnées pour vous proposer un devis.
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
          ← Consultation installateurs
        </Link>
        <div className="mx-auto mt-6 max-w-2xl">
          <NouveauRfpPageContent />
        </div>
      </div>
    </div>
  );
}
