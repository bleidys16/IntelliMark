import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function createPng(width, height, drawFn) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const [r, g, b, a] = drawFn(x, y, width, height)
      buffer[idx] = r
      buffer[idx + 1] = g
      buffer[idx + 2] = b
      buffer[idx + 3] = a
    }
  }

  // PNG structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type (RGBA)
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData)

  // IDAT chunk (scanlines with filter byte 0)
  const scanlines = Buffer.alloc(height * (1 + width * 4))
  let scanlineOffset = 0
  let bufferOffset = 0
  const rowBytes = width * 4

  for (let y = 0; y < height; y++) {
    scanlines[scanlineOffset++] = 0 // Filter type 0 (None)
    buffer.copy(scanlines, scanlineOffset, bufferOffset, bufferOffset + rowBytes)
    scanlineOffset += rowBytes
    bufferOffset += rowBytes
  }

  const compressedData = zlib.deflateSync(scanlines)
  const idatChunk = createChunk('IDAT', compressedData)

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const toCrc = Buffer.concat([typeBuf, data])
  const crc = crc32(toCrc)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// CRC32 table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[n] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function drawIcon(x, y, w, h) {
  // Normalize coords: 0 to 1
  const nx = x / w
  const ny = y / h

  // Rounded rectangle container
  const padding = 0.08
  if (nx < padding || nx > 1 - padding || ny < padding || ny > 1 - padding) {
    return [0, 0, 0, 0] // Transparent
  }

  // Gradient background (Indigo #6366f1 to Teal #14b8a6)
  const t = (nx + ny) / 2
  const rBg = Math.round(99 + (20 - 99) * t)
  const gBg = Math.round(102 + (184 - 102) * t)
  const bBg = Math.round(241 + (166 - 241) * t)

  // Inner bookmark ribbon shape
  const bmLeft = 0.3
  const bmRight = 0.7
  const bmTop = 0.22
  const bmBottom = 0.78
  const notchHeight = 0.12

  if (nx >= bmLeft && nx <= bmRight && ny >= bmTop && ny <= bmBottom) {
    // Check notch at the bottom of the ribbon
    const isInsideNotch = ny > (bmBottom - notchHeight) &&
      Math.abs(nx - 0.5) < ((ny - (bmBottom - notchHeight)) / notchHeight) * 0.2

    if (!isInsideNotch) {
      // White bookmark ribbon
      return [255, 255, 255, 255]
    }
  }

  return [rBg, gBg, bBg, 255]
}

const iconsDir = path.resolve(process.cwd(), 'public/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

;[16, 48, 128].forEach((size) => {
  const png = createPng(size, size, drawIcon)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png)
  console.log(`Generado icon-${size}.png (${size}x${size})`)
})
