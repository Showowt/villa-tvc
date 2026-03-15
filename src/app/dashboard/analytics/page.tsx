export default function AnalyticsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Analytics
        </h1>
        <p className="text-white/60">Conversation metrics and guest insights</p>
      </div>

      {/* Coming Soon */}
      <div className="card text-center py-16">
        <div className="w-20 h-20 bg-admin-border rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-tvc-turquoise"
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

        <h2 className="font-display text-2xl font-semibold text-white mb-3">
          Analytics Coming Soon
        </h2>
        <p className="text-white/60 max-w-lg mx-auto mb-8">
          We&apos;re building comprehensive analytics to help you understand
          your guests better. Track conversation metrics, response times,
          popular questions, and more.
        </p>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <FeaturePreview
            icon="📊"
            title="Conversation Metrics"
            description="Messages per day, response times, peak hours"
          />
          <FeaturePreview
            icon="🌍"
            title="Language Distribution"
            description="See which languages your guests prefer"
          />
          <FeaturePreview
            icon="❓"
            title="Top Questions"
            description="Most common questions guests ask Villa"
          />
        </div>
      </div>
    </div>
  );
}

function FeaturePreview({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-admin-border/30 rounded-lg p-4 text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <h3 className="font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}
