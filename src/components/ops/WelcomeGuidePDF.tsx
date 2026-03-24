"use client";

import { forwardRef } from "react";

export interface WelcomeGuideData {
  groupName: string;
  checkIn: Date;
  checkOut: Date;
  selectedInclusions: string[];
  itinerary: {
    dayNumber: number;
    date: Date;
    templateId: string;
  }[];
}

const formatDateRange = (checkIn: Date, checkOut: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const checkInStr = checkIn.toLocaleDateString("en-US", options);
  const checkOutStr = checkOut.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });
  return `${checkInStr} - ${checkOutStr}`;
};

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const STATIC_CONTENT = {
  goTime: `Welcome to Cartagena, one of the most colorful and culture-rich cities in the world. We've curated a custom experience for you that captures the absolute best of this historic city's fusion of Latin, Afro-Caribbean vibes. You'll be plugged into the local scene via cultural immersions, mouth-watering cuisine, tropical beach-side views, and the sights and sounds of this 16th-century city. You'll have private access to exclusive location(s) as we level up your vacation from "in your dreams" to "Wow, this is how you live life!"

Rest easy, turn up, discover, and enjoy! With us you don't worry about tourist traps, where to stay, where to eat, none of that. We have you covered! Come and indulge in a one-of-a-kind authentic Colombian experience, curated for us, by us!`,
  city: `Cartagena is one of the most visited cities in the world because the beauty of its landscapes and architecture, and its unique culture and cuisine. All of these are reasons why Cartagena was named a UNESCO World Heritage site. You'll experience all of this on your trip, plus, "we know what you came here for" — TO PARTY! Cartagena is notorious for its 7 day a week party atmosphere, and, yes, we will partake!`,
  property: `Tiny Village Cartagena is one of the most unique properties that can be found in the world! This property embodies a unique mix of culture, history, art, design and eco-friendly building concepts, in magical "tiny house resort" located just off the coast of Cartagena, Colombia. You and your group will enjoy all of amenities of our property including pool, roof terrace lounge, full bar, restaurant, and of course our tiny houses, which have been designed to replicate the famous look and feel of the spanish colonial houses that have made Cartagena so famous! We are sure you'll LOVE IT!`,
  culture: `Cartagena is a city overflowing with culture. From the food, to the music, to the art to the history, everything in this city screams culture. On this trip, you'll get an up and personal look into one of the most significant pieces of Cartagena's culture— It's African heritage. During our trip to San Basilio de Palenque (often known as just "Palenque") learn about the rich history of this town which was the first freed African settlement in the Americas, and how they've preserved their language, culture and customs. We'll experience the dance, music, boxing, food and culture that has made this town so famous.`,
  islands: `Have you ever heard of the "Rosario Islands"? If not, look it up! Some of the most beautiful islands in the world are just a short boat trip away — but, getting there is half the fun! We'll be embarking on one of the biggest, smoothest Catamaran's in Colombia, equipped with two bathrooms, and 4 bedrooms. We'll take off from Cartagena at 9am, and will have a day of partying, while careening through the beautiful blue waters of the Caribbean Sea. We'll land at the "Saint Tropez" of the Caribbean at the Island of Cholon, where we'll party and have lunch until we make our way back to Cartagena just in time for a beautiful sunset over the city.`,
  brunch: `Brunch is a lifestyle! — and life doesn't get much better than TVC's Bottomless brunch event. Here, you will have unlimited, and unfiltered access to Tiny Village Cartagena! Our chef and staff will make sure all your needs are met while you are leisurely basking in the sun, enjoying our beautiful pool and panoramic views of the city, and vining to the music you love. Oh, and what is brunch without BOTTOM MIMOSAS? Yes. But, let's add bottomless tapas to the list too! It doesn't get much better than this!`,
  whoWeAre: `We're Tiny Village Cartagena— Meet our ecosystem of friends, adventure-seekers, culture enthusiasts, art + music lovers, environmentalists, foodies, party-goers, explorers and more….

A community of diverse locals & travelers from around the world.

Together, we are creating a travel experience crafted through the lens of the local vibe.

To us, no one is considered tourists, because we believe in connecting and finding your tribe, your home wherever you are.

When we started the Tiny Village Cartagena Boutique Resort project in 2017, we made a conscious effort to not be just another beach bar and boutique hotel, but at Tiny Village a good time + stay is always-coupled with doing good for the world around us (we call that eco-leisure). Come visit us on the Island of Tierra Bomba — less than 10 minute boat ride from the city center of Cartagena!`,
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

// Page component styles
const pageStyle: React.CSSProperties = {
  width: "1920px",
  height: "1440px",
  position: "relative",
  overflow: "hidden",
  fontFamily: "'Montserrat', sans-serif",
};

const tealBg = "#0f3d3e";

interface WelcomeGuidePDFProps {
  data: WelcomeGuideData;
}

export const WelcomeGuidePDF = forwardRef<HTMLDivElement, WelcomeGuidePDFProps>(
  function WelcomeGuidePDF({ data }, ref) {
    const dateRange = formatDateRange(data.checkIn, data.checkOut);
    const numberOfNights = Math.ceil(
      (data.checkOut.getTime() - data.checkIn.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const inclusionsList = data.selectedInclusions
      .map((id) => INCLUSION_LABELS[id])
      .filter(Boolean);

    return (
      <div ref={ref} style={{ background: "#fff" }}>
        {/* PAGE 1: COVER */}
        <div style={{ ...pageStyle, background: "#1a1a1a" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "100%",
                  height: "360px",
                  objectFit: "cover",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt="TVC Logo"
              style={{ width: "140px", marginBottom: "20px" }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "0.3em",
                color: "rgba(255,255,255,0.8)",
                marginBottom: "40px",
              }}
            >
              PRESENTS:
            </div>
            <div
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: "140px",
                color: "white",
                lineHeight: 1,
              }}
            >
              {data.groupName}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "32px",
                color: "rgba(255,255,255,0.8)",
                marginTop: "30px",
              }}
            >
              {dateRange}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: "40px",
              display: "flex",
              gap: "20px",
              fontSize: "16px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <span>📷 TinyVillageCartagena</span>
            <span>✉ info@tinyvillagecolombia.com</span>
          </div>
        </div>

        {/* PAGE 2: IT'S GO TIME */}
        <div style={{ ...pageStyle, display: "flex" }}>
          <div
            style={{
              width: "40%",
              background: "#DC2626",
              padding: "100px 50px",
              color: "white",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: "72px",
              }}
            >
              It&apos;s GO
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "48px",
                letterSpacing: "0.3em",
              }}
            >
              TIME
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: "18px",
                lineHeight: 1.8,
                marginTop: "60px",
                maxWidth: "400px",
                whiteSpace: "pre-line",
              }}
            >
              {STATIC_CONTENT.goTime}
            </div>
          </div>
          <div style={{ width: "60%", position: "relative" }}>
            <img
              src="/tvc-assets/tvc-013.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
          </div>
        </div>

        {/* PAGE 3: WHAT'S INCLUDED */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[14, 15, 16, 17, 18, 19].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "300px",
                  height: "300px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-50px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              WHAT&apos;s INCLUDED
            </div>
            <div style={{ marginTop: "20px" }}>
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <span
                    style={{
                      color: "#f97316",
                      marginRight: "12px",
                      fontSize: "20px",
                    }}
                  >
                    ▼
                  </span>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "20px",
                        color: "white",
                      }}
                    >
                      {numberOfNights + 1} day, {numberOfNights} Night
                      &quot;Tiny Village Takeover&quot; package
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "rgba(255,255,255,0.8)",
                        marginTop: "4px",
                      }}
                    >
                      Private access to entire Tiny Village Cartagena resort
                    </div>
                  </div>
                </div>
              </div>
              {inclusionsList.map((inc, i) => (
                <div key={i} style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <span
                      style={{
                        color: "#f97316",
                        marginRight: "12px",
                        fontSize: "20px",
                      }}
                    >
                      ▼
                    </span>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "20px",
                          color: "white",
                        }}
                      >
                        {inc.name}
                      </div>
                      <div
                        style={{
                          fontSize: "16px",
                          color: "rgba(255,255,255,0.8)",
                          marginTop: "4px",
                        }}
                      >
                        {inc.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PAGE 4: THE CITY */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[20, 21, 22, 23].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "350px",
                  height: "350px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-60px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              THE CITY
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                lineHeight: 1.6,
                color: "white",
              }}
            >
              {STATIC_CONTENT.city}
            </div>
          </div>
        </div>

        {/* PAGE 5: THE PROPERTY */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[24, 25, 26, 27].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "350px",
                  height: "350px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-60px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              THE PROPERTY
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                lineHeight: 1.6,
                color: "white",
              }}
            >
              {STATIC_CONTENT.property}
            </div>
          </div>
        </div>

        {/* PAGE 6: THE CULTURE */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[28, 29, 30, 31].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "350px",
                  height: "350px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-60px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              THE CULTURE
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                lineHeight: 1.6,
                color: "white",
              }}
            >
              {STATIC_CONTENT.culture}
            </div>
          </div>
        </div>

        {/* PAGE 7: THE ISLANDS */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[32, 33, 34, 35].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "350px",
                  height: "350px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-60px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              THE ISLANDS
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                lineHeight: 1.6,
                color: "white",
              }}
            >
              {STATIC_CONTENT.islands}
            </div>
          </div>
        </div>

        {/* PAGE 8: THE BRUNCH */}
        <div style={{ ...pageStyle, display: "flex", background: tealBg }}>
          <div
            style={{
              width: "45%",
              padding: "40px",
              display: "flex",
              flexWrap: "wrap",
              alignContent: "center",
            }}
          >
            {[36, 37, 38, 39].map((i) => (
              <img
                key={i}
                src={`/tvc-assets/tvc-${String(i).padStart(3, "0")}.png`}
                alt=""
                style={{
                  width: "350px",
                  height: "350px",
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  objectFit: "cover",
                  margin: "-60px",
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "55%",
              padding: "80px 60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <img
              src="/tvc-assets/tvc-012.png"
              alt=""
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                width: "80px",
              }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "48px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              THE BRUNCH
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "22px",
                lineHeight: 1.6,
                color: "white",
              }}
            >
              {STATIC_CONTENT.brunch}
            </div>
          </div>
        </div>

        {/* PAGE 9: DIVIDER */}
        <div style={{ ...pageStyle, position: "relative" }}>
          <img
            src="/tvc-assets/tvc-040.png"
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.3)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "80px",
              left: "60px",
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: "100px",
                color: "white",
              }}
            >
              {data.groupName}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: "28px",
                color: "rgba(255,255,255,0.8)",
                marginTop: "10px",
              }}
            >
              {dateRange}
            </div>
          </div>
          <img
            src="/tvc-assets/tvc-041.png"
            alt=""
            style={{
              position: "absolute",
              top: "40px",
              right: "60px",
              width: "160px",
              zIndex: 10,
            }}
          />
        </div>

        {/* DAY PAGES */}
        {data.itinerary.map((day, idx) => {
          const template =
            DAY_TEMPLATES[day.templateId] || DAY_TEMPLATES["free-day"];
          return (
            <div
              key={idx}
              style={{ ...pageStyle, display: "flex", background: tealBg }}
            >
              <div
                style={{
                  width: "45%",
                  padding: "40px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignContent: "center",
                }}
              >
                {[42 + idx * 4, 43 + idx * 4, 44 + idx * 4, 45 + idx * 4].map(
                  (i) => (
                    <img
                      key={i}
                      src={`/tvc-assets/tvc-${String(Math.min(i, 86)).padStart(3, "0")}.png`}
                      alt=""
                      style={{
                        width: "350px",
                        height: "350px",
                        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                        objectFit: "cover",
                        margin: "-60px",
                      }}
                    />
                  ),
                )}
              </div>
              <div
                style={{
                  width: "55%",
                  padding: "80px 60px",
                  position: "relative",
                }}
              >
                <img
                  src="/tvc-assets/tvc-012.png"
                  alt=""
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: "40px",
                    width: "80px",
                  }}
                />
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 900,
                    fontSize: "72px",
                    color: "white",
                    letterSpacing: "0.1em",
                  }}
                >
                  Day {day.dayNumber}:
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: "24px",
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: "0.2em",
                    marginTop: "10px",
                  }}
                >
                  {formatFullDate(day.date)}
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700,
                    fontSize: "40px",
                    color: "white",
                    marginTop: "20px",
                  }}
                >
                  {template.title}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: "italic",
                    fontSize: "22px",
                    color: "rgba(255,255,255,0.9)",
                    marginTop: "20px",
                    lineHeight: 1.5,
                  }}
                >
                  {template.tagline}
                </div>
                <div style={{ marginTop: "30px" }}>
                  {template.activities.map((act, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        marginTop: "16px",
                        fontSize: "18px",
                        color: "white",
                      }}
                    >
                      <span
                        style={{
                          color: "#f97316",
                          marginRight: "12px",
                          fontSize: "20px",
                        }}
                      >
                        ▼
                      </span>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontStyle: "italic",
                          fontWeight: 700,
                        }}
                      >
                        {act.time}:
                      </span>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontStyle: "italic",
                          marginLeft: "8px",
                        }}
                      >
                        {act.activity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* PAGE 15: WHO WE ARE */}
        <div style={{ ...pageStyle, display: "flex" }}>
          <div style={{ width: "50%", position: "relative" }}>
            <img
              src="/tvc-assets/tvc-080.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            style={{
              width: "50%",
              background: tealBg,
              padding: "80px 60px",
              color: "white",
            }}
          >
            <img
              src="/tvc-assets/tvc-041.png"
              alt=""
              style={{ width: "160px", marginBottom: "20px" }}
            />
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 900,
                fontSize: "40px",
                letterSpacing: "0.15em",
                color: "white",
                marginBottom: "30px",
              }}
            >
              WHO WE ARE
            </div>
            <div
              style={{
                fontSize: "18px",
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {STATIC_CONTENT.whoWeAre}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "60px",
                right: "60px",
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <div>📷 TinyVillageCartagena</div>
              <div>✉ info@tinyvillagecolombia.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
