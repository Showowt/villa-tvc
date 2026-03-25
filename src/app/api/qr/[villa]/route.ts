// ============================================
// QR CODE GENERATOR API (Issue 67)
// Generate QR codes linking to villa menu
// ============================================

import { NextRequest, NextResponse } from "next/server";

// Villa metadata for QR generation
const VILLA_DATA: Record<
  string,
  { name: string; nameEs: string; number: number }
> = {
  villa1: { name: "Villa 1 - Casa del Mar", nameEs: "Casa del Mar", number: 1 },
  villa2: { name: "Villa 2 - Casa del Sol", nameEs: "Casa del Sol", number: 2 },
  villa3: {
    name: "Villa 3 - Casa del Cielo",
    nameEs: "Casa del Cielo",
    number: 3,
  },
  villa4: {
    name: "Villa 4 - Casa del Viento",
    nameEs: "Casa del Viento",
    number: 4,
  },
  villa5: {
    name: "Villa 5 - Casa del Bosque",
    nameEs: "Casa del Bosque",
    number: 5,
  },
  villa6: { name: "Villa 6 - Casa del Rio", nameEs: "Casa del Rio", number: 6 },
  villa7: { name: "Villa 7 - Casa Coral", nameEs: "Casa Coral", number: 7 },
  villa8: { name: "Villa 8 - Casa Palmera", nameEs: "Casa Palmera", number: 8 },
  villa9: {
    name: "Villa 9 - Casa Caracol",
    nameEs: "Casa Caracol",
    number: 9,
  },
  villa10: {
    name: "Villa 10 - Casa Arena",
    nameEs: "Casa Arena",
    number: 10,
  },
  villa11: {
    name: "Villa 11 - Casa Estrella",
    nameEs: "Casa Estrella",
    number: 11,
  },
  pool: { name: "Pool Area", nameEs: "Zona de Piscina", number: 0 },
  beach: { name: "Beach", nameEs: "Playa", number: 0 },
  common: { name: "Common Area", nameEs: "Area Comun", number: 0 },
};

interface RouteParams {
  params: Promise<{ villa: string }>;
}

// GET /api/qr/[villa] - Generate QR code data for a villa
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { villa } = await params;
    const villaInfo = VILLA_DATA[villa];

    if (!villaInfo) {
      return NextResponse.json(
        {
          success: false,
          error: "Villa not found",
          available_villas: Object.keys(VILLA_DATA),
        },
        { status: 404 },
      );
    }

    // Get base URL from request or env
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const menuUrl = `${baseUrl}/menu/${villa}`;

    // Generate QR code using Google Charts API (free, no dependencies)
    const qrSize = 300;
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${qrSize}x${qrSize}&chl=${encodeURIComponent(menuUrl)}&choe=UTF-8&chld=H|2`;

    // Alternative: Use QRServer.com (also free)
    const qrCodeUrlAlt = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(menuUrl)}&format=svg&ecc=H`;

    return NextResponse.json({
      success: true,
      data: {
        villa_id: villa,
        villa_info: villaInfo,
        menu_url: menuUrl,
        qr_code: {
          url: qrCodeUrlAlt, // SVG format, better quality
          url_png: qrCodeUrl, // PNG format backup
          size: qrSize,
        },
        // WiFi info for the card
        wifi: {
          network: "TVC-Guest",
          password: "TinyVillage2024",
        },
        // Instructions for printing
        print_instructions: {
          en: "Scan QR code to order food & drinks to your villa",
          es: "Escanea el codigo QR para ordenar comida y bebidas a tu villa",
        },
      },
    });
  } catch (error) {
    console.error("[QR API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate QR data" },
      { status: 500 },
    );
  }
}
