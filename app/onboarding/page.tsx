import { Suspense } from "react";
import OnboardingForm from "@/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x py-16 text-center text-slate-400">
          Chargement…
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
