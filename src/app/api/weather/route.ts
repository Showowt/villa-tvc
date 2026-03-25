// ============================================
// WEATHER INTEGRATION API (Issue 76)
// Fetches OpenWeatherMap forecast and caches in Supabase
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

const CARTAGENA_LAT = 10.3932;
const CARTAGENA_LON = -75.4832;
const CACHE_HOURS = 6;

// Schema for weather response
interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  feels_like: number;
  humidity: number;
  description: string;
  description_es: string;
  icon: string;
  wind_speed: number;
  wind_direction: number;
  rain_probability: number;
  rain_mm: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  is_good_for_excursions: boolean;
  excursion_warning: string | null;
}

// Fetch from OpenWeatherMap
async function fetchOpenWeatherForecast(): Promise<WeatherDay[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY not configured");
  }

  // Use One Call API 3.0 for complete forecast
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
    let is_good_for_excursions = true;
    let excursion_warning: string | null = null;

    if (rain_probability > 60) {
      is_good_for_excursions = false;
      excursion_warning =
        "Alta probabilidad de lluvia - considere reprogramar excursiones al aire libre";
    } else if (avg_wind > 25) {
      is_good_for_excursions = false;
      excursion_warning =
        "Vientos fuertes - paseos en bote pueden verse afectados";
    } else if (rain_probability > 40) {
      excursion_warning = "Posibilidad de lluvia - lleve paraguas";
    }

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
      description: day.descriptions[Math.floor(day.descriptions.length / 2)].en,
      description_es:
        day.descriptions[Math.floor(day.descriptions.length / 2)].es,
      icon: day.icons[Math.floor(day.icons.length / 2)],
      wind_speed: Math.round(avg_wind * 3.6), // m/s to km/h
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

  return forecast.slice(0, 5); // Return 5 days
}

// GET /api/weather - Get cached or fresh forecast
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Check cache first
    const { data: cached } = await supabase
      .from("weather_cache")
      .select("*")
      .eq("location", "cartagena")
      .gte("forecast_date", today)
      .gte("expires_at", new Date().toISOString())
      .order("forecast_date")
      .limit(5);

    if (cached && cached.length >= 3) {
      // Return cached data
      return NextResponse.json({
        success: true,
        source: "cache",
        forecast: cached.map((c) => c.data),
        cached_at: cached[0].fetched_at,
      });
    }

    // Fetch fresh data
    const forecast = await fetchOpenWeatherForecast();

    // Cache the forecast
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

    return NextResponse.json({
      success: true,
      source: "api",
      forecast,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Weather API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch weather",
      },
      { status: 500 },
    );
  }
}

// POST /api/weather/refresh - Force refresh cache
export async function POST() {
  try {
    const forecast = await fetchOpenWeatherForecast();
    const supabase = createServerClient();

    // Clear old cache and insert new
    await supabase.from("weather_cache").delete().eq("location", "cartagena");

    const cachePromises = forecast.map((day) =>
      supabase.from("weather_cache").insert({
        location: "cartagena",
        forecast_date: day.date,
        data: day,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + CACHE_HOURS * 60 * 60 * 1000,
        ).toISOString(),
      }),
    );

    await Promise.all(cachePromises);

    return NextResponse.json({
      success: true,
      message: "Weather cache refreshed",
      forecast,
    });
  } catch (error) {
    console.error("[Weather API] Refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to refresh weather",
      },
      { status: 500 },
    );
  }
}
