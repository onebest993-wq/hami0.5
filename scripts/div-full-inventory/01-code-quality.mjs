import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DIRS = [
    join(REPO_ROOT, 'src'),
];
const OUTPUT = join(REPO_ROOT, '.audit', 'div-full-inventory', 'code-quality-hits.csv');
if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });

const RE_HIT = /(TODO|FIXME|HACK|XXX|XME)|(console\.(log|warn|error))|(throw\s+new\s+(?:Error|RangeError|TypeError|SyntaxError)\s*\(\s*['"][^'"]{0,60}['"]\s*\))/gi;

function walk(dir) {
    let files = [];
    for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        const s = statSync(full);
        if (s.isDirectory()) {
            if (f === '__tests__' || f === 'node_modules' || f === '.git' || f === 'dist' || f === 'build') continue;
            files = files.concat(walk(full));
        } else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
            if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f)) continue;
            if (f.includes('.test.') || f.includes('.spec.')) continue;
            files.push(full);
        }
    }
    return files;
}

const rows = [['file', 'line', 'type', 'snippet_60chars', 'is_production_file']];
let totalFiles = 0;

for (const base of TARGET_DIRS) {
    if (!existsSync(base)) continue;
    const list = walk(base);
    totalFiles += list.length;
    for (const file of list) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
        const src = readFileSync(file, 'utf8');
        const lines = src.split('\n');
        lines.forEach((line, idx) => {
            let m;
            const line2 = line;
            RE_HIT.lastIndex = 0;
            while ((m = RE_HIT.exec(line2)) !== null) {
                const matched = m[0];
                let type = m[1] ? 'smell-tag:' + m[1]
                    : m[2] ? 'console:' + m[3]
                    : 'throw-generic';
                const snippet = line2.trim().slice(0, 80).replace(/,/g, ';').replace(/"/g, "'");
                rows.push([rel, String(idx + 1), type, snippet, 'TRUE']);
                break;
            }
        });
    }
}

writeFileSync(OUTPUT, rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n') + '\n', 'utf8');
process.stdout.write(`CODE QUALITY INVENTORY DONE\nTotal PRODUCTION files scanned: ${totalFiles}\nHits (rows-1 header): ${rows.length - 1}\nOutput: ${OUTPUT}\n`);
