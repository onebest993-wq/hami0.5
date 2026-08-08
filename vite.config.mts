/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import { createLogger, defineConfig, loadEnv, type ViteDevServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { hamiBootScriptOrder } from './src/vite-plugins/hamiBootScriptOrder'
import { preferFileOverDirectory } from './src/vite-plugins/preferFileOverDirectory'
import { getDevSecurityHeaders, getProductionSecurityHeaders } from './src/app/api/security/wifeSecurityHeaders'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = __dirname

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => resolve(Buffer.concat(chunks)))
        req.on('error', reject)
    })
}

function forwardRequestHeaders(req: IncomingMessage): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
            out[key] = value
            continue
        }
        if (Array.isArray(value) && value.length > 0) {
            out[key] = value.join(', ')
        }
    }
    return out
}

async function pipeWebBodyToNode(res: ServerResponse, body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader()
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            if (value?.byteLength) res.write(Buffer.from(value))
        }
    } finally {
        reader.releaseLock()
    }
}

/** يمرّر مسارات ‎/api/*‎ إلى ‎route.ts‎ في وضع التطوير — اكتشاف ديناميكي */
function resolveDevApiRouteFile(urlPath: string): string | null {
    if (!urlPath.startsWith('/api/')) return null
    const rel = `${urlPath.replace(/^\/api\//, 'src/app/api/')}/route.ts`
    const abs = path.join(projectRoot, rel)
    return fs.existsSync(abs) ? rel : null
}

const DEV_API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

function attachApiRouteMiddleware(
    server: ViteDevServer,
    middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void },
    securityHeaders: Record<string, string>,
    mode: string,
) {
    const env = loadEnv(mode, projectRoot, '')
    Object.assign(process.env, env)

    middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        for (const [key, value] of Object.entries(securityHeaders)) {
            if (!res.getHeader(key)) res.setHeader(key, value)
        }
        next()
    })

    middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url?.split('?')[0] ?? ''
        const method = (req.method ?? 'GET').toUpperCase()
        const routeFile = resolveDevApiRouteFile(url)
        if (!routeFile) return next()
        if (!DEV_API_METHODS.includes(method as (typeof DEV_API_METHODS)[number])) return next()
        try {
            const absRoute = path.join(projectRoot, routeFile)
            const moduleId = routeFile.replace(/\\/g, '/')
            const routeModule = await server.ssrLoadModule(moduleId) as {
                GET?: (request: Request) => Promise<Response>
                POST?: (request: Request) => Promise<Response>
                PUT?: (request: Request) => Promise<Response>
                PATCH?: (request: Request) => Promise<Response>
                DELETE?: (request: Request) => Promise<Response>
            }
            const handler =
                method === 'GET' ? routeModule.GET
                : method === 'POST' ? routeModule.POST
                : method === 'PUT' ? routeModule.PUT
                : method === 'PATCH' ? routeModule.PATCH
                : routeModule.DELETE
            if (!handler) return next()
            const hasBody = method !== 'GET' && method !== 'HEAD'
            const raw = hasBody ? await readRequestBody(req) : Buffer.alloc(0)
            const body = raw.byteLength ? new Uint8Array(raw) : undefined
            const forwardedHeaders = forwardRequestHeaders(req)
            const webReq = new Request(`http://127.0.0.1${req.url}`, {
                method,
                headers: forwardedHeaders,
                body: hasBody ? body : undefined,
            })
            const webRes = await handler(webReq)
            res.statusCode = webRes.status
            const skip = new Set(['content-encoding', 'content-length', 'transfer-encoding'])
            webRes.headers.forEach((v: string, k: string) => {
                if (!skip.has(k.toLowerCase())) res.setHeader(k, v)
            })
            if (webRes.body) {
                await pipeWebBodyToNode(res, webRes.body)
            }
            res.end()
        } catch (e) {
            console.error('[dev-api]', e)
            if (!res.headersSent) res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'خطأ داخلي في خادم التطوير' }))
        }
    })
}

