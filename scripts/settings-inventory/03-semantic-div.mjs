import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DIRS = [
    join(REPO_ROOT, 'src/app/components/lawyer/HamiSettings'),
    join(REPO_ROOT, 'src/app/components/lawyer/RoyalLawyerProfile/components/settings'),
];
const OUTPUT = join(REPO_ROOT, '.audit', 'settings-inventory', 'semantic-div-candidates.csv');
if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });

const CATEGORIES = [
    { id: 'header', re: /\b(className=.*?(?:header|topbar|toolbar|appBar)|role\s*=\s*(["'])banner\1)/i, label: 'header' },
    { id: 'footer', re: /\b(className=.*?(?:footer|bottombar)|role\s*=\s*(["'])contentinfo\1)/i, label: 'footer' },
    { id: 'nav', re: /\b(className=.*?(?:\bnav\b|navbar|menu|tabbar)|role\s*=\s*(["'])navigation\1)/i, label: 'nav' },
    { id: 'section', re: /\b(className=.*?(?:section|panel|sheet|chrome|modal|region)|role\s*=\s*(["'])region\1)/i, label: 'section' },
    { id: 'aside', re: /\b(className=.*?(?:aside|sidebar|side-panel|drawer)|role\s*=\s*(["'])complementary\1)/i, label: 'aside' },
    { id: 'article', re: /\bclassName=.*?(?:article|dossier|case|file|card-body)/i, label: 'article' },
    { id: 'tabpanel', re: /\b(role\s*=\s*(["'])tabpanel\2|id\s*=\s*(["'])settings-section-panel\3|className=.*?tab.?panel)/i, label: 'tabpanel' },
    { id: 'dialog', re: /\b(role\s*=\s*(["'])dialog\2|data-settings-root\b|aria-modal\s*=)/i, label: 'dialog' },
];

function walk(dir) {
    let files = [];
    for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        const s = statSync(full);
        if (s.isDirectory()) {
            if (f === '__tests__') continue;
            files = files.concat(walk(full));
        } else if (/\.(tsx|jsx)$/.test(f)) {
            files.push(full);
        }
    }
    return files;
}

const rows = [['file', 'line', 'category', 'snippet', 'first_class_name_60']];
let totalDivs = 0;
let totalFiles = 0;

for (const base of TARGET_DIRS) {
    if (!existsSync(base)) continue;
    const list = walk(base);
    totalFiles += list.length;
    for (const file of list) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
        const src = readFileSync(file, 'utf8');
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const idxDiv = line.indexOf('<div');
            if (idxDiv < 0) continue;
            totalDivs++;
            for (const cat of CATEGORIES) {
                cat.re.lastIndex = 0;
                if (cat.re.test(line)) {
                    const cnm = line.match(/className\s*=\s*(?:"([^"]{0,80})"|'([^']{0,80})')/);
                    const cnval = cnm ? (cnm[1] || cnm[2] || '') : '';
                    rows.push([rel, String(i + 1), cat.label,
                        line.trim().slice(0, 140).replace(/"/g, "'").replace(/,/g, ';'),
                        cnval.replace(/"/g, "'").replace(/,/g, ';')]);
                    break;
                }
            }
        }
    }
}

writeFileSync(OUTPUT, rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n') + '\n', 'utf8');
process.stdout.write(`SEMANTIC DIV (Settings-Scoped) INVENTORY DONE\nTotal TSX files scanned: ${totalFiles}\nTotal <div> tags: ${totalDivs}\nCandidates: ${rows.length - 1}\nOutput: ${OUTPUT}\n`);
