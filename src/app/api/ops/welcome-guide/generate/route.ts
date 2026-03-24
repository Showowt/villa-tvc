import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Text positions on each page (x, y from bottom-left in PDF coords)
// PDF is 1920x1440 but pdf-lib uses points (72 per inch)
// Original PDF page size needs to be determined

interface TextOverlay {
  page: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  font: "script" | "sans" | "serif";
  color?: { r: number; g: number; b: number };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupName, checkIn, checkOut, itinerary } = body;

    if (!groupName || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Format date range
    const formatDateRange = (start: Date, end: Date): string => {
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        day: "numeric",
      };
      const startStr = start.toLocaleDateString("en-US", options);
      const endStr = end.toLocaleDateString("en-US", {
        ...options,
        year: "numeric",
      });
      return `${startStr} - ${endStr}`;
    };

    const formatFullDate = (date: Date): string => {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    const dateRange = formatDateRange(checkInDate, checkOutDate);

    // Load the template PDF
    const templateUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://villa-tvc.vercel.app"}/tvc-assets/template.pdf`;

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error(
        `Failed to load template PDF: ${templateResponse.status}`,
      );
    }

    const templateBytes = await templateResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Register fontkit for custom fonts
    pdfDoc.registerFontkit(fontkit);

    // Embed fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Get pages
    const pages = pdfDoc.getPages();

    // Get first page dimensions to understand coordinate system
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Helper to draw text
    const drawText = (
      pageIndex: number,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      font: typeof helveticaBold,
      color = rgb(1, 1, 1),
    ) => {
      if (pageIndex < pages.length) {
        pages[pageIndex].drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color,
        });
      }
    };

    // Calculate positions based on page dimensions
    // The template PDF is landscape, likely 792 x 612 points (11x8.5 inches)
    // or custom size - we'll scale based on actual dimensions

    const centerX = width / 2;

    // PAGE 0 (Cover): Guest name and dates
    // Guest name - centered, script font, large
    // Need to blank out existing text first by drawing white/dark rectangle
    // Then draw new text

    // Cover page - draw over existing text areas
    // The guest name appears to be centered around y = height * 0.45
    // Dates appear around y = height * 0.35

    const coverNameY = height * 0.42;
    const coverDatesY = height * 0.32;

    // Draw dark rectangle to cover old text
    firstPage.drawRectangle({
      x: width * 0.15,
      y: coverNameY - 50,
      width: width * 0.7,
      height: 120,
      color: rgb(0.1, 0.1, 0.1),
      opacity: 0.95,
    });

    // Draw guest name (centered)
    const nameWidth = timesItalic.widthOfTextAtSize(groupName, 72);
    drawText(
      0,
      groupName,
      centerX - nameWidth / 2,
      coverNameY,
      72,
      timesItalic,
    );

    // Draw dates
    const datesWidth = timesItalic.widthOfTextAtSize(dateRange, 24);
    drawText(
      0,
      dateRange,
      centerX - datesWidth / 2,
      coverDatesY,
      24,
      timesItalic,
    );

    // PAGE 8 (Divider - index 8): Guest name and dates again
    if (pages.length > 8) {
      const dividerPage = pages[8];
      const dividerNameY = height * 0.85;
      const dividerDatesY = height * 0.78;

      // Cover old text
      dividerPage.drawRectangle({
        x: 30,
        y: dividerNameY - 30,
        width: width * 0.5,
        height: 100,
        color: rgb(0, 0, 0),
        opacity: 0.5,
      });

      // Draw guest name
      drawText(8, groupName, 50, dividerNameY, 48, timesItalic);

      // Draw dates
      drawText(8, dateRange, 50, dividerDatesY, 18, timesItalic);
    }

    // DAY PAGES (9-13): Update dates
    // Each day page has the date below "Day X:"
    if (itinerary && Array.isArray(itinerary)) {
      for (let i = 0; i < itinerary.length && i < 5; i++) {
        const pageIndex = 9 + i;
        if (pageIndex < pages.length) {
          const day = itinerary[i];
          const dayDate = new Date(day.date);
          const formattedDate = formatFullDate(dayDate);

          const dayPage = pages[pageIndex];
          const dateY = height * 0.82;

          // Cover old date
          dayPage.drawRectangle({
            x: width * 0.5,
            y: dateY - 5,
            width: width * 0.45,
            height: 25,
            color: rgb(0.059, 0.239, 0.243), // #0f3d3e
            opacity: 1,
          });

          // Draw new date
          drawText(
            pageIndex,
            formattedDate,
            width * 0.52,
            dateY,
            14,
            helveticaBold,
            rgb(0.6, 0.6, 0.6),
          );
        }
      }
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${groupName.replace(/[^a-zA-Z0-9]/g, "_")}_Welcome_Guide.pdf"`,
      },
    });
  } catch (error) {
    console.error("[WelcomeGuide PDF Error]", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: String(error) },
      { status: 500 },
    );
  }
}
