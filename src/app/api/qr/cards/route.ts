// ============================================
// QR CARDS PDF GENERATOR (Issue 67)
// Generate printable QR cards for all villas
// Includes QR code, villa name, WiFi info
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Villa data
const VILLAS = [
  { id: "villa1", name: "Villa 1", nameEs: "Casa del Mar", number: 1 },
  { id: "villa2", name: "Villa 2", nameEs: "Casa del Sol", number: 2 },
  { id: "villa3", name: "Villa 3", nameEs: "Casa del Cielo", number: 3 },
  { id: "villa4", name: "Villa 4", nameEs: "Casa del Viento", number: 4 },
  { id: "villa5", name: "Villa 5", nameEs: "Casa del Bosque", number: 5 },
  { id: "villa6", name: "Villa 6", nameEs: "Casa del Rio", number: 6 },
  { id: "villa7", name: "Villa 7", nameEs: "Casa Coral", number: 7 },
  { id: "villa8", name: "Villa 8", nameEs: "Casa Palmera", number: 8 },
  { id: "villa9", name: "Villa 9", nameEs: "Casa Caracol", number: 9 },
  { id: "villa10", name: "Villa 10", nameEs: "Casa Arena", number: 10 },
  { id: "villa11", name: "Villa 11", nameEs: "Casa Estrella", number: 11 },
];

const COMMON_AREAS = [
  { id: "pool", name: "Pool Area", nameEs: "Zona de Piscina", number: 0 },
  { id: "beach", name: "Beach", nameEs: "Playa", number: 0 },
  { id: "common", name: "Common Area", nameEs: "Area Comun", number: 0 },
];

// WiFi info
const WIFI_NETWORK = "TVC-Guest";
const WIFI_PASSWORD = "TinyVillage2024";

