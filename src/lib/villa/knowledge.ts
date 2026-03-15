// ============================================
// VILLA TVC - Complete Knowledge Base
// ============================================

export const TVC_KNOWLEDGE = {
  // ==========================================
  // PROPERTY INFORMATION
  // ==========================================
  property: {
    name: "Tiny Village Cartagena",
    nickname: "TVC",
    location: "Isla Tierra Bomba, Cartagena, Colombia",
    description:
      "A one-of-a-kind boutique eco-resort featuring 10 beautifully designed Tiny Villas built using materials from 200-year-old Colonial homes, including doors and windows from the historic Teatro Colón.",
    founded: "2016/2017 by Akil King",
    launched: "2023",
    distance_from_city: "15 minutes by boat from Cartagena city center",
    philosophy:
      "Fuse tiny house design principles with Spanish Colonial aesthetic to create the world's most thoughtfully designed tiny house resort.",
    eco_features: [
      "Solar power system (entire property)",
      "Reclaimed 200-year-old Colonial materials",
      "Tiny house design minimizes energy consumption",
      "Natural airflow design reduces need for AC",
      "Eco-leisure philosophy: good time + doing good for the world",
    ],
  },

  // ==========================================
  // CONTACT INFORMATION
  // ==========================================
  contact: {
    phone: "(+57) 316 055 1387",
    whatsapp: "+573160551387",
    hours: "Monday–Sunday, 8am–8pm",
    website: "www.tinyvillagecartagena.com",
    booking_url: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
    airport: "Rafael Nuñez International Airport (CTG)",
    dock: "Muelle Pegasus",
  },

  // ==========================================
  // VILLA TYPES
  // ==========================================
  villas: {
    total_units: 10,
    total_beds: 19,
    max_capacity: 42,
    common_features: [
      "15-foot ceilings for amazing natural airflow",
      "Split-level design with bedroom loft and main living area",
      "Two double beds (sleep up to 4 guests)",
      "Fully functional living room",
      "Private patio (~10ft x 10ft)",
      "Smart bathroom: shower, toilet, sink in independent spaces",
      "Ample storage (closets and drawers)",
      "Custom life-sized wall murals depicting Cartagena culture",
      "Artisanal interior design from Colombia's Caribbean coast",
    ],
    types: {
      garden_view: {
        name: "Garden View Villa",
        units: 5,
        description:
          "Second-largest villa type with courtyard view and beautiful back patio. Perfect for guests seeking a serene, garden-facing retreat.",
        features: [
          "Two double beds",
          "Bathroom",
          "Living room",
          "Back patio with garden view",
        ],
      },
      deluxe: {
        name: "Deluxe Villa",
        units: 4,
        description:
          "Largest Tiny Villas in square footage and ceiling height. Features incredible artisanal interior with antique items from Colombia's Caribbean coast towns. The most premium option.",
        features: [
          "Two double beds",
          "Sofa bed",
          "Bathroom",
          "Patio",
          "Highest ceilings",
          "Premium antique decor",
        ],
      },
      ada_accessible: {
        name: "ADA Accessible Villa",
        units: 1,
        description:
          "Beautifully designed one-story villa for guests with special needs or wheelchair users. Fully accessible. TVC believes every guest deserves the magic.",
        features: [
          "Single-story design",
          "Wheelchair accessible",
          "Modified layout for accessibility",
          "Full amenities",
        ],
      },
    },
  },

  // ==========================================
  // AMENITIES
  // ==========================================
  amenities: {
    included: [
      {
        name: "Complimentary Breakfast",
        description: "Start every day right. Breakfast included in every stay.",
      },
      {
        name: "Full-Service Restaurant",
        description:
          "Caribbean cuisine inspired by Colombia's coastal flavors. Breakfast, lunch, and dinner available.",
      },
      {
        name: "Full-Service Bar",
        description:
          "Available for happy hour at the bar or in-villa delivery. Staff delivers drinks directly to your Tiny Villa.",
      },
      {
        name: "Pool with Jacuzzi",
        description:
          "Beautifully designed outdoor pool with relaxing jet-filled jacuzzi.",
      },
      {
        name: "Roof Terrace",
        description:
          "360-degree panoramic views of island and city. Accessible 24 hours. Perfect for sunrise, sunset, and stargazing.",
      },
      {
        name: "Boat Transportation",
        description:
          "Pickup and drop-off at Muelle Pegasus dock. Available for check-in/check-out and throughout the day.",
      },
      {
        name: "Fitness Center",
        description: "On-property gym available to all guests.",
      },
      {
        name: "Solar Power",
        description:
          "Entire property runs on solar energy. Stay connected while minimizing carbon footprint.",
      },
      {
        name: "Multilingual Support",
        description: "Staff assists in English, Spanish, and French.",
      },
    ],
  },

  // ==========================================
  // BOAT FLEET
  // ==========================================
  boats: {
    colibri_one: {
      name: "Colibri ONE",
      type: "38' Cruiser",
      origin: "Originally built by Monte Carlo yacht designer",
      capacity: "~20 passengers",
      features: [
        "Twin 350HP Yamaha engines",
        "Bathroom",
        "Second floor",
        "Small cabin",
        "Speakers",
        "Full bar",
      ],
      best_for:
        "Group day trips, Rosario Islands excursions, special group adventures",
    },
    pescadito: {
      name: "Pescadito",
      type: "Smaller boat",
      capacity: "Up to 8 passengers",
      features: ["Twin 50HP Yamaha engines", "Speakers"],
      best_for:
        "Guest transportation to/from TVC, Sunset Bay Tours, Night Boat Trips to Cartagena",
    },
    partner_charters:
      "TVC works with trusted partner charter companies for groups of 40+ or special requests.",
  },

  // ==========================================
  // EXPERIENCES & EVENTS
  // ==========================================
  experiences: {
    culture_trips: {
      name: "Culture Trips",
      description: "Curated weekend packages showcasing the best of Cartagena",
      includes: [
        "Customized tours and cultural exchange events",
        "Famous island visits (including Rosario Islands)",
        "Culinary experiences with Cartagena's best-kept secrets",
        "Access to TVC's iconic day parties",
        "Worry-free planning - TVC handles everything",
      ],
    },
    private_parties: {
      name: "Private Parties",
      description:
        "Book the pool, bar, and 360-degree views for exclusive day party",
      includes: [
        "Crafted cocktails",
        "Music",
        "Fresh local eats",
        "Pool and jacuzzi access",
      ],
    },
    bottomless_brunch: {
      name: "Private Bottomless Brunch",
      description: "Exclusive brunch with unlimited property access",
      includes: [
        "Personal chef and staff",
        "All needs attended to",
        "Bottomless mimosas",
      ],
    },
    private_dinner: {
      name: "Private 4-Course Dinner",
      description: "Bespoke dinner experience",
      includes: [
        "Sunset departure from Cartagena by chartered boat",
        "Arrival at TVC for elegant dinner",
        "Fully customized 4-course menu",
        "Wine pairing",
        "Curated by TVC's chef",
      ],
    },
    custom_events:
      "Corporate events, photoshoots, and more - TVC will work with you to make it happen.",
  },

  // ==========================================
  // VILLAGE TAKEOVER
  // ==========================================
  village_takeover: {
    description:
      "TVC's most exclusive offering - exclusive buyout of the entire property for your group",
    includes: [
      "Private access to all 10 Tiny Villas",
      "19 double beds",
      "Up to 42 guests",
      "ALL TVC amenities",
      "Breakfast for all guests",
    ],
    upgrades: [
      "Premium boat transportation",
      "Curated activities and excursions",
      "Private brunches, dinners, parties",
    ],
    best_for: [
      "Weddings",
      "Bachelor/Bachelorette trips",
      "Milestone birthdays (30s, 40s, 50s, etc.)",
      "Corporate retreats",
      "Family reunions",
      "Epic group getaways",
    ],
    booking_process:
      "Fill out vacation builder form on TVC website. Custom quote returned within 3 business days.",
    deposit_required: true,
    deposit_reason:
      "Once confirmed, entire resort is removed from market for those dates.",
  },

  // ==========================================
  // EXCURSIONS
  // ==========================================
  excursions: [
    "Rosario Islands Day Excursion",
    "Palenque Cultural Experience (first free African town in the Americas)",
    "Island ATV Tour",
    "Aviary Bird Sanctuary",
    "El Totumo Mud Volcano",
    "Sunset Bay Tour (Pescadito boat)",
    "Night Boat Trip to Cartagena",
    "Private Bottomless Brunch at TVC",
    "Private 4-Course Dinner at TVC",
  ],

  // ==========================================
  // TVC AGENCY
  // ==========================================
  agency: {
    description:
      "TVC has grown beyond boutique resort into full hospitality brand",
    services: [
      {
        name: "TVC Event Services",
        description:
          "Full event planning and execution on-site and throughout Cartagena. Weddings, private parties, corporate events.",
      },
      {
        name: "TVC Experiences",
        description:
          "Handpicked tours and excursions throughout Cartagena. Curated best vendors for the FULL Cartagena experience.",
      },
      {
        name: "TVC Boating",
        description: "Boat fleet management and charter coordination.",
      },
    ],
  },
};

