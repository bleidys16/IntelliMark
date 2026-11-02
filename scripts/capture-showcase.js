import puppeteer from 'puppeteer-core'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const chromeExecutable = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const htmlPath = path.join(rootDir, 'scripts/render-showcase.html')
const outDir = path.join(rootDir, 'docs')
const destPreview = path.join(outDir, 'preview.png')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

async function capture() {
  console.log('Lanzando Chrome headless con puppeteer-core...')
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })

  console.log(`Cargando ${htmlPath}...`)
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' })

  // Esperar a que las fuentes web carguen
  await page.evaluateHandle('document.fonts.ready')

  // Tomar screenshot del elemento .browser-frame
  const frameElement = await page.$('.browser-frame')
  if (frameElement) {
    await frameElement.screenshot({
      path: destPreview,
      omitBackground: true,
    })
  } else {
    await page.screenshot({ path: destPreview })
  }

  console.log(`✓ Captura de showcase generada en: ${destPreview}`)
  await browser.close()
}

capture().catch((err) => {
  console.error('Error al capturar showcase:', err)
  process.exit(1)
})
