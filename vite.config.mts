/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { preferFileOverDirectory } from './src/vite-plugins/preferFileOverDirectory'
import { getDevSecurityHeaders, getProductionSecurityHeaders } from './src/app/api/security/wifeSecurityHeaders.ts'

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
            const body = raw.byteLength ? raw : undefined
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

function legalAnalysisDevApiPlugin() {
    return {
        name: 'dev-api-routes',
        configureServer(server: ViteDevServer) {
            attachApiRouteMiddleware(server, server.middlewares, getDevSecurityHeaders(), server.config.mode)
        },
        configurePreviewServer(server: ViteDevServer) {
            attachApiRouteMiddleware(server, server.middlewares, getProductionSecurityHeaders(), 'production')
        },
    }
}

// Stable Standard Config - Optimized for performance (Vite + Vitest merged)
// Uses .mts extension to force ESM loading (fixes require() of ESM modules)
function bootstrapGatePath(relative: string, command: string): string {
  const useProdGate = command === 'build'
  return path.resolve(projectRoot, useProdGate ? relative.replace('.dev.', '.prod.') : relative)
}

export default defineConfig(({ command }) => ({
  plugins: [
    preferFileOverDirectory(projectRoot),
    react(),
    tailwindcss(),
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
        replacement: bootstrapGatePath('src/app/bootstrap/LawyerDashboardGate.dev.tsx', command),
      },
      {
        find: '@/app/bootstrap/SecurityInitializerGate',
        replacement: bootstrapGatePath('src/app/bootstrap/SecurityInitializerGate.dev.tsx', command),
      },
      { find: '@/app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
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
        './src/app/App.tsx',
        './src/styles/index.css',
      ],
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
            !/(lawyer-dashboard|execution-dashboard|execution-hooks|execution-helpers|execution-shell-overlays|execution-phone-body|criminal-dashboard|criminal-store|smart-file-modal|iraqi-law-loader|ExecutionDashboard|CriminalDashboard)/i.test(
              dep,
            ),
        ),
    },
    rollupOptions: {
      external:
        command === 'build'
          ? ['html2canvas', 'dompurify', 'expo-secure-store', 'expo-modules-core']
          : ['expo-secure-store', 'expo-modules-core'],
      output: {
        manualChunks(id) {
          if (
            id.includes('context/AuthContext') ||
            id.includes('context\\AuthContext') ||
            id.includes('utils/authStorage')
          ) {
            return 'auth-context';
          }
          if (
            id.includes('/runtime/') ||
            id.includes('\\runtime\\') ||
            id.includes('/bootstrap/deferredBoot') ||
            id.includes('\\bootstrap\\deferredBoot')
          ) {
            return 'app-runtime';
          }
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('node_modules/react/')) return 'vendor-react';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@sentry')) return 'vendor-sentry';
            return;
          }
          if (id.includes('ExecutionDashboard/hooks/') || id.includes('ExecutionDashboard\\hooks\\')) {
            return 'execution-hooks';
          }
          if (id.includes('ExecutionDashboard/helpers/') || id.includes('ExecutionDashboard\\helpers\\')) {
            return 'execution-helpers';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardPhoneBody') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardPhoneBody')
          ) {
            return 'execution-phone-body';
          }
          if (
            /ExecutionDashboard\/components\/ExecutionDashboard(Shell|Heavy|Edit|Notes|Executor|Solidary)/.test(id) ||
            /ExecutionDashboard\\components\\ExecutionDashboard(Shell|Heavy|Edit|Notes|Executor|Solidary)/.test(id)
          ) {
            return 'execution-shell-overlays';
          }
          if (id.includes('criminal-system/criminalStore') || id.includes('criminal-system\\criminalStore')) {
            return 'criminal-store';
          }
          // لا تقسيم يدوي أوسع — يسبب circular chunks أو modulepreload لحزم lazy.
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
