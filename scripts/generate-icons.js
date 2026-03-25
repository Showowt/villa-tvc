/**
 * TVC PWA Icon Generator
 *
 * Run this script to generate all required PWA icons from a source image.
 * Requires: sharp (npm install sharp)
 *
 * Usage: node scripts/generate-icons.js [source-image.png]
 *
 * If no source image is provided, generates placeholder icons with TVC branding.
 */

const fs = require("fs");
const path = require("path");

// Icon sizes needed for PWA
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, "../public/tvc-assets");

// TVC brand colors
const EMERALD_500 = "#10B981";
const EMERALD_600 = "#059669";

// Generate SVG icon content
function generateSVG(size) {
  const fontSize = Math.floor(size * 0.35);
  const cornerRadius = Math.floor(size * 0.2);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${EMERALD_500}"/>
      <stop offset="100%" style="stop-color:${EMERALD_600}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="900" fill="white">TVC</text>
</svg>`;
}

// Generate maskable SVG (with safe zone padding)
function generateMaskableSVG(size) {
  const safeZone = Math.floor(size * 0.1);
  const innerSize = size - safeZone * 2;
  const fontSize = Math.floor(innerSize * 0.35);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${EMERALD_500}"/>
      <stop offset="100%" style="stop-color:${EMERALD_600}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="900" fill="white">TVC</text>
</svg>`;
}

// Generate shortcut icon with specific symbol
function generateShortcutSVG(size, symbol) {
  const fontSize = Math.floor(size * 0.5);
  const cornerRadius = Math.floor(size * 0.15);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${EMERALD_500}"/>
      <stop offset="100%" style="stop-color:${EMERALD_600}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" fill="white">${symbol}</text>
</svg>`;
}

async function generateIcons() {
  console.log("Generating TVC PWA icons...");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate standard icons
  for (const size of ICON_SIZES) {
    const svg = generateSVG(size);
    const filename = `icon-${size}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svg);
    console.log(`Generated ${filename}`);
  }

  // Generate maskable icons
  for (const size of [192, 512]) {
    const svg = generateMaskableSVG(size);
    const filename = `icon-maskable-${size}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svg);
    console.log(`Generated ${filename}`);
  }

  // Generate shortcut icons
  const shortcuts = {
    tasks: "checklist",
    checklist: "checkbox-checked",
    inventory: "package",
    kitchen: "utensils",
  };

  const shortcutSymbols = {
    tasks: "T",
    checklist: "C",
    inventory: "I",
    kitchen: "K",
  };

  for (const [name, _icon] of Object.entries(shortcuts)) {
    const svg = generateShortcutSVG(96, shortcutSymbols[name]);
    const filename = `shortcut-${name}.svg`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), svg);
    console.log(`Generated ${filename}`);
  }

  console.log("\nDone! Icons generated in:", OUTPUT_DIR);
  console.log("\nNote: These are SVG placeholders. For production, convert to PNG using:");
  console.log("  - sharp library (npm install sharp)");
  console.log("  - or online tools like realfavicongenerator.net");
}

// Check if sharp is available for PNG conversion
async function convertToPNG() {
  try {
    const sharp = require("sharp");
    console.log("\nsharp found, generating PNG versions...");

    for (const size of ICON_SIZES) {
      const svgPath = path.join(OUTPUT_DIR, `icon-${size}.svg`);
      const pngPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

      if (fs.existsSync(svgPath)) {
        await sharp(svgPath).png().toFile(pngPath);
        console.log(`Converted icon-${size}.png`);
      }
    }

    // Maskable icons
    for (const size of [192, 512]) {
      const svgPath = path.join(OUTPUT_DIR, `icon-maskable-${size}.svg`);
      const pngPath = path.join(OUTPUT_DIR, `icon-maskable-${size}.png`);

      if (fs.existsSync(svgPath)) {
        await sharp(svgPath).png().toFile(pngPath);
        console.log(`Converted icon-maskable-${size}.png`);
      }
    }

    console.log("\nPNG conversion complete!");
  } catch (e) {
    console.log("\nsharp not installed. Run: npm install sharp");
    console.log("Then run this script again to generate PNG versions.");
  }
}

generateIcons().then(() => convertToPNG());
