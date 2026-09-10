/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createLogger, defineConfig, loadEnv, type ViteDevServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import sirv from 'sirv'
import { hamiBootScriptOrder } from './src/vite-plugins/hamiBootScriptOrder'
import { hamiHqDocumentRewrite } from './src/vite-plugins/hamiHqDocumentRewrite'
import { hamiFaviconIco } from './src/vite-plugins/hamiFaviconIco'
import { hamiCriticalNativeAndroidCss } from './src/vite-plugins/hamiCriticalNativeAndroidCss'
import { hamiShellAssetHash, SHELL_ASSETS } from './src/vite-plugins/hamiShellAssetHash'
import { preferFileOverDirectory } from './src/vite-plugins/preferFileOverDirectory'
import { appReleaseIdentity } from './scripts/app-release-identity.mjs'
import { copyPdfjsCmaps, copyPdfjsStandardFonts } from './scripts/pdfjs-assets-copy.mjs'
import {
  getDevSecurityHeaders,
  getE2ePreviewSecurityHeaders,
  getProductionSecurityHeaders,
} from './src/app/api/security/wifeSecurityHeaders'
import {
  applyWebResponseHeadersToNode,
  createWebRequestFromNode,
} from './src/app/api/security/nodeWebApiBridge.ts'
import {
  isHeadquartersOnlyApiPath,
  rejectHeadquartersPublicSurface,
} from './src/app/api/security/headquartersOriginGate.ts'

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

function resolveDevApiRequestUrl(req: IncomingMessage): string {
    const rawHost = req.headers.host
    const host = (typeof rawHost === 'string' ? rawHost : Array.isArray(rawHost) ? rawHost[0] : '')
        ?.split(',')[0]
        ?.trim()
    const safeHost =
        host && /^[A-Za-z0-9.[\]:_-]+$/.test(host) && !host.includes('://') ? host : '127.0.0.1:8080'
    return `http://${safeHost}${req.url ?? '/'}`
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
            const gateReq = createWebRequestFromNode(resolveDevApiRequestUrl(req), req)
            if (isHeadquartersOnlyApiPath(url)) {
                const denied = rejectHeadquartersPublicSurface(gateReq)
                if (denied) {
                    if (method !== 'GET' && method !== 'HEAD') {
                        await readRequestBody(req).catch(() => Buffer.alloc(0))
                    }
                    res.statusCode = denied.status
                    applyWebResponseHeadersToNode(res, denied)
                    if (denied.body) {
                        await pipeWebBodyToNode(res, denied.body)
                    }
                    if (!res.writableEnded) res.end()
                    return
                }
            }
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
            const webReq = createWebRequestFromNode(
                resolveDevApiRequestUrl(req),
                req,
                hasBody ? body : undefined,
            )
            const webRes = await handler(webReq)
            res.statusCode = webRes.status
            applyWebResponseHeadersToNode(res, webRes)
            if (webRes.body) {
                await pipeWebBodyToNode(res, webRes.body)
            }
            if (!res.writableEnded) res.end()
        } catch (e) {
            const aborted =
                (e instanceof Error && (e.name === 'AbortError' || /aborted|ECONNRESET|destroyed/i.test(e.message))) ||
                req.aborted ||
                res.writableEnded
            if (aborted) {
                if (!res.writableEnded) {
                    try {
                        res.end()
                    } catch {
                        /* ignore */
                    }
                }
                return
            }
            console.error('[dev-api]', e)
            if (!res.headersSent) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ error: 'خطأ داخلي في خادم التطوير' }))
            } else if (!res.writableEnded) {
                try {
                    res.end()
                } catch {
                    /* ignore */
                }
            }
        }
    })
}

/**
 * أصول pdf.js تُشحن مع كل بناء بلا استثناء.
 *
 * كان الشحن اختيارياً والافتراضي CDN خارجي — أي أن النشر العادي كان يخرج بلا
 * عامل محلي فيسقط عرض المستندات إن مُنع الأصل الخارجي. الملفات تُطلب عند فتح
 * PDF فقط، فلا أثر لها على حمولة الإقلاع.
 */
function pdfjsAssetsPlugin(command: string, options: { minimalFonts?: boolean } = {}) {
    const cmapsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/cmaps')
    const fontsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/standard_fonts')
    const workerSrc = path.join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
    const minimalFonts = options.minimalFonts === true

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
            if (command !== 'build') return
            const outDir = path.join(projectRoot, 'dist/pdfjs-assets')
            fs.mkdirSync(outDir, { recursive: true })
            fs.copyFileSync(workerSrc, path.join(outDir, 'pdf.worker.min.mjs'))
            copyPdfjsCmaps(cmapsDir, path.join(outDir, 'cmaps'), { minimal: minimalFonts })
            copyPdfjsStandardFonts(fontsDir, path.join(outDir, 'standard_fonts'), {
                minimal: minimalFonts,
            })
        },
    }
}

/**
 * يختم `public/sw.js` بمعرّف الحزمة.
 *
 * الختم يُشتق من أسماء الأصول المُجزَّأة، فلا يتغيّر ما لم يتغيّر بناءٌ فعلاً —
 * ولا يُلغى تخزين المستخدمين عند إعادة بناء لا تُنتج شيئاً جديداً. ودونه يظل
 * اسم الذاكرة ثابتاً فلا يحذف `activate` شيئاً وتتراكم أصول كل نشرة على الجهاز.
 */
