import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-tvc-void to-tvc-deep">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2340b8c4' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="text-center">
            {/* Logo/Title */}
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6">
              Villa
            </h1>
            <p className="text-tvc-turquoise text-xl md:text-2xl mb-4">
              AI Concierge for Tiny Village Cartagena
            </p>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-12">
              The most intelligent hospitality assistant for the world&apos;s
              most thoughtfully designed tiny house resort.
            </p>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 bg-admin-surface border border-admin-border rounded-full px-4 py-2 mb-12">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-dot" />
              <span className="text-white/80 text-sm">
                Villa is online and ready to help
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="btn-primary">
                Open Dashboard
              </Link>
              <a
                href="https://wa.me/573160551387"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Message Villa on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-tvc-turquoise/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-tvc-turquoise"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              24/7 WhatsApp Concierge
            </h3>
            <p className="text-white/60">
              Guests get instant answers any time, day or night. Questions about
              the property, Cartagena, or their stay — Villa handles it all.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-tvc-gold/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-tvc-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Proactive Intelligence
            </h3>
            <p className="text-white/60">
              Villa surfaces information guests don&apos;t know to ask — visa
              tips, packing lists, local customs, and more based on their
              journey stage.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-tvc-coral/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-tvc-coral"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Multilingual (EN/ES/FR)
            </h3>
            <p className="text-white/60">
              Automatic language detection and response. Guests can write in
              English, Spanish, or French — Villa responds naturally in their
              language.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Smart Escalation
            </h3>
            <p className="text-white/60">
              Critical issues automatically escalate to staff. Emergencies,
              complaints, or complex requests trigger instant WhatsApp alerts.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Guest Memory
            </h3>
            <p className="text-white/60">
              Villa remembers each guest across conversations. Preferences,
              dietary needs, and past interactions inform every response.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card card-hover">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Full Analytics
            </h3>
            <p className="text-white/60">
              Track conversations, response times, common questions, and guest
              satisfaction from a beautiful admin dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-admin-border">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-white">
                Villa
              </span>
              <span className="text-white/40">×</span>
              <span className="text-white/60">Tiny Village Cartagena</span>
            </div>
            <div className="text-white/40 text-sm">
              Powered by MachineMind Genesis Engine
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
