"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken } from "@/lib/supabaseBrowser";
import {
  type ProjetDelai,
  type UserType,
  userTypeToPersona,
} from "@/lib/profile-onboarding";
import { writeStoredPersona } from "@/lib/persona";
import { useTranslations } from "@/components/LocaleProvider";
import EntrepriseAutocomplete from "@/components/EntrepriseAutocomplete";
import type { MessageKey } from "@/lib/i18n";

const USER_TYPES: UserType[] = ["installateur", "proprietaire", "gerant_parking"];
const PROJET_DELAIS: ProjetDelai[] = ["en_cours", "six_mois", "reflexion"];

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
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get("next") || "/leads";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [userType, setUserType] = useState<UserType | "">("");
  const [entreprise, setEntreprise] = useState("");
  const [siren, setSiren] = useState("");
  const [siret, setSiret] = useState("");
  const [entrepriseEtrangere, setEntrepriseEtrangere] = useState(false);
  const [paysEntreprise, setPaysEntreprise] = useState("");
  const [immatriculationEtrangere, setImmatriculationEtrangere] = useState("");
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
  const entrepriseRequired = needsEntreprise;

  const userTypeOptions = useMemo(
    () =>
      USER_TYPES.map((value) => ({
        value,
        label: t(`userType.${value}` as MessageKey),
      })),
    [t],
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
          if (p.siren) setSiren(p.siren);
          if (p.siret) setSiret(p.siret);
          if (p.entreprise_etrangere) setEntrepriseEtrangere(true);
          if (p.pays_entreprise && p.pays_entreprise !== "FR") setPaysEntreprise(p.pays_entreprise);
          if (p.immatriculation_etrangere) setImmatriculationEtrangere(p.immatriculation_etrangere);
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
        setMsg(t("onboarding.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [nextPath, router, t]);

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
          entreprise_etrangere: entrepriseEtrangere,
          siren: entrepriseEtrangere ? null : siren,
          siret: entrepriseEtrangere ? null : siret,
          pays_entreprise: entrepriseEtrangere ? paysEntreprise : "FR",
          immatriculation_etrangere: entrepriseEtrangere ? immatriculationEtrangere : null,
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
        setMsg(data.error || t("onboarding.saveError"));
        return;
      }

      if (userType) {
        writeStoredPersona(userTypeToPersona(userType));
      }
      router.replace(nextPath);
    } catch {
      setMsg(t("onboarding.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-x py-16 text-center text-slate-400">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          {t("common.backHome")}
        </Link>
        <div className="card mt-4 p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("onboarding.title")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("onboarding.lead")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-8">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                {t("onboarding.userType")}
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
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="mt-1 accent-solar"
                      checked={entrepriseEtrangere}
                      onChange={(e) => {
                        setEntrepriseEtrangere(e.target.checked);
                        if (e.target.checked) {
                          setSiren("");
                          setSiret("");
                        } else {
                          setPaysEntreprise("");
                          setImmatriculationEtrangere("");
                        }
                      }}
                    />
                    <span>{t("onboarding.foreignCompany")}</span>
                  </label>

                  {entrepriseEtrangere ? (
                    <>
                      <Field
                        label={
                          entrepriseRequired
                            ? t("onboarding.entrepriseRequired")
                            : t("onboarding.entrepriseOptional")
                        }
                        required={entrepriseRequired}
                        hint={
                          needsEntreprise
                            ? t("onboarding.entrepriseHintInstallateur")
                            : t("onboarding.entrepriseHintOwner")
                        }
                      >
                        <input
                          required={entrepriseRequired}
                          value={entreprise}
                          onChange={(e) => setEntreprise(e.target.value)}
                          className="input"
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t("onboarding.foreignCountry")} required={entrepriseRequired}>
                          <input
                            required={entrepriseRequired && !!entreprise}
                            value={paysEntreprise}
                            onChange={(e) => setPaysEntreprise(e.target.value)}
                            className="input"
                            placeholder="Ex. Belgique, DE, ES…"
                          />
                        </Field>
                        <Field label={t("onboarding.foreignRegistration")} required={entrepriseRequired}>
                          <input
                            required={entrepriseRequired && !!entreprise}
                            value={immatriculationEtrangere}
                            onChange={(e) => setImmatriculationEtrangere(e.target.value)}
                            className="input"
                          />
                        </Field>
                      </div>
                    </>
                  ) : (
                    <Field
                      label={
                        entrepriseRequired
                          ? t("onboarding.entrepriseRequired")
                          : t("onboarding.entrepriseOptional")
                      }
                      required={entrepriseRequired}
                      hint={
                        needsEntreprise
                          ? t("onboarding.entrepriseSearchHint")
                          : t("onboarding.entrepriseHintOwner")
                      }
                    >
                      <EntrepriseAutocomplete
                        value={entreprise}
                        siren={siren}
                        siret={siret}
                        required={entrepriseRequired}
                        onChange={({ label, siren: nextSiren, siret: nextSiret }) => {
                          setEntreprise(label);
                          setSiren(nextSiren);
                          setSiret(nextSiret);
                        }}
                      />
                    </Field>
                  )}
                </div>

                {needsOwnerInfo ? (
                  <fieldset className="space-y-4 rounded-lg border border-white/10 p-4">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {t("onboarding.ownerSection")}
                    </legend>
                    <p className="text-xs text-slate-500">{t("onboarding.ownerHint")}</p>
                    <Field label={t("onboarding.ownerCompany")}>
                      <input
                        value={proprietaireRaisonSociale}
                        onChange={(e) => setProprietaireRaisonSociale(e.target.value)}
                        className="input"
                      />
                    </Field>
                    <Field label={t("onboarding.ownerName")}>
                      <input
                        value={proprietaireNom}
                        onChange={(e) => setProprietaireNom(e.target.value)}
                        className="input"
                      />
                    </Field>
                  </fieldset>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("onboarding.managerFirstName")} required>
                    <input
                      required
                      value={responsablePrenom}
                      onChange={(e) => setResponsablePrenom(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label={t("onboarding.managerLastName")} required>
                    <input
                      required
                      value={responsableNom}
                      onChange={(e) => setResponsableNom(e.target.value)}
                      className="input"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("onboarding.mobile")} required>
                    <input
                      required
                      type="tel"
                      value={telephoneMobile}
                      onChange={(e) => setTelephoneMobile(e.target.value)}
                      className="input"
                    />
                  </Field>
                  <Field label={t("onboarding.officePhone")}>
                    <input
                      type="tel"
                      value={telephoneBureau}
                      onChange={(e) => setTelephoneBureau(e.target.value)}
                      className="input"
                    />
                  </Field>
                </div>

                {needsParkingFields ? (
                  <>
                    <Field label={t("onboarding.parkingAddress")} required>
                      <input
                        required
                        value={adresseParking}
                        onChange={(e) => setAdresseParking(e.target.value)}
                        className="input"
                      />
                    </Field>

                    <Field label={t("onboarding.surface")} required hint={t("onboarding.surfaceHint")}>
                      <input
                        required
                        inputMode="numeric"
                        value={surfaceM2}
                        onChange={(e) => setSurfaceM2(e.target.value.replace(/[^\d\s]/g, ""))}
                        className="input"
                      />
                    </Field>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        {t("onboarding.projectHorizon")}
                      </legend>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {PROJET_DELAIS.map((value) => (
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
                            {t(`projet.${value}` as MessageKey)}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                ) : null}

                <Field label={t("onboarding.comment")} hint={t("onboarding.commentHint")}>
                  <textarea
                    rows={4}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    className="input min-h-[6rem] resize-y"
                  />
                </Field>

                <button type="submit" disabled={submitting} className="btn-solar w-full">
                  {submitting ? t("onboarding.submitting") : t("onboarding.submit")}
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
