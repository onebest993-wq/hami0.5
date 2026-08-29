/**
 * يحزم مدخل Vercel إلى CJS. Node 24 على المنصّة لا يشغّل api/*.ts كـ ESM بأمان.
 * packages: external — لا ندمج jsdom بلا default-stylesheet.css (كان يُسقط المسارات بـ 500).
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(ROOT, 'src', 'app', 'api', 'vercelNodeHandler.ts');
const outfile = path.join(ROOT, 'api', 'handler.js');

const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
    logLevel: 'info',
    packages: 'external',
    loader: { '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.jpeg': 'empty', '.webp': 'empty', '.gif': 'empty' },
    alias: {
        'isomorphic-dompurify': path.join(ROOT, 'src', 'app', 'api', 'security', 'nodeDomPurifyStub.ts'),
    },
    legalComments: 'none',
    define: {
        'import.meta.env.DEV': 'false',
        'import.meta.env.PROD': 'true',
        'import.meta.env.SSR': 'true',
        'import.meta.env.MODE': '"production"',
        'import.meta.env.VITEST': 'false',
    },
    footer: {
        js: [
            'const __hamiApi = module.exports;',
            'module.exports = typeof __hamiApi.default === "function" ? __hamiApi.default : __hamiApi;',
            'module.exports.config = __hamiApi.config;',
        ].join('\n'),
    },
});

if (result.errors.length) {
    console.error('[bundle-vercel-api] esbuild failed');
    process.exit(1);
}

const out = fs.readFileSync(outfile, 'utf8');
if (out.includes('/browser/default-stylesheet.css') || /\brequire\(["']isomorphic-dompurify["']\)/.test(out)) {
    console.error('[bundle-vercel-api] DOMPurify/jsdom leaked into the bundle — keep the nodeDomPurifyStub alias');
    process.exit(1);
}

console.log('[bundle-vercel-api] OK → api/handler.js');