// Fetch QR code image as bytes
async function fetchQRCode(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

// GET /api/qr/cards - Generate PDF with all QR cards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "cards"; // cards or single
    const villaFilter = searchParams.get("villa"); // optional single villa

    // Get base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Determine which villas to generate
    let locations = villaFilter
      ? [...VILLAS, ...COMMON_AREAS].filter((v) => v.id === villaFilter)
      : [...VILLAS, ...COMMON_AREAS];

    if (locations.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid locations found" },
        { status: 400 },
      );
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Card dimensions (in points, 1 inch = 72 points)
    // Card size: 3.5" x 5" (business card tent style)
    const cardWidth = 252; // 3.5 inches
    const cardHeight = 360; // 5 inches
    const margin = 20;
    const qrSize = 150;

    // Colors
    const darkBg = rgb(10 / 255, 22 / 255, 40 / 255); // tvc-void
    const turquoise = rgb(64 / 255, 184 / 255, 196 / 255); // tvc-turquoise
    const gold = rgb(212 / 255, 165 / 255, 116 / 255); // tvc-gold
    const white = rgb(1, 1, 1);
    const lightGray = rgb(0.6, 0.6, 0.6);

    // Generate cards
    if (format === "cards") {
      // 2 cards per page (letter size 8.5x11)
      const pageWidth = 612; // 8.5 inches
      const pageHeight = 792; // 11 inches
      const cardsPerPage = 2;

      for (let i = 0; i < locations.length; i += cardsPerPage) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        for (let j = 0; j < cardsPerPage && i + j < locations.length; j++) {
          const location = locations[i + j];
          const menuUrl = `${baseUrl}/menu/${location.id}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}&format=png&ecc=H`;

          // Card position
          const cardX = (pageWidth - cardWidth) / 2;
          const cardY =
            pageHeight - cardHeight - margin - j * (cardHeight + margin);

          // Draw card background
          page.drawRectangle({
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            color: white,
            borderColor: lightGray,
            borderWidth: 1,
          });

          // Draw header bar
          page.drawRectangle({
            x: cardX,
            y: cardY + cardHeight - 50,
            width: cardWidth,
            height: 50,
            color: darkBg,
          });

          // Villa name in header
          const villaText = `${location.name}`;
          const villaTextWidth = helveticaBold.widthOfTextAtSize(villaText, 18);
          page.drawText(villaText, {
            x: cardX + (cardWidth - villaTextWidth) / 2,
            y: cardY + cardHeight - 32,
            size: 18,
            font: helveticaBold,
            color: white,
          });

          // Spanish name
          const spanishText = location.nameEs;
          const spanishTextWidth = helvetica.widthOfTextAtSize(spanishText, 12);
          page.drawText(spanishText, {
            x: cardX + (cardWidth - spanishTextWidth) / 2,
            y: cardY + cardHeight - 70,
            size: 12,
            font: helvetica,
            color: turquoise,
          });

          // QR Code placeholder with instruction
          // We'll add the QR code image
          const qrX = cardX + (cardWidth - qrSize) / 2;
          const qrY = cardY + cardHeight - 80 - qrSize - 20;

          // Fetch and embed QR code
          const qrBytes = await fetchQRCode(qrUrl);
          if (qrBytes) {
            const qrImage = await pdfDoc.embedPng(qrBytes);
            page.drawImage(qrImage, {
              x: qrX,
              y: qrY,
              width: qrSize,
              height: qrSize,
            });
          } else {
            // Fallback: draw placeholder
            page.drawRectangle({
              x: qrX,
              y: qrY,
              width: qrSize,
              height: qrSize,
              borderColor: lightGray,
              borderWidth: 1,
            });
            page.drawText("QR Code", {
              x: qrX + 45,
              y: qrY + 70,
              size: 14,
              font: helvetica,
              color: lightGray,
            });
          }

          // Scan instruction
          const scanText = "Escanea para ordenar";
          const scanTextWidth = helveticaBold.widthOfTextAtSize(scanText, 12);
          page.drawText(scanText, {
            x: cardX + (cardWidth - scanTextWidth) / 2,
            y: qrY - 20,
            size: 12,
            font: helveticaBold,
            color: darkBg,
          });

          const scanTextEn = "Scan to order food & drinks";
          const scanTextEnWidth = helvetica.widthOfTextAtSize(scanTextEn, 10);
          page.drawText(scanTextEn, {
            x: cardX + (cardWidth - scanTextEnWidth) / 2,
            y: qrY - 35,
            size: 10,
            font: helvetica,
            color: lightGray,
          });

          // WiFi section
          const wifiY = cardY + 70;

          page.drawRectangle({
            x: cardX + margin,
            y: wifiY,
            width: cardWidth - margin * 2,
            height: 55,
            color: rgb(0.95, 0.95, 0.95),
            borderColor: lightGray,
            borderWidth: 0.5,
          });

          page.drawText("WiFi", {
            x: cardX + margin + 10,
            y: wifiY + 38,
            size: 10,
            font: helveticaBold,
            color: darkBg,
          });

          page.drawText(`Red / Network: ${WIFI_NETWORK}`, {
            x: cardX + margin + 10,
            y: wifiY + 22,
            size: 9,
            font: helvetica,
            color: rgb(0.3, 0.3, 0.3),
          });

          page.drawText(`Contrasena / Password: ${WIFI_PASSWORD}`, {
            x: cardX + margin + 10,
            y: wifiY + 8,
            size: 9,
            font: helvetica,
            color: rgb(0.3, 0.3, 0.3),
          });

          // Footer
          const footerText = "Tiny Village Cartagena";
          const footerTextWidth = helvetica.widthOfTextAtSize(footerText, 10);
          page.drawText(footerText, {
            x: cardX + (cardWidth - footerTextWidth) / 2,
            y: cardY + 15,
            size: 10,
            font: helvetica,
            color: lightGray,
          });
        }
      }
    } else {
      // Single card per page (for larger printing)
      for (const location of locations) {
        const menuUrl = `${baseUrl}/menu/${location.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&format=png&ecc=H`;

        const page = pdfDoc.addPage([cardWidth + 40, cardHeight + 40]);
        const cardX = 20;
        const cardY = 20;

        // Draw card background
        page.drawRectangle({
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          color: white,
          borderColor: lightGray,
          borderWidth: 1,
        });

        // Header
        page.drawRectangle({
          x: cardX,
          y: cardY + cardHeight - 50,
          width: cardWidth,
          height: 50,
          color: darkBg,
        });

        const villaText = location.name;
        const villaTextWidth = helveticaBold.widthOfTextAtSize(villaText, 18);
        page.drawText(villaText, {
          x: cardX + (cardWidth - villaTextWidth) / 2,
          y: cardY + cardHeight - 32,
          size: 18,
          font: helveticaBold,
          color: white,
        });

        // Spanish name
        const spanishText = location.nameEs;
        const spanishTextWidth = helvetica.widthOfTextAtSize(spanishText, 12);
        page.drawText(spanishText, {
          x: cardX + (cardWidth - spanishTextWidth) / 2,
          y: cardY + cardHeight - 70,
          size: 12,
          font: helvetica,
          color: turquoise,
        });

        // QR Code
        const qrX = cardX + (cardWidth - qrSize) / 2;
        const qrY = cardY + cardHeight - 80 - qrSize - 20;

        const qrBytes = await fetchQRCode(qrUrl);
        if (qrBytes) {
          const qrImage = await pdfDoc.embedPng(qrBytes);
          page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
          });
        }

        // Instructions
        const scanText = "Escanea para ordenar";
        const scanTextWidth = helveticaBold.widthOfTextAtSize(scanText, 12);
        page.drawText(scanText, {
          x: cardX + (cardWidth - scanTextWidth) / 2,
          y: qrY - 20,
          size: 12,
          font: helveticaBold,
          color: darkBg,
        });

        const scanTextEn = "Scan to order food & drinks";
        const scanTextEnWidth = helvetica.widthOfTextAtSize(scanTextEn, 10);
        page.drawText(scanTextEn, {
          x: cardX + (cardWidth - scanTextEnWidth) / 2,
          y: qrY - 35,
          size: 10,
          font: helvetica,
          color: lightGray,
        });

        // WiFi section
        const wifiY = cardY + 70;
        page.drawRectangle({
          x: cardX + margin,
          y: wifiY,
          width: cardWidth - margin * 2,
          height: 55,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: lightGray,
          borderWidth: 0.5,
        });

        page.drawText("WiFi", {
          x: cardX + margin + 10,
          y: wifiY + 38,
          size: 10,
          font: helveticaBold,
          color: darkBg,
        });

        page.drawText(`Red / Network: ${WIFI_NETWORK}`, {
          x: cardX + margin + 10,
          y: wifiY + 22,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(`Contrasena / Password: ${WIFI_PASSWORD}`, {
          x: cardX + margin + 10,
          y: wifiY + 8,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });

        // Footer
        const footerText = "Tiny Village Cartagena";
        const footerTextWidth = helvetica.widthOfTextAtSize(footerText, 10);
        page.drawText(footerText, {
          x: cardX + (cardWidth - footerTextWidth) / 2,
          y: cardY + 15,
          size: 10,
          font: helvetica,
          color: lightGray,
        });
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tvc-qr-cards-${format}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[QR Cards API] Error generating PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate QR cards PDF" },
      { status: 500 },
    );
  }
}
