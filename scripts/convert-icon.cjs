/**
 * scripts/convert-icon.cjs
 * Creates a proper Windows ICO file from any image (JPEG/PNG)
 * Uses sharp for resizing + manual ICO binary format construction
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../assets/icon.png');
const outputPath = path.join(__dirname, '../assets/icon.ico');

async function createIco() {
  // Resize source image to 256x256 PNG buffer (sharp handles JPEG/PNG input)
  const pngBuffer = await sharp(inputPath)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toBuffer();

  // ── Build ICO binary manually ────────────────────────────────────────────
  // ICO format: ICONDIR header + ICONDIRENTRY + image data

  // ICONDIR (6 bytes)
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);  // Reserved = 0
  iconDir.writeUInt16LE(1, 2);  // Type = 1 (ICO)
  iconDir.writeUInt16LE(1, 4);  // Count = 1 image

  // ICONDIRENTRY (16 bytes)
  const iconDirEntry = Buffer.alloc(16);
  iconDirEntry.writeUInt8(0, 0);                       // Width: 0 means 256
  iconDirEntry.writeUInt8(0, 1);                       // Height: 0 means 256
  iconDirEntry.writeUInt8(0, 2);                       // Color count: 0 (true color)
  iconDirEntry.writeUInt8(0, 3);                       // Reserved
  iconDirEntry.writeUInt16LE(1, 4);                    // Color planes
  iconDirEntry.writeUInt16LE(32, 6);                   // Bits per pixel
  iconDirEntry.writeUInt32LE(pngBuffer.length, 8);     // Size of image data
  iconDirEntry.writeUInt32LE(22, 12);                  // Offset to image data (6 + 16 = 22)

  // Combine: header + entry + PNG data
  const icoBuffer = Buffer.concat([iconDir, iconDirEntry, pngBuffer]);
  fs.writeFileSync(outputPath, icoBuffer);

  console.log(`✅ Icon created: assets/icon.ico (${(icoBuffer.length / 1024).toFixed(1)} KB)`);
}

createIco().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});


