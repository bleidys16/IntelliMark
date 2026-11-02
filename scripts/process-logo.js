import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const rootDir = process.cwd()
const sourceLogo = path.join(rootDir, 'intellimark_logo.png')
const iconsDir = path.join(rootDir, 'public/icons')

if (!fs.existsSync(sourceLogo)) {
  console.error('No se encontró intellimark_logo.png en la raíz.')
  process.exit(1)
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [16, 48, 128]

async function generate() {
  for (const size of sizes) {
    const dest = path.join(iconsDir, `icon-${size}.png`)
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(dest)
    console.log(`✓ Generado: ${dest} (${size}x${size}px)`)
  }

  // Copiar también a public/logo.png para usarlo directamente en la UI del Side Panel
  const appLogoDest = path.join(rootDir, 'public/logo.png')
  await sharp(sourceLogo)
    .resize(64, 64, { fit: 'contain' })
    .png()
    .toFile(appLogoDest)
  console.log(`✓ Generado: ${appLogoDest} (64x64px para UI)`)
}

generate().catch(console.error)
