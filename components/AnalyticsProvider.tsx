import PlausibleProvider from "next-plausible";

const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC;

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!src) return <>{children}</>;

  return (
    <PlausibleProvider
      src={src}
      enabled={process.env.NODE_ENV === "production" || process.env.PLAUSIBLE_DEV === "true"}
    >
      {children}
    </PlausibleProvider>
  );
}
