/**

 * يتحقق من حجم حزمة الإنتاج بعد البناء — للنشر التجريبي.

 * الاستخدام: npm run build && node scripts/check-bundle-size.mjs

 */

import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { gzipSync } from 'node:zlib';

import { loadPerfBudget } from './load-perf-budget.mjs';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

const budget = loadPerfBudget();

const LIMITS = budget.limits;

const TARGETS = budget.targets;



function kb(bytes) {

    return Math.round(bytes / 1024);

}



function findPreloadedChunks(indexHtml) {

    const matches = [...indexHtml.matchAll(/modulepreload" crossorigin href="\/assets\/([^"]+)"/g)];

    return matches.map((m) => m[1]);

}



function collectTransitiveJsChunks(entryFile, assetsDir) {

    const visited = new Set();

    const queue = [entryFile];

    while (queue.length) {

        const file = queue.shift();

        if (!file || visited.has(file)) continue;

        visited.add(file);

        const abs = path.join(assetsDir, file);

        if (!fs.existsSync(abs)) continue;

        const source = fs.readFileSync(abs, 'utf8');

        for (const match of source.matchAll(/from"\.\/([^"]+\.js)"/g)) {

            queue.push(match[1]);

        }

    }

    return visited;

}



function findEntry(files) {

    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');

    const match = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);

    const entry = match ? match[1] : files.find((f) => f.startsWith('index-') && f.endsWith('.js')) ?? null;

    return { entry, preloaded: findPreloadedChunks(indexHtml), indexHtml };

}



if (!fs.existsSync(assetsDir)) {

    console.error('[check-bundle-size] dist/assets missing — run npm run build first');

    process.exit(1);

}



const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

const { entry: entryName, preloaded } = findEntry(jsFiles);



if (!entryName) {

    console.error('[check-bundle-size] entry chunk not found');

    process.exit(1);

}



const transitiveEntry = collectTransitiveJsChunks(entryName, assetsDir);

const criticalSet = new Set([entryName, ...preloaded, ...transitiveEntry]);



let failed = false;

const report = [];

let criticalPathGzip = 0;



for (const file of jsFiles) {

    const abs = path.join(assetsDir, file);

    const raw = fs.readFileSync(abs);

    const gzip = gzipSync(raw);

    const row = { file, rawKb: kb(raw.length), gzipKb: kb(gzip.length) };

    report.push(row);



    if (criticalSet.has(file)) {

        criticalPathGzip += row.gzipKb;

    }



    if (file === entryName) {

        if (row.rawKb > LIMITS.entryRawKb || row.gzipKb > LIMITS.entryGzipKb) {

            failed = true;

            console.error(

                `[check-bundle-size] entry ${file}: ${row.rawKb}KB raw / ${row.gzipKb}KB gzip — limit ${LIMITS.entryRawKb}/${LIMITS.entryGzipKb}KB`,

            );

        } else if (row.gzipKb > TARGETS.entryGzipKb) {

            console.warn(

                `[check-bundle-size] entry target: ${row.gzipKb}KB gzip > ${TARGETS.entryGzipKb}KB (مرحلة لاحقة)`,

            );

        }

    } else if (row.rawKb > LIMITS.anyChunkRawKb) {

        failed = true;

        console.error(

            `[check-bundle-size] chunk ${file}: ${row.rawKb}KB raw exceeds limit ${LIMITS.anyChunkRawKb}KB`,

        );

    } else if (row.rawKb > TARGETS.anyChunkRawKb) {

        console.warn(

            `[check-bundle-size] chunk target: ${file} ${row.rawKb}KB raw > ${TARGETS.anyChunkRawKb}KB`,

        );

    }

}



report.sort((a, b) => b.rawKb - a.rawKb);

console.log(`[check-bundle-size] critical path (entry+preload+static imports): ~${criticalPathGzip}KB gzip (${criticalSet.size} files)`);

if (criticalPathGzip > LIMITS.criticalPathGzipKb) {

    failed = true;

    console.error(

        `[check-bundle-size] critical path ${criticalPathGzip}KB gzip exceeds ${LIMITS.criticalPathGzipKb}KB`,

    );

} else if (criticalPathGzip > TARGETS.criticalPathGzipKb) {

    console.warn(

        `[check-bundle-size] critical path target: ${criticalPathGzip}KB > ${TARGETS.criticalPathGzipKb}KB`,

    );

}



console.log('[check-bundle-size] top chunks:');

for (const row of report.slice(0, 8)) {

    console.log(`  ${row.file}: ${row.rawKb}KB raw, ${row.gzipKb}KB gzip`);

}



const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.startsWith('index-') && f.endsWith('.css'));

if (cssFiles.length > 0) {

    const cssName = cssFiles.sort((a, b) => {

        const aSize = fs.statSync(path.join(assetsDir, a)).size;

        const bSize = fs.statSync(path.join(assetsDir, b)).size;

        return bSize - aSize;

    })[0];

    const cssRaw = fs.readFileSync(path.join(assetsDir, cssName));

    const cssGzipKb = kb(gzipSync(cssRaw).length);

    console.log(`[check-bundle-size] main CSS ${cssName}: ${kb(cssRaw.length)}KB raw, ${cssGzipKb}KB gzip`);

    if (cssGzipKb > LIMITS.mainCssGzipKb) {

        failed = true;

        console.error(

            `[check-bundle-size] main CSS ${cssGzipKb}KB gzip exceeds ${LIMITS.mainCssGzipKb}KB`,

        );

    }

}


try {

    const { evaluateNamedChunkBudget } = await import('./check-named-chunk-budget.mjs');

    const named = evaluateNamedChunkBudget(budget);

    for (const msg of named.failures) {

        failed = true;

        console.error(`[check-bundle-size] named ${msg}`);

    }

    if (named.checked > 0 && named.ok) {

        console.log(`[check-bundle-size] named chunk caps OK (${named.checked})`);

    }

} catch (err) {

    console.warn('[check-bundle-size] named chunk check skipped:', err?.message || err);

}



if (failed) {

    process.exit(1);

}



console.log('[check-bundle-size] OK');


