// TVC Welcome Guide PDF Template - Exact Match to Original

export interface WelcomeGuideData {
  groupName: string;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  selectedInclusions: string[];
  itinerary: {
    dayNumber: number;
    date: Date;
    templateId: string;
  }[];
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateRange = (checkIn: Date, checkOut: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const checkInStr = checkIn.toLocaleDateString("en-US", options);
  const checkOutStr = checkOut.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });
  return `${checkInStr} - ${checkOutStr}`;
};

const STATIC_CONTENT = {
  goTime: {
    title: "It's GO TIME",
    body: `Welcome to Cartagena, one of the most colorful and culture-rich cities in the world. We've curated a custom experience for you that captures the absolute best of this historic city's fusion of Latin, Afro-Caribbean vibes. You'll be plugged into the local scene via cultural immersions, mouth-watering cuisine, tropical beach-side views, and the sights and sounds of this 16th-century city. You'll have private access to exclusive location(s) as we level up your vacation from "in your dreams" to "Wow, this is how you live life!"

Rest easy, turn up, discover, and enjoy! With us you don't worry about tourist traps, where to stay, where to eat, none of that. We have you covered! Come and indulge in a one-of-a-kind authentic Colombian experience, curated for us, by us!`,
  },
  city: {
    title: "THE CITY",
    body: `Cartagena is one of the most visited cities in the world because the beauty of its landscapes and architecture, and its unique culture and cuisine. All of these are reasons why Cartagena was named a UNESCO World Heritage site. You'll experience all of this on your trip, plus, "we know what you came here for" — TO PARTY! Cartagena is notorious for its 7 day a week party atmosphere, and, yes, we will partake!`,
  },
  property: {
    title: "THE PROPERTY",
    body: `Tiny Village Cartagena is one of the most unique properties that can be found in the world! This property embodies a unique mix of culture, history, art, design and eco-friendly building concepts, in magical "tiny house resort" located just off the coast of Cartagena, Colombia. You and your group will enjoy all of amenities of our property including pool, roof terrace lounge, full bar, restaurant, and of course our tiny houses, which have been designed to replicate the famous look and feel of the spanish colonial houses that have made Cartagena so famous! We are sure you'll LOVE IT!`,
  },
  culture: {
    title: "THE CULTURE",
    body: `Cartagena is a city overflowing with culture. From the food, to the music, to the art to the history, everything in this city screams culture. On this trip, you'll get an up and personal look into one of the most significant pieces of Cartagena's culture— It's African heritage. During our trip to San Basilio de Palenque (often known as just "Palenque") learn about the rich history of this town which was the first freed African settlement in the Americas, and how they've preserved their language, culture and customs. We'll experience the dance, music, boxing, food and culture that has made this town so famous.`,
  },
  islands: {
    title: "THE ISLANDS",
    body: `Have you ever heard of the "Rosario Islands"? If not, look it up! Some of the most beautiful islands in the world are just a short boat trip away — but, getting there is half the fun! We'll be embarking on one of the biggest, smoothest Catamaran's in Colombia, equipped with two bathrooms, and 4 bedrooms. We'll take off from Cartagena at 9am, and will have a day of partying, while careening through the beautiful blue waters of the Caribbean Sea. We'll land at the "Saint Tropez" of the Caribbean at the Island of Cholon, where we'll party and have lunch until we make our way back to Cartagena just in time for a beautiful sunset over the city.`,
  },
  brunch: {
    title: "THE BRUNCH",
    body: `Brunch is a lifestyle! — and life doesn't get much better than TVC's Bottomless brunch event. Here, you will have unlimited, and unfiltered access to Tiny Village Cartagena! Our chef and staff will make sure all your needs are met while you are leisurely basking in the sun, enjoying our beautiful pool and panoramic views of the city, and vining to the music you love. Oh, and what is brunch without BOTTOM MIMOSAS? Yes. But, let's add bottomless tapas to the list too! It doesn't get much better than this!`,
  },
  whoWeAre: {
    title: "WHO WE ARE",
    body: `We're Tiny Village Cartagena— Meet our ecosystem of friends, adventure-seekers, culture enthusiasts, art + music lovers, environmentalists, foodies, party-goers, explorers and more….

A community of diverse locals & travelers from around the world.

Together, we are creating a travel experience crafted through the lens of the local vibe.

To us, no one is considered tourists, because we believe in connecting and finding your tribe, your home wherever you are.

When we started the Tiny Village Cartagena Boutique Resort project in 2017, we made a conscious effort to not be just another beach bar and boutique hotel, but at Tiny Village a good time + stay is always-coupled with doing good for the world around us (we call that eco-leisure). Come visit us on the Island of Tierra Bomba — less than 10 minute boat ride from the city center of Cartagena!`,
  },
};

