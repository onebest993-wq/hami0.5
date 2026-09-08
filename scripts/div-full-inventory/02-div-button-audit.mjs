import { readdirSync, statSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const TARGET_DIRS = [
    join(REPO_ROOT, 'src'),
];
const OUTPUT = join(REPO_ROOT, '.audit', 'div-full-inventory', 'div-button-hits.csv');
if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });

function walk(dir) {
    let files = [];
    for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        const s = statSync(full);
        if (s.isDirectory()) {
            if (f === '__tests__' || f === 'node_modules' || f === '.git' || f === 'dist') continue;
            files = files.concat(walk(full));
        } else if (/\.(tsx|jsx)$/.test(f)) {
            if (/\.(test|spec)\.(tsx|jsx)$/.test(f)) continue;
            if (f.includes('.test.') || f.includes('.spec.')) continue;
            files.push(full);
        }
    }
    return files;
}

const rows = [
    ['file', 'line', 'has_open_div_onclick', 'has_class_name', 'class_name_value',
     'has_onclick', 'has_onpointerdown', 'has_onkeydown', 'has_role_button', 'has_tabindex', 'cursor_pointer',
     'has_aria', 'tag_name', 'classification_initial']
];

let totalFiles = 0;
const OPEN_TAG_RE = /<div\s+([^>]*?)\/?>/gis;

for (const base of TARGET_DIRS) {
    if (!existsSync(base)) continue;
    const list = walk(base);
    totalFiles += list.length;
    for (const file of list) {
        const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
        const src = readFileSync(file, 'utf8');
        let m;
        OPEN_TAG_RE.lastIndex = 0;
        while ((m = OPEN_TAG_RE.exec(src)) !== null) {
            const rawAttrs = m[1] || '';
            const hasOnClick = /\bonClick\s*=/.test(rawAttrs);
            const hasOnPointerDown = /\bonPointer(Down|Up|Move|Enter|Leave)\s*=/.test(rawAttrs);
            const hasOnKeyDown = /\bonKey(Down|Up|Press)\s*=/.test(rawAttrs);
            const hasRoleButton = /\brole\s*=\s*(["'])button\1/.test(rawAttrs);
            const hasTabIndex = /\btabIndex\s*=/.test(rawAttrs);
            const hasAria = /\baria-/.test(rawAttrs) || /\b(ariaLabel|role|ariaHidden|ariaModal|ariaLabelledBy)\s*=/.test(rawAttrs);
            const classNameMatch = rawAttrs.match(/\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/);
            const classNameValue = classNameMatch ? (classNameMatch[1] || classNameMatch[2] || classNameMatch[3] || '').slice(0, 120) : '';
            const cursorPointer = classNameValue.includes('cursor-pointer');
            const interactiveCount = [hasOnClick, hasOnPointerDown, hasOnKeyDown, hasRoleButton, hasTabIndex].filter(Boolean).length;
            let classification;
            if (interactiveCount === 0) {
                classification = 'SAFE-presentation-wrapper';
            } else if ((hasOnClick || hasOnPointerDown) && hasRoleButton && hasTabIndex) {
                classification = 'MAYBE-WONTFIX-role-button-pattern';
            } else if (interactiveCount >= 1 && !cursorPointer && !hasRoleButton && !hasOnKeyDown) {
                classification = 'NEEDS-REVIEW-action-missing-semantics';
            } else if ((hasOnClick || hasOnPointerDown || hasOnKeyDown) && !hasRoleButton) {
                classification = 'NEEDS-FIX-interactive-div-not-button';
            } else {
                classification = 'REVIEW-MANUALLY';
            }
            const lineNumber = (m.index >= 0) ? (src.slice(0, m.index).split('\n').length) : -1;
            rows.push([
                rel, String(lineNumber),
                hasOnClick || hasOnPointerDown ? 'TRUE' : '', 'TRUE',
                classNameValue.replace(/"/g, "'").replace(/,/g, ';'),
                String(hasOnClick), String(hasOnPointerDown), String(hasOnKeyDown), String(hasRoleButton),
                String(hasTabIndex), String(cursorPointer),
                String(hasAria), 'div', classification
            ]);
        }
    }
}

writeFileSync(OUTPUT, rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n') + '\n', 'utf8');
process.stdout.write(`DIV BUTTON HONESTY (FULL) INVENTORY DONE\nTotal UI TSX files scanned: ${totalFiles}\nHits (rows-1 header): ${rows.length - 1}\nOutput: ${OUTPUT}\n`);
