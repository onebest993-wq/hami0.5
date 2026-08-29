/**
 * قياس إغلاق ثابت رسمي (بدون import()) + أكبر الملفات.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const toPosix = (p) => p.split(path.sep).join('/');

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

function staticSpecs(src) {
    const cleaned = stripComments(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/(?:^|[\s;}])import\s+(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    for (const m of cleaned.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s*['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    return specs;
}

function typeOnlySpecs(src) {
    const cleaned = stripComments(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/import\s+type\s[^;]*?from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    return specs;
}

function resolveSpec(fromRel, spec) {
    let base;
    if (spec.startsWith('@/app/')) base = path.join(ROOT, 'src/app', spec.slice('@/app/'.length));
    else if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.resolve(ROOT, path.dirname(fromRel), spec);
    else return null;
    const cands = [];
    if (path.extname(base)) cands.push(base);
    for (const e of EXTS) cands.push(base + e);
    for (const e of EXTS) cands.push(path.join(base, `index${e}`));
    for (const c of cands) {
        try {
            if (fs.statSync(c).isFile()) return toPosix(path.relative(ROOT, c));
        } catch {
            /* next */
        }
    }
    return null;
}

function walk(entry) {
    const seen = new Set();
    const stack = [toPosix(entry)];
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        let src;
        try {
            src = fs.readFileSync(path.join(ROOT, cur), 'utf8');
        } catch {
            continue;
        }
        const typeOnly = typeOnlySpecs(src);
        for (const spec of staticSpecs(src)) {
            if (typeOnly.has(spec)) continue;
            const target = resolveSpec(cur, spec);
            if (target && !seen.has(target)) stack.push(target);
        }
    }
    return seen;
}

function sizeOf(rel) {
    try {
        return fs.statSync(path.join(ROOT, rel)).size;
    } catch {
        return 0;
    }
}

function report(title, entry) {
    const seen = walk(entry);
    const files = [...seen].map((f) => ({ f, kb: sizeOf(f) / 1024 })).sort((a, b) => b.kb - a.kb);
    const total = files.reduce((s, x) => s + x.kb, 0);
    console.log(`\n=== ${title} ===`);
    console.log(`${files.length} وحدة / ${total.toFixed(1)} ك.ب مصدر`);
    for (const x of files.slice(0, 18)) {
        console.log(`  ${x.kb.toFixed(1).padStart(6)}  ${x.f}`);
    }
    return { total, files };
}

report('Host التقويم (ما يُحمَّل عند أول فتح)', 'src/app/components/lawyer/dashboard/schedule/ScheduleTabHost.tsx');
report('SmartLegalRadar', 'src/app/components/lawyer/SmartLegalRadar.tsx');
report('useCalendarData', 'src/app/components/lawyer/hooks/useCalendarData.ts');
report('EventForm', 'src/app/components/lawyer/SmartLegalRadar/EventForm.tsx');
report('EventCard', 'src/app/components/lawyer/SmartLegalRadar/EventCard.tsx');
report('calendarCloudLoader', 'src/app/services/calendar/calendarCloudLoader.ts');
report('calendarBridge barrel', 'src/app/services/calendarBridge.ts');
report('bridge/core فقط', 'src/app/services/calendar/bridge/core.ts');
report('HamiNotificationBridge', 'src/app/services/notifications/HamiNotificationBridge.ts');
report('hamiBridgeNativePlugin', 'src/app/services/notifications/bridge/hamiBridgeNativePlugin.ts');
report('vaultUploadService', 'src/app/services/vaultUploadService.ts');
report('scheduleBootHydrator', 'src/app/runtime/scheduleBootHydrator.ts');
report('settingsRuntime', 'src/app/services/settings/settingsRuntime.ts');
