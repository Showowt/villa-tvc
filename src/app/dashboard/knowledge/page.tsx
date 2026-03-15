import { TVC_KNOWLEDGE, CARTAGENA_KNOWLEDGE } from "@/lib/villa/knowledge";

export default function KnowledgePage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Knowledge Base
        </h1>
        <p className="text-white/60">
          Villa&apos;s built-in knowledge about TVC and Cartagena
        </p>
      </div>

      {/* Knowledge Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVC Knowledge */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-tvc-turquoise/20 rounded-lg flex items-center justify-center">
              <span className="text-tvc-turquoise">🏠</span>
            </span>
            TVC Property
          </h2>

          <div className="space-y-4">
            <KnowledgeSection
              title="Property Info"
              items={[
                `Name: ${TVC_KNOWLEDGE.property.name}`,
                `Location: ${TVC_KNOWLEDGE.property.location}`,
                `Founded: ${TVC_KNOWLEDGE.property.founded}`,
                `Villas: ${TVC_KNOWLEDGE.villas.total_units} units, ${TVC_KNOWLEDGE.villas.total_beds} beds`,
                `Capacity: ${TVC_KNOWLEDGE.villas.max_capacity} guests`,
              ]}
            />

            <KnowledgeSection
              title="Villa Types"
              items={[
                `Garden View (${TVC_KNOWLEDGE.villas.types.garden_view.units} units)`,
                `Deluxe (${TVC_KNOWLEDGE.villas.types.deluxe.units} units)`,
                `ADA Accessible (${TVC_KNOWLEDGE.villas.types.ada_accessible.units} unit)`,
              ]}
            />

            <KnowledgeSection
              title="Amenities"
              items={TVC_KNOWLEDGE.amenities.included.map((a) => a.name)}
            />

            <KnowledgeSection
              title="Boats"
              items={[
                `${TVC_KNOWLEDGE.boats.colibri_one.name} - ${TVC_KNOWLEDGE.boats.colibri_one.capacity}`,
                `${TVC_KNOWLEDGE.boats.pescadito.name} - ${TVC_KNOWLEDGE.boats.pescadito.capacity}`,
              ]}
            />
          </div>
        </div>

        {/* Cartagena Knowledge */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-tvc-gold/20 rounded-lg flex items-center justify-center">
              <span className="text-tvc-gold">🌴</span>
            </span>
            Cartagena Guide
          </h2>

          <div className="space-y-4">
            <KnowledgeSection
              title="Overview"
              items={[
                `Timezone: ${CARTAGENA_KNOWLEDGE.overview.timezone}`,
                `Currency: ${CARTAGENA_KNOWLEDGE.overview.currency}`,
                `Best Time: ${CARTAGENA_KNOWLEDGE.overview.best_time_to_visit}`,
              ]}
            />

            <KnowledgeSection
              title="Neighborhoods"
              items={Object.values(CARTAGENA_KNOWLEDGE.neighborhoods).map(
                (n) => `${n.name} - ${n.vibe}`,
              )}
            />

            <KnowledgeSection
              title="Must-Try Foods"
              items={CARTAGENA_KNOWLEDGE.food_and_drink.must_try
                .slice(0, 6)
                .map((f) => f.name)}
            />

            <KnowledgeSection
              title="Day Trips"
              items={CARTAGENA_KNOWLEDGE.day_trips.map((t) => t.name)}
            />

            <KnowledgeSection
              title="Nightlife"
              items={CARTAGENA_KNOWLEDGE.nightlife.hotspots.map(
                (h) => `${h.name} (${h.type})`,
              )}
            />
          </div>
        </div>

        {/* Experiences */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-tvc-coral/20 rounded-lg flex items-center justify-center">
              <span className="text-tvc-coral">✨</span>
            </span>
            Experiences
          </h2>

          <div className="space-y-4">
            <KnowledgeSection
              title="TVC Experiences"
              items={[
                TVC_KNOWLEDGE.experiences.culture_trips.name,
                TVC_KNOWLEDGE.experiences.private_parties.name,
                TVC_KNOWLEDGE.experiences.bottomless_brunch.name,
                TVC_KNOWLEDGE.experiences.private_dinner.name,
              ]}
            />

            <KnowledgeSection
              title="Excursions"
              items={TVC_KNOWLEDGE.excursions}
            />
          </div>
        </div>

        {/* Contact & Practical */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-green-500">📞</span>
            </span>
            Contact & Practical
          </h2>

          <div className="space-y-4">
            <KnowledgeSection
              title="TVC Contact"
              items={[
                `Phone: ${TVC_KNOWLEDGE.contact.phone}`,
                `Hours: ${TVC_KNOWLEDGE.contact.hours}`,
                `Website: ${TVC_KNOWLEDGE.contact.website}`,
                `Airport: ${TVC_KNOWLEDGE.contact.airport}`,
                `Dock: ${TVC_KNOWLEDGE.contact.dock}`,
              ]}
            />

            <KnowledgeSection
              title="Emergency Numbers"
              items={[
                `Police: ${CARTAGENA_KNOWLEDGE.safety.emergency.police}`,
                `Ambulance: ${CARTAGENA_KNOWLEDGE.safety.emergency.ambulance}`,
                `Tourist Police: ${CARTAGENA_KNOWLEDGE.safety.emergency.tourist_police}`,
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KnowledgeSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm text-white/80 flex items-start gap-2"
          >
            <span className="text-tvc-turquoise mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
