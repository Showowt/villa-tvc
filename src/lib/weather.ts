// ============================================
// WEATHER INTEGRATION LIBRARY (Issue #76)
// Cartagena weather utilities for TVC Operations
// ============================================

import { createServerClient } from "@/lib/supabase/client";

// Cartagena coordinates
const CARTAGENA_LAT = 10.3932;
const CARTAGENA_LON = -75.4832;
const CACHE_HOURS = 1; // Cache duration for API rate limiting

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  feels_like: number;
  humidity: number;
  description: string;
  description_es: string;
  icon: string;
  wind_speed: number; // km/h
  wind_direction: number;
  rain_probability: number; // 0-100
  rain_mm: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  is_good_for_excursions: boolean;
  excursion_warning: string | null;
}

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  description_es: string;
  icon: string;
  wind_speed: number;
  visibility: number;
  clouds: number;
  updated_at: string;
}

export interface WeatherAlert {
  type: "rain" | "wind" | "storm" | "heat";
  severity: "low" | "medium" | "high";
  message_es: string;
  message_en: string;
  date: string;
  recommendation: string;
}

// ─────────────────────────────────────────────────────────────────
// Weather Icon Mapping
// ─────────────────────────────────────────────────────────────────

const WEATHER_ICONS: Record<string, string> = {
  "01d": "weather-sunny", // clear sky day
  "01n": "weather-night", // clear sky night
  "02d": "weather-partly-cloudy", // few clouds day
  "02n": "weather-cloudy-night", // few clouds night
  "03d": "weather-cloudy", // scattered clouds
  "03n": "weather-cloudy",
  "04d": "weather-cloudy", // broken clouds
  "04n": "weather-cloudy",
  "09d": "weather-rain", // shower rain
  "09n": "weather-rain",
  "10d": "weather-rain", // rain
  "10n": "weather-rain",
  "11d": "weather-storm", // thunderstorm
  "11n": "weather-storm",
  "13d": "weather-snow", // snow (rare in Cartagena)
  "13n": "weather-snow",
  "50d": "weather-fog", // mist
  "50n": "weather-fog",
};

export function getWeatherIcon(iconCode: string): string {
  return WEATHER_ICONS[iconCode] || "weather-sunny";
}

export function getWeatherEmoji(iconCode: string): string {
  if (iconCode === "01d" || iconCode === "01n") return "sun";
  if (iconCode.includes("02")) return "cloud-sun";
  if (iconCode.includes("03") || iconCode.includes("04")) return "cloud";
  if (iconCode.includes("09") || iconCode.includes("10")) return "rain";
  if (iconCode.includes("11")) return "storm";
  return "sun";
}

// ─────────────────────────────────────────────────────────────────
// Fetch Weather from OpenWeatherMap
// ─────────────────────────────────────────────────────────────────