const DAY_TEMPLATES: Record<
  string,
  {
    title: string;
    tagline: string;
    activities: { time: string; activity: string }[];
  }
> = {
  arrival: {
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
  culture: {
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
  islands: {
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
  brunch: {
    title: "The Brunch",
    tagline:
      "How can you live the brunch lifestyle without a bottomless brunch party — on an island? that would be strange, right? Well, you are in luck. Welcome to the GREAT life!",
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
  departure: {
    title: "The Departure",
    tagline:
      "You don't have to go home, but ya got to get the hell up out of here! Sadly, our trip has come to the end",
    activities: [
      { time: "9:00 am", activity: "Breakfast at TVC" },
      { time: "11:00am", activity: "Check out" },
    ],
  },
  "free-day": {
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
};

const INCLUSION_LABELS: Record<string, { name: string; description: string }> =
  {
    "tiny-village-takeover": {
      name: "Tiny Village Takeover package",
      description: "Private access to entire Tiny Village Cartagena resort",
    },
    "daily-breakfast": {
      name: "Daily Breakfast",
      description: "Breakfast included for all guests",
    },
    "welcome-happy-hour": {
      name: "Welcome Happy Hour at TVC",
      description: "Signature drink happy hour",
    },
    "palenque-culture": {
      name: "Palenque Culture Experience",
      description:
        "Immerse yourself in the vibrant history, traditions, and culture of Palenque.",
    },
    "rosario-islands": {
      name: "Cholón & Rosario Islands Escape",
      description:
        "A full-day island adventure through the Rosario Islands, ending with a vibrant party experience in the crystal-clear waters of Cholón.",
    },
    "bottomless-brunch": {
      name: "The Brunch",
      description: "Bottomless brunch, island vibes, and unforgettable energy.",
    },
    "tailored-experiences": {
      name: "Tailored Experiences & Local Picks",
      description:
        "Handpicked daytime activities and nightlife recommendations, thoughtfully curated to match your style and preferences.",
    },
  };

export function generatePDFHTML(
  data: WelcomeGuideData,
  baseUrl: string,
): string {
  const dateRange = formatDateRange(data.checkIn, data.checkOut);
  const numberOfNights = Math.ceil(
    (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Build inclusions list
  const inclusionsList = data.selectedInclusions
    .map((id) => INCLUSION_LABELS[id])
    .filter(Boolean);

  // Build day pages
  const dayPages = data.itinerary.map((day) => {
    const template = DAY_TEMPLATES[day.templateId] || DAY_TEMPLATES["free-day"];
    return {
      dayNumber: day.dayNumber,
      date: formatDate(day.date),
      shortDate: day.date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      ...template,
    };
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 1920px 1440px;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Montserrat', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 1920px;
      height: 1440px;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .page:last-child {
      page-break-after: auto;
    }

    /* Colors */
    .bg-teal { background-color: #0f3d3e; }
    .bg-dark { background-color: #1a1a1a; }
    .text-white { color: #ffffff; }
    .text-orange { color: #f97316; }
    .text-white-60 { color: rgba(255,255,255,0.6); }
    .text-white-80 { color: rgba(255,255,255,0.8); }

    /* Fonts */
    .font-script { font-family: 'Great Vibes', cursive; }
    .font-serif { font-family: 'Playfair Display', Georgia, serif; }
    .font-sans { font-family: 'Montserrat', sans-serif; }

    /* TVC Logo */
    .tvc-logo {
      width: 80px;
      height: auto;
    }
    .tvc-logo-large {
      width: 120px;
      height: auto;
    }

    /* Diamond Photo Grid */
    .diamond {
      clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      object-fit: cover;
    }

    /* Footer */
    .footer {
      position: absolute;
      bottom: 40px;
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 16px;
      color: rgba(255,255,255,0.6);
    }
    .footer-left { left: 40px; }
    .footer-center { left: 50%; transform: translateX(-50%); }
    .footer-right { right: 40px; }

    /* Orange Arrow Bullet */
    .bullet-arrow {
      color: #f97316;
      margin-right: 12px;
      font-size: 20px;
    }

    /* Page-specific styles */
    .cover-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 20px;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .split-layout {
      display: flex;
      height: 100%;
    }
    .split-left {
      width: 40%;
      position: relative;
    }
    .split-right {
      width: 60%;
      position: relative;
    }

    .diamond-grid-left {
      width: 45%;
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-content: center;
      gap: 0;
    }

    .content-right {
      width: 55%;
      padding: 80px 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .section-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900;
      font-size: 48px;
      letter-spacing: 0.15em;
      color: white;
      margin-bottom: 30px;
    }

    .section-body {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 22px;
      line-height: 1.6;
      color: white;
    }

    .inclusion-item {
      margin-bottom: 24px;
    }
    .inclusion-title {
      font-weight: 700;
      font-size: 20px;
      color: white;
    }
    .inclusion-desc {
      font-size: 16px;
      color: rgba(255,255,255,0.8);
      margin-top: 4px;
    }

    .day-header {
      font-family: 'Montserrat', sans-serif;
      font-weight: 900;
      font-size: 72px;
      color: white;
      letter-spacing: 0.1em;
    }
    .day-date {
      font-family: 'Montserrat', sans-serif;
      font-size: 24px;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.2em;
      margin-top: 10px;
    }
    .day-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 40px;
      color: white;
      margin-top: 20px;
    }
    .day-tagline {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-size: 22px;
      color: rgba(255,255,255,0.9);
      margin-top: 20px;
      line-height: 1.5;
    }
    .activity-item {
      display: flex;
      align-items: flex-start;
      margin-top: 16px;
      font-size: 18px;
      color: white;
    }
    .activity-time {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
      font-weight: 700;
    }
    .activity-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-style: italic;
    }

    /* Red accent bar */
    .red-accent {
      background-color: #DC2626;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER -->
  <div class="page bg-dark" style="position: relative;">
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;">
      <img src="${baseUrl}/tvc-assets/tvc-000.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-001.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-002.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-003.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-004.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-005.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-006.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-007.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-008.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-009.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-010.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
      <img src="${baseUrl}/tvc-assets/tvc-011.png" style="width: 100%; height: 360px; object-fit: cover; opacity: 0.7;">
    </div>
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%);"></div>
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 10;">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="width: 140px; margin-bottom: 20px;">
      <div style="font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.3em; color: rgba(255,255,255,0.8); margin-bottom: 40px;">PRESENTS:</div>
      <div style="font-family: 'Great Vibes', cursive; font-size: 140px; color: white; line-height: 1;">${data.groupName}</div>
      <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 32px; color: rgba(255,255,255,0.8); margin-top: 30px;">${dateRange}</div>
    </div>
    <div class="footer footer-left">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 2: IT'S GO TIME -->
  <div class="page" style="display: flex;">
    <div style="width: 40%; position: relative;">
      <div class="red-accent"></div>
      <div style="position: relative; z-index: 10; padding: 100px 50px; color: white;">
        <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 700; font-size: 72px;">It's GO</div>
        <div style="font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 48px; letter-spacing: 0.3em;">TIME</div>
        <div style="font-family: 'Montserrat', sans-serif; font-size: 18px; line-height: 1.8; margin-top: 60px; max-width: 400px;">${STATIC_CONTENT.goTime.body}</div>
      </div>
    </div>
    <div style="width: 60%; position: relative;">
      <img src="${baseUrl}/tvc-assets/tvc-013.png" style="width: 100%; height: 100%; object-fit: cover;">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
    </div>
    <div class="footer footer-left">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 3: WHAT'S INCLUDED -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-014.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
      <img src="${baseUrl}/tvc-assets/tvc-015.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
      <img src="${baseUrl}/tvc-assets/tvc-016.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
      <img src="${baseUrl}/tvc-assets/tvc-017.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
      <img src="${baseUrl}/tvc-assets/tvc-018.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
      <img src="${baseUrl}/tvc-assets/tvc-019.png" class="diamond" style="width: 300px; height: 300px; margin: -50px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">WHAT's INCLUDED</div>
      <div style="margin-top: 20px;">
        <div class="inclusion-item">
          <div style="display: flex; align-items: flex-start;">
            <span class="bullet-arrow">▼</span>
            <div>
              <div class="inclusion-title">${numberOfNights + 1} day, ${numberOfNights} Night "Tiny Village Takeover" package</div>
              <div class="inclusion-desc">Private access to entire Tiny Village Cartagena resort</div>
            </div>
          </div>
        </div>
        ${inclusionsList
          .map(
            (inc) => `
        <div class="inclusion-item">
          <div style="display: flex; align-items: flex-start;">
            <span class="bullet-arrow">▼</span>
            <div>
              <div class="inclusion-title">${inc.name}</div>
              <div class="inclusion-desc">${inc.description}</div>
            </div>
          </div>
        </div>
        `,
          )
          .join("")}
      </div>
    </div>
  </div>

  <!-- PAGE 4: THE CITY -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-020.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-021.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-022.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-023.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">${STATIC_CONTENT.city.title}</div>
      <div class="section-body">${STATIC_CONTENT.city.body}</div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 5: THE PROPERTY -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-024.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-025.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-026.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-027.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">${STATIC_CONTENT.property.title}</div>
      <div class="section-body">${STATIC_CONTENT.property.body}</div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 6: THE CULTURE -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-028.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-029.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-030.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-031.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">${STATIC_CONTENT.culture.title}</div>
      <div class="section-body">${STATIC_CONTENT.culture.body}</div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 7: THE ISLANDS -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-032.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-033.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-034.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-035.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">${STATIC_CONTENT.islands.title}</div>
      <div class="section-body">${STATIC_CONTENT.islands.body}</div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- PAGE 8: THE BRUNCH -->
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-036.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-037.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-038.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
      <img src="${baseUrl}/tvc-assets/tvc-039.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="section-title">${STATIC_CONTENT.brunch.title}</div>
      <div class="section-body">${STATIC_CONTENT.brunch.body}</div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
      <span>www.tinyvillagecartagena.com</span>
    </div>
  </div>

  <!-- PAGE 9: DIVIDER -->
  <div class="page" style="position: relative;">
    <img src="${baseUrl}/tvc-assets/tvc-040.png" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3);"></div>
    <div style="position: absolute; top: 80px; left: 60px; z-index: 10;">
      <div style="font-family: 'Great Vibes', cursive; font-size: 100px; color: white;">${data.groupName}</div>
      <div style="font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; color: rgba(255,255,255,0.8); margin-top: 10px;">${dateRange}</div>
    </div>
    <img src="${baseUrl}/tvc-assets/tvc-041.png" style="position: absolute; top: 40px; right: 60px; width: 160px; z-index: 10;">
    <div class="footer footer-right" style="z-index: 10;">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>

  <!-- DAY PAGES -->
  ${dayPages
    .map(
      (day, idx) => `
  <div class="page bg-teal" style="display: flex;">
    <div class="diamond-grid-left" style="padding: 40px;">
      <img src="${baseUrl}/tvc-assets/tvc-${String(42 + idx * 4).padStart(3, "0")}.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;" onerror="this.src='${baseUrl}/tvc-assets/tvc-042.png'">
      <img src="${baseUrl}/tvc-assets/tvc-${String(43 + idx * 4).padStart(3, "0")}.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;" onerror="this.src='${baseUrl}/tvc-assets/tvc-043.png'">
      <img src="${baseUrl}/tvc-assets/tvc-${String(44 + idx * 4).padStart(3, "0")}.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;" onerror="this.src='${baseUrl}/tvc-assets/tvc-044.png'">
      <img src="${baseUrl}/tvc-assets/tvc-${String(45 + idx * 4).padStart(3, "0")}.png" class="diamond" style="width: 350px; height: 350px; margin: -60px;" onerror="this.src='${baseUrl}/tvc-assets/tvc-045.png'">
    </div>
    <div class="content-right">
      <img src="${baseUrl}/tvc-assets/tvc-012.png" style="position: absolute; top: 40px; right: 40px; width: 80px;">
      <div class="day-header">Day ${day.dayNumber}:</div>
      <div class="day-date">${day.shortDate}</div>
      <div class="day-title">${day.title}</div>
      <div class="day-tagline">${day.tagline}</div>
      <div style="margin-top: 30px;">
        ${day.activities
          .map(
            (act) => `
        <div class="activity-item">
          <span class="bullet-arrow">▼</span>
          <span class="activity-time">${act.time}:</span>&nbsp;
          <span class="activity-text">${act.activity}</span>
        </div>
        `,
          )
          .join("")}
      </div>
    </div>
    <div class="footer footer-center">
      <span>📷 TinyVillageCartagena</span>
      <span>✉ info@tinyvillagecolombia.com</span>
    </div>
  </div>
  `,
    )
    .join("")}

  <!-- PAGE 15: WHO WE ARE -->
  <div class="page" style="display: flex;">
    <div style="width: 50%; position: relative;">
      <img src="${baseUrl}/tvc-assets/tvc-080.png" style="width: 100%; height: 100%; object-fit: cover;">
    </div>
    <div style="width: 50%; background-color: #0f3d3e; padding: 80px 60px; color: white;">
      <img src="${baseUrl}/tvc-assets/tvc-041.png" style="width: 160px; margin-bottom: 20px;">
      <div class="section-title" style="font-size: 40px;">WHO WE ARE</div>
      <div style="font-size: 18px; line-height: 1.8; white-space: pre-line;">${STATIC_CONTENT.whoWeAre.body}</div>
      <div style="position: absolute; bottom: 60px; right: 60px; font-size: 14px; color: rgba(255,255,255,0.6);">
        <div>📷 TinyVillageCartagena</div>
        <div>✉ info@tinyvillagecolombia.com</div>
      </div>
    </div>
  </div>

</body>
</html>
`;
}
