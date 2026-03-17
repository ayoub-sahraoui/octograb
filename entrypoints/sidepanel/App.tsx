import { useState, useEffect } from "react";
import Router from "./pages/router";
import { observer } from "mobx-react-lite";
import { useLicenseStore } from "@/entrypoints/stores/license-store";
import LicenseActivation from "./pages/license-activation";
import { isTampered } from "@/core/integrity";
import { Loader2, ShieldAlert } from "lucide-react";

import { isDevMode } from '@/core/dev-mode';

export default observer(function App() {
  const licenseStore = useLicenseStore();
  const [tampered, setTampered] = useState(false);
  const devMode = isDevMode();

  useEffect(() => {
    isTampered().then(setTampered);
  }, []);

  // In dev mode, skip tamper check and license wall entirely
  if (devMode) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden">
        <Router />
      </div>
    );
  }

  // Tampered — block completely
  if (tampered) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden items-center justify-center">
        <ShieldAlert className="w-10 h-10 text-red-500" />
        <p className="text-sm text-red-600 font-medium text-center">This extension has been modified and cannot run. Please reinstall from the Chrome Web Store.</p>
      </div>
    );
  }

  // Loading state while checking license
  if (licenseStore.isLoading) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Checking license...</p>
      </div>
    );
  }

  // Not activated and not free — show activation screen
  if (!licenseStore.isActivated && !licenseStore.isFreeUser) {
    return (
      <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden">
        <LicenseActivation onActivated={() => licenseStore.markActivated()} onContinueFree={() => licenseStore.continueFree()} />
      </div>
    );
  }

  // Activated or free user — show normal app
  return (
    <div className="w-full h-screen bg-gray-200 p-2 flex flex-col gap-2 overflow-hidden">
      <Router />
    </div>
  );
})
