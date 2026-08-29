import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = 'dist/assets';
const html = fs.readFileSync('dist/index.html', 'utf8');
const initial = [...html.matchAll(/assets\/([^"'?]+\.js)/g)].map((m) => m[1]);
console.log('initial_js_count', initial.length);
console.log(
    'gs_in_initial_html',
    initial.filter((a) => /search|Search|fuse|global/i.test(a)),
);

const chunk = 'readGlobalSearchRecentSearchesSync-QAeh5N_z.js';
const t = fs.readFileSync(path.join(dir, chunk), 'utf8');
console.log('shell_chunk_markers', {
    idleHint: t.includes('ابدأ بالكتابة'),
    recent: t.includes('الأخيرة'),
    scopes: t.includes('جزائي') && t.includes('المستودع'),
    searchTitle: t.includes('البحث الشامل'),
    motionLib: /framer-motion|motion\/react/.test(t),
});

const named = fs
    .readdirSync(dir)
    .filter((f) => /\.(js|css)$/.test(f) && /search|Search|fuse|globalSearch|GlobalSearch|vendor-search/i.test(f))
    .map((f) => {
        const buf = fs.readFileSync(path.join(dir, f));
        return {
            f,
            rawKb: +(buf.length / 1024).toFixed(1),
            gzKb: +(zlib.gzipSync(buf, { level: 9 }).length / 1024).toFixed(1),
        };
    })
    .sort((a, b) => b.rawKb - a.rawKb);

const totalRaw = named.reduce((s, r) => s + r.rawKb, 0);
const totalGz = named.reduce((s, r) => s + r.gzKb, 0);
console.log(JSON.stringify({ namedTop: named.slice(0, 12), totalRawKb: +totalRaw.toFixed(1), totalGzKb: +totalGz.toFixed(1) }, null, 2));
