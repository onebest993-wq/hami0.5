/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { preferFileOverDirectory } from './src/vite-plugins/preferFileOverDirectory'

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

/** مفاتيح OpenRouter المقروءة من ‎.env‎ لتمريرها إلى ‎process.env‎ (وسيط التطوير لا يحمّل ‎.env‎ تلقائياً) */
const OPENROUTER_ENV_KEYS = [
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_HTTP_REFERER',
    'OPENROUTER_APP_TITLE',
] as const

function applyOpenRouterEnvToProcess(env: Record<string, string>): void {
    for (const key of OPENROUTER_ENV_KEYS) {
        const fromFile = env[key]?.trim()
        const fromProcess = process.env[key]?.trim()
        const value = fromFile || fromProcess
        if (value) process.env[key] = value
    }
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

/** يمرّر ‎POST /api/legal-analysis‎ إلى ‎route.ts‎ (OpenRouter) في وضع التطوير فقط */
function legalAnalysisDevApiPlugin() {
    return {
        name: 'legal-analysis-dev-api',
        configureServer(server: ViteDevServer) {
            const envDir = server.config.envDir ?? server.config.root
            const loaded = loadEnv(server.config.mode, envDir, '')
            applyOpenRouterEnvToProcess(loaded)

            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                const url = req.url?.split('?')[0] ?? ''
                if (req.method !== 'POST') {
                    return next()
                }
                const routeFile =
                    url === '/api/legal-analysis'
                        ? './src/app/api/legal-analysis/route.ts'
                        : url === '/api/forum/delete'
                          ? './src/app/api/forum/delete/route.ts'
                          : url === '/api/forum/report'
                            ? './src/app/api/forum/report/route.ts'
                            : url === '/api/requests/create'
                              ? './src/app/api/requests/create/route.ts'
                              : url === '/api/requests/update'
                                ? './src/app/api/requests/update/route.ts'
                                : url === '/api/requests/list'
                                  ? './src/app/api/requests/list/route.ts'
                                : url === '/api/upload'
                                  ? './src/app/api/upload/route.ts'
                            : null
                if (!routeFile) return next()
                try {
                    const absRoute = path.join(projectRoot, routeFile.replace(/^\.\//, ''))
                    const { POST } = await import(pathToFileURL(absRoute).href)
                    const raw = await readRequestBody(req)
                    const body = raw.byteLength ? raw : undefined
                    const forwardedHeaders = forwardRequestHeaders(req)
                    const webReq = new Request(`http://127.0.0.1${req.url}`, {
                        method: 'POST',
                        headers: forwardedHeaders,
                        body,
                    })
                    const webRes = await POST(webReq)
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
                    console.error('[legal-analysis API]', e)
                    if (!res.headersSent) res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ error: 'خطأ داخلي في خادم التطوير' }))
                }
            })
        },
    }
}

// Stable Standard Config - Optimized for performance (Vite + Vitest merged)
// Uses .mts extension to force ESM loading (fixes require() of ESM modules)
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
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
    },
  },
  server: {
    host: true,
    port: 8080,
    strictPort: false,
    open: true,
    allowedHosts: true,
    warmup: {
      clientFiles: [
        './src/index.tsx',
        './src/app/App.tsx',
        './src/app/components/auth/LoginScreen.tsx',
        './src/styles/index.css',
      ],
    },
    headers: {
      'Cache-Control': 'no-store',
    },
    /** WebSocket HMR — ثابت على localhost لتجنب فشل الاتصال مع host:true */
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8080,
      clientPort: 8080,
    },
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: false,
    open: true,
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
    rollupOptions: {
      external:
        command === 'build'
          ? ['html2canvas', 'dompurify', 'expo-secure-store', 'expo-modules-core']
          : ['expo-secure-store', 'expo-modules-core'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('node_modules/react/')) return 'vendor-react';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@sentry')) return 'vendor-sentry';
            return;
          }
          if (
            id.includes('Dashboard_Active_Order_File') ||
            id.includes('DeferredActiveOrderFile')
          ) {
            return 'chunk-active-order-file';
          }
          if (
            id.includes('View_Urgent_And_Orders_Dashboard') ||
            id.includes('Form_Urgent_Actions')
          ) {
            return 'chunk-urgent-orders-view';
          }
          // Keep admin/legal tools separate from core lawyer shell
          if (
            id.includes('/components/admin/') ||
            id.includes('\\components\\admin\\') ||
            id.includes('/app/admin/') ||
            id.includes('\\app\\admin\\')
          ) {
            return 'chunk-admin-tools';
          }
          if (
            id.includes('criminal-system/criminalStore') ||
            id.includes('criminal-system\\criminalStore')
          ) {
            return 'chunk-criminal-store';
          }
          if (
            id.includes('criminal-system/') ||
            id.includes('criminal-system\\')
          ) {
            return 'chunk-criminal-ui';
          }
          if (
            id.includes('SecretaryOrchestrator') ||
            id.includes('services/lawyer-cloud')
          ) {
            return 'chunk-lawyer-cloud-alerts';
          }
          if (
            id.includes('LawyerDashboardBackgroundServices') ||
            id.includes('LawyerDashboard.tsx')
          ) {
            return 'chunk-lawyer-dashboard';
          }
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
