// TVC Welcome Guide - Packages, Inclusions & Pricing

export interface Inclusion {
  id: string;
  name: string;
  description: string;
  pricePerPerson: number; // COP
  priceFlat?: number; // Flat rate if not per person
  isPerPerson: boolean;
  category: "accommodation" | "experience" | "dining" | "transport" | "addon";
  includedByDefault?: boolean;
}

export interface DayTemplate {
  id: string;
  title: string;
  tagline: string;
  activities: {
    time: string;
    activity: string;
  }[];
}

export const INCLUSIONS: Inclusion[] = [
  // Accommodation
  {
    id: "tiny-village-takeover",
    name: "Tiny Village Takeover Package",
    description: "Private access to entire Tiny Village Cartagena resort",
    pricePerPerson: 450000,
    isPerPerson: true,
    category: "accommodation",
    includedByDefault: true,
  },
  {
    id: "daily-breakfast",
    name: "Daily Breakfast",
    description: "Breakfast included for all guests every morning",
    pricePerPerson: 0,
    isPerPerson: true,
    category: "dining",
    includedByDefault: true,
  },
  {
    id: "welcome-happy-hour",
    name: "Welcome Happy Hour at TVC",
    description: "Signature drink happy hour on arrival",
    pricePerPerson: 50000,
    isPerPerson: true,
    category: "dining",
    includedByDefault: true,
  },
  // Experiences
  {
    id: "palenque-culture",
    name: "Palenque Culture Experience",
    description:
      "Immerse yourself in the vibrant history, traditions, and culture of Palenque",
    pricePerPerson: 280000,
    isPerPerson: true,
    category: "experience",
  },
  {
    id: "rosario-islands",
    name: "Cholón & Rosario Islands Escape",
    description:
      "Full-day island adventure through the Rosario Islands with party experience in Cholón",
    pricePerPerson: 350000,
    isPerPerson: true,
    category: "experience",
  },
  {
    id: "bottomless-brunch",
    name: "The Brunch",
    description: "Bottomless brunch, island vibes, and unforgettable energy",
    pricePerPerson: 185000,
    isPerPerson: true,
    category: "dining",
  },
  {
    id: "sunset-boat-tour",
    name: "Sunset Bay Tour",
    description: "Evening cruise around the bay watching the sunset",
    pricePerPerson: 200000,
    isPerPerson: true,
    category: "experience",
  },
  {
    id: "private-dinner",
    name: "Private Chef Dinner",
    description: "4-course Cartagena Culture Menu by our private chef",
    pricePerPerson: 235000,
    isPerPerson: true,
    category: "dining",
  },
  // Transport
  {
    id: "airport-transfer",
    name: "Airport Transfers",
    description: "Round-trip private transport from Rafael Núñez Airport",
    priceFlat: 180000,
    pricePerPerson: 0,
    isPerPerson: false,
    category: "transport",
  },
  {
    id: "boat-transfers",
    name: "Boat Transfers",
    description: "All boat transfers to/from Tierra Bomba island included",
    pricePerPerson: 0,
    isPerPerson: true,
    category: "transport",
    includedByDefault: true,
  },
  // Add-ons
  {
    id: "tailored-experiences",
    name: "Tailored Experiences & Local Picks",
    description: "Handpicked daytime activities and nightlife recommendations",
    pricePerPerson: 0,
    isPerPerson: true,
    category: "addon",
    includedByDefault: true,
  },
  {
    id: "city-tour",
    name: "Cartagena City Tour",
    description: "Guided walking tour through the historic walled city",
    pricePerPerson: 120000,
    isPerPerson: true,
    category: "experience",
  },
  {
    id: "spa-day",
    name: "Spa & Wellness Day",
    description: "Full spa treatment at partner wellness center",
    pricePerPerson: 320000,
    isPerPerson: true,
    category: "addon",
  },
];

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: "arrival",
    title: "The Arrival",
    tagline: "You're here. You made it. Best life activated!",
    activities: [
      { time: "11:00am - 2:00pm", activity: "Arrival" },
      { time: "3:00pm", activity: "Check in Tiny Village Cartagena" },
      { time: "5:00 - 7:00pm", activity: "Welcome Happy Hour at TVC" },
      {
        time: "7:00pm",
        activity: "Welcome Dinner at recommended restaurant in Cartagena",
      },
    ],
  },
  {
    id: "culture",
    title: "THE CULTURE",
    tagline:
      "A day in the life. Getting to know what it is to be from Cartagena. Past, present and future.",
    activities: [
      { time: "7:30 am - 8:30am", activity: "Breakfast at TVC" },
      { time: "8:30 am", activity: "Departure from TVC" },
      { time: "9:00 am", activity: "Departure from Cartagena to Palenque" },
      { time: "10:30am", activity: "Arrival at Palenque" },
      {
        time: "10:30 am - 2pm",
        activity: "Palenque Cultural Experience (Lunch Included)",
      },
      { time: "2:00 pm", activity: "Departure from Palenque" },
      { time: "5:00pm - 7:00pm", activity: "Rest and relaxation at TVC" },
      { time: "8:00pm - Until", activity: "Dinner and Night out in the city" },
    ],
  },
  {
    id: "islands",
    title: "The Islands",
    tagline:
      "Cartagena has some of the most incredible islands in the world, and in turn, most incredible island parties. We'll be taking the group on an amazing boat trip to Cholon island to Party, party!",
    activities: [
      { time: "7:00 am - 8:00am", activity: "Breakfast at TVC" },
      { time: "8:30 am", activity: "Departure for Rosario Islands" },
      {
        time: "8:30am - 5:00pm",
        activity: "Cholon Boat/Island Party (Full day excursion)",
      },
      { time: "6:00pm - 7:00pm", activity: "Rest and Recovery" },
      { time: "7:00pm", activity: "Dinner at TVC" },
    ],
  },
  {
    id: "brunch",
    title: "The Brunch",
    tagline:
      "How can you live the brunch lifestyle without a bottomless brunch party — on an island? That would be strange, right? Well, you are in luck. Welcome to the GREAT life!",
    activities: [
      { time: "8:00 am - 9:30am", activity: "Breakfast at TVC" },
      {
        time: "11:00 am - 4pm",
        activity: "Village People Bottomless Brunch @ TVC",
      },
      { time: "4:00pm - 5:00pm", activity: "Rest and relaxation" },
      { time: "5:00pm - 7:00pm", activity: "Sunset rooftop drinks" },
      { time: "7:00pm - All night", activity: "Night out in the city" },
    ],
  },
  {
    id: "departure",
    title: "The Departure",
    tagline:
      "You don't have to go home, but ya got to get the hell up out of here! Sadly, our trip has come to the end",
    activities: [
      { time: "9:00 am", activity: "Breakfast at TVC" },
      { time: "11:00am", activity: "Check out" },
    ],
  },
  {
    id: "free-day",
    title: "Free Day",
    tagline: "Your day, your way. Explore at your own pace or relax at TVC.",
    activities: [
      { time: "8:00 am - 10:00am", activity: "Breakfast at TVC" },
      {
        time: "All day",
        activity: "Free time - explore, relax, or book additional experiences",
      },
      { time: "7:00pm", activity: "Dinner recommendations available" },
    ],
  },
  {
    id: "city-exploration",
    title: "City Exploration",
    tagline:
      "Get lost in the colorful streets of one of the most beautiful cities in the world.",
    activities: [
      { time: "8:00 am - 9:30am", activity: "Breakfast at TVC" },
      { time: "10:00 am", activity: "Boat to Cartagena" },
      {
        time: "10:30 am - 1:00pm",
        activity: "Walking tour of the Walled City",
      },
      { time: "1:00pm - 3:00pm", activity: "Lunch in Getsemaní" },
      { time: "3:00pm - 6:00pm", activity: "Shopping & exploration" },
      { time: "7:00pm", activity: "Dinner in the city" },
      { time: "10:00pm - Until", activity: "Nightlife" },
    ],
  },
];

export const formatCOP = (amount: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatUSD = (copAmount: number): string => {
  const usdAmount = copAmount / 4000; // Approximate conversion rate
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usdAmount);
};

export const getDayOfWeek = (date: Date): string => {
  return date.toLocaleDateString("en-US", { weekday: "long" });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDateRange = (checkIn: Date, checkOut: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const checkInStr = checkIn.toLocaleDateString("en-US", options);
  const checkOutStr = checkOut.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });
  return `${checkInStr} - ${checkOutStr}`;
};