function serviceWorkerCacheStampPlugin(command: string) {
    let cacheStampApplied = false
    return {
        name: 'hami-sw-cache-stamp',
        closeBundle() {
            if (command !== 'build' || cacheStampApplied) return
            const swPath = path.join(projectRoot, 'dist/sw.js')
            if (!fs.existsSync(swPath)) return
            const assetsDir = path.join(projectRoot, 'dist/assets')
            const assetNames = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).sort() : []
            /*
             * القشرة جزء من الحمولة التي يخزّنها العامل، فغيابها عن مدخل الختم
             * يعني ورقة قشرة تتبدّل واسم الذاكرة لا يتحرّك — أي قشرة قديمة تُقدَّم
             * إلى أن يتغيّر شيء آخر مصادفةً. الفحص يقع على الترتيب لا على النية.
             */
            for (const base of SHELL_ASSETS) {
                const ext = path.extname(base)
                const stem = path.basename(base, ext)
                const found = assetNames.some((name) => name.startsWith(`${stem}.`) && name.endsWith(ext))
                if (!found) {
                    throw new Error(
                        `[hami-sw-cache-stamp] ${base} غير مختوم بعد — يجب أن يسبق hami-shell-asset-hash هذا المكوّن`,
                    )
                }
            }
            const stamp = createHash('sha256').update(assetNames.join('\n')).digest('hex').slice(0, 16)
            const source = fs.readFileSync(swPath, 'utf8')
            if (!source.includes('__HAMI_SW_CACHE_VERSION__')) {
                if (/const CACHE_VERSION = '[a-f0-9]{16}';/.test(source)) {
                    cacheStampApplied = true
                    return
                }
                throw new Error('[hami-sw-cache-stamp] placeholder missing from public/sw.js')
            }
            fs.writeFileSync(swPath, source.replaceAll('__HAMI_SW_CACHE_VERSION__', stamp))
            cacheStampApplied = true
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

/**
 * تحويل شجرة أول طلاء لأجندة المهام على طلب صريح بعد فتح الستارة/الأجندة.
 * ليست في warmup.clientFiles حتى لا ينافس Overlay أول إطار للمنزل بعد تسجيل الدخول.
 */
function hamiFieldTasksAgendaDevWarmPlugin() {
    const WARM_PATH = '/hami-dev/warm-tasks-manager-agenda'
    const AGENDA = [
        '/src/app/components/lawyer/dashboard/TasksManagerOverlay.tsx',
        '/src/app/components/lawyer/dashboard/TasksManager.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TasksManagerHeader.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/WeeklyAgendaSection.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/useTasksManagerController.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/AgendaTaskCard.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCard.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/TasksManagerOverlays.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/useTasksManagerUiState.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/useTasksManagerDialogActions.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/utils.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/constants.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCardFieldBrief.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCardMainBrief.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCardPanels.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCardToolRow.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/TaskCardStatusRow.tsx',
        '/src/app/components/lawyer/dashboard/tasksManager/useTaskCardChrome.ts',
        '/src/app/components/lawyer/dashboard/tasksManager/taskCardUtils.ts',
        '/src/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle.ts',
    ]
    return {
        name: 'hami-field-tasks-agenda-dev-warm',
        apply: 'serve' as const,
        enforce: 'pre' as const,
        configureServer(server: ViteDevServer) {
            let warming = false
            server.middlewares.use((req, res, next) => {
                const pathOnly = (req.url ?? '').split('?')[0]
                if (pathOnly !== WARM_PATH) {
                    next()
                    return
                }
                if (!warming) {
                    warming = true
                    void Promise.all(AGENDA.map((file) => server.transformRequest(file))).catch(() => {
                        warming = false
                    })
                }
                res.statusCode = 204
                res.end()
            })
        },
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
    { find: '@capacitor/keyboard', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/geolocation', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/filesystem', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/share', replacement: path.join(shimDir, 'pluginStub.ts') },
    { find: '@capacitor/haptics', replacement: path.join(shimDir, 'pluginStub.ts') },
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

function resolveForumServerOnlyChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (normalized.includes('forumModeratorIds')) return 'forum-moderator-ids'
  if (normalized.includes('/forum/supabaseAdmin')) return 'forum-supabase-admin'
  return undefined
}

function resolveVendorChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/node_modules/')) return undefined
  if (normalized.endsWith('.css')) return undefined

  if (normalized.includes('/@supabase/') || normalized.includes('/supabase-js/')) {
    return 'vendor-supabase'
  }
  /*
   * سياق إعداد الحركة وحده — مقطع مستقلّ بمئات البايتات.
   *
   * وحدته `createContext` واحد لا غير. وفرْدُها يجعل مزوّد السياق قابلاً للاستيراد
   * الساكن من قشرة التشغيل **بلا** أن يُسحب `vendor-motion` (١٣٣ ك.ب) إلى مسار
   * الإقلاع. وهو شرطٌ لأن يكون المزوّد حاضراً من أوّل رسم: غلافٌ يظهر بعد التركيب
   * يُغيّر عمق الشجرة فيُبيد React كلّ ما تحته — وهو ما كان يُعيد تركيب التطبيق
   * بأسره بعد نحو ١.٤ ثانية (FINDING-025). والمقطع واحد فلا تتكرّر نسخة السياق.
   */
  if (normalized.includes('/framer-motion/dist/es/context/MotionConfigContext')) {
    return 'vendor-motion-config-context'
  }
  if (
    normalized.includes('/framer-motion/') ||
    normalized.includes('/node_modules/motion/') ||
    normalized.includes('/motion-dom/') ||
    normalized.includes('/motion-utils/')
  ) {
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
  /** نواة lucide فقط — ملفات الأيقونات تتبع الشاشة المستورِدة، لا برميل vendor. */
  if (
    normalized.includes('/lucide-react/dist/esm/createLucideIcon') ||
    normalized.includes('/lucide-react/dist/esm/defaultAttributes')
  ) {
    return 'vendor-lucide'
  }
  if (
    normalized.includes('/@radix-ui/') ||
    normalized.includes('/@floating-ui/') ||
    normalized.includes('/vaul/') ||
    normalized.includes('/embla-carousel-react/') ||
    normalized.includes('/aria-hidden/') ||
    normalized.includes('/react-remove-scroll') ||
    normalized.includes('/react-style-singleton/') ||
    normalized.includes('/get-nonce/') ||
    normalized.includes('/detect-node-es/') ||
    normalized.includes('/use-callback-ref/') ||
    normalized.includes('/use-sidecar/')
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
    normalized.includes('/node_modules/scheduler/') ||
    normalized.includes('/tslib/') ||
    normalized.includes('/prop-types/')
  ) {
    return 'vendor-react'
  }
  return 'vendor-misc'
}

function resolveExecutionHandlerClusterChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return undefined
  if (normalized.includes('/__tests__/')) return undefined

  const inExecutionDashboardCore = normalized.includes('/executionDashboardCore/')
  const isSeizureInlineSatellite =
    inExecutionDashboardCore &&
    (normalized.includes('SeizureAssetModal') ||
      normalized.includes('SeizedPropertyModal') ||
      normalized.includes('AuctionSessionResult') ||
      normalized.includes('FollowupSeizureInits') ||
      normalized.includes('FollowupSeizureHandlers') ||
      normalized.includes('SeizureRequestSubmit') ||
      normalized.includes('propertySeizureInline') ||
      normalized.includes('movableSeizureInline') ||
      normalized.includes('PropertyInlineSave') ||
      normalized.includes('MovableInlineSave') ||
      normalized.includes('RealEstateSeizureModal') ||
      normalized.includes('ThirdPartySeizureHandlers') ||
      normalized.includes('ThirdPartySeizureSave') ||
      normalized.includes('CoerciveActionSeizureSave'))

  // Peel AssetModal / inline-persistence satellites before the broad seizure host bucket
  // (and even when the module is not on the HandlerCluster allowlist).
  if (isSeizureInlineSatellite) {
    return 'execution-handler-cluster-seizure-inline'
  }

  // Utils persistence helpers live beside ExecutionDashboard (not always under Core).
  if (
    !inExecutionDashboardCore &&
    (normalized.includes('propertySeizureInline') || normalized.includes('movableSeizureInline'))
  ) {
    return 'execution-handler-cluster-seizure-inline'
  }

  if (!inExecutionDashboardCore) return undefined

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

/**
 * أوراق دعم ExecutionDashboard خارج handler-cluster — تقلّص جذع ExecutionDashboard-*
 * تحت هدف anyChunkRawKb=280 دون تغيير بصري.
 * يُستدعى بعد resolveExecutionHandlerClusterChunk حتى لا تُسرق وحدات العناقيد.
 *
 * التقسيم على مراحل (boot / claim / persist / scope / glue) يمنع ورم امتصاص
 * واحد >520KB كما يحدث عند تسمية سلسلة Persist/Pipeline كلها في chunk واحد.
 */
function resolveExecutionDashboardSupportChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/')) return undefined
  if (normalized.includes('/__tests__/')) return undefined

  if (normalized.includes('executionDashboardLazyRegistry')) {
    return 'execution-lazy-registry'
  }

  if (normalized.includes('CoreScopeAndChunk')) {
    return 'execution-dashboard-scope'
  }

  if (
    normalized.includes('CoreBootPipeline') ||
    normalized.includes('executionDashboardCoreBootPipeline')
  ) {
    return 'execution-dashboard-boot-pipeline'
  }

  if (
    normalized.includes('CoreWorkspacePipeline') ||
    normalized.includes('executionDashboardCoreWorkspacePipeline') ||
    normalized.includes('CoreFileMetadataBinding')
  ) {
    return 'execution-dashboard-workspace-pipeline'
  }

  if (
    normalized.includes('CoreClaimFinancialLedgerPipeline') ||
    normalized.includes('CoreGraceMasterEvictionPipeline') ||
    normalized.includes('executionDashboardCoreGraceMasterEvictionPipeline') ||
    normalized.includes('CoreClaimGracePersist') ||
    normalized.includes('CoreFollowupDebtorPipeline')
  ) {
    return 'execution-dashboard-claim-pipeline'
  }

  if (
    normalized.includes('CorePersistHandlerPipeline') ||
    normalized.includes('executionDashboardCorePersistHandlerPipeline') ||
    normalized.includes('CorePersistSaveEditSegment') ||
    normalized.includes('CorePersistSummonsNoticeSegment') ||
    normalized.includes('useExecutionDashboardPersistExecutionMerge')
  ) {
    return 'execution-dashboard-persist-pipeline'
  }

  if (
    normalized.includes('/pipelinesChainInputs/') ||
    normalized.includes('CorePipelinesChain') ||
    normalized.includes('buildExecutionDashboardCorePipelinesChainInputs')
  ) {
    return 'execution-dashboard-pipelines'
  }

  return undefined
}

/**
 * هيكل اللوحة المشترك. ليس داخل home-paint حتى لا تسحب البلاطات Shell.
 * apply يبقى خارج bootStaticShell (ورقة bootTypographyFlush) لكسر دورة
 * boot-runtime ↔ home-paint من المصدر — لا ترقيع chunk إضافي على apply.
 */
function resolveLawyerDashboardCanvasChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  const canvas = [
    '/src/app/components/lawyer/dashboard/LawyerDashboardShell',
    '/src/app/components/lawyer/dashboard/schedule/DashboardTabSurface',
    '/src/app/hooks/lawyerDashboard/useLawyerDashboardAuth',
    '/src/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils',
  ]
  if (canvas.some((fragment) => normalized.includes(fragment))) {
    return 'lawyer-dashboard-canvas'
  }
  return undefined
}

/**
 * peek التنبيهات + حدث الملف للهيدر — أوراق FullBoot/Header.
 * بلا تثبيت يمتصّها hub-card فيسحب Supabase إلى الإقلاع.
 */
function resolveLawyerBootPeekLiteChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/services/alerts/homeHubSecretaryAlertsWarmCache') ||
    normalized.includes('/src/app/services/alerts/homeHubRadarWarmCache') ||
    normalized.includes('/src/app/services/alerts/homeHubAlertRevision') ||
    normalized.includes('/src/app/services/appAlertDismiss') ||
    normalized.includes('/src/app/hooks/useDismissedAlertIds') ||
    normalized.includes('/src/app/services/profile/profileEvents') ||
    normalized.includes('/src/app/services/profile/profileWarmCacheStore') ||
    normalized.includes('/src/app/services/profile/resolveLawyerDisplayName') ||
    normalized.includes('/src/app/services/profile/profileHeaderLogic') ||
    normalized.includes('/src/app/services/profile/profileUrlSanitize') ||
    normalized.includes('/src/app/services/profile/lawyerProfileLocalRead') ||
    normalized.includes('/src/app/services/profile/profileWarmCache') ||
    normalized.includes('/src/app/services/profile/resolveForumTileProfileChrome') ||
    normalized.includes('/src/app/components/lawyer/dashboard/peekForumFirstPaintChrome') ||
    normalized.includes('/src/app/services/profileSanitizer')
  ) {
    return 'lawyer-boot-peek-lite'
  }
  return undefined
}

/**
 * إغلاق الطبقات + زر الرجوع + inset الكيبورد — أوراق مشتركة بين الإقلاع والبحث والهاب.
 * تُثبَّت قبل home-hub حتى لا يمتصّ hub-overlays/hub-card مسار FullBoot.
 */
function resolveHamiOverlaySnapLiteChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/runtime/overlaySnapClose') ||
    normalized.includes('/src/app/runtime/executionDossierPrimeHost') ||
    normalized.includes('/src/app/runtime/nativeBackStack') ||
    normalized.includes('/src/app/runtime/capacitorAppLifecycle') ||
    normalized.includes('/src/app/hooks/useMobileKeyboardInset') ||
    normalized.includes('/src/app/services/alerts/homeHubPerfMetrics')
  ) {
    return 'hami-overlay-snap-lite'
  }
  return undefined
}

function resolveHamiShellLiteChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  const lite = [
    '/src/app/components/ui/smartToastBus',
    '/src/app/services/auth/lawyerAccountStatus',
    '/src/app/services/auth/lawyerVerificationStore',
  ]
  if (lite.some((fragment) => normalized.includes(fragment))) {
    return 'hami-shell-lite'
  }
  /** SmartToast.ts فقط — بادئة SmartToast تبتلع SmartToastContainer (motion). */
  if (/\/src\/app\/components\/ui\/SmartToast\.(ts|tsx|js|jsx)$/.test(normalized)) {
    return 'hami-shell-lite'
  }
  return undefined
}

/**
 * أساس persist المشترك (secure JSON + rehydrate reporter).
 * يجب أن يبقى ورقة قبل lawyer-workspace-store وlawyer-boot-stores.
 * إن امتصّه caseStore داخل lawyer-boot-stores، يستورد workspace-store
 * ذلك العنقود عند التقييم → دورة تهيئة مع storage-domain-keys / boot-runtime →
 * ReferenceError: Cannot access 'E' before initialization (E = StorageDomainKeys).
 */
function resolveHamiPersistFoundationChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/services/securePersistStorage') ||
    normalized.includes('/src/app/infrastructure/persistence/zustandPersistFoundation')
  ) {
    return 'hami-persist-foundation'
  }
  return undefined
}

function resolveLawyerWorkspaceStoreChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  const store = [
    '/src/app/stores/workspaceStore',
    '/src/app/infrastructure/persistence/workspaceStorePersist',
    '/src/app/workspace/workspaceRoutes',
    '/src/app/workspace/types',
  ]
  if (store.some((fragment) => normalized.includes(fragment))) {
    return 'lawyer-workspace-store'
  }
  return undefined
}

/**
 * تطبيع ملف التنفيذ — قبل archive-portal حتى لا يمتص المخزن دوال coerce.
 */
function resolveLawyerFileCoerceChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/components/lawyer/LawyerDashboardParts/utils') ||
    normalized.includes('/src/app/utils/executionPartyNormalize')
  ) {
    return 'lawyer-file-coerce'
  }
  return undefined
}

/**
 * وحدات orchestration التي يمتصها execution-handler أو hub-secretary إن بقيت بلا اسم.
 * تُثبَّت قبل home-hub حتى لا يسحب FullBoot السكرتير/Supabase عبر أوراق المسح.
 */
function resolveWorkspaceScanLiteChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/hooks/lawyerDashboard/useLawyerDashboardCalendarClusterLite') ||
    normalized.includes('/src/app/workspace/clusterScanSourcesLite') ||
    normalized.includes('/src/app/workspace/clusterScanSources.types') ||
    normalized.includes('/src/app/workspace/useVaultDocsForClusterScan') ||
    normalized.includes('/src/app/workspace/useCalendarEventsForClusterScan') ||
    normalized.includes('/src/app/services/vault/vaultDocsWarmState') ||
    normalized.includes('/src/app/services/vault/vaultDocUtils')
  ) {
    return 'app-workspace-scan-lite'
  }
  return undefined
}

function resolveLawyerOrchestrationLiteChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  const lite = [
    '/src/app/services/profile/profileShellPolicy',
    '/src/app/utils/quantumTasksMetrics',
    '/src/app/utils/quantumTasksStorageKey',
    '/src/app/utils/quantumTasksStorageDeserialize',
    '/src/app/utils/primeQuantumTasksBootMetrics',
    '/src/app/context/quantumTasksContext',
    '/src/app/utils/quantumTasksEvents',
    '/src/app/services/voice/voiceNoteCodec',
    '/src/app/services/tasks/fieldCurtainDayCountLite',
    '/src/app/services/search/normalizeArabicSearch',
    '/src/app/services/search/globalSearchQuerySecurity',
  ]
  if (lite.some((fragment) => normalized.includes(fragment))) {
    return 'lawyer-orchestration-lite'
  }
  return undefined
}

/**
 * وحدات المنزل/orchestration التي يمتصها archive-portal أو execution-handler
 * إن بقيت بلا اسم. تُثبَّت هنا قبل تلك العناقيد.
 */
function resolveLawyerBootSharedChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/infrastructure/persistence/LocalStorageRepository')
  ) {
    return 'lawyer-persist'
  }
  if (
    normalized.includes('/src/app/stores/caseStore') ||
    normalized.includes('/src/app/stores/notificationStore') ||
    normalized.includes('/src/app/infrastructure/persistence/caseStorePersist')
  ) {
    return 'lawyer-boot-stores'
  }
  const lawsuitLite = [
    '/src/app/utils/lawsuitTrash',
    '/src/app/utils/lawsuitFilesStorage',
    '/src/app/services/dossierPersistence/dossierCollectionSyncLite',
    '/src/app/domain/lawsuit/lawsuitSegmentStorage',
    '/src/app/domain/lawsuit/lawsuitLifecycleIndex',
    '/src/app/domain/lawsuit/lawsuitFilesRepository',
    '/src/app/hooks/useLawsuitFilesState',
  ]
  if (lawsuitLite.some((fragment) => normalized.includes(fragment))) {
    return 'lawyer-lawsuit-lite'
  }
  if (normalized.includes('/src/app/services/calendar/calendarEventsCache')) {
    return 'lawyer-calendar-cache'
  }
  const quantumLite = [
    '/src/app/context/QuantumTasksProvider',
    '/src/app/components/lawyer/dashboard/tasksManager/quantumTasksHydration',
    '/src/app/hooks/useQuantumTasks.ts',
    '/src/app/hooks/useQuantumTasks.tsx',
  ]
  if (
    quantumLite.some((fragment) => normalized.includes(fragment)) ||
    /\/src\/app\/utils\/quantumTasksStorage\.(ts|tsx|js)(?:\?|$)/.test(normalized)
  ) {
    return 'lawyer-quantum-lite'
  }
  return undefined
}

/**
 * يمنع امتصاص وحدات المنزل داخل named chunks الثقيلة (execution-handler /
 * archive-portal). الأيقونات تبقى مقطعاً منفصلاً حتى لا يسحب أرشيف التنفيذ
 * شجرة HomeTab عبر HomeXIcon.
 */
function resolveLawyerHomePaintChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (normalized.includes('/src/app/components/lawyer/dashboard/homeStemIcons')) {
    return 'lawyer-home-stem-icons'
  }
  const homePaint = [
    '/src/app/components/lawyer/dashboard/LawyerDashboardHomeTab',
    '/src/app/components/lawyer/dashboard/HomeTabPaintShell',
    '/src/app/components/lawyer/dashboard/HomeLayoutScrollRoot',
    '/src/app/components/lawyer/dashboard/LawyerHomeTabErrorBoundary',
    '/src/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton',
    '/src/app/components/lawyer/dashboard/hubHalfTileMetrics',
    '/src/app/components/lawyer/dashboard/HomeMainGrid',
    '/src/app/components/lawyer/dashboard/HomeMainGridFirstPaint',
    '/src/app/components/lawyer/dashboard/useHomeMainGridSlots',
    '/src/app/components/lawyer/dashboard/HomeHubErrorBoundary',
    '/src/app/components/lawyer/dashboard/HomeHubCardSkeleton',
    '/src/app/components/lawyer/dashboard/LawyerHomeAmbient',
    '/src/app/components/lawyer/dashboard/HomeBlockPatternOverlay',
    '/src/app/components/lawyer/dashboard/HomeMoroccanGlassDecor',
    '/src/app/components/lawyer/dashboard/commandHubTileClasses',
    '/src/app/services/settings/homeLayout',
    '/src/app/services/settings/homeWidgetPlacements',
    '/src/app/services/settings/homeBlockLabels',
    '/src/app/services/settings/resolveHomeBlockStyle',
    '/src/app/services/settings/resolveHubRouteTileVisuals',
    '/src/app/services/settings/homeBlockScale',
    '/src/app/services/settings/themeResolve',
    '/src/app/services/settings/lawyerThemeTokens',
    '/src/app/components/lawyer/lawyerThemeStyles',
    '/src/app/context/lawyerSettings/lawyerSettingsHooks',
    '/src/app/context/lawyerSettings/lawyerSettingsContexts',
    '/src/app/context/lawyerSettings/lawyerSettingsDevFallback',
  ]
  if (homePaint.some((fragment) => normalized.includes(fragment))) {
    return 'lawyer-home-paint'
  }
  /**
   * apply.ts فقط — بادئة `settings/apply` كانت تبتلع
   * applyLawyerSettingsFactoryReset وتضخّم طلاء المنزل.
   */
  if (/\/src\/app\/services\/settings\/apply\.(ts|tsx|js|jsx)$/.test(normalized)) {
    return 'lawyer-home-paint'
  }
  return undefined
}