export async function fetchCurrentWeather(): Promise<CurrentWeather | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("[Weather] OPENWEATHER_API_KEY not configured");
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${CARTAGENA_LAT}&lon=${CARTAGENA_LON}&appid=${apiKey}&units=metric&lang=es`;
    const response = await fetch(url, { next: { revalidate: 1800 } }); // Cache 30 min

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      description_es: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
      visibility: data.visibility / 1000, // m to km
      clouds: data.clouds.all,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Weather] Error fetching current weather:", error);
    return null;
  }
}

export async function fetchForecast(): Promise<WeatherDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("[Weather] OPENWEATHER_API_KEY not configured");
    return [];
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${CARTAGENA_LAT}&lon=${CARTAGENA_LON}&appid=${apiKey}&units=metric&lang=es`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();

    // Process 5-day forecast (3-hour intervals -> daily)
    const dailyMap = new Map<
      string,
      {
        temps: number[];
        feels: number[];
        humidity: number[];
        descriptions: { en: string; es: string }[];
        icons: string[];
        wind_speeds: number[];
        wind_dirs: number[];
        rain_probs: number[];
        rain_amounts: number[];
      }
    >();

    for (const item of data.list) {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          temps: [],
          feels: [],
          humidity: [],
          descriptions: [],
          icons: [],
          wind_speeds: [],
          wind_dirs: [],
          rain_probs: [],
          rain_amounts: [],
        });
      }
      const day = dailyMap.get(date)!;
      day.temps.push(item.main.temp);
      day.feels.push(item.main.feels_like);
      day.humidity.push(item.main.humidity);
      day.descriptions.push({
        en: item.weather[0].description,
        es: item.weather[0].description,
      });
      day.icons.push(item.weather[0].icon);
      day.wind_speeds.push(item.wind.speed);
      day.wind_dirs.push(item.wind.deg);
      day.rain_probs.push((item.pop || 0) * 100);
      day.rain_amounts.push(item.rain?.["3h"] || 0);
    }

    const forecast: WeatherDay[] = [];

    for (const [date, day] of dailyMap) {
      const temp_min = Math.min(...day.temps);
      const temp_max = Math.max(...day.temps);
      const rain_probability = Math.max(...day.rain_probs);
      const rain_mm = day.rain_amounts.reduce((a, b) => a + b, 0);
      const avg_wind =
        day.wind_speeds.reduce((a, b) => a + b, 0) / day.wind_speeds.length;

      // Determine excursion suitability
      const { is_good_for_excursions, excursion_warning } =
        evaluateExcursionConditions(rain_probability, avg_wind, temp_max);

      forecast.push({
        date,
        temp_min: Math.round(temp_min),
        temp_max: Math.round(temp_max),
        feels_like: Math.round(
          day.feels.reduce((a, b) => a + b, 0) / day.feels.length,
        ),
        humidity: Math.round(
          day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length,
        ),
        description:
          day.descriptions[Math.floor(day.descriptions.length / 2)].en,
        description_es:
          day.descriptions[Math.floor(day.descriptions.length / 2)].es,
        icon: day.icons[Math.floor(day.icons.length / 2)],
        wind_speed: Math.round(avg_wind * 3.6),
        wind_direction: Math.round(
          day.wind_dirs.reduce((a, b) => a + b, 0) / day.wind_dirs.length,
        ),
        rain_probability: Math.round(rain_probability),
        rain_mm: Math.round(rain_mm * 10) / 10,
        uv_index: 8, // Cartagena is always high UV
        sunrise: "06:00",
        sunset: "18:00",
        is_good_for_excursions,
        excursion_warning,
      });
    }

    return forecast.slice(0, 5);
  } catch (error) {
    console.error("[Weather] Error fetching forecast:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Excursion Evaluation
// ─────────────────────────────────────────────────────────────────

function evaluateExcursionConditions(
  rainProbability: number,
  windSpeed: number, // m/s
  tempMax: number,
): { is_good_for_excursions: boolean; excursion_warning: string | null } {
  let is_good_for_excursions = true;
  let excursion_warning: string | null = null;

  // High rain probability
  if (rainProbability > 60) {
    is_good_for_excursions = false;
    excursion_warning =
      "Alta probabilidad de lluvia - considere reprogramar excursiones al aire libre";
  }
  // Strong winds (>25 km/h average, risky for boats)
  else if (windSpeed > 7) {
    // ~25 km/h
    is_good_for_excursions = false;
    excursion_warning =
      "Vientos fuertes - paseos en bote pueden verse afectados";
  }
  // Moderate rain chance
  else if (rainProbability > 40) {
    excursion_warning = "Posibilidad de lluvia - lleve paraguas";
  }
  // Extreme heat
  else if (tempMax > 35) {
    excursion_warning = "Dia muy caluroso - mantengase hidratado";
  }

  return { is_good_for_excursions, excursion_warning };
}

// ─────────────────────────────────────────────────────────────────
// Generate Alerts
// ─────────────────────────────────────────────────────────────────

export function generateWeatherAlerts(forecast: WeatherDay[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  for (const day of forecast) {
    // Rain alert
    if (day.rain_probability >= 60) {
      alerts.push({
        type: "rain",
        severity: day.rain_probability >= 80 ? "high" : "medium",
        message_es: `Lluvia probable (${day.rain_probability}%) el ${formatDateEs(day.date)}`,
        message_en: `Rain likely (${day.rain_probability}%) on ${formatDateEn(day.date)}`,
        date: day.date,
        recommendation:
          "Considere reprogramar actividades al aire libre / Consider rescheduling outdoor activities",
      });
    }

    // Wind alert
    if (day.wind_speed >= 30) {
      alerts.push({
        type: "wind",
        severity: day.wind_speed >= 40 ? "high" : "medium",
        message_es: `Vientos fuertes (${day.wind_speed} km/h) el ${formatDateEs(day.date)}`,
        message_en: `Strong winds (${day.wind_speed} km/h) on ${formatDateEn(day.date)}`,
        date: day.date,
        recommendation:
          "Excursiones en bote pueden cancelarse / Boat excursions may be cancelled",
      });
    }

    // Storm alert
    if (day.icon.includes("11")) {
      alerts.push({
        type: "storm",
        severity: "high",
        message_es: `Tormentas esperadas el ${formatDateEs(day.date)}`,
        message_en: `Storms expected on ${formatDateEn(day.date)}`,
        date: day.date,
        recommendation: "Permanezca en la villa / Stay at the villa",
      });
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────
// Cache Management
// ─────────────────────────────────────────────────────────────────

export async function getCachedForecast(): Promise<{
  forecast: WeatherDay[];
  source: "cache" | "api";
  fetched_at: string;
} | null> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Check cache
    const { data: cached } = await supabase
      .from("weather_cache")
      .select("*")
      .eq("location", "cartagena")
      .gte("forecast_date", today)
      .gte("expires_at", new Date().toISOString())
      .order("forecast_date")
      .limit(5);

    if (cached && cached.length >= 3) {
      return {
        forecast: cached.map((c) => c.data as WeatherDay),
        source: "cache",
        fetched_at: cached[0].fetched_at,
      };
    }

    // Fetch fresh
    const forecast = await fetchForecast();

    if (forecast.length > 0) {
      // Cache the results
      const cachePromises = forecast.map((day) =>
        supabase.from("weather_cache").upsert(
          {
            location: "cartagena",
            forecast_date: day.date,
            data: day,
            fetched_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + CACHE_HOURS * 60 * 60 * 1000,
            ).toISOString(),
          },
          { onConflict: "location,forecast_date" },
        ),
      );

      await Promise.all(cachePromises);
    }

    return {
      forecast,
      source: "api",
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Weather] Error getting cached forecast:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function formatDateEs(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatDateEn(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function isGoodDayForBoatTrip(day: WeatherDay): boolean {
  return day.is_good_for_excursions && day.wind_speed < 25;
}

export function isGoodDayForBeach(day: WeatherDay): boolean {
  return day.rain_probability < 30 && day.temp_max >= 28;
}

export function getUVRecommendation(uvIndex: number): string {
  if (uvIndex >= 11) return "Evite el sol entre 10am-4pm / Avoid sun 10am-4pm";
  if (uvIndex >= 8)
    return "Proteccion solar muy alta / Very high sun protection";
  if (uvIndex >= 6) return "Proteccion solar alta / High sun protection";
  if (uvIndex >= 3)
    return "Proteccion solar moderada / Moderate sun protection";
  return "Proteccion solar baja / Low sun protection";
}
