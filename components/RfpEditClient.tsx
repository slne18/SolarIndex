"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { getAccessToken } from "@/lib/supabaseBrowser";
import { catalogAuthHeaders } from "@/lib/preview-catalog";
import type { OwnedRfp } from "@/lib/rfp";
import { RFP_OWNER_TYPE_LABELS, type RfpOwnerType } from "@/lib/rfp-official";
import { MON_ESPACE_PATH } from "@/lib/paths";

async function lookupSiret(siret: string) {
  const res = await fetch(`/api/siret?siret=${encodeURIComponent(siret)}`);
  return res.json();
}

export default function RfpEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [entreprise, setEntreprise] = useState("");
  const [siret, setSiret] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactFonction, setContactFonction] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelephone, setContactTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [surfaceEstimee, setSurfaceEstimee] = useState("");
  const [typeSolution, setTypeSolution] = useState<
    "pv_pur" | "mixte_pv_vegetal" | "vegetalisation_uniquement"
  >("pv_pur");
  const [dejaEquipe, setDejaEquipe] = useState(false);
  const [derogPente, setDerogPente] = useState(false);
  const [derogAbf, setDerogAbf] = useState(false);
  const [budget, setBudget] = useState("");
  const [delai, setDelai] = useState("");
  const [notes, setNotes] = useState("");
  const [aoPublie, setAoPublie] = useState(false);
  const [lienOfficiel, setLienOfficiel] = useState("");
  const [dateLimite, setDateLimite] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState("");
  const [typeProprietaire, setTypeProprietaire] = useState("");
  const [parkingEtudie, setParkingEtudie] = useState(false);
  const [documents, setDocuments] = useState("");
  const [acceptRefOfficielle, setAcceptRefOfficielle] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = `/login?next=${encodeURIComponent(`/appels-offres/${id}/modifier`)}`;
        return;
      }
      try {
        const res = await fetch(`/api/rfp/${id}`, { headers: catalogAuthHeaders(token) });
        const data = await res.json();
        if (!res.ok || !data.can_edit || !data.rfp) {
          setError(data.error || "Modification indisponible.");
          return;
        }
        const r = data.rfp as OwnedRfp;
        setEntreprise(r.entreprise);
        setSiret(r.siret ?? "");
        setContactNom(r.contact_nom);
        setContactFonction(r.contact_fonction ?? "");
        setContactEmail(r.contact_email);
        setContactTelephone(r.contact_telephone);
        setAdresse(r.adresse ?? "");
        setSurfaceEstimee(r.surface_estimee_m2 ? String(r.surface_estimee_m2) : "");
        setTypeSolution(r.type_solution_recherchee);
        setDejaEquipe(r.deja_equipe_partiel);
        setDerogPente(r.derogation_pente);
        setDerogAbf(r.derogation_abf);
        setBudget(r.budget_indicatif ?? "");
        setDelai(r.delai_souhaite ?? "");
        setNotes(r.notes_particulieres ?? "");
        setAoPublie(r.ao_publie_officiellement);
        setLienOfficiel(r.lien_consultation_officielle ?? "");
        setDateLimite(r.date_limite_offres ?? "");
        setNombrePlaces(r.nombre_places ? String(r.nombre_places) : "");
        setTypeProprietaire(r.type_proprietaire ?? "");
        setParkingEtudie(r.parking_deja_etudie);
        setDocuments((r.documents_complementaires ?? []).join("\n"));
        setAcceptRefOfficielle(r.ao_publie_officiellement);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSiretBlur() {
    if (siret.replace(/\s/g, "").length < 14) return;
    const data = await lookupSiret(siret);
    if (data.ok && data.entreprise) setEntreprise(data.entreprise);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (aoPublie && !acceptRefOfficielle) {
      setMsg("Acceptez la déclaration sur le lien officiel.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const body = {
        entreprise,
        siret,
        contact_nom: contactNom,
        contact_fonction: contactFonction,
        contact_email: contactEmail,
        contact_telephone: contactTelephone,
        adresse: adresse.trim() || undefined,
        surface_estimee_m2: Number(surfaceEstimee) || undefined,
        type_solution_recherchee: typeSolution,
        deja_equipe_partiel: dejaEquipe,
        derogation_pente: derogPente,
        derogation_abf: derogAbf,
        budget_indicatif: budget,
        delai_souhaite: delai,
        notes_particulieres: notes,
        ao_publie_officiellement: aoPublie,
        lien_consultation_officielle: aoPublie ? lienOfficiel : undefined,
        date_limite_offres: aoPublie ? dateLimite : undefined,
        nombre_places: nombrePlaces || undefined,
        type_proprietaire: typeProprietaire || undefined,
        parking_deja_etudie: parkingEtudie,
        documents_complementaires: documents || undefined,
        acceptation_reference_officielle: aoPublie ? acceptRefOfficielle : undefined,
      };
      const res = await fetch(`/api/rfp/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Échec enregistrement.");
        return;
      }
      router.push(`/appels-offres/${id}?updated=1`);
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="container-x py-10 text-slate-600">Chargement…</p>;
  }
  if (error) {
    return (
      <div className="container-x py-10">
        <p className="text-red-600">{error}</p>
        <Link href={MON_ESPACE_PATH} className="back-link mt-4 inline-block underline">
          ← Mon espace
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <Link href={`/appels-offres/${id}`} className="back-link text-sm">
        ← Retour au projet
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Corriger votre projet</h1>
      <p className="mt-2 text-sm text-slate-600">
        Mettez à jour les informations affichées aux installateurs. Les conditions acceptées lors du
        dépôt initial restent applicables.
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-4 p-6 text-sm">
        <Field label="SIRET" required>
          <input
            className="input"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            onBlur={onSiretBlur}
            required
          />
        </Field>
        <Field label="Entreprise">
          <input className="input" value={entreprise} readOnly />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact" required>
            <input className="input" value={contactNom} onChange={(e) => setContactNom(e.target.value)} required />
          </Field>
          <Field label="Fonction">
            <input className="input" value={contactFonction} onChange={(e) => setContactFonction(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required>
            <input
              type="email"
              className="input"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Téléphone" required>
            <input
              className="input"
              value={contactTelephone}
              onChange={(e) => setContactTelephone(e.target.value)}
              required
            />
          </Field>
        </div>
        <Field
          label="Adresse du parking"
          hint="Optionnel — précisez la localisation dans « Particularités » si l'adresse n'est pas connue."
        >
          <AddressAutocomplete name="adresse" value={adresse} onChange={setAdresse} />
        </Field>
        <Field label="Surface estimée (m²)">
          <input
            type="number"
            min={1500}
            className="input"
            value={surfaceEstimee}
            onChange={(e) => setSurfaceEstimee(e.target.value)}
          />
        </Field>
        <Field label="Type de solution" required>
          <select
            className="input"
            value={typeSolution}
            onChange={(e) =>
              setTypeSolution(
                e.target.value as "pv_pur" | "mixte_pv_vegetal" | "vegetalisation_uniquement",
              )
            }
          >
            <option value="pv_pur">Ombrières photovoltaïques (100 % PV)</option>
            <option value="mixte_pv_vegetal">Mix panneaux + végétalisation</option>
            <option value="vegetalisation_uniquement">Végétalisation uniquement</option>
          </select>
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dejaEquipe} onChange={(e) => setDejaEquipe(e.target.checked)} />
          Déjà équipé partiellement
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={derogPente} onChange={(e) => setDerogPente(e.target.checked)} />
          Dérogation pente possible
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={derogAbf} onChange={(e) => setDerogAbf(e.target.checked)} />
          Zone ABF possible
        </label>
        <Field label="Budget indicatif">
          <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
        <Field label="Délai souhaité">
          <input className="input" value={delai} onChange={(e) => setDelai(e.target.value)} />
        </Field>
        <Field label="Particularités">
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Type propriétaire">
          <select
            className="input"
            value={typeProprietaire}
            onChange={(e) => setTypeProprietaire(e.target.value)}
          >
            <option value="">—</option>
            {(Object.keys(RFP_OWNER_TYPE_LABELS) as RfpOwnerType[]).map((k) => (
              <option key={k} value={k}>
                {RFP_OWNER_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={parkingEtudie} onChange={(e) => setParkingEtudie(e.target.checked)} />
          Parking déjà étudié
        </label>
        <Field label="Nombre de places">
          <input
            type="number"
            className="input"
            value={nombrePlaces}
            onChange={(e) => setNombrePlaces(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={aoPublie} onChange={(e) => setAoPublie(e.target.checked)} />
          Appel d&apos;offres officiel publié (lien DCE)
        </label>
        {aoPublie ? (
          <>
            <Field label="Lien consultation officielle" required>
              <input className="input" value={lienOfficiel} onChange={(e) => setLienOfficiel(e.target.value)} required />
            </Field>
            <Field label="Date limite offres (AAAA-MM-JJ)" required>
              <input
                type="date"
                className="input"
                value={dateLimite}
                onChange={(e) => setDateLimite(e.target.value)}
                required
              />
            </Field>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptRefOfficielle}
                onChange={(e) => setAcceptRefOfficielle(e.target.checked)}
              />
              <span className="text-slate-400">
                J&apos;autorise SolarIndex à référencer le lien public vers la consultation officielle.
              </span>
            </label>
          </>
        ) : null}
        <Field label="Documents complémentaires (URLs, une par ligne)">
          <textarea className="input" rows={2} value={documents} onChange={(e) => setDocuments(e.target.value)} />
        </Field>

        {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className="btn-solar" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
          <Link href={`/appels-offres/${id}`} className="btn-ghost">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
        {label}
        {required ? " *" : ""}
      </span>
      {hint ? <span className="mb-2 block text-xs text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}
