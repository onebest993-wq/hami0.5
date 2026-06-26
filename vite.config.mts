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
            !/(lawyer-dashboard|execution-dashboard|execution-dashboard-static-scope|execution-dashboard-loader|execution-lazy-registry|execution-tab-|execution-orchestrators|execution-hooks|execution-helpers|execution-modals|execution-overlays|execution-shell-overlays|execution-phone-body|execution-law-articles|criminal-dashboard|criminal-tab-|criminal-dashboard-request-ui|criminal-dashboard-parties|criminal-legal-codes|criminal-store|criminal-store-slices|criminal-lazy-modals|community-overlays|community-repository|CommunityScreen|global-search-|smart-file-modal|iraqi-law-loader|articles\.json|ExecutionDashboard|CriminalDashboard|vendor-motion|vendor-supabase|SmartToastContainer|SmartDialogContainer|auth-context|app-deferred-boot|runtime-|deferred-app)/i.test(
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
        manualChunks(id) {
          if (
            id.includes('context/authProviderRuntime') ||
            id.includes('context\\authProviderRuntime')
          ) {
            return 'auth-context';
          }
          if (
            id.includes('/runtime/lawyerDashboardLoader') ||
            id.includes('\\runtime\\lawyerDashboardLoader')
          ) {
            return 'app-runtime';
          }
          if (
            id.includes('/bootstrap/deferredBoot') ||
            id.includes('\\bootstrap\\deferredBoot') ||
            id.includes('/runtime/deferredGoogleFonts') ||
            id.includes('\\runtime\\deferredGoogleFonts') ||
            id.includes('/runtime/deferredAppStyles') ||
            id.includes('\\runtime\\deferredAppStyles')
          ) {
            return 'app-deferred-boot';
          }
          if (
            (id.includes('/runtime/') || id.includes('\\runtime\\')) &&
            !id.includes('sameOriginApiProbe')
          ) {
            if (id.includes('executionDashboardLoader')) return 'execution-dashboard-loader';
            if (id.includes('globalSearchLoader')) return 'global-search-loader';
            if (/HubLoader|hubLoader|Loader\.ts/i.test(id)) {
              const base = id.split(/[/\\]/).pop()?.replace(/\.ts$/, '') ?? 'hub';
              return `runtime-${base}`;
            }
            return;
          }
          if (
            id.includes('workers/globalSearchIndex.worker') ||
            id.includes('workers\\globalSearchIndex.worker')
          ) {
            return 'global-search-worker';
          }
          if (id.includes('globalSearchLoad')) {
            return 'global-search-extras';
          }
          if (
            /globalSearchIndexPure|globalSearchIndex\w+Entries|globalSearchIndexPureHelpers/.test(id) ||
            /[/\\]globalSearchIndex\.ts$/.test(id) ||
            id.includes('executionSearchIndex') ||
            id.includes('globalSearchFileSliceCache')
          ) {
            return 'global-search-index-build';
          }
          if (
            id.includes('globalSearchIndexRuntime') ||
            id.includes('globalSearchIndexPrepare') ||
            id.includes('globalSearchWarm') ||
            id.includes('globalSearchQuerySecurity') ||
            id.includes('globalSearchProfileCache') ||
            id.includes('globalSearchIndexWorkerClient') ||
            id.includes('globalSearchFuse')
          ) {
            return 'global-search-index-runtime';
          }
          if (id.includes('GlobalSearchOverlay') || id.includes('GlobalSearchOverlay\\')) {
            if (
              /GlobalSearchOverlay[/\\]hooks[/\\](useSearchIndex|useSearchExtras|GlobalSearchRuntimeProvider)/.test(
                id,
              )
            ) {
              return 'global-search-index-runtime';
            }
            if (
              /GlobalSearchOverlay[/\\]components[/\\](SearchResultsPanel|ResultsBody|ResultRow)/.test(id)
            ) {
              return 'global-search-results-panel';
            }
            return 'global-search-overlay';
          }
          if (id.includes('node_modules')) {
            if (id.includes('fuse.js')) return 'global-search-fuse';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('node_modules/react/')) return 'vendor-react';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@sentry')) return 'vendor-sentry';
            return;
          }
          if (
            id.includes('useFollowupModalPersistNavigation') ||
            id.includes('useExecutionDashboardView') ||
            id.includes('useExecutionDashboardState') ||
            id.includes('useExecutionDashboardCore')
          ) {
            return 'execution-dashboard-core';
          }
          if (
            id.includes('ExecutionDashboard/hooks/executionDashboardCore') ||
            id.includes('ExecutionDashboard\\hooks\\executionDashboardCore') ||
            id.includes('useExecutionDashboardShellOrchestrators') ||
            id.includes('useExecutionDashboardClaimFinancials') ||
            id.includes('useExecutionDashboardGraceAndSummoning') ||
            id.includes('useExecutionDashboardFollowupSeizureTabs') ||
            id.includes('useExecutionDashboardOtherPartyMirror') ||
            id.includes('useExecutionDashboardSalarySeizureTabRows') ||
            id.includes('useExecutionDashboardCoerciveActionBridge') ||
            id.includes('useExecutionDashboardSeizureReleaseHandlers') ||
            id.includes('useExecutionDashboardThirdPartyReceiveHandlers') ||
            id.includes('useFollowupModalTabGuards')
          ) {
            return 'execution-dashboard-core';
          }
          if (
            id.includes('executionDashboardLazyChunkScope') ||
            id.includes('executionDashboardLazyRegistry') ||
            id.includes('executionFollowupModalLazy') ||
            id.includes('executionFollowupTabPrefetch')
          ) {
            return 'execution-lazy-registry';
          }
          if (id.includes('executionDashboardLazyShellUi') || id.includes('DebtorFinancialProgressBar')) {
            return 'execution-helpers';
          }
          if (id.includes('executionModalStack')) {
            return 'execution-helpers';
          }
          if (
            id.includes('executorApprovalWorkflow') ||
            id.includes('publicationNoticeDebtor') ||
            id.includes('residentialEvictionGrace') ||
            id.includes('executionModuleStrategies')
          ) {
            return 'execution-helpers';
          }
          if (id.includes('ExecutionDashboard/components/PersonalTab') || id.includes('ExecutionDashboard\\components\\PersonalTab')) {
            return 'execution-tab-personal';
          }
          if (id.includes('PersonalCoerciveFollowupPanel')) {
            return 'execution-tab-personal';
          }
          if (id.includes('ExecutionDashboard/components/CoerciveTab') || id.includes('ExecutionDashboard\\components\\CoerciveTab')) {
            return 'execution-tab-coercive';
          }
          if (id.includes('ExecutionDashboard/components/FinancialTab') || id.includes('ExecutionDashboard\\components\\FinancialTab')) {
            return 'execution-tab-financial';
          }
          if (id.includes('ExecutionDashboard/components/SeizureRequestsTab') || id.includes('ExecutionDashboard\\components\\SeizureRequestsTab')) {
            return 'execution-tab-seizure';
          }
          if (id.includes('ExecutionDashboard/components/CommunicationsTab') || id.includes('ExecutionDashboard\\components\\CommunicationsTab')) {
            return 'execution-tab-correspondences';
          }
          if (id.includes('ExecutionDashboard/components/RequestsTab') || id.includes('ExecutionDashboard\\components\\RequestsTab')) {
            return 'execution-tab-requests';
          }
          if (id.includes('ExecutionDashboard/components/DossierControlsTab') || id.includes('ExecutionDashboard\\components\\DossierControlsTab')) {
            return 'execution-tab-dossier-controls';
          }
          if (id.includes('ExecutionDashboard/components/OtherPartyTab') || id.includes('ExecutionDashboard\\components\\OtherPartyTab')) {
            return 'execution-tab-other-party';
          }
          if (id.includes('followupModalTabTypes')) {
            return 'execution-helpers';
          }
          if (
            /followupModalContext|followupModalSnapshot|followupTabKeepAlive|useExecutionFollowupModalSnapshot|FollowupTabKeepAlivePanel/.test(
              id,
            )
          ) {
            return 'execution-followup-shared';
          }
          if (
            id.includes('ExecutionDashboard/orchestrators') ||
            id.includes('ExecutionDashboard\\orchestrators')
          ) {
            return 'execution-dashboard-core';
          }
          if (
            id.includes('executionDashboardStaticChunkScope') ||
            id.includes('executionDashboardConstants') ||
            id.includes('ExecutionDashboard/hooks/executionDashboardStaticChunkScope')
          ) {
            return 'execution-dashboard-static-scope';
          }
          if (id.includes('executionDashboardClaimFinancials')) {
            return 'execution-helpers';
          }
          if (id.includes('executionDashboardGraceSummoning')) {
            return 'execution-helpers';
          }
          if (id.includes('executionDashboardRuntimeChunkScope')) {
            return 'execution-helpers';
          }
          if (id.includes('executionDashboardUiChunkScope')) {
            return 'execution-dashboard-core';
          }
          if (id.includes('followupSnapshotFieldKeys')) {
            return 'execution-followup-shared';
          }
          if (id.includes('ExecutionDashboard/hooks/') || id.includes('ExecutionDashboard\\hooks\\')) {
            if (
              /followupModal|FollowupModal|buildFollowupModalSnapshot|executionFollowupModalSnapshot|useExecutionFollowupModalSnapshot|enrichFollowupModalSnapshot/.test(
                id,
              ) &&
              !id.includes('useFollowupModalPersistNavigation')
            ) {
              return 'execution-followup-shared';
            }
            if (
              /LazyChunk|ChunkScope|BootPrefetch|PhoneBodyGate|PhoneBodyPropKeys|ShellOverlayPropKeys|buildExecutionPhoneBodyProps|buildExecutionDashboardChunkScopeSources|pickExecution|assignExecution|executionDashboardChunkScope|executionPhoneBodyScope|executionShellOverlayScope/.test(
                id,
              )
            ) {
              return 'execution-dashboard-core';
            }
            return 'execution-dashboard-core';
          }
          if (id.includes('requestsTabConstants')) {
            return 'execution-helpers';
          }
          if (id.includes('ExecutionDashboard/helpers/') || id.includes('ExecutionDashboard\\helpers\\')) {
            return 'execution-helpers';
          }
          if (
            id.includes('ExecutionDashboard/ExecutionFollowupModalPortal') ||
            id.includes('ExecutionDashboard\\ExecutionFollowupModalPortal')
          ) {
            return 'execution-modals-followup';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionModalsContainer') ||
            id.includes('ExecutionDashboard\\components\\ExecutionModalsContainer')
          ) {
            return 'execution-modals-core';
          }
          if (
            id.includes('ExecutionDashboard/components/UnifiedSummonsModalContainer') ||
            id.includes('ExecutionDashboard\\components\\UnifiedSummonsModalContainer')
          ) {
            return 'execution-modals-summons';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardPhoneBody') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardPhoneBody')
          ) {
            return 'execution-phone-body';
          }
          if (id.includes('executionLaws.articles.json')) {
            return 'execution-law-articles';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardHeavyModals') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardHeavyModals')
          ) {
            return 'execution-overlays-heavy';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardEditOverlays') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardEditOverlays')
          ) {
            return 'execution-overlays-edit';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardNotesOverlays') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardNotesOverlays')
          ) {
            return 'execution-overlays-notes';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardExecutorWorkflowOverlays') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardExecutorWorkflowOverlays')
          ) {
            return 'execution-overlays-executor';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardSolidaryEvictionOverlays') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardSolidaryEvictionOverlays')
          ) {
            return 'execution-overlays-solidary';
          }
          if (
            id.includes('ExecutionDashboard/components/ExecutionDashboardShellOverlays') ||
            id.includes('ExecutionDashboard\\components\\ExecutionDashboardShellOverlays')
          ) {
            return 'execution-overlays-shell';
          }
          if (id.includes('criminal-system/criminalStore') || id.includes('criminal-system\\criminalStore')) {
            return 'criminal-store';
          }
          if (
            /criminal-system[/\\]CriminalPartiesGrid/.test(id)
          ) {
            return 'criminal-dashboard-parties';
          }
          if (
            /criminal-system[/\\]components[/\\](RequestModalEntryLanes|ConcernedPartyDecisionPicker|LawyerRequestUxAddons)\./.test(
              id,
            )
          ) {
            return 'criminal-dashboard-request-ui';
          }
          if (
            /criminal-system[/\\](lawFilters|penalLawFilters|juvenileLawFilters)\./.test(id) ||
            /criminal-system[/\\]legalCodes[/\\]LegalCodesTab/.test(id)
          ) {
            return 'criminal-tab-legal-codes';
          }
          if (/criminal-system[/\\]CriminalNewCase/.test(id)) {
            return 'criminal-tab-new-case';
          }
          if (/criminal-system[/\\]components[/\\]TrialsTab/.test(id)) {
            return 'criminal-tab-trials';
          }
          if (/criminal-system[/\\]components[/\\]RecursiveProceduralCanvas/.test(id)) {
            return 'criminal-tab-procedural-canvas';
          }
          if (/criminal-system[/\\]components[/\\]JudicialDecisionsLedger/.test(id)) {
            return 'criminal-tab-judicial-ledger';
          }
          if (/criminal-system[/\\]components[/\\]StatementsPhaseSections/.test(id)) {
            return 'criminal-tab-statements';
          }
          if (
            /criminal-system[/\\](trialSessions|trialDepositions|trialCharge|trialSessionPreparatory|stageFinalDecision|verdictCassation|partyPersonalStage|cassation|stageTransitionAppeal|proceduralCassation|complainantCassation|decisionAppealPeriod|proceduralContainers|proceduralSandbox|proceduralItemLink|proceduralRequestTypes|journeyOrder|lawyerRequestsEngine|lawyerMotionFeed|investigationDefendant|investigationDraft|investigationPhase|juvenileInvestigation|criminalUnknown|detentionEngine|statementRecording)/.test(
              id,
            )
          ) {
            return 'criminal-store-slices';
          }
          if (
            id.includes('bundledIraqiLawLoader') ||
            id.includes('iraqiLawBundleRegistry')
          ) {
            return 'iraqi-law-loader';
          }
          if (
            id.includes('criminal-system/legalCodes') ||
            id.includes('criminal-system\\legalCodes')
          ) {
            return 'criminal-legal-codes';
          }
          if (id.includes('criminalDashboardLazyModals')) {
            return 'criminal-lazy-modals';
          }
          if (id.includes('CommunityScreen') || id.includes('CommunityScreen\\')) {
            if (
              /CommunityScreen[/\\]components[/\\](LegalRepository|UploadDocumentModal|RepositoryCard|RepositoryFilterPanel|ForumDeleteConfirmModal)/.test(
                id,
              )
            ) {
              return 'community-repository';
            }
            if (
              /CommunityScreen[/\\]components[/\\](AddQuestionSheet|CommentBottomSheet|SearchOverlay|CreateGroupModal|EditPostModal|ForumMemberProfileOverlay|FullscreenImageOverlay)/.test(
                id,
              )
            ) {
              return 'community-overlays';
            }
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
