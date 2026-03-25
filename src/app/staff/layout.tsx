"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ToastProvider, useToast, toastMessages } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initOfflineSync } from "@/lib/offline-storage";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import BottomNav from "@/components/staff/BottomNav";

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const { addToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Check initial online status
    setIsOffline(!navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      addToast("success", "Conexion restaurada");
    };

    const handleOffline = () => {
      setIsOffline(true);
      addToast("warning", toastMessages.offline);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initialize offline sync
    const cleanup = initOfflineSync((result) => {
      if (result.synced > 0) {
        addToast("success", `${result.synced} cambio(s) sincronizado(s)`);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cleanup();
    };
  }, [addToast]);

  // Don't show nav on login page
  const isLoginPage = pathname === "/staff/login";
  const isOnboardingPage = pathname === "/staff/onboarding";
  const hideNav = isLoginPage || isOnboardingPage;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Offline Banner */}
      {isOffline && !hideNav && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center safe-area-top">
          <span className="text-xs text-amber-400 font-medium">
            📡 {t("staff.offline_banner")}
          </span>
        </div>
      )}

      {/* Mobile Header - Compact */}
      {!hideNav && (
        <header className="bg-slate-800/95 backdrop-blur-sm px-4 py-3 border-b border-slate-700 sticky top-0 z-50 safe-area-top">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-black">
                TVC
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">
                  {t("staff.portal")}
                </div>
                <div className="text-[10px] text-cyan-400">
                  Tiny Village Cartagena
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageToggle compact />
              <Link
                href="/staff/login"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 active:text-white transition-colors"
                aria-label="Cerrar sesion"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Content - Full width, padding for bottom nav */}
      <main className={`${hideNav ? "" : "pb-[72px]"} safe-area-bottom`}>
        <div className="p-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      {/* Bottom Navigation */}
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <StaffLayoutContent>{children}</StaffLayoutContent>
      </ToastProvider>
    </LanguageProvider>
  );
}