/**
 * محتوى المنزل الحيّ وبلاطات المركز — خارج طلاء الهيكل حتى لا يعود الغلاف
 * يسحب ExecutionHero/Dock مع أول إطار.
 */
function resolveLawyerHomeTabContentChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/components/lawyer/dashboard/HomeTabContent') ||
    normalized.includes('/src/app/components/lawyer/dashboard/HomeTabWidgetSlot') ||
    normalized.includes('/src/app/components/lawyer/dashboard/HomeHubHomeSlot') ||
    normalized.includes('/src/app/components/lawyer/dashboard/useHomeTabContentModel') ||
    normalized.includes('/src/app/components/lawyer/dashboard/homeTabWidgetIds') ||
    normalized.includes('/src/app/components/lawyer/dashboard/useCommandHubTiles') ||
    normalized.includes('/src/app/components/lawyer/dashboard/useCommandCenterDockActions')
  ) {
    return 'lawyer-home-tab-content'
  }
  if (normalized.includes('/src/app/components/lawyer/dashboard/forumProfile/')) {
    return 'lawyer-home-forum-profile'
  }
  if (normalized.includes('/src/app/components/lawyer/dashboard/commandHub/')) {
    return 'lawyer-home-command-hub'
  }
  return undefined
}

/**
 * زر/شكل التثبيت — ورقة مستقلة.
 * إن بقيت بلا اسم يمتصّها lawyer-home-hub-pins (أيقونة Pin مشتركة مع صف التثبيت)
 * فأول فتح للمعاملات يدفع لوحة تثبيتات الصفحة.
 */
function resolveWorkspacePinButtonChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    /\/src\/app\/workspace\/workspacePinVisuals\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/workspace\/WorkspacePinButton\.(tsx|ts|js)$/.test(normalized) ||
    /\/src\/app\/components\/ui\/icons\/Pin\.(ts|js)$/.test(normalized) ||
    /lucide-react\/dist\/esm\/icons\/pin\.js$/.test(normalized)
  ) {
    return 'workspace-pin-button'
  }
  return undefined
}

/**
 * بناة عناصر التثبيت — مشتركة مع تجميع لوحة التثبيتات.
 * بلا اسم يمتصّها lawyer-home-hub-pins فيدفع أول فتح للمعاملات لوحة المنزل.
 */
function resolveWorkspacePinBuildersChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/workspace/workspacePinBuilders') ||
    normalized.includes('/src/app/workspace/workspacePinRecord') ||
    normalized.includes('/src/app/workspace/pinDisplayUtils') ||
    normalized.includes('/src/app/workspace/extractCaseRefs') ||
    normalized.includes('/src/app/workspace/resolveLinkedCaseMeta') ||
    normalized.includes('/src/app/workspace/lawsuitWorkspacePin') ||
    normalized.includes('/src/app/workspace/executionWorkspacePin')
  ) {
    return 'workspace-pin-builders'
  }
  return undefined
}

/**
 * بطاقة الهاب — صدفة خفيفة منفصلة عن الأوراق حتى لا يدخل portal أول طلاء.
 */
function resolveLawyerHomeHubChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubUrgentMoreOverlay') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsMoreOverlay') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsMoreOverlay') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubMoreOverlayShell') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubOverlaySheetHandle') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubOverlaySheet') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack')
  ) {
    return 'lawyer-home-hub-overlays'
  }
  if (
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsVirtualList') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsPanel') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinRow') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPinsOverflow') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/hooks/useClusterAggregatorGated')
  ) {
    return 'lawyer-home-hub-pins'
  }
  if (
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPrimaryBody') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPanel') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsList') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertRow') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubUrgentTabContent') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubRadarRow') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubTabOverflow') ||
    normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubKeyboardFeedStyle') ||
    normalized.includes('/src/app/components/lawyer/NeuralAlertsCard/HorizonFilterTabs')
  ) {
    return 'lawyer-home-hub-alerts-feed'
  }
  if (normalized.includes('/src/app/components/lawyer/LawyerHomeHubCard')) {
    return 'lawyer-home-hub-card'
  }
  return undefined
}

function resolveLawyerDashboardStemChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (normalized.includes('/src/app/components/lawyer/LawyerDashboard.tsx')) {
    return 'lawyer-dashboard-stem'
  }
  return undefined
}

/**
 * أوراق مشتركة بلا اعتمادية ثقيلة — يجب أن تُسمّى قبل أي chunk ميزة.
 *
 * بلا تثبيت: Rollup يسكن الورقة داخل أول chunk مسمّى يستوردها
 * (`execution-dashboard-persist-pipeline` غالباً). بعدها كل مستورد للورقة
 * — لوحة OTP، المنتدى، أيقونة إغلاق — يدفع إغلاق خط أنابيب التنفيذ (~1.2 م.ب).
 * القياس: LawyerAuthOtpPanel استورد parseJsonResponse (17 سطراً) فسحب persist-pipeline.
 *
 * الأيقونات تبقى ملفاً لكل أيقونة بلا برميل `lawyer-lucide-icons` — تسمية كل
 * أيقونة chunk مستقل أنتج مقاطع فارغة وكسَر قصد «تتبع الشاشة المستورِدة».
 */
function resolveSharedRuntimeLeafChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/')) return undefined

  if (/\/src\/app\/utils\/bffJsonResponse\.(ts|js)$/.test(normalized)) {
    return 'bff-json-leaf'
  }
  /**
   * تاريخ الجهاز YYYY-MM-DD. بلا تثبيت يمتصّه execution-dashboard-boot-pipeline
   * فيدفع المنزل وصدف التقويم إغلاق خط إقلاع التنفيذ لأجل اليوم المحلي.
   */
  if (/\/src\/app\/utils\/localYmd\.(ts|js)$/.test(normalized)) {
    return 'local-ymd'
  }
  /**
   * hop التقويم السحابي. بلا تثبيت يمتصّه lawyer-boot-peek-lite عبر
   * homeHubRadarWarmCache فيدفع المضيف أرشيف المنزل عند prefetch النموذج.
   * الطبقتان تبقى ملفين؛ تسميتان منفصلتان — لا دمج hop.
   */
  if (/\/src\/app\/services\/calendar\/calendarCloudRuntime\.(ts|js)$/.test(normalized)) {
    return 'calendar-cloud-runtime'
  }
  if (/\/src\/app\/services\/calendar\/calendarCloudLoader\.(ts|js)$/.test(normalized)) {
    return 'calendarCloudLoader'
  }
  /**
   * كاش أحداث الذاكرة. بلا تثبيت يمتصّه lawyer-boot-peek-lite عبر
   * homeHubRadarWarmCache فيُجبر ScheduleTabHost على peek المنزل.
   */
  if (/\/src\/app\/services\/calendar\/calendarEventsCache\.(ts|js)$/.test(normalized)) {
    return 'calendar-events-cache'
  }
  /**
   * مفاتيح تخزين الأحداث/الشواهد. بلا تثبيت يمتصّها persist-pipeline عبر
   * lawyerCalendarCloud فتدفع calendarLocalSnapshot (المضيف) إغلاق التنفيذ.
   */
  if (/\/src\/app\/services\/calendar\/calendarStorageKeys\.(ts|js)$/.test(normalized)) {
    return 'calendar-storage-keys'
  }
  /**
   * ذاكرة رادار الهاب (peek فقط). بلا تثبيت تسكن داخل lawyer-boot-peek-lite
   * عبر homeHubRadarWarmCache فيدفع ScheduleTabHost شجرة peek المنزل (ملف شخصي).
   */
  if (/\/src\/app\/services\/alerts\/homeHubRadarPeek\.(ts|js)$/.test(normalized)) {
    return 'home-hub-radar-peek'
  }
  /**
   * نموذج الإشعار (أنواع + اشتقاق). بلا تثبيت يمتصّه lawyer-boot-stores عبر
   * notificationStore فيدفع المنتدى إغلاق المخزن لأجل deriveNotificationCategory.
   */
  if (/\/src\/app\/infrastructure\/notificationModel\.(ts|js)$/.test(normalized)) {
    return 'notification-model'
  }
  /**
   * قراءة blob الإشعار sync. بلا تثبيت يمتصّه lawyer-boot-stores عبر
   * notificationStore فيدفع شارة المنتدى إغلاق zustand.
   */
  if (/\/src\/app\/infrastructure\/notificationPeekLite\.(ts|js)$/.test(normalized)) {
    return 'notification-peek-lite'
  }
  /**
   * ملكية مفاتيح KV. بلا تثبيت يمتصّها execution-storage-cache عبر
   * lawyerWorkCloudGate فيدفع CommunityDB إغلاق كاش إضبارة التنفيذ.
   */
  if (/\/src\/app\/security\/kvProxyKeyOwnership\.(ts|js)$/.test(normalized)) {
    return 'kv-proxy-key-ownership'
  }
  if (/\/src\/lib\/cloudSyncEnv\.(js|ts)$/.test(normalized)) {
    return 'cloud-sync-env'
  }
  /**
   * بوابة مزامنة العمل. بلا تثبيت تسكن داخل execution-storage-cache
   * فيدفع lawyerCloudKv / lawyerRepositoryCloud كاش التنفيذ (~19 ك.ب).
   */
  if (/\/src\/app\/services\/settings\/lawyerWorkCloudGate\.(ts|js)$/.test(normalized)) {
    return 'lawyer-work-cloud-gate'
  }
  if (/\/src\/app\/utils\/uuidv4\.(ts|js)$/.test(normalized)) {
    return 'hami-uuidv4'
  }
  /**
   * تخزين الدعاوى الجزائية. بلا تثبيت يمتصّه persist-pipeline عبر
   * جسر التقويم فيدفع CriminalDashboard إغلاق تنفيذ persist لأجل zustand.
   */
  if (
    /\/src\/app\/utils\/criminalCasesStorage/.test(normalized) ||
    /\/src\/app\/utils\/criminalCaseCardIndex\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/criminalShardedPersistStorage\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/criminalEmptyPersistAuth\.(ts|js)$/.test(normalized)
  ) {
    return 'criminal-cases-storage'
  }
  /**
   * محرك الطعن. بلا تثبيت يمتصّه execution-dashboard-boot-pipeline عبر
   * طابور قرارات الحجز فيدفع المالية/التمييز إغلاق إقلاع التنفيذ (~242 ك.ب).
   */
  if (normalized.includes('/src/app/components/lawyer/DecisionsAndAppealsEngine/utils/appeal-engine/')) {
    return 'execution-appeal-engine'
  }
  /**
   * طابور قرارات الحجز. بلا تثبيت يسكن داخل boot-pipeline مع المحرك.
   */
  if (/\/src\/app\/utils\/executorSeizureDecisionQueue/.test(normalized)) {
    return 'executor-seizure-decision-queue'
  }
  /**
   * رادار 48س + تسميات الصف. بلا تثبيت يمتصّه lawyer-home-hub-card عبر
   * useHomeHubRadarState فيدفع المضيف بطاقة المحور (~42 ك.ب) إن شارك ورقة.
   */
  if (
    /\/src\/app\/workspace\/useCalendarRadar48h\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/workspace\/calendarRadarDisplay\.(ts|js)$/.test(normalized)
  ) {
    return 'calendar-radar-48h'
  }
  if (
    /\/src\/app\/runtime\/appStateEvents\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/hooks\/useVisibilityAwareInterval\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/runtime\/backgroundInterval\.(ts|js)$/.test(normalized)
  ) {
    return 'app-state-events'
  }
  if (/\/src\/app\/motion\/overlayMotionRuntime\.(ts|js)$/.test(normalized)) {
    return 'overlay-motion-runtime'
  }
  if (/\/src\/app\/utils\/overlayPortal\.(ts|js)$/.test(normalized)) {
    return 'overlay-portal'
  }
  if (/\/src\/app\/utils\/scheduleIdleWork\.(ts|js)$/.test(normalized)) {
    return 'schedule-idle-work'
  }
  if (/\/src\/app\/runtime\/devicePerformanceTier\.(ts|js)$/.test(normalized)) {
    return 'device-performance-tier'
  }
  if (
    /\/src\/app\/utils\/debug\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/utils\/consoleHygiene\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/secureFetchErrors\.(ts|js)$/.test(normalized)
  ) {
    return 'hami-debug'
  }
  if (/\/src\/app\/utils\/lazy\/preloadableLazy\.(ts|js|tsx)$/.test(normalized)) {
    return 'preloadable-lazy'
  }
  if (/\/src\/app\/observability\/sentryBuildPolicy\.(ts|js)$/.test(normalized)) {
    return 'sentry-build-policy'
  }
  /**
   * تقارير Sentry للتقويم/المنتدى — بلا تثبيت يمتصّها persist-pipeline
   * فيدفع calendarPerfMetrics / forumPerfMetrics إغلاق التنفيذ.
   */
  if (
    /\/src\/app\/services\/calendar\/calendarSentryReporting\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/forum\/forumSentryReporting\.(ts|js)$/.test(normalized)
  ) {
    return 'perf-sentry-reporting'
  }
  if (/\/src\/app\/services\/transactions\/transactionsInputSecurity\.(ts|js)$/.test(normalized)) {
    return 'tx-input-security'
  }
  /**
   * ترحيل JSON الآمن — ورقة مستقلة. إدخالها في hami-persist-foundation
   * أسكن home-paint داخل الأساس فقفز إغلاق main إلى 1.1 م.ب.
   */
  if (
    /\/src\/app\/services\/storage\/readSecureOrDrainLegacySync\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/storage\/syncSecureJson\.(ts|js)$/.test(normalized)
  ) {
    return 'secure-json-legacy'
  }
  if (/\/src\/app\/services\/storage\/storageEncryptionError\.(ts|js)$/.test(normalized)) {
    return 'storage-encryption-error'
  }
  if (
    /\/src\/app\/services\/transactions\/persistTransactionsSecure\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/transactions\/notifyTransactionsPersistFailure\.(ts|js)$/.test(normalized)
  ) {
    return 'tx-secure-persist'
  }
  /**
   * مخزن المعاملات — حزمة مجال مستقلة. ليست داخل persist-foundation
   * (انحدار إقلاع مقيس) ولا تُمتص داخل persist-pipeline.
   */
  if (
    /\/src\/app\/modules\/transactionsThreading\/(store|transactionsThreadingStoreRuntime|transactionsThreadingStoreMaps|transactionsThreadingStoreOptimistic|transactionsThreadingStoreSeed|persistentRepository|repository|service|types|ids|taskTree)\.(ts|js)$/.test(
      normalized,
    ) ||
    /\/src\/app\/services\/transactions\/(transactionsThreadingMirror|sanitizeTransactionsThreadingPersist|transactionsThreadingDumpBridge)\.(ts|js)$/.test(
      normalized,
    ) ||
    /\/src\/app\/services\/cloud\/lawyerTransactionTypes\.(ts|js)$/.test(normalized)
  ) {
    return 'transactions-threading-store'
  }
  if (/\/src\/app\/services\/cloud\/lawyerRepositoryCloud\.(ts|js)$/.test(normalized)) {
    return 'lawyer-repository-cloud'
  }
  /**
   * حافلة الحوار بلا motion. بلا تثبيت يمتصّها persist-pipeline
   * فيدفع AccountSection إغلاق التنفيذ عند أول SmartDialog.confirm.
   * لا تُدرَج SmartDialogContainer (motion) — نفس قيد SmartToast.
   */
  if (
    /\/src\/app\/components\/ui\/smartDialogBus\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/components\/ui\/SmartDialog\.(ts|tsx|js|jsx)$/.test(normalized)
  ) {
    return 'hami-dialog-lite'
  }
  if (/\/src\/app\/utils\/storageCache\.(ts|js)$/.test(normalized)) {
    return 'execution-storage-cache'
  }
  /**
   * نواة الشبكة. بلا تثبيت يمتصّها persist-pipeline فيدفع المنتدى والتقويم
   * والإعدادات إغلاق التنفيذ عند أول fetchSecure.
   */
  if (
    /\/src\/app\/services\/SecureAPIClient\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/secureApiWifeSigning\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/secureApiNetworkFeatures\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/kvProxyGuard\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/utils\/bffWifeSign\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/security\/wifePublicApi\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/network\/sameOriginApiProbe\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/services\/auth\/localSigningToken\.(ts|js)$/.test(normalized)
  ) {
    return 'secure-api-client'
  }
  /**
   * HMAC الزوجة. بلا تثبيت داخل secure-api-client يسحب supabase إلى
   * كل مستورد لـ fetchSecure (المنتدى على أول فتح الخلاصة).
   */
  if (/\/src\/app\/services\/RequestSigningService\.(ts|js)$/.test(normalized)) {
    return 'wife-hmac-signing'
  }
  return undefined
}

/**
 * وحدات صدفة التقويم المشتركة بين InstantChrome (MainView) والرادار الحي (Host).
 * بلا تثبيت يسكنها Rollup داخل LawyerDashboardMainView فيُجبر Host على استيراد
 * كسرة المنزل كاملة — 117 اعتماداً ثابتاً معظمها وهمي على مسار الفتح.
 */
function resolveScheduleChromeSharedChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/')) return undefined
  if (normalized.includes('/__tests__/')) return undefined

  const chromeLite = [
    '/src/app/services/calendar/calendarShellSession',
    '/src/app/services/calendar/calendarMonthMath',
    '/src/app/services/calendar/calendarWeekStrip',
    '/src/app/services/calendar/calendarArabicLabels',
    '/src/app/services/calendar/calendarLiveHandoffContext',
    '/src/app/services/calendar/calendarReminderOverlayGate',
    '/src/app/services/calendar/calendarOpenSourceIntent',
    '/src/app/services/calendar/legalDeadlineEngine',
    '/src/app/services/calendar/calendarEventForm',
    /**
     * معرّف/صف الحدث. بلا تثبيت يمتصّه persist-pipeline عبر lawyerCalendarCloud
     * فيدفع RadarOpenInstantAddHost (MainView) إغلاق التنفيذ لأجل UUID.
     */
    '/src/app/services/calendar/calendarEventRecord',
    '/src/app/services/calendar/bridge/core',
    '/src/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeClasses',
    '/src/app/components/lawyer/dashboard/schedule/RadarEventFormInstantCover',
    '/src/app/services/calendarModuleVisuals',
  ]
  if (chromeLite.some((fragment) => normalized.includes(fragment))) {
    return 'schedule-chrome-lite'
  }
  return undefined
}