function pdfjsAssetsPlugin(command: string, options: { minimalFonts?: boolean; bundleAssets?: boolean } = {}) {
    const cmapsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/cmaps')
    const fontsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/standard_fonts')
    const workerSrc = path.join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
    const minimalFonts = options.minimalFonts === true
    const bundleAssets = options.bundleAssets !== false

    return {
        name: 'hami-pdfjs-assets',
        configureServer(server: ViteDevServer) {
            server.middlewares.use(
                '/pdfjs-assets/cmaps',
                sirv(cmapsDir, { dev: true, etag: true, single: false }),
            )
            server.middlewares.use(
                '/pdfjs-assets/standard_fonts',
                sirv(fontsDir, { dev: true, etag: true, single: false }),
            )
            server.middlewares.use((req, res, next) => {
                if (req.url?.split('?')[0] !== '/pdfjs-assets/pdf.worker.min.mjs') return next()
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
                fs.createReadStream(workerSrc).pipe(res)
            })
        },
        closeBundle() {
            if (command !== 'build' || !bundleAssets) return
            const outDir = path.join(projectRoot, 'dist/pdfjs-assets')
            fs.mkdirSync(outDir, { recursive: true })
            fs.copyFileSync(workerSrc, path.join(outDir, 'pdf.worker.min.mjs'))
            fs.cpSync(cmapsDir, path.join(outDir, 'cmaps'), { recursive: true })
            if (!minimalFonts) {
                fs.cpSync(fontsDir, path.join(outDir, 'standard_fonts'), { recursive: true })
            }
        },
    }
}

function legalAnalysisDevApiPlugin() {
    return {
        name: 'dev-api-routes',
        configureServer(server: ViteDevServer) {
            attachApiRouteMiddleware(server, server.middlewares, getDevSecurityHeaders(), server.config.mode)
        },
        // preview لا يدعم ssrLoadModule — لا نُسجّل dev-api هنا (يتجنّب 500 أثناء E2E على preview)
    }
}

// Stable Standard Config - Optimized for performance (Vite + Vitest merged)
// Uses .mts extension to force ESM loading (fixes require() of ESM modules)
function resolveSentryBundled(env: Record<string, string>): boolean {
  const flag = String(env.VITE_ENABLE_SENTRY ?? '').trim().toLowerCase()
  const dsn = String(env.VITE_SENTRY_DSN ?? '').trim()
  const dsnValid = Boolean(dsn && !dsn.includes('examplePublicKey'))
  if (flag === 'false') return false
  if (flag === 'true') return dsnValid
  return dsnValid
}

function bootstrapGatePath(relative: string, command: string): string {
  const useProdGate = command === 'build'
  return path.resolve(projectRoot, useProdGate ? relative.replace('.dev.', '.prod.') : relative)
}

function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, '/')
}

function resolveCapacitorWebAliases(command: string, env: Record<string, string>) {
  if (command !== 'build' || env.VITE_BUILD_NATIVE === 'true') return [] as const;
  const shimDir = path.resolve(projectRoot, 'src/app/runtime/capacitorWebShims');
  return [
    { find: '@capacitor/core', replacement: path.join(shimDir, 'core.ts') },
    { find: '@capacitor/app', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/status-bar', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/keyboard', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/geolocation', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/filesystem', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/share', replacement: path.join(shimDir, 'pluginStub.ts') },
    {
      find: '@capacitor/local-notifications',
      replacement: path.join(shimDir, 'localNotificationsStub.ts'),
    },
    {
      find: '@capacitor-community/privacy-screen',
      replacement: path.join(shimDir, 'communityPluginStub.ts'),
    },
    {
      find: '@aparajita/capacitor-biometric-auth',
      replacement: path.join(shimDir, 'biometricStub.ts'),
    },
  ] as const;
}

function resolveVendorChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/node_modules/')) return undefined
  if (normalized.endsWith('.css')) return undefined

  if (normalized.includes('/@supabase/') || normalized.includes('/supabase-js/')) {
    return 'vendor-supabase'
  }
  if (normalized.includes('/framer-motion/') || normalized.includes('/motion/')) {
    return 'vendor-motion'
  }
  if (normalized.includes('/@sentry/') || normalized.includes('/@sentry-internal/')) {
    return 'vendor-sentry'
  }
  if (normalized.includes('/pdfjs-dist/')) {
    return 'vendor-pdf'
  }
  if (normalized.includes('/@capacitor-community/privacy-screen/')) {
    return 'vendor-privacy-screen'
  }
  if (normalized.includes('/@aparajita/capacitor-biometric-auth/')) {
    return 'vendor-biometric-auth'
  }
  if (
    normalized.includes('/@capacitor/') ||
    normalized.includes('/@aparajita/') ||
    normalized.includes('/@capacitor-community/')
  ) {
    return 'vendor-capacitor'
  }
  if (
    normalized.includes('/@radix-ui/') ||
    normalized.includes('/vaul/') ||
    normalized.includes('/embla-carousel-react/') ||
    normalized.includes('/lucide-react/')
  ) {
    return 'vendor-ui'
  }
  if (normalized.includes('/dompurify/') || normalized.includes('/isomorphic-dompurify/')) {
    return 'vendor-sanitize'
  }
  if (normalized.includes('/zustand/')) {
    return 'vendor-zustand'
  }
  if (normalized.includes('/fuse.js/') || normalized.includes('/@tanstack/react-virtual/')) {
    return 'vendor-search'
  }
  if (
    normalized.includes('/clsx/') ||
    normalized.includes('/tailwind-merge/') ||
    normalized.includes('/tailwindcss-animate/')
  ) {
    return 'vendor-style-utils'
  }
  if (
    normalized.includes('/node_modules/react/') ||
    normalized.includes('/node_modules/react-dom/') ||
    normalized.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react'
  }
  return 'vendor-misc'
}

function resolveExecutionHandlerClusterChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return undefined
  if (!normalized.includes('/executionDashboardCore/')) return undefined
  if (normalized.includes('/__tests__/')) return undefined

  const inHandlerCluster =
    normalized.includes('/ExecutionDashboardHandlerCluster') ||
    normalized.includes('/useExecutionDashboardCoreHandlerCluster') ||
    normalized.includes('handlerClusterContextShared') ||
    normalized.includes('buildHandlerClusterCoreInput') ||
    normalized.includes('executionDashboardCoreHandlerClusterTypes') ||
    normalized.includes('useExecutionDashboardNotesTasksHandlers') ||
    normalized.includes('useExecutionDashboardAppointmentHandlers') ||
    normalized.includes('useExecutionDashboardPaymentHandlers') ||
    normalized.includes('useExecutionDashboardPushTimelineEvent') ||
    normalized.includes('useExecutionDashboardRuntimeSyncEffects') ||
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate')

  if (!inHandlerCluster) return undefined

  if (
    normalized.includes('handlerClusterContextShared') ||
    normalized.includes('buildHandlerClusterCoreInput') ||
    normalized.includes('executionDashboardCoreHandlerClusterTypes')
  ) {
    return 'execution-handler-cluster-shared'
  }

  const isCoerciveCluster =
    normalized.includes('HandlerClusterCoercive') ||
    normalized.includes('CoreHandlerClusterCoercive')
  const isSeizureCluster =
    normalized.includes('HandlerClusterSeizure') ||
    normalized.includes('CoreHandlerClusterSeizure')
  const isFollowupCluster =
    normalized.includes('HandlerClusterFollowup') ||
    normalized.includes('CoreHandlerClusterFollowup')
  const isLightCluster =
    normalized.includes('HandlerClusterLight') || normalized.includes('CoreHandlerClusterLight')

  if (isCoerciveCluster) {
    return 'execution-handler-cluster-coercive'
  }

  if (isSeizureCluster) {
    return 'execution-handler-cluster-seizure'
  }

  if (isFollowupCluster) {
    return 'execution-handler-cluster-followup'
  }

  if (isLightCluster) {
    return 'execution-handler-cluster-light'
  }

  if (
    normalized.includes('HandlerClusterDossierSupport') ||
    normalized.includes('CoreHandlerClusterDossierSupport')
  ) {
    return 'execution-handler-cluster-dossier'
  }

  if (
    normalized.includes('HandlerClusterPartyDeath') ||
    normalized.includes('PartyLifecycle') ||
    normalized.includes('HandlerClusterEmployeeAssignment')
  ) {
    return 'execution-handler-cluster-party'
  }

  if (
    normalized.includes('HandlerClusterPayment') ||
    normalized.includes('HandlerClusterPublicationNotice') ||
    normalized.includes('useExecutionDashboardPublicationNoticeHandlers')
  ) {
    return 'execution-handler-cluster-publication'
  }

  if (
    normalized.includes('useExecutionDashboardPushTimelineEvent') ||
    normalized.includes('useExecutionDashboardRuntimeSyncEffects') ||
    normalized.includes('useExecutionDashboardSupabaseTimelineHydrate')
  ) {
    return 'execution-handler-cluster-runtime'
  }

  if (normalized.includes('Foundation')) {
    return 'execution-handler-cluster-foundation'
  }

  if (normalized.includes('Eviction') && !normalized.includes('Coercive')) {
    return 'execution-handler-cluster-eviction'
  }

  if (
    normalized.includes('useExecutionDashboardNotesTasksHandlers') ||
    normalized.includes('useExecutionDashboardAppointmentHandlers') ||
    normalized.includes('useExecutionDashboardPaymentHandlers')
  ) {
    return 'execution-handler-cluster-handlers'
  }

  return 'execution-handler-cluster-core'
}

function resolveBootRuntimeChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/')) return undefined
  if (
    normalized.includes('/src/boot/mountApplication') ||
    normalized.includes('/src/boot/bootEntryPreamble') ||
    normalized.includes('/src/boot/appModule') ||
    normalized.includes('/src/app/bootstrap/bootReveal') ||
    normalized.includes('/src/app/bootstrap/bootStaticShell') ||
    normalized.includes('/src/app/bootstrap/useBootReveal') ||
    normalized.includes('/src/app/bootstrap/bootMetrics')
  ) {
    return 'boot-runtime'
  }
  return undefined
}

function resolveArchivePortalChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (normalized.includes('/components/lawyer/ArchivePortal/ArchivePortalLawsuitEntry')) {
    return 'lawsuit-archive-portal'
  }
  if (normalized.includes('/components/lawyer/ArchivePortal.tsx')) {
    return 'app-archive-portal'
  }
  if (
    normalized.includes('/ArchivePortal/LawsuitArchiveChrome') ||
    normalized.includes('/ArchivePortal/components/LawsuitArchiveFileGrid')
  ) {
    return 'lawsuit-archive-grid'
  }
  if (
    normalized.includes('/ArchivePortal/ExecutionArchiveChrome') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveFileGrid') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveToolbar')
  ) {
    return 'archive-portal-execution'
  }
  if (
    normalized.includes('/ArchivePortal/components/LawsuitArchiveLifecycleBars') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveLifecycleBars') ||
    normalized.includes('/ArchivePortal/components/ArchiveDossierToolbar') ||
    normalized.includes('/ArchivePortal/criminalArchiveUtils')
  ) {
    return 'archive-portal-lite'
  }
  return undefined
}

function isBenignBuildNoise(message: string): boolean {
  return (
    /dynamic import will not move module into another chunk/i.test(message) ||
    /^Circular chunk:/i.test(message)
  );
}

const viteLogger = createLogger();

