/**
 * تصديرات بلا مستهلك في ملفّ محدَّد.
 *
 * حارس الوحدات الميتة يعمل على مستوى **الملفّ**: يسأل «هل يستورد أحدٌ هذا الملفّ؟».
 * فإن كان للملفّ عشرون تصديراً ويُستورد منها اثنان، بقيت الثمانية عشر ميتةً وهو
 * أخضر. وهذه الوحدات الميتة تُشحن في المقطع، وتُبقي أضلاع استيراد تُغلق دوائر،
 * وتُوهم القارئ بأن للوصول طرقاً مقصودة.
 *
 * usage: node .audit/probe-export-surface.mjs src/app/utils/lazyComponents.tsx
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const target = process.argv[2];
if (!target) {
    console.error('usage: node .audit/probe-export-surface.mjs <file>');
    process.exit(1);
}

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p);
    }
    return out;
}

function stripComments(src) {
    let out = '';
    for (let i = 0; i < src.length; i += 1) {
        if (src[i] === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i += 1;
            out += '\n';
            continue;
        }
        if (src[i] === '/' && src[i + 1] === '*') {
            i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
            i += 1;
            continue;
        }
        out += src[i];
    }
    return out;
}

const text = stripComments(fs.readFileSync(path.join(ROOT, target), 'utf8'));

const names = new Set();
for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
}
for (const m of text.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
}

const files = walk(path.join(ROOT, 'src')).concat(walk(path.join(ROOT, 'scripts')));
const selfAbs = path.resolve(ROOT, target);

const usage = new Map([...names].map((n) => [n, new Set()]));

for (const file of files) {
    if (path.resolve(file) === selfAbs) continue;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.includes('lazyComponents') && !raw.includes(path.basename(target, path.extname(target)))) {
        /* لا يذكر الملفّ إطلاقاً — لكن قد يُصله عبر إعادة تصدير، فنُكمل على الأسماء */
    }
    const cleaned = stripComments(raw);
    for (const n of names) {
        const re = new RegExp(`(?<![\\w$])${n}(?![\\w$])`, 'g');
        if (re.test(cleaned)) usage.get(n).add(path.relative(ROOT, file).replace(/\\/g, '/'));
    }
}

const dead = [...usage.entries()].filter(([, files]) => files.size === 0);
const live = [...usage.entries()].filter(([, files]) => files.size > 0);

console.log(`${target}`);
console.log(`  تصديرات: ${names.size}   حيّة: ${live.length}   بلا أي ذكر خارج الملفّ: ${dead.length}\n`);
if (dead.length) {
    console.log('--- بلا مستهلك ---');
    for (const [n] of dead) console.log(`  ${n}`);
}
console.log('\n--- حيّة (أوّل مستهلك) ---');
for (const [n, f] of live) console.log(`  ${n}  <- ${[...f][0]}${f.size > 1 ? ` (+${f.size - 1})` : ''}`);
