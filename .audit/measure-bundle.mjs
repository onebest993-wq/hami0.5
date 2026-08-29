/** قياس أحجام المقاطع والحمل الأوّلي من `dist` مباشرة (خام + gzip حقيقيّ). */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = 'dist';
const ASSETS = path.join(DIST, 'assets');

const files = fs
    .readdirSync(ASSETS)
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => {
        const buf = fs.readFileSync(path.join(ASSETS, f));
        return { f, raw: buf.length / 1024, gz: zlib.gzipSync(buf, { level: 9 }).length / 1024 };
    });

const js = files.filter((r) => r.f.endsWith('.js')).sort((a, b) => b.raw - a.raw);
const css = files.filter((r) => r.f.endsWith('.css')).sort((a, b) => b.raw - a.raw);

const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);

console.log(`مقاطع JS: ${js.length}   ملفّات CSS: ${css.length}`);
console.log(`مجموع JS:  ${sum(js, 'raw').toFixed(0)} kB خام / ${sum(js, 'gz').toFixed(0)} kB مضغوط`);
console.log(`مجموع CSS: ${sum(css, 'raw').toFixed(0)} kB خام / ${sum(css, 'gz').toFixed(0)} kB مضغوط`);

console.log('\n--- أكبر ١٥ مقطع JS ---');
for (const r of js.slice(0, 15)) {
    console.log(`  ${r.raw.toFixed(1).padStart(8)} kB  gzip ${r.gz.toFixed(1).padStart(6)}  ${r.f}`);
}

console.log('\n--- CSS ---');
for (const r of css) {
    console.log(`  ${r.raw.toFixed(1).padStart(8)} kB  gzip ${r.gz.toFixed(1).padStart(6)}  ${r.f}`);
}

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const seen = new Set();
const initial = [];
for (const m of html.matchAll(/(?:href|src)="\/assets\/([^"]+)"/g)) {
    if (!seen.has(m[1]) && /\.(js|css)$/.test(m[1])) {
        seen.add(m[1]);
        initial.push(m[1]);
    }
}

console.log('\n--- الحمل الأوّلي (ما يطلبه المتصفّح قبل أي تفاعل) ---');
let ir = 0;
let ig = 0;
for (const f of initial) {
    const r = files.find((x) => x.f === f);
    if (!r) continue;
    ir += r.raw;
    ig += r.gz;
    const kind = html.includes(`modulepreload" crossorigin href="/assets/${f}"`) ? 'preload' : 'blocking';
    console.log(
        `  ${r.raw.toFixed(1).padStart(8)} kB  gzip ${r.gz.toFixed(1).padStart(6)}  ${kind.padEnd(9)} ${f}`,
    );
}
console.log(`  المجموع: ${ir.toFixed(1)} kB خام / ${ig.toFixed(1)} kB مضغوط`);

const raws = js.map((r) => r.raw).sort((a, b) => a - b);
const median = raws.length > 0 ? raws[Math.floor(raws.length / 2)] : 0;
console.log(
    `\nوسيط حجم المقطع: ${median.toFixed(1)} kB   >100kB: ${js.filter((r) => r.raw > 100).length}   >200kB: ${
        js.filter((r) => r.raw > 200).length
    }`,
);

const maps = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.map'));
console.log(`خرائط مصدر في dist: ${maps.length}`);
