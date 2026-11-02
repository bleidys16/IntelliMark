import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const rootDir = process.cwd()
const sourceLogo = path.join(rootDir, 'public/logo_transparent.png')
const iconsDir = path.join(rootDir, 'public/icons')

if (!fs.existsSync(sourceLogo)) {
  console.error('No se encontró public/logo_transparent.png. Ejecuta make-transparent-logo.js primero.')
  process.exit(1)
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const sizes = [16, 48, 128]

async function generate() {
  for (const size of sizes) {
    const dest = path.join(iconsDir, `icon-${size}.png`)
    // Inner size with 8% padding
    const innerSize = Math.max(12, Math.round(size * 0.9))
    const resized = await sharp(sourceLogo)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toFile(dest)

    console.log(`✓ Generado: ${dest} (${size}x${size}px)`)
  }

  // Copiar también a public/logo.png para usarlo directamente en la UI del Side Panel
  const appLogoDest = path.join(rootDir, 'public/logo.png')
  const uiInner = 56
  const uiResized = await sharp(sourceLogo)
    .resize(uiInner, uiInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: uiResized, gravity: 'center' }])
    .png()
    .toFile(appLogoDest)

  console.log(`✓ Generado: ${appLogoDest} (64x64px para UI)`)
}

generate().catch(console.error)
