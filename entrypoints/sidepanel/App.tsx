
import Router from "./pages/router";
import { observer } from "mobx-react-lite";
import { useLicenseStore } from "@/entrypoints/stores/license-store";
import LicenseActivation from "./pages/license-activation";
import { Loader2 } from "lucide-react";

export default observer(function App() {
  const licenseStore = useLicenseStore();

  // Loading state while checking license
  if (licenseStore.isLoading) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Checking license...</p>
      </div>
    );
  }

  // Not activated — show activation screen
  if (!licenseStore.isActivated) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden">
        <LicenseActivation onActivated={() => licenseStore.markActivated()} />
      </div>
    );
  }

  // Activated — show normal app
  return (
    <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden">
      <Router />
    </div>
  );
})