// ==========================================
// CARTAGENA KNOWLEDGE
// ==========================================

export const CARTAGENA_KNOWLEDGE = {
  overview: {
    description:
      "Cartagena de Indias is a vibrant port city on Colombia's Caribbean coast. Founded in 1533, it's known for its colorful colonial architecture, incredible food scene, and rich Afro-Caribbean culture.",
    timezone: "Colombia Time (COT) - UTC-5",
    currency: "Colombian Peso (COP)",
    language: "Spanish (most tourism workers speak English)",
    best_time_to_visit:
      "December to April (dry season). June-July also good. Avoid September-November (rainiest).",
    weather: {
      avg_temp: "27-32°C (80-90°F) year-round",
      humidity: "High (80%+)",
      rainy_season: "May-November, with peaks in October",
      dry_season: "December-April",
    },
  },

  getting_there: {
    airport: {
      name: "Rafael Nuñez International Airport",
      code: "CTG",
      distance_to_city: "15 minutes to Old Town",
      tips: [
        "Book airport taxi inside terminal (safer, fixed rates)",
        "Uber works but may need to be discreet",
        "Typical taxi to Old Town: 25,000-35,000 COP",
      ],
    },
    to_tvc: {
      step1:
        "Get to Muelle Pegasus dock in Cartagena (taxi or Uber from airport/hotel)",
      step2: "TVC boat picks you up at scheduled time",
      step3: "15-minute scenic boat ride to Tierra Bomba island",
      tip: "Coordinate arrival time with TVC team",
    },
  },

  neighborhoods: {
    old_town: {
      name: "Ciudad Amurallada (Walled City)",
      description:
        "UNESCO World Heritage Site. Colorful colonial buildings, historic churches, plazas, restaurants, and nightlife.",
      highlights: [
        "Plaza Santo Domingo",
        "Clock Tower (Torre del Reloj)",
        "San Felipe Castle",
        "Cathedral of Cartagena",
      ],
      vibe: "Tourist-friendly, walkable, romantic, historic",
    },
    getsemani: {
      name: "Getsemaní",
      description:
        "Hip, artistic neighborhood just outside the walls. Street art, local bars, authentic vibes.",
      highlights: [
        "Plaza de la Trinidad",
        "Street art murals",
        "Local bars and restaurants",
        "Café Havana (salsa club)",
      ],
      vibe: "Artsy, local, nightlife, budget-friendly",
    },
    bocagrande: {
      name: "Bocagrande",
      description:
        "Modern beach area with high-rise hotels, casinos, and beach clubs.",
      highlights: ["Beaches", "Shopping malls", "Modern restaurants"],
      vibe: "Miami-like, resort feel, less historic",
    },
    tierra_bomba: {
      name: "Tierra Bomba",
      description:
        "Island just off Cartagena coast. Where TVC is located. More relaxed, local feel, beautiful beaches.",
      highlights: [
        "Tiny Village Cartagena",
        "Playa Blanca Tierra Bomba",
        "Local fishing communities",
      ],
      vibe: "Island escape, peaceful, authentic",
    },
  },

  food_and_drink: {
    must_try: [
      {
        name: "Ceviche",
        description: "Fresh seafood cured in citrus, often with coconut",
      },
      {
        name: "Arepa de Huevo",
        description: "Fried corn cake stuffed with egg",
      },
      {
        name: "Cazuela de Mariscos",
        description: "Creamy seafood stew with coconut milk",
      },
      {
        name: "Patacones",
        description: "Fried plantain discs, served as side or appetizer",
      },
      {
        name: "Cocada",
        description: "Sweet coconut candy, sold on beaches",
      },
      {
        name: "Limonada de Coco",
        description: "Coconut limeade - incredibly refreshing",
      },
      {
        name: "Aguardiente",
        description: "Anise-flavored spirit - Colombia's national drink",
      },
      {
        name: "Ron Cartagena",
        description: "Local rum",
      },
    ],
    dining_tips: [
      "Lunch (almuerzo) is biggest meal - look for 'menu del día' for value",
      "Dinner starts late (8pm+)",
      "Tip 10% (not always included)",
      "Street food is generally safe at busy stalls",
    ],
  },

  safety: {
    general:
      "Cartagena is generally safe for tourists, especially in tourist areas. Use common sense.",
    tips: [
      "Stay in well-lit, populated areas at night",
      "Don't flash expensive jewelry or electronics",
      "Use registered taxis or Uber",
      "Keep copies of passport (leave original in hotel safe)",
      "Watch drinks at bars/clubs",
      "Avoid Bazurto market unless with local guide",
      "Beach vendors can be persistent - polite 'no gracias' works",
    ],
    emergency: {
      police: "123",
      ambulance: "125",
      tourist_police: "317 437 6031",
    },
  },

  practical: {
    money: {
      currency: "Colombian Peso (COP)",
      exchange_rate_note:
        "Check current rates - approximately 4000 COP = 1 USD",
      atms: "Widely available. Use bank ATMs inside buildings for safety",
      cards: "Visa/Mastercard accepted at most tourist places",
      cash: "Carry cash for street vendors, small shops, tips",
      tip: "Many ATMs offer bad exchange rates - decline conversion",
    },
    connectivity: {
      wifi: "Good at hotels and restaurants",
      sim: "Claro, Movistar, Tigo available. Buy at airport or Éxito stores",
      whatsapp: "Primary communication method in Colombia",
    },
    health: {
      water: "Drink bottled water only",
      mosquitos: "Bring repellent. Dengue exists but rare in tourist areas",
      sun: "Strong - use SPF 50+, reapply often",
      pharmacies:
        "Droguerías available everywhere. Many meds available OTC that require prescriptions elsewhere",
    },
    packing: [
      "Light, breathable clothing",
      "Reef-safe sunscreen (protect the ocean!)",
      "Mosquito repellent",
      "Light rain jacket (rainy season)",
      "Comfortable walking shoes",
      "Swimwear",
      "Hat and sunglasses",
      "Cash in small bills",
    ],
  },

  etiquette: {
    greetings:
      "Colombians are warm. Kiss on cheek for women, handshake for men. 'Buenos días/tardes/noches' goes far.",
    pace: "Life moves slower. Patience is key. Punctuality flexible.",
    dress:
      "Casual but neat. Cover up for churches. Swimwear only at beach/pool.",
    bargaining:
      "Expected at markets, not at restaurants or stores with fixed prices.",
    tipping:
      "10% at restaurants (often not included). Small tips for porters, guides.",
  },

  nightlife: {
    hotspots: [
      {
        name: "Café Havana",
        type: "Salsa club",
        location: "Getsemaní",
        note: "THE place for live salsa. Gets packed late.",
      },
      {
        name: "Alquímico",
        type: "Cocktail bar",
        location: "Old Town",
        note: "Award-winning cocktails, rooftop, great vibes",
      },
      {
        name: "La Movida",
        type: "Bar/Club",
        location: "Getsemaní",
        note: "Good music, dancing, local crowd",
      },
      {
        name: "Donde Fidel",
        type: "Salsa bar",
        location: "Portal de los Dulces",
        note: "Classic, less touristy than Café Havana",
      },
    ],
    tips: [
      "Nightlife starts late - 11pm onwards",
      "Cover charges common at clubs (50-100k COP)",
      "Dress code: smart casual usually fine",
      "Thursday-Saturday are biggest nights",
    ],
  },

  day_trips: [
    {
      name: "Rosario Islands",
      distance: "1 hour by boat",
      highlights: "Crystal clear water, snorkeling, beach clubs",
      tip: "Book through TVC for best experience",
    },
    {
      name: "Playa Blanca",
      distance: "1 hour by boat",
      highlights: "Beautiful white sand beach",
      tip: "Can be crowded. TVC's island is more peaceful alternative",
    },
    {
      name: "San Basilio de Palenque",
      distance: "1 hour by car",
      highlights:
        "First free African town in Americas, UNESCO heritage, unique culture",
      tip: "Go with local guide to truly understand the history",
    },
    {
      name: "El Totumo Mud Volcano",
      distance: "45 minutes by car",
      highlights: "Float in mineral-rich mud volcano",
      tip: "Fun unique experience, great photos",
    },
  ],

  visa: {
    general:
      "Many nationalities get 90-day visa on arrival. US, EU, UK, Canada, Australia included.",
    check:
      "Always verify current requirements for your specific nationality before travel.",
    extension: "Can extend for another 90 days at Migración Colombia office.",
  },
};

