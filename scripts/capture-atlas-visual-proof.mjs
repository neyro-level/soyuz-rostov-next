import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const donorRoot = process.env.ATLAS_DONOR_ROOT
const donorSha = process.env.ATLAS_DONOR_SHA
const port = Number(process.env.ATLAS_VISUAL_PORT ?? 3012)
const baseUrl = `http://127.0.0.1:${port}`
const outputRoot = path.resolve(
  process.env.ATLAS_VISUAL_OUTPUT ?? 'docs/research/atlas-visual-baseline',
)

if (!donorRoot || !donorSha) {
  throw new Error('ATLAS_DONOR_ROOT and ATLAS_DONOR_SHA are required')
}
if (!/^[0-9a-f]{40}$/.test(donorSha)) {
  throw new Error('ATLAS_DONOR_SHA must be a full lowercase Git SHA')
}

function git(...args) {
  return execFileSync('git', ['-C', donorRoot, ...args], { encoding: 'utf8' }).trim()
}

const donorHead = git('rev-parse', 'HEAD')
const donorOriginMain = git('rev-parse', 'origin/main')
const donorOrigin = git('remote', 'get-url', 'origin')
const donorTrackedStatus = git('status', '--porcelain', '--untracked-files=no')
if (donorHead !== donorSha || donorOriginMain !== donorSha) {
  throw new Error(
    `Atlas donor SHA mismatch: expected=${donorSha} HEAD=${donorHead} origin/main=${donorOriginMain}`,
  )
}
if (donorTrackedStatus) {
  throw new Error('Atlas donor has tracked changes; capture is blocked')
}
if (!/git\.sourcecraft\.dev[/:]integrator-p\/atlas-realty-starter(?:\.git)?$/.test(donorOrigin)) {
  throw new Error(`Unexpected Atlas donor origin: ${donorOrigin}`)
}

const visualConfigPath = path.join(donorRoot, 'playwright.visual.config.ts')
const visualConfig = await readFile(visualConfigPath)
const visualConfigSha256 = createHash('sha256').update(visualConfig).digest('hex')

const playwrightUrl = pathToFileURL(
  path.join(donorRoot, 'node_modules', '@playwright', 'test', 'index.mjs'),
).href
const { chromium } = await import(playwrightUrl)

async function assertPortFree() {
  await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', () => reject(new Error(`Port ${port} is already in use`)))
    server.once('listening', () => server.close(resolve))
    server.listen(port, '127.0.0.1')
  })
}

async function waitForServer(processHandle) {
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Atlas fixture server exited with code ${processHandle.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Atlas fixture server did not become ready within 180 seconds')
}

const scenarios = [
  { name: 'home', route: '/' },
  { name: 'catalog', route: '/kvartiry/' },
  { name: 'property', route: '/kvartiry/svetlaya-kvartira-v-centre-1001/' },
  { name: 'commercial-service', route: '/promo/stroitelstvo-domov' },
  { name: 'contacts', route: '/kontakty' },
  { name: 'lead-modal-validation', route: '/', state: 'lead-modal-validation' },
]

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1440', width: 1440, height: 1000 },
]

async function settlePage(page) {
  await page.locator('main:not([aria-busy="true"])').waitFor({ state: 'visible', timeout: 30_000 })
  await page.evaluate(async () => {
    await document.fonts.ready
    const step = Math.max(window.innerHeight, 1)
    for (let offset = 0; offset < document.documentElement.scrollHeight; offset += step) {
      window.scrollTo(0, offset)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    await Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve()
        return Promise.race([
          new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true })
            image.addEventListener('error', resolve, { once: true })
          }),
          new Promise((resolve) => setTimeout(resolve, 3_000)),
        ])
      }),
    )
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
}

await mkdir(outputRoot, { recursive: true })
const capturedAt = new Date().toISOString()
await assertPortFree()
const nextBin = path.join(donorRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
const fixtureServer = spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: donorRoot,
  env: {
    ...process.env,
    APP_ENV: 'test',
    DATABASE_URL:
      'postgresql://atlas_realty_starter_local:replace-local-password@127.0.0.1:5435/atlas_realty_starter_test',
    NEXT_PUBLIC_APP_URL: baseUrl,
    NEXT_PUBLIC_INDEXABLE: 'false',
    NEXT_PUBLIC_SITE_URL: baseUrl,
    NODE_ENV: 'development',
    PAYLOAD_SECRET: 'fixture-visual-secret-at-least-32-characters',
    PORT: String(port),
    REVALIDATE_SECRET: 'fixture-visual-revalidate-at-least-32-chars',
    SITE_ENGINE: 'fixture',
  },
  stdio: 'ignore',
  windowsHide: true,
})
let browser
const files = []

try {
  await waitForServer(fixtureServer)
  browser = await chromium.launch()
  for (const viewport of viewports) {
    const directory = path.join(outputRoot, viewport.name)
    await mkdir(directory, { recursive: true })
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'ru-RU',
      reducedMotion: 'reduce',
      viewport: { width: viewport.width, height: viewport.height },
    })
    await context.addInitScript(() => {
      window.localStorage.setItem('agency.cookie.notice.dismissed', '1')
    })
    const page = await context.newPage()

    for (const scenario of scenarios) {
      await page.goto(new URL(scenario.route, baseUrl).toString(), {
        timeout: 90_000,
        waitUntil: 'domcontentloaded',
      })
      await settlePage(page)

      if (scenario.state === 'lead-modal-validation') {
        await page.getByRole('button', { name: 'Подобрать проверенный объект' }).click()
        const dialog = page.getByRole('dialog')
        await dialog.locator('button[type="submit"]').click()
        await dialog.getByText('Введите имя').waitFor({ state: 'visible' })
      }

      const relativeFile = path.join(viewport.name, `${scenario.name}.png`)
      const absoluteFile = path.join(outputRoot, relativeFile)
      await page.screenshot({
        animations: 'disabled',
        fullPage: true,
        mask: [page.locator('[data-visual-dynamic]')],
        maskColor: '#e7e5e4',
        path: absoluteFile,
      })
      const buffer = await readFile(absoluteFile)
      files.push({
        file: relativeFile.replaceAll('\\', '/'),
        route: scenario.route,
        state: scenario.state ?? 'default',
        viewport: `${viewport.width}x${viewport.height}`,
        bytes: buffer.byteLength,
        sha256: createHash('sha256').update(buffer).digest('hex'),
      })
    }

    await context.close()
  }
} finally {
  if (browser) await browser.close()
  if (fixtureServer.exitCode === null) fixtureServer.kill()
}

const manifest = {
  schemaVersion: 1,
  donor: {
    repository: 'integrator-p/atlas-realty-starter',
    branch: 'main',
    commit: donorSha,
    dataMode: 'fixture',
    preflight: {
      head: donorHead,
      originMain: donorOriginMain,
      trackedClean: donorTrackedStatus === '',
      originVerified: true,
      visualConfig: 'playwright.visual.config.ts',
      visualConfigSha256,
    },
  },
  capture: {
    capturedAt,
    baseUrl,
    locale: 'ru-RU',
    colorScheme: 'light',
    reducedMotion: true,
    dynamicMask: '#e7e5e4',
    serverLaunchedByScript: true,
    siteEngine: 'fixture',
  },
  expectedFiles: scenarios.length * viewports.length,
  files,
}

await writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Captured ${files.length} screenshots in ${outputRoot}`)
