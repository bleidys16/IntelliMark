import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const rootDir = process.cwd()
const sourceLogo = path.join(rootDir, 'conceptos_logo/concepto_2.png')
const destTransparent = path.join(rootDir, 'public/logo_transparent.png')

async function makeTransparent() {
  const { data, info } = await sharp(sourceLogo)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bgR = 37
  const bgG = 5
  const bgB = 29

  const thresholdLow = 14
  const thresholdHigh = 34

  const outData = Buffer.alloc(info.width * info.height * 4)

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3]
    const g = data[i * 3 + 1]
    const b = data[i * 3 + 2]

    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)

    let alpha = 255
    if (dist <= thresholdLow) {
      alpha = 0
    } else if (dist < thresholdHigh) {
      alpha = Math.round(((dist - thresholdLow) / (thresholdHigh - thresholdLow)) * 255)
    }

    outData[i * 4] = r
    outData[i * 4 + 1] = g
    outData[i * 4 + 2] = b
    outData[i * 4 + 3] = alpha
  }

  // Create image, trim excess transparent space, and save with small padding
  await sharp(outData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim()
    .extend({
      top: 30,
      bottom: 30,
      left: 30,
      right: 30,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(destTransparent)

  console.log(`✓ Generado logo transparente en: ${destTransparent}`)
}

makeTransparent().catch(console.error)
