import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const s = statSync(full);
        if (s.isDirectory()) walk(full, out);
        else if (full.endsWith('.tsx') && !full.includes('__tests__')) out.push(full);
    }
    return out;
}

const HEADER_RE = /<div\s+([^>]*?className="[^"]*(?:header|topbar|top-bar|appBar|toolbar)[^"]*"[^>]*)>/gi;
const FOOTER_RE = /<div\s+([^>]*?className="[^"]*(?:footer|bottombar|bottom-bar)[^"]*"[^>]*)>/gi;
const NAV_RE = /<div\s+([^>]*?className="[^"]*(?:nav|navbar|nav-bar|menu|tabbar|tab-bar)[^"]*"[^>]*)>/gi;
const SECTION_RE = /<div\s+([^>]*?className="[^"]*(?:section|panel|card|sheet|chrome|frame|modal|dialog|overlay)[^"]*"[^>]*)>/gi;
const ASIDE_RE = /<div\s+([^>]*?className="[^"]*(?:aside|sidebar|side-panel|drawer)[^"]*"[^>]*)>/gi;
const ARTICLE_RE = /<div\s+([^>]*?className="[^"]*(?:article|post|entry|dossier|case|file|card-body)[^"]*"[^>]*)>/gi;

const files = walk(SRC);
const buckets = { header: 0, footer: 0, nav: 0, section: 0, aside: 0, article: 0, totalDivs: 0 };
const hits = [];
const samples = { header: [], footer: [], nav: [], section: [], aside: [], article: [] };

for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f).replace(/\\/g,'/');
    let divCount = (src.match(/<div(\s|>|\/)/g) || []).length;
    buckets.totalDivs += divCount;
    for (const [re, key, label] of [
        [HEADER_RE, 'header', '<header>'],
        [FOOTER_RE, 'footer', '<footer>'],
        [NAV_RE, 'nav', '<nav>'],
        [SECTION_RE, 'section', '<section>'],
        [ASIDE_RE, 'aside', '<aside>'],
        [ARTICLE_RE, 'article', '<article>'],
    ]) {
        const arr = [...src.matchAll(re)];
        if (arr.length) {
            buckets[key] += arr.length;
            for (const m of arr.slice(0, 2)) {
                const line = src.slice(0, m.index).split('\n').length;
                samples[key].push(`${rel}:L${line} → ${m[0].slice(0, 140)}`);
            }
        }
    }
}

console.log(`NON-TEST TSX files: ${files.length}`);
console.log(`Total <div> tags (non-test): ${buckets.totalDivs}`);
console.log('\nSemantic candidates by className keyword:');
for (const k of ['header','footer','nav','section','aside','article']) {
    console.log(`  ${k.padEnd(8)} → ${buckets[k]} candidate(s)`);
    for (const s of samples[k].slice(0,3)) console.log(`    ${s}`);
}

console.log(`\nTotal high-impact candidate count: ${buckets.header + buckets.footer + buckets.nav + buckets.aside + buckets.article + Math.floor(buckets.section/4)}`);
