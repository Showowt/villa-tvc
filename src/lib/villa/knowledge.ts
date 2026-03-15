// ============================================
// VILLA TVC - Complete Knowledge Base
// Updated from Official Welcome Guide 2025
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
      "A boutique resort with 10 beautifully designed Tiny Houses inspired by Cartagena's Spanish Colonial architecture. Located on Tierra Bomba Island, less than 15 minutes by boat from Cartagena's city center, offering the perfect mix of privacy and convenience.",
    philosophy:
      "At Tiny Village Cartagena we aim to build an island getaway that incorporates everything that makes Cartagena special from its architectural design, to its culture to its cuisine. Our Tiny Villas are stand alone structures which incorporate Tiny house design principles to afford maximum space and comfort per square foot, while still ensuring that the energy consumption of each Villa is environmentally responsible.",
    eco_features: [
      "Connected to island's main power grid with solar backup system",
      "Natural cross-breezes and industrial fans reduce AC need",
      "Eco-friendly approach: towels not changed daily unless requested",
      "Climate-temperature showers to reduce energy and environmental impact",
    ],
  },

  // ==========================================
  // CONTACT INFORMATION
  // ==========================================
  contact: {
    phone: "+57 316 055 1387",
    whatsapp: "+57 316 055 1387",
    email: "info@tinyvillagecolombia.com",
    website: "www.tinyvillagecartagena.com",
    booking_url: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
    note: "Cell service on the island can be spotty, but WiFi is available at the hotel. WhatsApp is the best way to communicate.",
  },

  // ==========================================
  // GETTING HERE
  // ==========================================
  getting_here: {
    taxi_from_airport: {
      cost: "30,000 - 40,000 COP",
      note: "Taxis available at the airport to our pick-up points",
    },
    private_transfer: {
      cost: "40,000 COP for small groups (up to 5 people)",
      contact:
        "WhatsApp +57 316 055 1387 or email info@tinyvillagecolombia.com",
    },
    pickup_points: {
      local_boats: {
        name: "Behind Bocagrande Hospital (Nuevo Hospital de Bocagrande)",
        description:
          "Departure point for local lanchas - authentic island experience",
        google_maps: "Search: Behind Bocagrande Hospital",
      },
      tvc_boating: {
        name: "Todomar Marina, Bocagrande",
        description: "Departure point for TVC Boating premium experience",
        google_maps: "Search: Todomar Marina Bocagrande",
      },
    },
    boat_ride: "Less than 15 minutes - short, scenic ride across the bay",
    complimentary_transfers:
      "Guests who book directly with us or through our website enjoy complimentary check-in and check-out boat transfers",
  },

  // ==========================================
  // BOAT TRANSPORTATION
  // ==========================================
  boats: {
    local_boat: {
      name: "Local Lancha",
      departure: "Beach behind Bocagrande Hospital",
      description:
        "Safe, lively option operated by local islanders. Direct connection to the culture and rhythm of Tierra Bomba.",
      price_one_way: 50000,
      price_note: "50,000 COP per trip",
    },
    tvc_boating: {
      description:
        "Enjoy a smooth and stylish ride across the bay with comfort, views, and Caribbean breezes.",
      pescadito: {
        name: "Pescadito",
        length: "19 Feet",
        capacity_islands: 6,
        capacity_bay: 8,
        capacity_note: "Luxury boat for up to 7 guests",
        engines: "Two 50Hp Yamaha Engines",
        features: [
          "Sound System (Bluetooth Enabled)",
          "Party Lights",
          "Cooler with Ice",
          "Sunbathing Area",
        ],
        price_one_way: 200000,
        price_round_trip: 300000,
      },
      colibri_one: {
        name: "Colibri One",
        length: "39 Feet",
        capacity_islands: 20,
        capacity_bay: 22,
        capacity_note: "Elegant mini yacht for up to 20 guests",
        engines: "Two 350Hp Yamaha Engines",
        features: [
          "Sound System (Bluetooth Enabled)",
          "2 Levels",
          "Bathroom",
          "Shower",
          "Party Lights",
          "Wet Bar",
          "Cooler with Ice",
          "Sunbathing Area",
        ],
        price_one_way: 450000,
        price_round_trip: 750000,
      },
    },
    destinations: [
      "Rosario Islands",
      "Baru",
      "Sunset Tours",
      "Tierra Bomba",
      "Special Events",
    ],
    schedule: {
      cartagena_to_tvc: ["3:00 PM (Daily)", "6:30 PM (Daily)"],
      tvc_to_cartagena: ["8:00 AM (Daily)", "11:00 AM (Daily)"],
      nightlife_experience: {
        departure: "7:30 PM from Tiny Village Cartagena",
        return: "12:00 AM from Cartagena to TVC",
        note: "Return after 12am is possible, additional fees apply",
        description:
          "Set sail on our boats at night, dive into Cartagena's vibrant nightlife, and return after an unforgettable party under the city lights.",
      },
      flexible:
        "Need a ride outside these hours? Just reach out to us, and we'll see what we can do. We're pretty good at making things happen!",
    },
  },

  // ==========================================
  // HOTEL OPERATIONS
  // ==========================================
  operations: {
    check_in: "From 3:00 PM",
    check_out: "By 11:00 AM",
    late_checkout:
      "Let us know in advance, and we'll try to accommodate based on availability (extra charge may apply)",
    security: "24/7 on-site staff and security cameras",
    emergency:
      "Bocagrande Hospital is just a 10-minute boat ride away. Emergency medical services are available on the island.",
  },

  // ==========================================
  // AMENITIES - Full list from Cloudbeds
  // ==========================================
  amenities: {
    included: [
      { name: "Swimming Pool", description: "Beautiful outdoor pool" },
      { name: "Hot Tub / Jacuzzi", description: "Relaxing hot tub" },
      { name: "Beach", description: "2-minute walk to beach" },
      { name: "Beach Chairs/Loungers", description: "Poolside relaxation" },
      { name: "Solarium", description: "Sun deck area" },
      {
        name: "Restaurant",
        description: "Tia's Kitchen & Bar - Caribbean cuisine",
      },
      { name: "Bar", description: "Full-service bar" },
      { name: "Free Breakfast", description: "Complimentary daily breakfast" },
      { name: "Bottled Water", description: "Available for purchase" },
      { name: "WiFi", description: "Wireless internet throughout property" },
      { name: "Air Conditioning", description: "In villas" },
      { name: "Concierge", description: "Guest services" },
      { name: "Tour Assistance", description: "Help booking excursions" },
      {
        name: "Baggage Storage",
        description: "Store luggage before/after checkout",
      },
      { name: "24-Hour Front Desk", description: "Always staffed" },
      { name: "Daily Housekeeping", description: "Room cleaning service" },
      { name: "Safety Deposit Box", description: "Secure storage" },
      { name: "Outdoor Furniture", description: "Common area seating" },
      { name: "Terrace", description: "Outdoor terrace areas" },
      { name: "Boating", description: "Boat services available" },
      { name: "Tours", description: "Various excursion options" },
      { name: "Happy Hour", description: "Daily specials" },
    ],
    accessibility: ["Property has wheelchair access"],
    safety_security: [
      "24-hour security",
      "CCTV in common areas",
      "CCTV outside property",
    ],
    health_hygiene: [
      "Cashless payment accepted",
      "First aid kits available",
      "Hand sanitizer provided",
    ],
    sustainability: [
      "Guests can opt out of daily room cleaning",
      "Towels changed upon request",
    ],
    pool_rules: {
      hours: "7:00 AM - 10:00 PM",
      rules: [
        "No glass containers in the pool area for safety reasons",
        "Please shower before entering the pool to help keep the water clean",
      ],
    },
  },

  // ==========================================
  // PAYMENTS & CASH
  // ==========================================
  payments: {
    at_tvc:
      "We do NOT accept cash at Tiny Village. Credit/debit cards only for your convenience.",
    on_island:
      "No ATMs on Tierra Bomba. Local businesses only accept cash. Bring Colombian pesos if you plan to make purchases outside the property.",
    tipping:
      "Not mandatory but appreciated. If you receive great service, a small tip goes a long way!",
    water: "Do not drink tap water. Bottled water is available for purchase.",
  },

  // ==========================================
  // VILLAS - Accurate from Cloudbeds
  // ==========================================
  villas: {
    total_units: 10,
    description:
      "10 beautifully designed Tiny Houses inspired by Cartagena's Spanish Colonial architecture, each with unique wall murals representative of Cartagena's iconic street art.",
    types: {
      garden_view: {
        name: "Garden View Tiny Villa",
        capacity: 4,
        size: "26m² (two story)",
        beds: "Two double beds",
        features: [
          "Private shower and toilet",
          "Beautiful private back patio with water views",
          "Unique wall mural (Cartagena street art style)",
          "Two story layout",
        ],
        amenities: ["220-240 volt circuits", "Ceiling fan", "WiFi"],
      },
      deluxe: {
        name: "Deluxe Tiny Villa",
        capacity: 5,
        description:
          "Experience Cartagena's renowned Spanish colonial architecture. Built with restored wood from the iconic Teatro Colon.",
        beds: "Two double beds + sofa bed",
        features: [
          "Extra spacious layout",
          "Private back patio",
          "Stylish living room with incredible wall mural",
          "Separate loft upstairs",
          "Artisanal crafts from Colombia's Caribbean Coast",
          "Bathroom with 3 separate areas (sink, bathing, toilet)",
        ],
        amenities: [
          "110-120 volt circuits",
          "Ceiling fan",
          "Easily accessible outlets",
          "Eco-friendly bathroom amenities",
          "Hair dryer (upon request)",
          "In-room safe",
          "Iron/ironing board (upon request)",
          "Private patio",
          "WiFi",
        ],
      },
    },
    common_features: [
      "Natural cross-breezes and powerful industrial fans",
      "Portable air conditioners available upon request",
      "No hot water - refreshing, climate-temperature showers (eco-friendly)",
      "Towels not changed daily unless requested (eco-friendly)",
    ],
  },

  // ==========================================
  // RESTAURANT - TIA'S KITCHEN & BAR
  // ==========================================
  restaurant: {
    name: "Tia's Kitchen & Bar",
    description:
      "The heart of our culinary experience is Tia, our beloved chef whose warmth, charisma, and infectious smile light up every corner of Tiny Village Cartagena. With every dish she prepares, Tia brings not just flavor but joy - turning meals into memorable moments. Her cooking is a celebration of tradition, creativity, and love.",
    hours: {
      breakfast: "7:30am - 9:30am",
      lunch: "11:30am - 2:00pm",
      dinner: "4:00pm - 8:00pm",
      after_hours:
        "After 8:00 PM, After Hours Snack Boxes are available - so you'll never go hungry!",
    },
    menus: [
      "Tia's Kitchen & Bar menu",
      "Menu Specialties",
      "4 Courses dinner menu",
      "Brunch menu (Village People Brunch)",
      "Bottles menu",
    ],
    food_menu: {
      starters: [
        { name: "Empanadas", price: 22000 },
        { name: "Cassava Croquettes (Croquetas de yuca)", price: 22000 },
        { name: "Patacones", price: 22000 },
      ],
      sandwiches_mains: [
        { name: "Chicken Sandwich", price: 44000 },
        { name: "Turkey, Ham and Cheese Sandwich", price: 44000 },
        { name: "Vegan Burger", price: 35000 },
        { name: "Beef Burger", price: 52000 },
        { name: "Vegetarian Wraps", price: 52000 },
        { name: "Vegan Buddha Bowl", price: 52000 },
        { name: "Hot Dog with Chips", price: 35000 },
      ],
      specialties: [
        {
          name: "Caribbean Lobster Delight",
          price: 180000,
          description:
            "Grilled lobster with coconut rice, tropical salad, and golden patacones",
        },
        {
          name: "Coconut Fish Fantasy",
          price: 75000,
          description:
            "Catch of the day in creamy coconut sauce with coconut rice and patacones",
        },
        {
          name: "Island Beef Plate",
          price: 65000,
          description:
            "Tender beef with sauteed vegetables, coconut rice, and choice of fries or patacones",
        },
        {
          name: "Grilled Chicken Tropicale",
          price: 65000,
          description:
            "Juicy grilled chicken with coconut rice and passion fruit salad",
        },
      ],
    },
    drinks_menu: {
      non_alcoholic: [
        { name: "Soda", price: 8700 },
        { name: "Fruit Juice", price: 13000 },
        { name: "Water (XL)", price: 8000 },
        { name: "Unlimited Daily Water", price: 20000 },
      ],
      cocktails: [
        { name: "Margarita", price: 44000 },
        { name: "Cuba Libre", price: 44000 },
        { name: "Mojito", price: 44000 },
        { name: "Gin and Tonic", price: 44000 },
        { name: "Moscow Mule", price: 44000 },
      ],
      other: [
        { name: "Beer", price: 22000 },
        { name: "Glass of Wine", price: 35000 },
        { name: "Shots", price: 30000 },
        { name: "Premium Drinks", price: 61000 },
        { name: "Premium Shots", price: 44000 },
      ],
    },
    bottle_service: {
      tequila: [
        { name: "Olmeca Silver/Reposado", price: 200000 },
        { name: "1800 Silver", price: 540000 },
        { name: "Patron Silver", price: 580000 },
        { name: "Don Julio Silver", price: 620000 },
        { name: "Casamigos", price: 700000 },
      ],
      vodka: [
        { name: "Absolut", price: 220000 },
        { name: "Tito's", price: 440000 },
        { name: "Grey Goose", price: 500000 },
      ],
      whiskey: [
        { name: "Black & White", price: 180000 },
        { name: "Jack Daniel's", price: 460000 },
        { name: "Jameson", price: 440000 },
      ],
      rum: [
        { name: "Bandoleros", price: 140000 },
        { name: "Ron Medellin", price: 160000 },
        { name: "La Hechicera", price: 500000 },
      ],
      cognac: [{ name: "Hennessy", price: 700000 }],
    },
    private_dinner_menus: [
      { name: "Cartagena Culture Menu", price_per_person: 235000 },
      { name: "Sunset Flavors of the Coast", price_per_person: 200000 },
      { name: "Jungle Soul Tasting", price_per_person: 170000 },
    ],
    brunch: {
      name: "Village People - Bottomless Brunch",
      tagline:
        "Brunch is a lifestyle - and life doesn't get much better than TVC's private brunch event!",
      includes: ["Bottomless Mimosas", "Bottomless Tapas"],
    },
    outside_food:
      "Outside food & drinks are allowed, but we kindly ask you to dispose of waste properly.",
  },

  // ==========================================
  // THINGS TO DO NEARBY
  // ==========================================
  nearby: {
    beach:
      "Just a 2-minute walk from our property, guests can enjoy a beautiful beach perfect for relaxing by the sea.",
    restaurants: [
      { name: "Palmarito Beach", phone: "+57 310 5172659" },
      { name: "Vista Mare Beach House", phone: "+57 313 5508457" },
      { name: "Eteka", phone: "+57 301 2533196" },
    ],
    beach_clubs: [
      { name: "Amare", phone: "+57 314 2594747" },
      { name: "Tamarindo", phone: "+57 300 8304905" },
      { name: "Anaho", phone: "+57 314 5948838" },
    ],
    beaches: ["Playa Linda", "Playa Punta Arena"],
    adventures: [
      {
        name: "Jet Skiing",
        note: "Right outside our resort, just a call away!",
      },
      {
        name: "Bike Ride - Bocachica & the Fort",
        note: "Pedal to Bocachica and explore its historic fort. Book 24 hours in advance.",
      },
      {
        name: "Moto Tour - Around the Island",
        note: "Discover Tierra Bomba by moto - villages, beaches, hidden gems. Book 24 hours ahead.",
      },
      {
        name: "Sunset Bay Tour",
        note: "Cruise into golden hour with skyline views and sparkling waters.",
      },
    ],
    local_villages: [
      {
        name: "Bocachica",
        description:
          "A raw, authentic island experience - no paved roads or running water, but full of culture, history, and soul.",
      },
      {
        name: "Punta Arena",
        description:
          "Known for its beautiful beaches and stunning blue waters, perfect for a day under the sun.",
      },
      {
        name: "Playa Linda",
        description:
          "A wide, sandy beach loved by locals and visitors alike, offering a laid-back vibe and true charm of island life.",
      },
      {
        name: "Tierra Bomba Village",
        description:
          "The island's main community, where you'll find daily local life, small shops, and warm hospitality.",
      },
    ],
    village_tip:
      "Be respectful when visiting local communities, and it's best to leave fancy jewelry at home.",
  },

  // ==========================================
  // TVC EXPERIENCES
  // ==========================================
  experiences: [
    {
      name: "Art and City Tour",
      description:
        "Learn about the architecture that makes Cartagena and TVC so special in this walking tour in the historic center.",
    },
    {
      name: "Aviario Bird Sanctuary",
      description:
        "Home to 190 bird species across three ecosystems - see flamingos, parrots, eagles, and peacocks roaming freely.",
    },
    {
      name: "El Totumo Mud Volcano",
      description:
        "Get natural spa therapy at this natural mud volcano just minutes outside of Cartagena. Quite an experience!",
    },
    {
      name: "Palenque Cultural Experience Tour",
      description:
        "Experience the culture, customs and history of one of the most unique places in the world. Palenque is first free black settlement in the Americas and has preserved their customs and language for hundreds of years.",
    },
    {
      name: "Island ATV Tour",
      description:
        "Amazing beach and island ATV excursion through some of the most beautiful terrain in Cartagena.",
    },
    {
      name: "Rosario Islands Experience",
      description:
        "Set sail for adventure! The Rosarios are among the most breathtaking islands in the world. Hop from island to island, soak up the turquoise waters, and feel like the captain of your own boat.",
    },
    {
      name: "Playa Blanca",
      description:
        "One of Cartagena's most famous beaches - absolutely stunning! You'll have a TVC guide by your side to make sure you enjoy it like a true insider.",
    },
    {
      name: "Private Events",
      description:
        "Whether with a private dinner, brunch, party or any other type of event, we'll make sure your private event is unforgettable.",
    },
  ],

  // ==========================================
  // VILLAGE TAKEOVER
  // ==========================================
  village_takeover: {
    description:
      "TVC's most exclusive offering - exclusive buyout of the entire property for your group",
    includes: [
      "Private access to all 10 Tiny Villas",
      "ALL TVC amenities",
      "Breakfast for all guests",
    ],
    best_for: [
      "Weddings",
      "Bachelor/Bachelorette trips",
      "Milestone birthdays",
      "Corporate retreats",
      "Family reunions",
      "Epic group getaways",
    ],
    booking: "Contact us via WhatsApp +57 316 055 1387",
  },

  // ==========================================
  // HOTEL RULES
  // ==========================================
  rules: {
    general: [
      "Keep the vibes positive",
      "Respect other guests & staff",
      "No wild parties - let's keep it classy!",
      "No unregistered guests",
    ],
    noise:
      "Out of respect for all guests, loud music is not allowed after 11:00 PM.",
    smoking:
      "Smoking is allowed only in designated areas. Please do not smoke inside the villas.",
    fire_safety:
      "Open flames (candles, bonfires, fireworks) are NOT allowed on the property for safety reasons.",
    bugs: "You're on a tropical island - expect geckos, mosquitoes, and the occasional crab. We provide mosquito repellent.",
    lost_found:
      "We are not responsible for lost or forgotten items, but we'll do our best to help recover them if possible.",
  },
};

