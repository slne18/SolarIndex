export const INSTALLER_CHANTIERS_LINKS = [
  {
    href: "/leads",
    label: "Accéder aux leads",
    hint: "Catalogue automatisé · estimation par zone incluse",
  },
  {
    href: "/appels-offres",
    label: "Consulter les appels d'offres",
    hint: "Projets déposés par les gérants prêts à équiper",
  },
] as const;

export function isInstallerAppelsOffresPath(pathname: string): boolean {
  return pathname.startsWith("/appels-offres") && !pathname.startsWith("/appels-offres/nouveau");
}