function resolveBootRuntimeChunk(id: string): string | undefined {
  const normalized = normalizeModuleId(id)
  if (!normalized.includes('/src/')) return undefined
  if (normalized.includes('/src/hq/stubs/')) return undefined
  /**
   * مفاتيح التخزين بلا تبعيات — يجب أن تبقى ورقة مستقلة قبل boot-runtime.
   * إن امتصّها SecureStoreService عبر protectedStorageKeys داخل boot-runtime،
   * يسحب lawyer-lawsuit-lite ربطاً حيّاً أثناء تهيئة دائرية مع home-paint →
   * ReferenceError: Cannot access '…' before initialization.
   *
   * storageDomains كذلك: lawyer-workspace-store يستورد StorageDomainKeys عند
   * التقييم. إن بقيت داخل boot-runtime تُغلق دائرة تهيئة →
   * ReferenceError: Cannot access 'E' before initialization.
   *
   * clientEnv كذلك: كاش `cached`/`q` داخل boot-runtime يُستدعى من
   * command-hub أثناء دورة boot ↔ paint ↔ hub قبل اكتمال let →
   * ReferenceError: Cannot access 'q' before initialization.
   */
  if (normalized.includes('/src/app/infrastructure/persistence/storageDomains')) {
    return 'storage-domain-keys'
  }
  if (normalized.includes('/src/app/domain/dossier/dossierStorageKeys')) {
    return 'dossier-storage-keys'
  }
  /**
   * لقطة سطح الإقلاع — ورقة مشتركة. ليست داخل boot-runtime حتى لا تسحب
   * settings/apply (home-paint) عنقود الإقلاع بالكامل عند الاستيراد الثابت.
   */
  if (normalized.includes('/src/app/services/settings/bootSurfacePaintCache')) {
    return 'boot-surface-paint-cache'
  }
  /**
   * سياسة قطع-الاتصال الخفيفة + تسليح الإقلاع — تُثبَّت خارج home-paint.
   * بلا تثبيت: Rollup يمتصّ localOnlyUrlPolicy داخل lawyer-home-paint لأن apply
   * يستوردها عبر localOnlyGuard، فيُجبر entry على استيراد طلاء المنزل + supabase.
   */
  if (
    normalized.includes('/src/app/services/settings/localOnlyUrlPolicy') ||
    normalized.includes('/src/app/services/settings/localOnlyBootArm') ||
    normalized.includes('/src/app/security/wifeNativeFetch') ||
    normalized.includes('/src/boot/shouldPreloadLawyerBoard') ||
    normalized.includes('/src/app/services/auth/legalTermsAcceptance') ||
    normalized.includes('/src/app/services/auth/passwordRecoveryGate') ||
    /\/src\/app\/utils\/bffAuthFlags\.(ts|js)$/.test(normalized) ||
    /\/src\/app\/runtime\/nativePlatform\.(ts|js)$/.test(normalized)
  ) {
    return 'boot-local-only'
  }
  /**
   * أوراق إقلاع بلا دورة: typography flush + إعلان طلاء الشبكة.
   * تبقى خارج home-paint وخارج كتلة SecureStore.
   * homeMainGridPaintAnnounce لا يستورد homeBootChrome — اتجاه واحد فقط.
   */
  if (
    normalized.includes('/src/app/bootstrap/bootTypographyLock') ||
    normalized.includes('/src/app/bootstrap/bootTypographyFlush') ||
    normalized.includes('/src/app/bootstrap/bootEventNames') ||
    normalized.includes('/src/app/bootstrap/homeMainGridPaintAnnounce') ||
    normalized.includes('/src/app/bootstrap/homeBootChromeState') ||
    normalized.includes('/src/app/services/profile/profileBootWarmPending') ||
    normalized.includes('/src/app/bootstrap/bootStaticShell.constants') ||
    /\/src\/app\/components\/lawyer\/bootStemIcons\.(ts|tsx|js)$/.test(normalized)
  ) {
    return 'boot-paint-leaves'
  }
  /**
   * تحضير الكروم خارج home-paint حتى لا يُنزَّل مقطع المنزل 150KB قبل المقاطع الحية.
   */
  if (normalized.includes('/src/app/bootstrap/homeBootChrome')) {
    return 'home-boot-chrome'
  }
  if (
    normalized.includes('/src/app/runtime/homeTabContentLoader') ||
    normalized.includes('/src/app/runtime/commandHubTilesLoader') ||
    normalized.includes('/src/app/runtime/homeHubCardLoader')
  ) {
    return 'home-boot-loaders'
  }
  if (
    normalized.includes('/src/utils/supabase/clientEnv') ||
    normalized.includes('/src/utils/supabase/devFallbackConfig')
  ) {
    return 'supabase-client-env'
  }
  if (
    /\/src\/lib\/supabaseClient\.(js|ts)$/.test(normalized) ||
    /\/src\/lib\/supabase\.(js|ts)$/.test(normalized) ||
    /\/src\/app\/lib\/supabase-client\.(js|ts)$/.test(normalized)
  ) {
    return 'supabase-browser-client'
  }
  if (
    normalized.includes('/src/boot/mountApplication') ||
    normalized.includes('/src/boot/bootEntryPreamble') ||
    normalized.includes('/src/boot/bootCriticalPreload') ||
    normalized.includes('/src/boot/appModule') ||
    normalized.includes('/src/boot/peekBootSessionUserId') ||
    normalized.includes('/src/boot/bootStaleChunkReload') ||
    normalized.includes('/src/app/bootstrap/bootReveal') ||
    normalized.includes('/src/app/bootstrap/bootStaticShell') ||
    normalized.includes('/src/app/bootstrap/useBootReveal') ||
    normalized.includes('/src/app/bootstrap/bootMetrics') ||
    normalized.includes('/src/app/bootstrap/dashboardInteractiveMark') ||
    normalized.includes('/src/app/bootstrap/lawyerDashboardFirstTabMark') ||
    normalized.includes('/src/app/bootstrap/lawyerDashboardChunk') ||
    normalized.includes('/src/app/bootstrap/homeStaticShellPaintGate') ||
    normalized.includes('/src/app/bootstrap/LawyerDashboardStemInstantBridge') ||
    normalized.includes('/src/app/runtime/lawyerDashboardLoader') ||
    normalized.includes('/src/app/runtime/lawyerDashboardFirstTabWarm') ||
    normalized.includes('/src/app/runtime/innerRuntimeLoader') ||
    normalized.includes('/src/app/runtime/lawyerDashboardGateLoader') ||
    normalized.includes('/src/app/runtime/appRuntimeShellLoader') ||
    normalized.includes('/src/app/utils/lazy/lazyWithRetry') ||
    normalized.includes('/src/app/utils/lazy/staleChunkError') ||
    normalized.includes('/src/app/hooks/useReduceMotion') ||
    normalized.includes('/src/app/utils/bodyScrollLock') ||
    normalized.includes('/src/app/services/auth/shellAuth') ||
    normalized.includes('/src/app/services/auth/devMockLawyerAuth') ||
    normalized.includes('/src/app/services/auth/localGuestSession') ||
    normalized.includes('/src/app/context/authHooks') ||
    normalized.includes('/src/app/context/authContextStore') ||
    normalized.includes('/src/app/utils/guestLawyerSession') ||
    normalized.includes('/src/app/utils/humanizeAppError') ||
    normalized.includes('/src/app/services/SecureFetchError') ||
    normalized.includes('/src/app/utils/inertProps') ||
    normalized.includes('/src/app/utils/authStorage') ||
    normalized.includes('/src/app/services/SecureStoreService') ||
    normalized.includes('/src/app/services/CryptoService') ||
    /\/src\/app\/security\/deviceId\.(ts|js)$/.test(normalized)
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
    normalized.includes('/ArchivePortal/components/ExecutionSmartCard') ||
    normalized.includes('/ArchivePortal/components/ExecutionSmartCardBody') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveCardPin') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchivePartyBlock') ||
    normalized.includes('/ArchivePortal/components/ArchivePortalExecutionPreviewModal') ||
    normalized.includes('/ArchivePortal/executionArchiveCardView') ||
    normalized.includes('/ArchivePortal/executionArchiveListLabels') ||
    normalized.includes('/ArchivePortal/executionArchiveStatusLabel') ||
    normalized.includes('/workspace/executionWorkspacePin') ||
    normalized.includes('/workspace/executionPinMeta')
  ) {
    return 'archive-execution-cards'
  }
  if (
    normalized.includes('/ArchivePortal/ExecutionArchiveChrome') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveFileGrid')
  ) {
    return 'archive-portal-execution'
  }
  if (
    normalized.includes('/ArchivePortal/components/LawsuitArchiveLifecycleBars') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveLifecycleBars') ||
    normalized.includes('/ArchivePortal/components/ExecutionArchiveToolbar') ||
    normalized.includes('/ArchivePortal/executionArchiveFilterPresentation') ||
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

function isHqProductMode(mode: string, env: Record<string, string>): boolean {
  return mode === 'hq' || env.HAMI_PRODUCT === 'hq' || env.VITE_HAMI_PRODUCT === 'hq'
}

/** يقطع وحدات عمل المحامي بعد توسيع `@/` والاستيراد النسبي — alias وحده لا يكفي. */
function hamiHqOmitLawyerWorkPlugin(enabled: boolean) {
  if (!enabled) return null
  const stubDir = path.resolve(projectRoot, 'src/hq/stubs')
  const bySpec: Record<string, string> = {
    '@/app/services/settings/applicationWipe': 'hqOmitAppWipe.ts',
    '@/app/utils/storageCache': 'hqOmitWorkCache.ts',
    '@/app/utils/executionWipeRegistry': 'hqOmitExecPurge.ts',
    '@/app/services/dossierPersistence/dossierBackupStore': 'hqOmitDossierSnap.ts',
    '@/app/domain/dossier/dossierStorageKeys': 'hqOmitDossierKeyTable.ts',
    '@/app/services/dossierPersistence/protectedStorageKeys': 'hqOmitProtectedKeyTable.ts',
    '@/app/services/dossierPersistence/protectedBackupService': 'hqOmitProtectedCopy.ts',
    '@/app/services/dossierPersistence/dossierWipeGuard': 'hqOmitWipeGuard.ts',
    '@/app/services/settings/localOnlyNetworkIsolation': 'hqOmitPhoneIsolation.ts',
    '@/app/services/settings/settingsSecurityRuntime': 'hqOmitPhoneSecurityFx.ts',
    '@/app/services/settings/settingsSnapshot': 'hqOmitPhoneSettingsSnap.ts',
    '@/app/stores/caseStore': 'hqOmitPhoneCases.ts',
    '@/app/services/calendarTombstones': 'hqOmitAgendaMarkers.ts',
    '@/app/services/cloudSyncEngine': 'hqOmitPhoneBucketSync.ts',
  }
  const byAbs = new Map<string, string>()
  for (const [spec, stubName] of Object.entries(bySpec)) {
    const rel = `${spec.replace(/^@\//, 'src/')}.ts`
    const abs = path.resolve(projectRoot, rel)
    const dest = path.resolve(stubDir, stubName)
    byAbs.set(abs, dest)
    byAbs.set(abs.replace(/\\/g, '/'), dest)
  }
  const stubForSpec = (source: string): string | undefined => {
    const bare = source.replace(/\\/g, '/').replace(/\.(tsx?)$/, '')
    const stubName = bySpec[bare]
    return stubName ? path.resolve(stubDir, stubName) : undefined
  }
  return {
    name: 'hami-hq-omit-lawyer-work',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      const fromSpec = stubForSpec(source)
      if (fromSpec) return fromSpec
      if (!importer) return null
      if (source.startsWith('.') || path.isAbsolute(source)) {
        const abs = path.resolve(path.dirname(importer), source)
        const candidates = [abs, `${abs}.ts`, `${abs}.tsx`]
        for (const candidate of candidates) {
          const hit = byAbs.get(candidate) || byAbs.get(candidate.replace(/\\/g, '/'))
          if (hit) return hit
        }
      }
      return null
    },
  }
}