// ==========================================
// CARTAGENA KNOWLEDGE
// ==========================================

export const CARTAGENA_KNOWLEDGE = {
  overview: {
    description:
      "Cartagena de Indias is a vibrant port city on Colombia's Caribbean coast. Known for colorful colonial architecture, incredible food scene, and rich Afro-Caribbean culture.",
    timezone: "Colombia Time (COT) - UTC-5",
    currency: "Colombian Peso (COP)",
    language: "Spanish (most tourism workers speak English)",
  },

  immigration: {
    visa: "Many nationalities can enter Colombia visa-free for up to 90 days. Check your country's requirements.",
    passport:
      "Ensure your passport is valid for at least six months upon arrival.",
    proof_of_exit: "Immigration may ask for a return or onward ticket.",
    customs: "Declare cash over $10,000 USD to avoid issues.",
    health:
      "No vaccines are mandatory, but yellow fever is recommended if visiting jungle areas.",
    tvc_address:
      "If asked for address: Tiny Village Cartagena, Isla Tierra Bomba, Cartagena / +57 316 055 1387",
  },

  airport_tips: {
    luggage:
      "Some people will try to carry your bags and then ask for money. Just say 'No, gracias' if you don't want help.",
    cash: "There are ATMs just outside arrivals in the departures area. You'll need pesos for small purchases.",
    safety:
      "Watch your bags and don't accept help from strangers unless they're official staff.",
    etiquette:
      "Locals are kind and helpful - a smile and a 'hola' go a long way.",
  },

  nighttime_tips: [
    "The island gets very dark at night outside of the property, so a small flashlight or phone light is helpful when walking around.",
    "Mosquitoes are more active after sunset - wear repellent if sitting outside.",
    "Keep noise levels low after 11:00 PM out of respect for other guests.",
    "If you're returning late from Cartagena, respect other guests - avoid loud music or conversations in shared areas.",
  ],

  practical: {
    water: "Do not drink tap water. Bottled water available for purchase.",
    sun: "The Caribbean sun can be intense. Stay hydrated and use sunscreen.",
    communication:
      "WhatsApp is the best way to communicate. Cell service can be spotty on the island, but WiFi is available at the hotel.",
    activities_booking:
      "Bike riding tour, island and boat tours need at least 24-48 hours notice.",
    beach_shoes:
      "Bring water shoes if you plan to explore - some beach areas have rocks or coral.",
    village_dress:
      "When walking around local villages, dress modestly and be respectful. Locals are friendly, but be mindful of cultural norms.",
  },

  nightlife: {
    hotspots: [
      {
        name: "Cafe Havana",
        type: "Salsa club",
        location: "Getsemani",
        note: "THE place for live salsa. Gets packed late.",
      },
      {
        name: "Alquimico",
        type: "Cocktail bar",
        location: "Old Town",
        note: "Award-winning cocktails, rooftop, great vibes",
      },
    ],
    tips: [
      "Nightlife starts late - 11pm onwards",
      "TVC offers Nightlife Experience: 7:30 PM departure, 12:00 AM return",
    ],
  },

  safety: {
    general: "Cartagena is generally safe for tourists. Use common sense.",
    tips: [
      "Stay in well-lit, populated areas at night",
      "Don't flash expensive jewelry or electronics",
      "Use registered taxis or Uber",
      "Leave fancy jewelry at home when visiting local villages",
    ],
  },
};

