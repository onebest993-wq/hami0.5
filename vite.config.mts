/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
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

function pdfjsAssetsPlugin(command: string) {
    const cmapsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/cmaps')
    const fontsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/standard_fonts')

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
        },
        closeBundle() {
            if (command !== 'build') return
            const outDir = path.join(projectRoot, 'dist/pdfjs-assets')
            fs.mkdirSync(outDir, { recursive: true })
            fs.cpSync(cmapsDir, path.join(outDir, 'cmaps'), { recursive: true })
            fs.cpSync(fontsDir, path.join(outDir, 'standard_fonts'), { recursive: true })
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
function bootstrapGatePath(relative: string, command: string): string {
  const useProdGate = command === 'build'
  return path.resolve(projectRoot, useProdGate ? relative.replace('.dev.', '.prod.') : relative)
}

function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, '/')
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
  return 'vendor-misc'
}

function resolveExecutionHandlerClusterChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return undefined

  if (
    normalized.includes('/ExecutionDashboardHandlerClusterFollowupHeavyBridge') ||
    normalized.includes('/useExecutionDashboardCoreHandlerClusterFollowupHeavy')
  ) {
    return 'ExecutionDashboardHandlerClusterFollowupHeavyBridge'
  }

  if (
    normalized.includes('/ExecutionDashboardHandlerClusterSeizureHeavyBridge') ||
    normalized.includes('/useExecutionDashboardCoreHandlerClusterSeizureHeavy')
  ) {
    return 'ExecutionDashboardHandlerClusterSeizureHeavyBridge'
  }

  if (
    normalized.includes('/ExecutionDashboardHandlerClusterBridge') ||
    normalized.includes('/useExecutionDashboardCoreHandlerCluster.ts')
  ) {
    return 'ExecutionDashboardHandlerClusterBridge'
  }

  return undefined
}

export default defineConfig(({ command }) => ({
  plugins: [
    preferFileOverDirectory(projectRoot),
    react(),
    tailwindcss(),
    pdfjsAssetsPlugin(command),
    legalAnalysisDevApiPlugin(),
  ],
  esbuild: {
    legalComments: 'none',
    // إزالة console/debugger من حزمة الإنتاج — أخف على الشبكة وأقل عملاً في وقت التشغيل
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: [
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
    exclude: ['expo-secure-store', 'expo-modules-core'],
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'motion/react',
      '@supabase/supabase-js',
      'zustand',
      'pdfjs-dist',
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    // Smaller dist + faster builds; set VITE_SOURCEMAP=true when you need .map files (e.g. Sentry upload)
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    assetsInlineLimit: 4096,
    modulePreload: {
      /** لا تُحمَّل مسبقاً حزم الشاشات الثقيلة — تُجلب عند أول lazy import فقط */
      resolveDependencies: (_filename, deps) =>
        deps.filter(
          (dep) =>
            !/(lawyer-dashboard|execution-dashboard|execution-dashboard-static-scope|execution-dashboard-loader|execution-lazy-registry|execution-tab-|execution-orchestrators|execution-hooks|execution-helpers|execution-modals|execution-overlays|execution-shell-overlays|execution-phone-body|execution-law-articles|criminal-dashboard|criminal-tab-|criminal-dashboard-request-ui|criminal-dashboard-parties|criminal-legal-codes|criminal-store|criminal-store-slices|criminal-lazy-modals|community-overlays|community-repository|CommunityScreen|global-search-|smart-file-modal|iraqi-law-loader|articles\.json|ExecutionDashboard|CriminalDashboard|vendor-core|vendor-motion|vendor-supabase|vendor-sentry|SmartToastContainer|SmartDialogContainer|auth-context|app-deferred-boot|runtime-|deferred-app)/i.test(
              dep,
            ),
        ),
    },
    rollupOptions: {
      external:
        command === 'build'
          ? ['html2canvas', 'expo-secure-store', 'expo-modules-core']
          : ['expo-secure-store', 'expo-modules-core'],
      output: {
        experimentalMinChunkSize: 50 * 1024,
        manualChunks(id) {
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
  },
}))
