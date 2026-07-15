import PlausibleProvider from "next-plausible";
import {
  isPlausibleEnabled,
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_SCRIPT_SRC,
} from "@/lib/plausible-config";

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!isPlausibleEnabled()) return <>{children}</>;

  const trackInDev = process.env.PLAUSIBLE_DEV === "true";
  const legacyScript = PLAUSIBLE_SCRIPT_SRC.includes("/script.js");

  return (
    <PlausibleProvider
      enabled={process.env.NODE_ENV === "production" || trackInDev}
      scriptProps={legacyScript ? { "data-domain": PLAUSIBLE_DOMAIN } : undefined}
      init={{ captureOnLocalhost: trackInDev }}
    >
      {children}
    </PlausibleProvider>
  );
}
