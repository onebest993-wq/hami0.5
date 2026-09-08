import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DIRS = [
    join(REPO_ROOT, 'src/app/components/lawyer/HamiSettings'),
    join(REPO_ROOT, 'src/app/components/lawyer/RoyalLawyerProfile/components/settings'),
];
const OUTPUT = join(REPO_ROOT, '.audit', 'settings-inventory', 'div-button-hits.csv');
if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });

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

const rows = [
    ['file', 'line', 'has_open_div_onclick', 'has_class_name', 'class_name_value',
     'has_onclick', 'has_onkeydown', 'has_role_button', 'has_tabindex', 'cursor_pointer',
     'has_aria', 'tag_name', 'classification_initial']
];

let totalFiles = 0;
const OPEN_TAG_RE = /<div\s+([^>]*?)\/?>/gis;
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g;

for (const base of TARGET_DIRS) {
    if (!existsSync(base)) continue;
    const list = walk(base);
    totalFiles += list.length;
    for (const file of list) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
        const src = readFileSync(file, 'utf8');
        const perLine = src.split('\n');
        let m;
        OPEN_TAG_RE.lastIndex = 0;
        while ((m = OPEN_TAG_RE.exec(src)) !== null) {
            const rawAttrs = m[1] || '';
            const hasOnClick = /\bonClick\s*=/.test(rawAttrs);
            const hasOnKeyDown = /\bonKey(Down|Up|Press)\s*=/.test(rawAttrs);
            const hasRoleButton = /\brole\s*=\s*(["'])button\1/.test(rawAttrs);
            const hasTabIndex = /\btabIndex\s*=/.test(rawAttrs);
            const hasAria = /\baria-/.test(rawAttrs) || /\b(ariaLabel|role|ariaHidden)\s*=/.test(rawAttrs);
            const classNameMatch = rawAttrs.match(/\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/);
            const classNameValue = classNameMatch ? (classNameMatch[1] || classNameMatch[2] || classNameMatch[3] || '').slice(0, 120) : '';
            const cursorPointer = classNameValue.includes('cursor-pointer');
            const classification = (!hasOnClick && !hasOnKeyDown && !hasRoleButton) ? 'SAFE-presentation-wrapper'
                : (hasOnClick && hasRoleButton && hasTabIndex) ? 'MAYBE-WONTFIX-role-button-pattern'
                : (hasOnClick && !hasRoleButton && !cursorPointer) ? 'NEEDS-REVIEW-action-missing-semantics'
                : (hasOnClick || hasOnKeyDown) ? 'NEEDS-FIX-interactive-div-not-button'
                : 'REVIEW-MANUALLY';
            const lineNumber = (m.index >= 0) ? (src.slice(0, m.index).split('\n').length) : -1;
            rows.push([
                rel, String(lineNumber),
                hasOnClick ? String(hasOnClick) : '', 'TRUE',
                classNameValue.replace(/"/g, "'").replace(/,/g, ';'),
                String(hasOnClick), String(hasOnKeyDown), String(hasRoleButton),
                String(hasTabIndex), String(cursorPointer),
                String(hasAria), 'div', classification
            ]);
        }
    }
}

writeFileSync(OUTPUT, rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n') + '\n', 'utf8');
process.stdout.write(`DIV BUTTON HONESTY INVENTORY DONE\nTotal UI TSX files scanned: ${totalFiles}\nHits (rows-1 header): ${rows.length - 1}\nOutput: ${OUTPUT}\n`);
