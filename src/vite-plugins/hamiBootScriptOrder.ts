import fs from 'node:fs';
import path from 'node:path';
import type { OutputChunk, Plugin } from 'rollup';

const BOOT_SCRIPT_TAG = '<script src="/hami-boot.js"></script>';
const BOOT_SCRIPT_RE = /<script[^>]*src="\/hami-boot\.js"[^>]*><\/script>/i;
const APP_MODULE_RE = /<script[^>]*type="module"[^>]*><\/script>/i;

const CRITICAL_PRELOAD_PREFIXES = ['boot-runtime', 'vendor-react'] as const;

function collectChunkFileNames(bundle: Record<string, OutputChunk | unknown>): string[] {
    return Object.values(bundle)
        .filter((item): item is OutputChunk => typeof item === 'object' && item !== null && (item as OutputChunk).type === 'chunk')
        .map((item) => item.fileName);
}

/** يحقن modulepreload للمسار الحرج إن لم يُولّده Vite */
export function injectCriticalModulePreloads(html: string, chunkFileNames: string[]): string {
    const tags: string[] = [];
    for (const prefix of CRITICAL_PRELOAD_PREFIXES) {
        const file = chunkFileNames.find((name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'));
        if (!file) continue;
        const href = `/assets/${file}`;
        if (html.includes(href)) continue;
        tags.push(`    <link rel="modulepreload" crossorigin href="${href}">`);
    }
    if (!tags.length) return html;
    const block = tags.join('\n');
    const moduleMatch = html.match(APP_MODULE_RE);
    if (moduleMatch) {
        return html.replace(moduleMatch[0], `${block}\n    ${moduleMatch[0]}`);
    }
    return html.replace('</head>', `${block}\n  </head>`);
}

function patchIndexHtml(html: string, chunkFileNames: string[]): string {
    const demoBoot = process.env.VITE_SHELL_AUTH_OPEN === 'true';
    let out = reorderBootScriptBeforeAppModule(html, {
        demoBoot,
        hideStaticBoot: false,
        bootGuardMs: demoBoot ? 4_000 : 14_000,
    });
    out = injectCriticalModulePreloads(out, chunkFileNames);
    return out;
}

function injectHtmlRootAttr(html: string, attr: string, value: string): string {
    if (html.includes(`${attr}=`)) return html;
    return html.replace(/<html\b([^>]*)>/i, (_match, rest: string) => `<html${rest} ${attr}="${value}">`);
}

/**
 * يضمن أن hami-boot.js يُنفَّذ قبل حزمة التطبيق في الإنتاج.
 * Vite يحقن entry كـ module في <head>؛ إن بقي boot في نهاية body فلا تُثبَّت
 * معالجات الأخطاء قبل فشل تحميل الـchunks.
 */
export function reorderBootScriptBeforeAppModule(
    html: string,
    opts?: { demoBoot?: boolean; hideStaticBoot?: boolean; bootGuardMs?: number },
): string {
    let out = html;
    const hideBoot = Boolean(opts?.hideStaticBoot);
    const guardMs = opts?.bootGuardMs ?? (opts?.demoBoot ? 4_000 : 14_000);

    out = injectHtmlRootAttr(out, 'data-hami-boot-guard-ms', String(guardMs));
    if (opts?.demoBoot) {
        out = injectHtmlRootAttr(out, 'data-hami-demo-boot', '1');
    }

    if (hideBoot) {
        out = out.replace(/\bhami-boot-static-active\b/g, '').replace(/class="\s*"/, '');
        if (!out.includes('hami-instant-boot-css')) {
            out = out.replace(
                '</head>',
                '    <style id="hami-instant-boot-css">#hami-static-boot{display:none!important;visibility:hidden!important}</style>\n  </head>',
            );
        }
    }

    const existingBoot = out.match(BOOT_SCRIPT_RE);
    const bootTag = (existingBoot?.[0] ?? BOOT_SCRIPT_TAG).replace(/\sdefer\b/i, '');

    out = out.replace(BOOT_SCRIPT_RE, '');

    const moduleMatch = out.match(APP_MODULE_RE);
    if (moduleMatch) {
        if (!out.includes(bootTag)) {
            out = out.replace(moduleMatch[0], `${bootTag}\n    ${moduleMatch[0]}`);
        }
        return out;
    }

    if (!out.includes('/hami-boot.js')) {
        out = out.replace('</head>', `    ${bootTag}\n  </head>`);
    }
    return out;
}

export function hamiBootScriptOrder(): Plugin {
    return {
        name: 'hami-boot-script-order',
        enforce: 'post',
        transformIndexHtml: {
            order: 'post',
            handler(html) {
                return reorderBootScriptBeforeAppModule(html, {
                    demoBoot: process.env.VITE_SHELL_AUTH_OPEN === 'true',
                    hideStaticBoot: false,
                    bootGuardMs: process.env.VITE_SHELL_AUTH_OPEN === 'true' ? 4_000 : 14_000,
                });
            },
        },
        generateBundle(_outputOptions, bundle) {
            const chunkFileNames = collectChunkFileNames(bundle);
            for (const asset of Object.values(bundle)) {
                if (asset.type !== 'asset' || asset.fileName !== 'index.html') continue;
                if (typeof asset.source !== 'string') continue;
                asset.source = patchIndexHtml(asset.source, chunkFileNames);
            }
        },
        writeBundle(options, bundle) {
            const outDir = options.dir ?? path.resolve(process.cwd(), 'dist');
            const indexPath = path.join(outDir, 'index.html');
            if (!fs.existsSync(indexPath)) return;
            const html = fs.readFileSync(indexPath, 'utf8');
            const patched = patchIndexHtml(html, collectChunkFileNames(bundle));
            if (patched !== html) {
                fs.writeFileSync(indexPath, patched, 'utf8');
            }
        },
    };
}
