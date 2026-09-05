import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
if (!fs.existsSync(ASSETS)) {
    console.error('missing dist');
    process.exit(1);
}
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const STATIC_RE = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;

function staticImports(file) {
    const src = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    const found = [];
    let m;
    while ((m = STATIC_RE.exec(src))) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        found.push(m[1]);
    }
    return found;
}

function find(pre) {
    return files.find(
        (f) =>
            f.startsWith(pre) &&
            !f.startsWith('CommunityScreenHost') &&
            !f.startsWith('CommunityScreenContent'),
    );
}

for (const pre of ['CommunityScreen-', 'ScheduleTabHost-', 'forumApiService-', 'secure-api-client-']) {
    const f = find(pre);
    if (!f) {
        console.log(pre, 'MISSING');
        continue;
    }
    console.log(`\n=== ${f} ===`);
    for (const d of staticImports(f).sort()) {
        const short = d.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
        console.log(' ', short);
    }
}