// ==========================================
// BLIND SPOTS - THINGS GUESTS DON'T KNOW TO ASK
// ==========================================

export const BLIND_SPOTS = {
  pre_booking: [
    {
      id: "visa",
      trigger: "first_message",
      question: "Do you need a visa?",
      info: "Most Western countries get 90 days on arrival, but always verify for your nationality.",
    },
    {
      id: "weather",
      trigger: "dates_mentioned",
      question: "Have you checked the weather for your dates?",
      info: "Dry season (Dec-Apr) is best. Rainy season (Sep-Nov) can have afternoon showers but is usually fine.",
    },
    {
      id: "best_time",
      trigger: "when_to_visit",
      question: "When's the best time to visit?",
      info: "December-April for guaranteed sun. June-July also lovely. September-October rainiest.",
    },
  ],

  pre_arrival: [
    {
      id: "packing",
      trigger: "within_7_days",
      question: "Have you packed everything you need?",
      info: "Light clothes, reef-safe sunscreen (protects our ocean!), mosquito repellent, comfortable shoes, small bills in cash.",
    },
    {
      id: "dock_directions",
      trigger: "within_3_days",
      question: "Do you know how to get to Muelle Pegasus?",
      info: "It's in Cartagena's historic center. Taxi from airport costs about 30,000 COP. We'll text you exact coordinates.",
    },
    {
      id: "cash_situation",
      trigger: "within_7_days",
      question: "Do you have Colombian pesos?",
      info: "ATMs are at the airport. Get some cash for tips, small purchases. Cards work at most tourist spots.",
    },
    {
      id: "phone_service",
      trigger: "within_7_days",
      question: "Will your phone work here?",
      info: "WhatsApp works everywhere with WiFi. For data, buy a local SIM at the airport (Claro is best). Or check your roaming plan.",
    },
    {
      id: "dietary",
      trigger: "food_mentioned",
      question: "Any dietary restrictions we should know about?",
      info: "Our chef can accommodate most diets - just let us know! Vegetarian, vegan, gluten-free all possible.",
    },
  ],

  on_property: [
    {
      id: "boat_schedule",
      trigger: "first_day",
      question: "Know the boat schedule?",
      info: "Boats run regularly between TVC and Cartagena. Just ask staff or check the schedule board. We can also arrange private boats.",
    },
    {
      id: "bar_delivery",
      trigger: "arrived",
      question: "Did you know we deliver drinks to your villa?",
      info: "Just message us or flag any staff member. We'll bring cocktails right to your patio!",
    },
    {
      id: "roof_terrace",
      trigger: "sunset_mention",
      question: "Have you been to the roof terrace?",
      info: "360-degree views, open 24 hours. Perfect for sunrise coffee or sunset cocktails. Don't miss it!",
    },
  ],

  departing: [
    {
      id: "checkout",
      trigger: "last_day",
      question: "All set for checkout?",
      info: "Checkout is at 11am. Boat will take you to Muelle Pegasus. Need a taxi to airport? We can arrange it.",
    },
    {
      id: "review",
      trigger: "post_stay",
      question: "Would you share your experience?",
      info: "We'd love a review on TripAdvisor or Google - it really helps other travelers find us!",
    },
  ],
};
