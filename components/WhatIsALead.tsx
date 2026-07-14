export default function WhatIsALead({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-sm text-slate-400">
        Un <strong className="font-medium text-slate-200">lead</strong> est une opportunité
        commerciale documentée : parking éligible APER + contacts B2B (exploitant et propriétaire
        des murs lorsque identifiés). Ce n&apos;est pas un contrat signé — c&apos;est un signal
        de prospection qualifié.
      </p>
    );
  }

  return (
    <div className="card border-accent/20 bg-accent/5 p-6 text-sm text-slate-300">
      <h2 className="text-base font-semibold text-white">Qu&apos;est-ce qu&apos;un lead SolarIndex&nbsp;?</h2>
      <p className="mt-3 leading-relaxed">
        Nous vendons un <strong className="text-white">lead de prospection</strong>, pas un chantier
        garanti. Concrètement, vous recevez une fiche actionnable pour contacter une entreprise
        liée à un parking soumis à l&apos;obligation d&apos;ombrières photovoltaïques (loi APER).
        Chaque fiche indique si le lead est encore disponible à l&apos;achat.
      </p>
      <ul className="mt-4 space-y-2">
        <li className="flex gap-2">
          <span className="text-solar">✓</span>
          <span>
            <strong className="text-slate-100">Parking qualifié</strong> — surface, localisation,
            parcelle cadastrale, recouvrement PV (OSM) et photo aérienne IGN pour les urgences.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-solar">✓</span>
          <span>
            <strong className="text-slate-100">Contacts B2B</strong> — exploitant du site (SIREN)
            et propriétaire foncier (MAJIC DGFiP) : SIREN, NAF, dirigeants et coordonnées lorsque
            identifiés.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-amber-400">!</span>
          <span>
            <strong className="text-slate-100">Pas une promesse de vente</strong> — identification
            cadastrale et inférences documentées. Validez l&apos;interlocuteur APER avant engagement
            (voir indice de confiance).
          </span>
        </li>
      </ul>
    </div>
  );
}