/** بناء المقر: لا تُحلّ لوحة الهاتف إلى مصادرها الحقيقية. */
function hqPhoneUiExclusionAliases() {
  const stub = (name: string) => path.resolve(projectRoot, 'src/hq/stubs', name)
  const omit = (spec: string, file: string) => {
    const replacement = stub(file)
    const rel = spec.replace(/^@\//, 'src/')
    const entries: Array<{ find: string; replacement: string }> = [{ find: spec, replacement }]
    for (const ext of ['.ts', '.tsx']) {
      const abs = path.resolve(projectRoot, `${rel}${ext}`)
      if (fs.existsSync(abs)) {
        entries.push({ find: abs, replacement })
        entries.push({ find: abs.replace(/\\/g, '/'), replacement })
      }
    }
    return entries
  }
  return [
    {
      find: '@/app/components/lawyer/LawyerDashboard',
      replacement: stub('excludedLawyerDashboard.tsx'),
    },
    {
      find: '@/app/runtime/lawyerDashboardInnerLoader',
      replacement: stub('excludedLawyerDashboardInnerLoader.ts'),
    },
    {
      find: '@/app/components/lawyer/dashboard/LawyerDashboardInner',
      replacement: stub('excludedLawyerDashboardInner.tsx'),
    },
    {
      find: '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry',
      replacement: stub('excludedCommunityOverlayEntry.tsx'),
    },
    {
      find: '@/app/bootstrap/lawyerDashboardChunk',
      replacement: stub('excludedLawyerDashboardChunk.ts'),
    },
    {
      find: '@/app/components/lawyer/criminal-system/criminalStore',
      replacement: stub('excludedCriminalStore.ts'),
    },
    {
      find: /^@\/app\/stores\/executionDashboardStoreLazy$/,
      replacement: stub('excludedExecutionDashboardStoreLazy.ts'),
    },
    {
      find: /^@\/app\/stores\/executionDashboardStore$/,
      replacement: stub('excludedExecutionDashboardStore.ts'),
    },
    ...omit('@/app/services/settings/applicationWipe', 'hqOmitAppWipe.ts'),
    ...omit('@/app/utils/storageCache', 'hqOmitWorkCache.ts'),
    ...omit('@/app/utils/executionWipeRegistry', 'hqOmitExecPurge.ts'),
    ...omit('@/app/services/dossierPersistence/dossierBackupStore', 'hqOmitDossierSnap.ts'),
    ...omit('@/app/domain/dossier/dossierStorageKeys', 'hqOmitDossierKeyTable.ts'),
    ...omit('@/app/services/dossierPersistence/protectedStorageKeys', 'hqOmitProtectedKeyTable.ts'),
    ...omit('@/app/services/dossierPersistence/protectedBackupService', 'hqOmitProtectedCopy.ts'),
    ...omit('@/app/services/dossierPersistence/dossierWipeGuard', 'hqOmitWipeGuard.ts'),
    ...omit('@/app/services/settings/localOnlyNetworkIsolation', 'hqOmitPhoneIsolation.ts'),
    ...omit('@/app/services/settings/settingsSecurityRuntime', 'hqOmitPhoneSecurityFx.ts'),
    ...omit('@/app/services/settings/settingsSnapshot', 'hqOmitPhoneSettingsSnap.ts'),
    ...omit('@/app/stores/caseStore', 'hqOmitPhoneCases.ts'),
    ...omit('@/app/services/calendarTombstones', 'hqOmitAgendaMarkers.ts'),
    ...omit('@/app/services/cloudSyncEngine', 'hqOmitPhoneBucketSync.ts'),
  ]
}

function resolveHtmlInputs(command: string, mode: string, env: Record<string, string>) {
  const main = path.resolve(projectRoot, 'index.html')
  const hq = path.resolve(projectRoot, 'hq.html')
  if (command === 'serve') return { main, hq }
  return isHqProductMode(mode, env) ? { hq } : { main }
}

function isHqProductionBuild(command: string, mode: string, env: Record<string, string>): boolean {
  return command === 'build' && isHqProductMode(mode, env)
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, '')
  const pdfMinimalAssets = env.VITE_PDF_MINIMAL_ASSETS === 'true'
  const sentryBundled = resolveSentryBundled(env)
  const sentryStubPath = path.resolve(projectRoot, 'src/app/observability/sentryReactStub.ts')
  const release = appReleaseIdentity()
  const htmlInputs = resolveHtmlInputs(command, mode, env)
  const hqProduct = isHqProductMode(mode, env)
  const hqProductionBuild = isHqProductionBuild(command, mode, env)

  return {
  customLogger,
  /**
   * هوية البناء تُحقن نصّاً ثابتاً لا تُقرأ من البيئة في وقت التشغيل: بلاغ عطل
   * بلا `release` لا يُنسب إلى بناء، وخرائط المصدر المرفوعة لا تجد ما تُطابقه.
   */
  define: {
    __HAMI_APP_VERSION__: JSON.stringify(release.version),
    __HAMI_APP_RELEASE__: JSON.stringify(release.release),
    __HAMI_BUILD_ID__: JSON.stringify(release.buildId),
    __HAMI_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __HAMI_CLIENT_PRODUCT__: JSON.stringify(hqProduct ? 'hq' : 'lawyer'),
  },
  plugins: [
    hamiHqOmitLawyerWorkPlugin(hqProduct),
    ...(process.env.HAMI_DUMP_CHUNK_MODULES === '1'
      ? [
          {
            name: 'hami-dump-chunk-modules',
            generateBundle(this: { getModuleInfo: (id: string) => { importedIds: readonly string[] } | null }, _opts: unknown, bundle: Record<string, { type: string; name?: string; fileName: string; moduleIds?: string[] }>) {
              const short = (id: string) =>
                id.replace(/\\/g, '/').replace(/^.*\/(src\/|node_modules\/)/, (_, p1: string) =>
                  p1 === 'node_modules/' ? 'node_modules/' : 'src/',
                )
              const chunks = Object.values(bundle).filter((c) => c.type === 'chunk') as Array<{
                name?: string
                fileName: string
                moduleIds: string[]
              }>
              const pipelineNames = [
                'execution-dashboard-persist-pipeline',
                'execution-dashboard-boot-pipeline',
                'execution-dashboard-claim-pipeline',
                'execution-dashboard-workspace-pipeline',
                'lawyer-home-hub-card',
                'lawyer-home-hub-alerts-feed',
                'lawyer-boot-peek-lite',
                'lawyer-boot-stores',
                'execution-storage-cache',
              ]
              const wantedNames = [
                'LawyerDashboardMainView',
                'ScheduleTabHost',
                'AddTaskBottomSheet',
                'CommunityScreen',
                'CommunityScreenContent',
                'useCalendarData',
              ]
              const pipelineSets = Object.fromEntries(
                pipelineNames.map((name) => {
                  const chunk = chunks.find((c) => c.name === name)
                  return [name, new Set(chunk?.moduleIds ?? [])]
                }),
              )
              const edges: Record<string, Record<string, Array<{ importer: string; pipelineModule: string }>>> = {}
              for (const chunk of chunks) {
                if (!wantedNames.includes(chunk.name ?? '')) continue
                const byPipeline: Record<string, Array<{ importer: string; pipelineModule: string }>> = {}
                for (const [pipeName, pipeSet] of Object.entries(pipelineSets)) {
                  const hits: Array<{ importer: string; pipelineModule: string }> = []
                  for (const id of chunk.moduleIds) {
                    const info = this.getModuleInfo(id)
                    if (!info) continue
                    for (const dep of info.importedIds) {
                      if (pipeSet.has(dep)) {
                        hits.push({ importer: short(id), pipelineModule: short(dep) })
                      }
                    }
                  }
                  if (hits.length) byPipeline[pipeName] = hits
                }
                edges[chunk.name ?? chunk.fileName] = byPipeline
              }
              const reverseNames = [
                'lawyer-boot-stores',
                'execution-storage-cache',
                'lawyer-boot-peek-lite',
              ]
              const wantedSets = Object.fromEntries(
                wantedNames.map((name) => {
                  const chunk = chunks.find((c) => c.name === name)
                  return [name, new Set(chunk?.moduleIds ?? [])]
                }),
              )
              const reverse: Record<string, Record<string, Array<{ pipelineModule: string; wantedModule: string }>>> = {}
              for (const pipeName of reverseNames) {
                const chunk = chunks.find((c) => c.name === pipeName)
                if (!chunk) continue
                const byWanted: Record<string, Array<{ pipelineModule: string; wantedModule: string }>> = {}
                for (const id of chunk.moduleIds) {
                  const info = this.getModuleInfo(id)
                  if (!info) continue
                  for (const dep of info.importedIds) {
                    for (const [wanted, set] of Object.entries(wantedSets)) {
                      if (!set.has(dep)) continue
                      if (!byWanted[wanted]) byWanted[wanted] = []
                      byWanted[wanted].push({ pipelineModule: short(id), wantedModule: short(dep) })
                    }
                  }
                }
                if (Object.keys(byWanted).length) reverse[pipeName] = byWanted
              }
              fs.writeFileSync(
                path.join(projectRoot, '.audit/_chunk_connect_edges.json'),
                JSON.stringify(
                  {
                    edges,
                    reverse,
                    members: {
                      CommunityScreenContent: (
                        chunks.find((c) => c.name === 'CommunityScreenContent')?.moduleIds ?? []
                      ).map(short),
                      'execution-storage-cache': (
                        chunks.find((c) => c.name === 'execution-storage-cache')?.moduleIds ?? []
                      ).map(short),
                      'execution-dashboard-persist-pipeline': (
                        chunks.find((c) => c.name === 'execution-dashboard-persist-pipeline')?.moduleIds ?? []
                      ).map(short),
                      'execution-dashboard-boot-pipeline': (
                        chunks.find((c) => c.name === 'execution-dashboard-boot-pipeline')?.moduleIds ?? []
                      ).map(short),
                    },
                  },
                  null,
                  2,
                ),
              )
            },
          },
        ]
      : []),
    preferFileOverDirectory(projectRoot),
    hamiHqDocumentRewrite(),
    {
      name: 'hami-hq-dist-index',
      closeBundle() {
        if (!hqProductionBuild) return
        const dir = path.join(projectRoot, 'dist-hq')
        fs.mkdirSync(dir, { recursive: true })
        const hqFile = path.join(dir, 'hq.html')
        const indexFile = path.join(dir, 'index.html')
        if (fs.existsSync(hqFile) && !fs.existsSync(indexFile)) {
          fs.copyFileSync(hqFile, indexFile)
        }
        fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
      },
    },
    hamiBootScriptOrder(),
    hamiFaviconIco(),
    hamiCriticalNativeAndroidCss(command, env, projectRoot),
    react(),
    tailwindcss(),
    pdfjsAssetsPlugin(command, { minimalFonts: pdfMinimalAssets }),
    legalAnalysisDevApiPlugin(),
    hamiFieldTasksAgendaDevWarmPlugin(),
    /** قبل ختم العامل: الختم يُشتق من أسماء `assets/` وأصول القشرة تنضم إليها هنا */
    hamiShellAssetHash(),
    serviceWorkerCacheStampPlugin(command),
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
      ...(hqProduct ? hqPhoneUiExclusionAliases() : []),
      {
        find: '@/app/bootstrap/LawyerDashboardGate',
        replacement: hqProduct
          ? path.resolve(projectRoot, 'src/hq/stubs/excludedLawyerDashboardGate.tsx')
          : path.resolve(projectRoot, 'src/app/bootstrap/LawyerDashboardGate.tsx'),
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
      ignored: [
        '**/playwright-report/**',
        '**/test-results/**',
        '**/blob-report/**',
        '**/rgb-cleanup/**',
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
      ...(process.env.E2E_PREVIEW_RELAXED_SECURITY === '1'
        ? getE2ePreviewSecurityHeaders()
        : getProductionSecurityHeaders()),
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
    outDir: isHqProductMode(mode, env) ? 'dist-hq' : 'dist',
    emptyOutDir: true,
    // يطابق target/lib في tsconfig.json — الحد الأدنى Chrome/WebView 94، iOS 15.4
    target: 'es2022',
    /**
     * `hidden` لا `true`.
     *
     * الخرائط تعيد بناء الشيفرة المصدرية كاملة. مع `true` يُلحَق بكل ملف تعليق
     * `sourceMappingURL` فيصير المصدر كلّه قابلاً للتنزيل من متصفّح أي زائر —
     * منطق الصلاحيات والتشفير ومسارات الواجهة الخلفية. مع `hidden` تُنتَج الخرائط
     * للرفع إلى Sentry بلا تعليق يدلّ عليها، ويمنع `guard:dist-secrets` بقاءها
     * في المخرجات المنشورة أصلاً.
     */
    sourcemap: process.env.VITE_SOURCEMAP === 'true' ? 'hidden' : false,
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
      input: htmlInputs,
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
          const sharedLeafChunk = resolveSharedRuntimeLeafChunk(id)
          if (sharedLeafChunk) return sharedLeafChunk
          const scheduleChromeChunk = resolveScheduleChromeSharedChunk(id)
          if (scheduleChromeChunk) return scheduleChromeChunk
          const bootChunk = resolveBootRuntimeChunk(id)
          if (bootChunk) return bootChunk
          if (!hqProduct) {
            const lawyerStemChunk = resolveLawyerDashboardStemChunk(id)
            if (lawyerStemChunk) return lawyerStemChunk
            const homePaintChunk = resolveLawyerHomePaintChunk(id)
            if (homePaintChunk) return homePaintChunk
            const homeTabContentChunk = resolveLawyerHomeTabContentChunk(id)
            if (homeTabContentChunk) return homeTabContentChunk
            const workspaceScanLiteChunk = resolveWorkspaceScanLiteChunk(id)
            if (workspaceScanLiteChunk) return workspaceScanLiteChunk
            const overlaySnapLiteChunk = resolveHamiOverlaySnapLiteChunk(id)
            if (overlaySnapLiteChunk) return overlaySnapLiteChunk
            const bootPeekLiteChunk = resolveLawyerBootPeekLiteChunk(id)
            if (bootPeekLiteChunk) return bootPeekLiteChunk
            const workspacePinButtonChunk = resolveWorkspacePinButtonChunk(id)
            if (workspacePinButtonChunk) return workspacePinButtonChunk
            const workspacePinBuildersChunk = resolveWorkspacePinBuildersChunk(id)
            if (workspacePinBuildersChunk) return workspacePinBuildersChunk
            const homeHubChunk = resolveLawyerHomeHubChunk(id)
            if (homeHubChunk) return homeHubChunk
            const shellLiteChunk = resolveHamiShellLiteChunk(id)
            if (shellLiteChunk) return shellLiteChunk
            const persistFoundationChunk = resolveHamiPersistFoundationChunk(id)
            if (persistFoundationChunk) return persistFoundationChunk
            const workspaceStoreChunk = resolveLawyerWorkspaceStoreChunk(id)
            if (workspaceStoreChunk) return workspaceStoreChunk
            const fileCoerceChunk = resolveLawyerFileCoerceChunk(id)
            if (fileCoerceChunk) return fileCoerceChunk
            const orchestrationLiteChunk = resolveLawyerOrchestrationLiteChunk(id)
            if (orchestrationLiteChunk) return orchestrationLiteChunk
            const bootSharedChunk = resolveLawyerBootSharedChunk(id)
            if (bootSharedChunk) return bootSharedChunk
            const dashboardCanvasChunk = resolveLawyerDashboardCanvasChunk(id)
            if (dashboardCanvasChunk) return dashboardCanvasChunk
            const archivePortalChunk = resolveArchivePortalChunk(id)
            if (archivePortalChunk) return archivePortalChunk
            const executionHandlerClusterChunk = resolveExecutionHandlerClusterChunk(id)
            if (executionHandlerClusterChunk) return executionHandlerClusterChunk
            const executionDashboardSupportChunk = resolveExecutionDashboardSupportChunk(id)
            if (executionDashboardSupportChunk) return executionDashboardSupportChunk
          }
          const forumServerChunk = resolveForumServerOnlyChunk(id)
          if (forumServerChunk) return forumServerChunk
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
