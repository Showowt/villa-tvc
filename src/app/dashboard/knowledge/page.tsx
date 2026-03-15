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
                `Villas: ${TVC_KNOWLEDGE.villas.total_units} units`,
                `Check-in: ${TVC_KNOWLEDGE.operations.check_in}`,
                `Check-out: ${TVC_KNOWLEDGE.operations.check_out}`,
              ]}
            />

            <KnowledgeSection
              title="Villa Types"
              items={[
                `Garden View: ${TVC_KNOWLEDGE.villas.types.garden_view.capacity} guests, ${TVC_KNOWLEDGE.villas.types.garden_view.beds}`,
                `Deluxe: ${TVC_KNOWLEDGE.villas.types.deluxe.capacity} guests, ${TVC_KNOWLEDGE.villas.types.deluxe.beds}`,
              ]}
            />

            <KnowledgeSection
              title="Amenities"
              items={TVC_KNOWLEDGE.amenities.included.map((a) => a.name)}
            />

            <KnowledgeSection
              title="Boats"
              items={[
                `${TVC_KNOWLEDGE.boats.tvc_boating.colibri_one.name} - up to ${TVC_KNOWLEDGE.boats.tvc_boating.colibri_one.capacity_islands} guests`,
                `${TVC_KNOWLEDGE.boats.tvc_boating.pescadito.name} - up to ${TVC_KNOWLEDGE.boats.tvc_boating.pescadito.capacity_bay} guests`,
                `Local Lancha - ${TVC_KNOWLEDGE.boats.local_boat.price_note}`,
              ]}
            />

            <KnowledgeSection
              title="Boat Schedule"
              items={[
                `To TVC: ${TVC_KNOWLEDGE.boats.schedule.cartagena_to_tvc.join(", ")}`,
                `To Cartagena: ${TVC_KNOWLEDGE.boats.schedule.tvc_to_cartagena.join(", ")}`,
                `Nightlife: ${TVC_KNOWLEDGE.boats.schedule.nightlife_experience.departure}`,
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
                `Language: ${CARTAGENA_KNOWLEDGE.overview.language}`,
              ]}
            />

            <KnowledgeSection
              title="Immigration"
              items={[
                CARTAGENA_KNOWLEDGE.immigration.visa,
                CARTAGENA_KNOWLEDGE.immigration.passport,
                CARTAGENA_KNOWLEDGE.immigration.customs,
              ]}
            />

            <KnowledgeSection
              title="Nightlife"
              items={CARTAGENA_KNOWLEDGE.nightlife.hotspots.map(
                (h) => `${h.name} (${h.type})`,
              )}
            />

            <KnowledgeSection
              title="Safety Tips"
              items={CARTAGENA_KNOWLEDGE.safety.tips.slice(0, 4)}
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
              items={TVC_KNOWLEDGE.experiences.map((e) => e.name)}
            />

            <KnowledgeSection
              title="Nearby Adventures"
              items={TVC_KNOWLEDGE.nearby.adventures.map((a) => a.name)}
            />

            <KnowledgeSection
              title="Local Villages"
              items={TVC_KNOWLEDGE.nearby.local_villages.map((v) => v.name)}
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
                `WhatsApp: ${TVC_KNOWLEDGE.contact.whatsapp}`,
                `Email: ${TVC_KNOWLEDGE.contact.email}`,
                `Website: ${TVC_KNOWLEDGE.contact.website}`,
              ]}
            />

            <KnowledgeSection
              title="Restaurant Hours"
              items={[
                `Breakfast: ${TVC_KNOWLEDGE.restaurant.hours.breakfast}`,
                `Lunch: ${TVC_KNOWLEDGE.restaurant.hours.lunch}`,
                `Dinner: ${TVC_KNOWLEDGE.restaurant.hours.dinner}`,
              ]}
            />

            <KnowledgeSection
              title="Payments"
              items={[
                TVC_KNOWLEDGE.payments.at_tvc,
                TVC_KNOWLEDGE.payments.on_island,
              ]}
            />

            <KnowledgeSection
              title="Pool Hours"
              items={[
                `Hours: ${TVC_KNOWLEDGE.amenities.pool_rules.hours}`,
                ...TVC_KNOWLEDGE.amenities.pool_rules.rules,
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
