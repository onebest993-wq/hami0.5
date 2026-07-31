/**
 * Static scan for client-side battery/RAM/storage drain patterns.
 * Exit 1 on high-severity findings that should be fixed in logic (not UI).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** @type {{ severity: 'high' | 'medium'; file: string; line: number; message: string }[]} */
const findings = [];

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '__tests__') continue;
            walk(full, out);
        } else if (/\.(tsx?|jsx?)$/.test(ent.name) && !/\.(test|spec)\.(tsx?|jsx?)$/.test(ent.name)) {
            out.push(full);
        }
    }
    return out;
}

function rel(p) {
    return path.relative(ROOT, p).replace(/\\/g, '/');
}

function scanFile(filePath) {
    let text;
    try {
        text = fs.readFileSync(filePath, 'utf8');
    } catch {
        return;
    }
    const lines = text.split('\n');
    const r = rel(filePath);

    if (r.includes('useVisibilityAwareInterval')) return;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const n = i + 1;

        if (/setInterval\s*\(/.test(line) && !/clearInterval/.test(text.slice(0, 500))) {
            /* skip — too noisy without AST */
        }

        if (/setInterval\s*\([^)]*,\s*[1-9]\d{0,3}\s*\)/.test(line.replace(/\s/g, ''))) {
            if (
                !/test|mock|spec|__tests__|performanceMonitor\.test/i.test(r) &&
                !/useVisibilityAwareInterval|visibilitychange|document\.hidden/.test(text)
            ) {
                findings.push({
                    severity: 'medium',
                    file: r,
                    line: n,
                    message: 'Fast setInterval (<10s) without visibility-aware helper in same file',
                });
            }
        }

        if (/localStorage\.setItem\s*\(\s*[`'"][^`'"]+[`'"]\s*,\s*JSON\.stringify\s*\(\s*rows/.test(line)) {
            if (!/slice\s*\(|MAX_|cap|limit|trim/.test(text)) {
                findings.push({
                    severity: 'medium',
                    file: r,
                    line: n,
                    message: 'localStorage array write without visible cap in file',
                });
            }
        }
    }

    const usesPrintPopupWrite = /w\.document\.write/.test(text) && !/(?<!w\.)document\.write/.test(text.replace(/w\.document\.write/g, ''));
    const usesDomPurifySanitize =
        /from\s+['"]dompurify['"]/.test(text) && /DOMPurify|sanitizeRichNoteHtml|sanitize\(/.test(text);

    if (
        !usesPrintPopupWrite &&
        !usesDomPurifySanitize &&
        /new\s+Function\s*\(|\.innerHTML\s*=|document\.write\s*\(/.test(text)
    ) {
        findings.push({
            severity: 'high',
            file: r,
            line: 1,
            message: 'Potential XSS footgun (innerHTML / eval / document.write)',
        });
    }
}

const files = walk(SRC);
for (const f of files) scanFile(f);

const high = findings.filter((f) => f.severity === 'high');
const medium = findings.filter((f) => f.severity === 'medium');

console.log(`client-resource-audit: scanned ${files.length} files\n`);
console.log(`High: ${high.length} | Medium: ${medium.length}\n`);

for (const f of [...high, ...medium].slice(0, 40)) {
    console.log(`  [${f.severity}] ${f.file}:${f.line} — ${f.message}`);
}
if (findings.length > 40) {
    console.log(`  ... and ${findings.length - 40} more`);
}

if (high.length) process.exit(1);
console.log('\nclient-resource-audit: OK (no high-severity findings)');