const customLogger = {
  ...viteLogger,
  info(msg, options) {
    if (isBenignBuildNoise(msg)) return;
    viteLogger.info(msg, options);
  },
  warn(msg, options) {
    if (isBenignBuildNoise(msg)) return;
    viteLogger.warn(msg, options);
  },
};

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const pdfMinimalAssets = env.VITE_PDF_MINIMAL_ASSETS === 'true'
  const pdfBundleAssets = env.VITE_PDF_BUNDLE_ASSETS === 'true'
  const sentryBundled = resolveSentryBundled(env)
  const sentryStubPath = path.resolve(projectRoot, 'src/app/observability/sentryReactStub.ts')

  return {
  customLogger,
  plugins: [
    preferFileOverDirectory(projectRoot),
    hamiBootScriptOrder(),
    react(),
    tailwindcss(),
    pdfjsAssetsPlugin(command, { minimalFonts: pdfMinimalAssets, bundleAssets: pdfBundleAssets }),
    legalAnalysisDevApiPlugin(),
  ],
  esbuild: {
    legalComments: 'none',
    // إزالة console/debugger من حزمة الإنتاج — أخف على الشبكة وأقل عملاً في وقت التشغيل
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: [
      ...(sentryBundled
        ? []
        : [
            {
              find: '@sentry/react',
              replacement: sentryStubPath,
            },
          ]),
      ...resolveCapacitorWebAliases(command, env),
      {
        find: '@/app/bootstrap/LawyerDashboardGate',
        replacement: path.resolve(projectRoot, 'src/app/bootstrap/LawyerDashboardGate.tsx'),
      },
      {
        find: '@/app/bootstrap/SecurityInitializerGate',
        replacement: bootstrapGatePath('src/app/bootstrap/SecurityInitializerGate.dev.tsx', command),
      },
      { find: '@/app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: 8080,
    /** منفذ واحد فقط — تجنّب تشغيل عدة خوادم (8080/8081/8082) مع HMR مكسور */
    strictPort: true,
    open: true,
    allowedHosts: true,
    warmup: {
      clientFiles: [
        './src/index.tsx',
        './src/app/AppBootRoot.tsx',
        './src/styles/index.css',
      ],
    },
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**', '**/blob-report/**'],
    },
    headers: {
      ...getDevSecurityHeaders(),
    },
    /** يتبع منفذ الخادم الفعلي — لا تثبيت 8080 يدوياً (كان يسبب stale imports عند 8081/8082) */
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: false,
    open: true,
    headers: {
      ...getProductionSecurityHeaders(),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'zustand',
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // يطابق target/lib في tsconfig.json — الحد الأدنى Chrome/WebView 94، iOS 15.4
    target: 'es2022',
    // Smaller dist + faster builds; set VITE_SOURCEMAP=true when you need .map files (e.g. Sentry upload)
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    assetsInlineLimit: 4096,
    modulePreload: {
      /**
       * السياق يحدّد السياسة:
       *
       * - `html`: روابط modulepreload في index.html تُجلب قبل أي شيء وتزاحم React
       *   على النطاق. allowlist ضيّق — React وboot-runtime فقط.
       *
       * - `js`: قائمة الاعتماديات التي يمرّرها Vite لـ`__vitePreload` عند استيراد
       *   ديناميكي. قصّها يعني أن المتصفح لا يكتشف اعتماديات الـchunk إلا بعد
       *   تنزيله وتحليله — رحلة ذهاب وإياب لكل مستوى في الشجرة. على شبكة بزمن
       *   تأخير 150 مللي كلّف ذلك لوحة المحامي ثوانيَ من العمق الصرف. تُمرَّر
       *   كاملة ليتوازى الجلب.
       */
      resolveDependencies: (_filename, deps, { hostType }) =>
        hostType === 'html'
          ? deps.filter((dep) => /(^|\/)(vendor-react|boot-runtime)-[^/]+\.js(\?|$)/i.test(dep))
          : deps,
    },
    rollupOptions: {
      external: command === 'build' ? ['html2canvas'] : [],
      onLog(level, log, handler) {
        const msg = typeof log === 'string' ? log : log.message ?? '';
        if (isBenignBuildNoise(msg)) return;
        if (typeof handler === 'function') handler(level, log);
      },
      output: {
        /**
         * بلا دمج micro-chunks.
         *
         * الدمج يقلّل عدد الملفات، لكنه يلحم وحدات feature صغيرة داخل chunk نقطة
         * الدخول لأن المدخل «متوافق» مع كل شيء — فتصير استيراداتها اعتمادية ثابتة
         * لأول رسم. بالقياس: 606 كيلوبايت مضغوطة قبل أن يرى المستخدم شيئاً، منها
         * محرّك القضايا الجزائية وSupabase وعناقيد التنفيذ.
         *
         * والسلوك غير رتيب: 2048 و3072 أبقيا المدخل نظيفاً بينما 2560 و4096 لوّثاه.
         * أي عتبة موجبة حظّ لا هندسة. الصفر وحده يضمن مدخلاً بـ54 كيلوبايت.
         * التكلفة: عدد chunks أكبر — يُعوَّض بالتحميل المسبق المرحلي لا بالدمج الأعمى.
         *
         * HAMI_MIN_CHUNK_SIZE للقياس المقارن؛ guard:boot-critical-weight يحرس النتيجة.
         */
        experimentalMinChunkSize: Number(process.env.HAMI_MIN_CHUNK_SIZE ?? 0),
        manualChunks(id) {
          const bootChunk = resolveBootRuntimeChunk(id)
          if (bootChunk) return bootChunk
          const archivePortalChunk = resolveArchivePortalChunk(id)
          if (archivePortalChunk) return archivePortalChunk
          const executionHandlerClusterChunk = resolveExecutionHandlerClusterChunk(id)
          if (executionHandlerClusterChunk) return executionHandlerClusterChunk
          return resolveVendorChunk(id);
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /**
     * المهلة الافتراضية 5 ثوانٍ كانت تُسقط اختبارات ثقيلة (ArchivePortal مثلاً)
     * داخل المجموعة الكاملة بينما تنجح منفردة — تجويع تحت التوازي لا خلل فيها.
     */
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  }
})