// ==========================================
// BLIND SPOTS - THINGS GUESTS DON'T KNOW TO ASK
// ==========================================

export const BLIND_SPOTS = {
  pre_booking: [
    {
      id: "visa",
      question: "Do you need a visa?",
      info: "Many nationalities can enter Colombia visa-free for up to 90 days. Make sure your passport is valid for at least 6 months.",
    },
    {
      id: "boat_options",
      question: "How will you get to TVC?",
      info: "We have two options: Local lanchas (50,000 COP) from behind Bocagrande Hospital, or premium TVC Boating from Todomar Marina (Pescadito 200K one-way, Colibri One 450K one-way). Guests who book directly enjoy complimentary transfers!",
    },
  ],

  pre_arrival: [
    {
      id: "cash",
      question: "Do you have Colombian pesos?",
      info: "IMPORTANT: There are NO ATMs on Tierra Bomba! TVC only accepts cards, but local businesses only accept cash. Get pesos at the airport before coming.",
    },
    {
      id: "packing",
      question: "Have you packed everything?",
      info: "Light clothes, sunscreen, mosquito repellent, water shoes (for exploring beaches with rocks), small flashlight for nighttime walks on the island.",
    },
    {
      id: "boat_schedule",
      question: "Know the boat times?",
      info: "From Cartagena to TVC: 3:00 PM and 6:30 PM. From TVC to Cartagena: 8:00 AM and 11:00 AM. Night return at 12:00 AM (extra fees after midnight).",
    },
  ],

  on_property: [
    {
      id: "no_hot_water",
      question: "Expecting hot water?",
      info: "Our showers offer refreshing, climate-temperature water - perfect for cooling off in the tropical heat! It's part of our eco-friendly approach.",
    },
    {
      id: "ac",
      question: "Need air conditioning?",
      info: "Our villas stay cool with natural cross-breezes and powerful industrial fans, but portable AC is available on request if you prefer.",
    },
    {
      id: "pool_hours",
      question: "When is the pool open?",
      info: "Pool & Jacuzzi are open 7:00 AM - 10:00 PM. No glass containers allowed for safety!",
    },
    {
      id: "restaurant_hours",
      question: "When can you eat?",
      info: "Breakfast 7:30-9:30am, Lunch 11:30am-2pm, Dinner 4-8pm. After 8pm? We have After Hours Snack Boxes!",
    },
  ],

  departing: [
    {
      id: "checkout",
      question: "Ready for checkout?",
      info: "Checkout is by 11:00 AM. Boats leave at 8:00 AM and 11:00 AM. Need late checkout? Ask in advance (extra charge may apply).",
    },
  ],
};
