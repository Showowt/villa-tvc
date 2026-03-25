import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { OfflineIndicator } from "@/components/OfflineIndicator";
// Issue #82 - Environment validation on server start
import { getEnvSummary, isMinimallyFunctional } from "@/lib/validateEnv";

// Log environment status on server startup
if (typeof window === "undefined") {
  console.log(getEnvSummary());
  if (!isMinimallyFunctional()) {
    console.error(
      "[TVC] WARNING: App is not minimally functional - Supabase not configured.\n" +
        "Visit /error-config for diagnostic information.",
    );
  }
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10B981",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "TVC Operations | Tiny Village Cartagena",
  description:
    "Portal de operaciones para el personal de Tiny Village Cartagena. Tareas, checklists, inventario y mas.",
  keywords: [
    "Cartagena",
    "Colombia",
    "boutique hotel",
    "tiny house",
    "Tierra Bomba",
    "operaciones",
    "staff",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TVC Ops",
    startupImage: [
      {
        url: "/tvc-assets/splash-640x1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/tvc-assets/splash-750x1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/tvc-assets/splash-1242x2208.png",
        media:
          "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/tvc-assets/splash-1125x2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  formatDetection: {
    telephone: true,
    date: false,
    email: true,
    address: false,
  },
  openGraph: {
    title: "TVC Operations | Tiny Village Cartagena",
    description:
      "Portal de operaciones para el personal de Tiny Village Cartagena.",
    type: "website",
    locale: "es_CO",
    siteName: "TVC Operations",
  },
  robots: {
    index: false,
    follow: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#10B981",
    "msapplication-config": "/tvc-assets/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <head>
        {/* PWA Icons */}
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/tvc-assets/icon-32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/tvc-assets/icon-16.png"
        />
        <link rel="apple-touch-icon" href="/tvc-assets/icon-192.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/tvc-assets/icon-152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/tvc-assets/icon-180.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/tvc-assets/icon-167.png"
        />

        {/* PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TVC Ops" />
        <meta name="application-name" content="TVC Operations" />
        <meta name="msapplication-TileColor" content="#10B981" />
        <meta
          name="msapplication-TileImage"
          content="/tvc-assets/icon-144.png"
        />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-slate-900 text-white min-h-screen">
        {/* Offline Status Indicator */}
        <OfflineIndicator
          position="top"
          showPendingCount={true}
          autoHideDelay={4000}
        />

        {/* Main Content */}
        {children}

        {/* Service Worker Registration */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

// Service Worker Registration Component
function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then(function(registration) {
                    console.log('[TVC] Service Worker registrado:', registration.scope);

                    // Check for updates periodically
                    setInterval(function() {
                      registration.update();
                    }, 60 * 60 * 1000); // Every hour

                    // Handle updates
                    registration.addEventListener('updatefound', function() {
                      var newWorker = registration.installing;
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('[TVC] Nueva version disponible');
                          // Could show update notification here
                        }
                      });
                    });
                  })
                  .catch(function(error) {
                    console.error('[TVC] Error registrando Service Worker:', error);
                  });
              });

              // Handle controller change (new SW activated)
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                console.log('[TVC] Service Worker actualizado');
              });
            }

            // Register for background sync if supported
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
              navigator.serviceWorker.ready.then(function(registration) {
                return registration.sync.register('tvc-sync-queue');
              }).catch(function(err) {
                console.log('[TVC] Background sync not available:', err);
              });
            }

            // Handle online/offline for visual feedback
            function updateOnlineStatus() {
              document.body.classList.toggle('is-offline', !navigator.onLine);
              document.body.classList.toggle('is-online', navigator.onLine);
            }

            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            updateOnlineStatus();
          })();
        `,
      }}
    />
  );
}
