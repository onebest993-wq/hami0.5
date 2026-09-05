import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const STATIC_RE = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;
const DYNAMIC_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;

function dump(prefix) {
    const f = files.find(
        (x) =>
            x.startsWith(prefix) &&
            !x.startsWith('CommunityScreenHost') &&
            !x.startsWith('CommunityScreenContent'),
    );
    if (!f) {
        console.log('MISSING', prefix);
        return;
    }
    const code = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    const staticDeps = [];
    let m;
    STATIC_RE.lastIndex = 0;
    while ((m = STATIC_RE.exec(code))) {
        const before = code.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        staticDeps.push(m[1]);
    }
    const dyn = [];
    DYNAMIC_RE.lastIndex = 0;
    while ((m = DYNAMIC_RE.exec(code))) dyn.push(m[1]);
    const short = (s) => s.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
    console.log('\n====', f, 'raw', fs.statSync(path.join(ASSETS, f)).size, '====');
    console.log('STATIC:');
    for (const d of [...new Set(staticDeps)].sort()) console.log(' ', short(d));
    console.log('DYNAMIC:');
    for (const d of [...new Set(dyn)].sort()) {
        const sz = fs.existsSync(path.join(ASSETS, d))
            ? Math.round(fs.statSync(path.join(ASSETS, d)).size / 1024)
            : '?';
        console.log(' ', short(d), `${sz}KB`);
    }
}

dump(process.argv[2] || 'communityScreenLazyEntries-');
