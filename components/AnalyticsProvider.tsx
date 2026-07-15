import PlausibleProvider from "next-plausible";
import { isPlausibleEnabled, PLAUSIBLE_SCRIPT_SRC } from "@/lib/plausible-config";

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!isPlausibleEnabled()) return <>{children}</>;

  const trackInDev = process.env.PLAUSIBLE_DEV === "true";

  return (
    <PlausibleProvider
      src={PLAUSIBLE_SCRIPT_SRC}
      enabled={process.env.NODE_ENV === "production" || trackInDev}
      init={{ captureOnLocalhost: trackInDev }}
    >
      {children}
    </PlausibleProvider>
  );
}
