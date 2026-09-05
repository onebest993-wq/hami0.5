import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));

function find(prefix) {
    return files.find(
        (f) =>
            f.startsWith(prefix) &&
            !f.startsWith('CommunityScreenHost') &&
            !f.startsWith('CommunityScreenContent'),
    );
}

function pipelineImports(file) {
    const s = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    const re = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;
    const hits = [];
    let m;
    while ((m = re.exec(s))) {
        const before = s.slice(Math.max(0, m.index - 12), m.index);
        if (/import\s*\($/.test(before)) continue;
        if (/execution-dashboard-(persist|boot|claim|workspace)-pipeline/.test(m[1])) {
            const start = Math.max(0, m.index - 200);
            hits.push({ chunk: m[1], around: s.slice(start, m.index + m[0].length + 20) });
        }
    }
    return hits;
}

for (const pre of [
    'CommunityScreen-',
    'AccountSection-',
    'AddTaskBottomSheet-',
    'calendarPerfMetrics-',
]) {
    const f = find(pre);
    console.log(`\n=== ${f} ===`);
    for (const h of pipelineImports(f)) {
        console.log(`  ${h.chunk}`);
        console.log(`    …${h.around.replace(/\s+/g, ' ').slice(-180)}`);
    }
}
