"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import {
  PROJET_DELAI_LABELS,
  USER_TYPE_LABELS,
  type ProjetDelai,
  type UserType,
  userTypeToPersona,
} from "@/lib/profile-onboarding";
import { writeStoredPersona } from "@/lib/persona";

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

export default function OnboardingForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get("next") || "/leads";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [userType, setUserType] = useState<UserType | "">("");
  const [entreprise, setEntreprise] = useState("");
  const [proprietaireRaisonSociale, setProprietaireRaisonSociale] = useState("");
  const [proprietaireNom, setProprietaireNom] = useState("");
  const [responsablePrenom, setResponsablePrenom] = useState("");
  const [responsableNom, setResponsableNom] = useState("");
  const [telephoneMobile, setTelephoneMobile] = useState("");
  const [telephoneBureau, setTelephoneBureau] = useState("");
  const [adresseParking, setAdresseParking] = useState("");
  const [surfaceM2, setSurfaceM2] = useState("");
  const [projetDelai, setProjetDelai] = useState<ProjetDelai | "">("");
  const [commentaire, setCommentaire] = useState("");

  const needsParkingFields = userType === "proprietaire" || userType === "gerant_parking";
  const needsEntreprise = userType === "installateur" || userType === "gerant_parking";
  const needsOwnerInfo = userType === "gerant_parking";

  const userTypeOptions = useMemo(
    () =>
      (Object.entries(USER_TYPE_LABELS) as [UserType, string][]).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        window.location.href = `/login?mode=signup&next=${encodeURIComponent(`/onboarding?next=${nextPath}`)}`;
        return;
      }

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(`/onboarding?next=${nextPath}`)}`;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.profile_completed) {
            router.replace(nextPath);
            return;
          }
          const p = data.profile ?? {};
          if (p.user_type) setUserType(p.user_type);
          if (p.entreprise) setEntreprise(p.entreprise);
          if (p.proprietaire_raison_sociale) setProprietaireRaisonSociale(p.proprietaire_raison_sociale);
          if (p.proprietaire_nom) setProprietaireNom(p.proprietaire_nom);
          if (p.responsable_prenom) setResponsablePrenom(p.responsable_prenom);
          if (p.responsable_nom) setResponsableNom(p.responsable_nom);
          if (p.telephone_mobile) setTelephoneMobile(p.telephone_mobile);
          if (p.telephone_bureau) setTelephoneBureau(p.telephone_bureau);
          if (p.adresse_parking) setAdresseParking(p.adresse_parking);
          if (p.surface_m2_estimee) setSurfaceM2(String(p.surface_m2_estimee));
          if (p.projet_delai) setProjetDelai(p.projet_delai);
          if (p.commentaire) setCommentaire(p.commentaire);
        }
      } catch {
        setMsg("Impossible de charger votre profil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nextPath, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    const token = await getAccessToken();
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(`/onboarding?next=${nextPath}`)}`;
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_type: userType,
          entreprise,
          proprietaire_raison_sociale: proprietaireRaisonSociale,
          proprietaire_nom: proprietaireNom,
          responsable_prenom: responsablePrenom,
          responsable_nom: responsableNom,
          telephone_mobile: telephoneMobile,
          telephone_bureau: telephoneBureau,
          adresse_parking: adresseParking,
          surface_m2_estimee: surfaceM2,
          projet_delai: projetDelai || null,
          commentaire,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Impossible d'enregistrer votre profil.");
        return;
      }

      if (userType) {
        writeStoredPersona(userTypeToPersona(userType));
      }
      router.replace(nextPath);
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
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Accueil
        </Link>
        <div className="card mt-4 p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Complétez votre profil</h1>
          <p className="mt-2 text-sm text-slate-400">
            Quelques informations pour adapter SolarIndex à votre situation. Les champs marqués *
            sont obligatoires.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-8">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Vous êtes *
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {userTypeOptions.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-lg border p-4 text-sm transition-colors ${
                      userType === value
                        ? "border-solar/60 bg-solar/10 text-white"
                        : "border-white/10 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="user_type"
                      required
                      className="sr-only"
                      checked={userType === value}
                      onChange={() => setUserType(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {userType ? (
              <>
                {needsEntreprise ? (
                  <Field label="Raison sociale" required hint="Votre structure (exploitant ou société d'installation).">
                    <input
                      required
                      value={entreprise}
                      onChange={(e) => setEntreprise(e.target.value)}
                      className="input"
                      placeholder="Ex. Parking Services SAS"
                    />
                  </Field>
                ) : (
                  <Field label="Raison sociale ou nom" hint="Facultatif pour un propriétaire personne physique.">
                    <input
                      value={entreprise}
                      onChange={(e) => setEntreprise(e.target.value)}
                      className="input"
                      placeholder="Ex. Foncière du Parc"
                    />
                  </Field>
                )}

                {needsOwnerInfo ? (
                  <fieldset className="space-y-4 rounded-lg border border-white/10 p-4">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Propriétaire du parking *
                    </legend>
                    <p className="text-xs text-slate-500">
                      Renseignez la raison sociale et/ou le nom du propriétaire foncier.
                    </p>
                    <Field label="Raison sociale du propriétaire">
                      <input
                        value={proprietaireRaisonSociale}
                        onChange={(e) => setProprietaireRaisonSociale(e.target.value)}
                        className="input"
                        placeholder="Ex. SCI Les Tilleuls"
                      />
                    </Field>
                    <Field label="Nom du propriétaire">
                      <input
                        value={proprietaireNom}
                        onChange={(e) => setProprietaireNom(e.target.value)}
                        className="input"
                        placeholder="Ex. Dupont"
                      />
                    </Field>
                  </fieldset>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom du responsable" required>
                    <input
                      required
                      value={responsablePrenom}
                      onChange={(e) => setResponsablePrenom(e.target.value)}
                      className="input"
                      placeholder="Marie"
                    />
                  </Field>
                  <Field label="Nom du responsable" required>
                    <input
                      required
                      value={responsableNom}
                      onChange={(e) => setResponsableNom(e.target.value)}
                      className="input"
                      placeholder="Durand"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Mobile" required>
                    <input
                      required
                      type="tel"
                      value={telephoneMobile}
                      onChange={(e) => setTelephoneMobile(e.target.value)}
                      className="input"
                      placeholder="06 12 34 56 78"
                    />
                  </Field>
                  <Field label="Téléphone bureau">
                    <input
                      type="tel"
                      value={telephoneBureau}
                      onChange={(e) => setTelephoneBureau(e.target.value)}
                      className="input"
                      placeholder="01 23 45 67 89"
                    />
                  </Field>
                </div>

                {needsParkingFields ? (
                  <>
                    <Field label="Adresse du parking" required>
                      <input
                        required
                        value={adresseParking}
                        onChange={(e) => setAdresseParking(e.target.value)}
                        className="input"
                        placeholder="12 avenue de la Gare, 33000 Bordeaux"
                      />
                    </Field>

                    <Field label="Surface à couvrir (m²)" required hint="Estimation approximative acceptée.">
                      <input
                        required
                        inputMode="numeric"
                        value={surfaceM2}
                        onChange={(e) => setSurfaceM2(e.target.value.replace(/[^\d\s]/g, ""))}
                        className="input"
                        placeholder="Ex. 3500"
                      />
                    </Field>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Horizon projet *
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(Object.entries(PROJET_DELAI_LABELS) as [ProjetDelai, string][]).map(
                          ([value, label]) => (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                                projetDelai === value
                                  ? "border-solar/60 bg-solar/10 text-white"
                                  : "border-white/10 text-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="projet_delai"
                                required={needsParkingFields}
                                className="accent-solar"
                                checked={projetDelai === value}
                                onChange={() => setProjetDelai(value)}
                              />
                              {label}
                            </label>
                          ),
                        )}
                      </div>
                    </fieldset>
                  </>
                ) : null}

                <Field label="Commentaire" hint="Facultatif — précisions utiles pour votre dossier.">
                  <textarea
                    rows={4}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    className="input min-h-[6rem] resize-y"
                    placeholder="Ex. parking couvert, toiture en bon état, démarches urbanisme engagées…"
                  />
                </Field>

                <button type="submit" disabled={submitting} className="btn-solar w-full">
                  {submitting ? "Enregistrement…" : "Enregistrer et continuer"}
                </button>
              </>
            ) : null}
          </form>

          {msg ? <p className="mt-4 text-sm text-red-300">{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}
