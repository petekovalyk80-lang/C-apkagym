/* Generuje assety brandingowe Anvil z 2.jpg (ikona) i 3.jpg (splash/hero).
   Uruchom: node scripts/make-brand-assets.js */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const IMG = path.join(R, 'assets', 'images');
const BRAND = path.join(R, 'assets', 'brand');
fs.mkdirSync(BRAND, { recursive: true });

(async () => {
  const anvil = path.join(R, '2.jpg');
  const forge = path.join(R, '3.jpg');

  // Kolor tła = próbka narożnika #2 (near-black), by adaptive icon był bezszwowy
  const { data } = await sharp(anvil).extract({ left: 8, top: 8, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };

  // Ikona legacy (pełny kwadrat)
  await sharp(anvil).resize(1024, 1024, { fit: 'cover' }).png().toFile(path.join(IMG, 'icon.png'));

  // Adaptive: przód = kowadło przeskalowane do strefy bezpiecznej na tym samym near-black
  const fg = await sharp(anvil).resize(860, 860, { fit: 'cover' }).toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toFile(path.join(IMG, 'android-icon-foreground.png'));

  // Adaptive: tło = jednolity near-black
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
    .png()
    .toFile(path.join(IMG, 'android-icon-background.png'));

  // Splash (natywny) = scena kuźni #3
  await sharp(forge).resize(1080, null).png().toFile(path.join(IMG, 'splash-icon.png'));

  // Kopie do kodowego ekranu startowego
  await sharp(forge).resize(1080, null).jpeg({ quality: 82 }).toFile(path.join(BRAND, 'forge.jpg'));
  await sharp(anvil).resize(600, 600, { fit: 'cover' }).png().toFile(path.join(BRAND, 'anvil.png'));

  console.log('✅ Assety gotowe. Tło near-black:', `rgb(${bg.r},${bg.g},${bg.b})`);
})().catch((e) => { console.error(e); process.exit(1); });
