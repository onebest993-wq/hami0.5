var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import sirv from 'sirv';
import { preferFileOverDirectory } from './src/vite-plugins/preferFileOverDirectory';
import { getDevSecurityHeaders, getProductionSecurityHeaders } from './src/app/api/security/wifeSecurityHeaders';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var projectRoot = __dirname;
function readRequestBody(req) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        req.on('data', function (c) { return chunks.push(c); });
        req.on('end', function () { return resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
    });
}
function forwardRequestHeaders(req) {
    var out = {};
    for (var _i = 0, _a = Object.entries(req.headers); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === 'string') {
            out[key] = value;
            continue;
        }
        if (Array.isArray(value) && value.length > 0) {
            out[key] = value.join(', ');
        }
    }
    return out;
}
function pipeWebBodyToNode(res, body) {
    return __awaiter(this, void 0, void 0, function () {
        var reader, _a, done, value;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reader = body.getReader();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 6, 7]);
                    _b.label = 2;
                case 2: return [4 /*yield*/, reader.read()];
                case 3:
                    _a = _b.sent(), done = _a.done, value = _a.value;
                    if (done)
                        return [3 /*break*/, 5];
                    if (value === null || value === void 0 ? void 0 : value.byteLength)
                        res.write(Buffer.from(value));
                    _b.label = 4;
                case 4: return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 7];
                case 6:
                    reader.releaseLock();
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/** يمرّر مسارات ‎/api/*‎ إلى ‎route.ts‎ في وضع التطوير — اكتشاف ديناميكي */
function resolveDevApiRouteFile(urlPath) {
    if (!urlPath.startsWith('/api/'))
        return null;
    var rel = "".concat(urlPath.replace(/^\/api\//, 'src/app/api/'), "/route.ts");
    var abs = path.join(projectRoot, rel);
    return fs.existsSync(abs) ? rel : null;
}
var DEV_API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
function attachApiRouteMiddleware(server, middlewares, securityHeaders, mode) {
    var _this = this;
    var env = loadEnv(mode, projectRoot, '');
    Object.assign(process.env, env);
    middlewares.use(function (req, res, next) {
        for (var _i = 0, _a = Object.entries(securityHeaders); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (!res.getHeader(key))
                res.setHeader(key, value);
        }
        next();
    });
    middlewares.use(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var url, method, routeFile, absRoute, moduleId, routeModule, handler, hasBody, raw, _a, body, forwardedHeaders, webReq, webRes, skip_1, e_1;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    url = (_c = (_b = req.url) === null || _b === void 0 ? void 0 : _b.split('?')[0]) !== null && _c !== void 0 ? _c : '';
                    method = ((_d = req.method) !== null && _d !== void 0 ? _d : 'GET').toUpperCase();
                    routeFile = resolveDevApiRouteFile(url);
                    if (!routeFile)
                        return [2 /*return*/, next()];
                    if (!DEV_API_METHODS.includes(method))
                        return [2 /*return*/, next()];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 9, , 10]);
                    absRoute = path.join(projectRoot, routeFile);
                    moduleId = routeFile.replace(/\\/g, '/');
                    return [4 /*yield*/, server.ssrLoadModule(moduleId)];
                case 2:
                    routeModule = _e.sent();
                    handler = method === 'GET' ? routeModule.GET
                        : method === 'POST' ? routeModule.POST
                            : method === 'PUT' ? routeModule.PUT
                                : method === 'PATCH' ? routeModule.PATCH
                                    : routeModule.DELETE;
                    if (!handler)
                        return [2 /*return*/, next()];
                    hasBody = method !== 'GET' && method !== 'HEAD';
                    if (!hasBody) return [3 /*break*/, 4];
                    return [4 /*yield*/, readRequestBody(req)];
                case 3:
                    _a = _e.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = Buffer.alloc(0);
                    _e.label = 5;
                case 5:
                    raw = _a;
                    body = raw.byteLength ? new Uint8Array(raw) : undefined;
                    forwardedHeaders = forwardRequestHeaders(req);
                    webReq = new Request("http://127.0.0.1".concat(req.url), {
                        method: method,
                        headers: forwardedHeaders,
                        body: hasBody ? body : undefined,
                    });
                    return [4 /*yield*/, handler(webReq)];
                case 6:
                    webRes = _e.sent();
                    res.statusCode = webRes.status;
                    skip_1 = new Set(['content-encoding', 'content-length', 'transfer-encoding']);
                    webRes.headers.forEach(function (v, k) {
                        if (!skip_1.has(k.toLowerCase()))
                            res.setHeader(k, v);
                    });
                    if (!webRes.body) return [3 /*break*/, 8];
                    return [4 /*yield*/, pipeWebBodyToNode(res, webRes.body)];
                case 7:
                    _e.sent();
                    _e.label = 8;
                case 8:
                    res.end();
                    return [3 /*break*/, 10];
                case 9:
                    e_1 = _e.sent();
                    console.error('[dev-api]', e_1);
                    if (!res.headersSent)
                        res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({ error: 'خطأ داخلي في خادم التطوير' }));
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    }); });
}
function pdfjsAssetsPlugin(command) {
    var cmapsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/cmaps');
    var fontsDir = path.join(projectRoot, 'node_modules/pdfjs-dist/standard_fonts');
    return {
        name: 'hami-pdfjs-assets',
        configureServer: function (server) {
            server.middlewares.use('/pdfjs-assets/cmaps', sirv(cmapsDir, { dev: true, etag: true, single: false }));
            server.middlewares.use('/pdfjs-assets/standard_fonts', sirv(fontsDir, { dev: true, etag: true, single: false }));
        },
        closeBundle: function () {
            if (command !== 'build')
                return;
            var outDir = path.join(projectRoot, 'dist/pdfjs-assets');
            fs.mkdirSync(outDir, { recursive: true });
            fs.cpSync(cmapsDir, path.join(outDir, 'cmaps'), { recursive: true });
            fs.cpSync(fontsDir, path.join(outDir, 'standard_fonts'), { recursive: true });
        },
    };
}
function legalAnalysisDevApiPlugin() {
    return {
        name: 'dev-api-routes',
        configureServer: function (server) {
            attachApiRouteMiddleware(server, server.middlewares, getDevSecurityHeaders(), server.config.mode);
        },
        configurePreviewServer: function (server) {
            attachApiRouteMiddleware(server, server.middlewares, getProductionSecurityHeaders(), 'production');
        },
    };
}
// Stable Standard Config - Optimized for performance (Vite + Vitest merged)
// Uses .mts extension to force ESM loading (fixes require() of ESM modules)
function bootstrapGatePath(relative, command) {
    var useProdGate = command === 'build';
    return path.resolve(projectRoot, useProdGate ? relative.replace('.dev.', '.prod.') : relative);
}
function normalizeModuleId(id) {
    return id.replace(/\\/g, '/');
}
function resolveVendorChunk(id) {
    var normalized = normalizeModuleId(id);
    if (!normalized.includes('/node_modules/'))
        return undefined;
    if (normalized.endsWith('.css'))
        return undefined;
    if (normalized.includes('/@supabase/') || normalized.includes('/supabase-js/')) {
        return 'vendor-supabase';
    }
    if (normalized.includes('/framer-motion/') || normalized.includes('/motion/')) {
        return 'vendor-motion';
    }
    if (normalized.includes('/@sentry/') || normalized.includes('/@sentry-internal/')) {
        return 'vendor-sentry';
    }
    if (normalized.includes('/pdfjs-dist/')) {
        return 'vendor-pdf';
    }
    if (normalized.includes('/@capacitor/') ||
        normalized.includes('/@aparajita/') ||
        normalized.includes('/@capacitor-community/')) {
        return 'vendor-capacitor';
    }
    if (normalized.includes('/@radix-ui/') ||
        normalized.includes('/vaul/') ||
        normalized.includes('/embla-carousel-react/') ||
        normalized.includes('/lucide-react/')) {
        return 'vendor-ui';
    }
    if (normalized.includes('/dompurify/') || normalized.includes('/isomorphic-dompurify/')) {
        return 'vendor-sanitize';
    }
    if (normalized.includes('/fuse.js/') || normalized.includes('/@tanstack/react-virtual/')) {
        return 'vendor-search';
    }
    if (normalized.includes('/clsx/') ||
        normalized.includes('/tailwind-merge/') ||
        normalized.includes('/tailwindcss-animate/')) {
        return 'vendor-style-utils';
    }
    return 'vendor-misc';
}
function resolveExecutionHandlerClusterChunk(id) {
    var normalized = normalizeModuleId(id);
    if (!normalized.includes('/src/app/components/lawyer/ExecutionDashboard/'))
        return undefined;
    if (normalized.includes('/ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge') ||
        normalized.includes('/useExecutionDashboardCoreHandlerClusterFollowupAdminSpecial') ||
        normalized.includes('/useExecutionDashboardDossierAdminFollowupHandlers') ||
        normalized.includes('/useExecutionDashboardCoreHandlerClusterFoundationTimeline')) {
        return 'ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge';
    }
    if (normalized.includes('/ExecutionDashboardHandlerClusterFollowupDossierControlsBridge') ||
        normalized.includes('/useExecutionDashboardCoreHandlerClusterFollowupDossierControls') ||
        normalized.includes('/useExecutionDashboardDossierControlsHandlers')) {
        return 'ExecutionDashboardHandlerClusterFollowupDossierControlsBridge';
    }
    if (normalized.includes('/ExecutionDashboardHandlerClusterFollowupOtherPartyBridge') ||
        normalized.includes('/useExecutionDashboardCoreHandlerClusterFollowupOtherParty') ||
        normalized.includes('/useExecutionDashboardOtherPartyHandlers')) {
        return 'ExecutionDashboardHandlerClusterFollowupOtherPartyBridge';
    }
    if (normalized.includes('/ExecutionDashboardHandlerClusterSeizureHeavyBridge') ||
        normalized.includes('/useExecutionDashboardCoreHandlerClusterSeizureHeavy')) {
        return 'ExecutionDashboardHandlerClusterSeizureHeavyBridge';
    }
    if (normalized.includes('/ExecutionDashboardHandlerClusterBridge') ||
        normalized.includes('/useExecutionDashboardCoreHandlerCluster.ts')) {
        return 'ExecutionDashboardHandlerClusterBridge';
    }
    return undefined;
}
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
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
                    './src/app/App.tsx',
                    './src/styles/index.css',
                ],
            },
            headers: __assign({}, getDevSecurityHeaders()),
            /** يتبع منفذ الخادم الفعلي — لا تثبيت 8080 يدوياً (كان يسبب stale imports عند 8081/8082) */
        },
        preview: {
            host: true,
            port: 8080,
            strictPort: false,
            open: true,
            headers: __assign({}, getProductionSecurityHeaders()),
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
                resolveDependencies: function (_filename, deps) {
                    return deps.filter(function (dep) {
                        return !/(lawyer-dashboard|execution-dashboard|execution-dashboard-static-scope|execution-dashboard-loader|execution-lazy-registry|execution-tab-|execution-orchestrators|execution-hooks|execution-helpers|execution-modals|execution-overlays|execution-shell-overlays|execution-phone-body|execution-law-articles|criminal-dashboard|criminal-tab-|criminal-dashboard-request-ui|criminal-dashboard-parties|criminal-legal-codes|criminal-store|criminal-store-slices|criminal-lazy-modals|community-overlays|community-repository|CommunityScreen|global-search-|smart-file-modal|iraqi-law-loader|articles\.json|ExecutionDashboard|CriminalDashboard|vendor-core|vendor-motion|vendor-supabase|vendor-sentry|SmartToastContainer|SmartDialogContainer|auth-context|app-deferred-boot|runtime-|deferred-app)/i.test(dep);
                    });
                },
            },
            rollupOptions: {
                external: command === 'build'
                    ? ['html2canvas', 'expo-secure-store', 'expo-modules-core']
                    : ['expo-secure-store', 'expo-modules-core'],
                output: {
                    experimentalMinChunkSize: 50 * 1024,
                    manualChunks: function (id) {
                        var executionHandlerClusterChunk = resolveExecutionHandlerClusterChunk(id);
                        if (executionHandlerClusterChunk)
                            return executionHandlerClusterChunk;
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
    });
});
