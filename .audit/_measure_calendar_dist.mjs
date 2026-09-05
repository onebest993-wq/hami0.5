/**
 * قياس حي لكِسَر التقويم في dist بعد البناء.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'dist', 'assets');

function kb(n) {
    return +(n / 1024).toFixed(1);
}

function sizeOf(file) {
    const raw = fs.readFileSync(path.join(DIR, file));
    return { file, rawKb: kb(raw.length), gzipKb: kb(gzipSync(raw).length), bytes: raw.length, gzip: gzipSync(raw).length, text: raw.toString('utf8') };
}

if (!fs.existsSync(DIR)) {
    console.error('dist/assets missing');
    process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') || f.endsWith('.css'));
const rows = files.map(sizeOf);

function byPrefix(prefixes) {
    return rows
        .filter((r) => prefixes.some((p) => r.file.startsWith(p) || r.file.includes(p)))
        .sort((a, b) => b.rawKb - a.rawKb);
}

function sum(list) {
    return {
        raw: +list.reduce((s, r) => s + r.rawKb, 0).toFixed(1),
        gzip: +list.reduce((s, r) => s + r.gzipKb, 0).toFixed(1),
        n: list.length,
    };
}

const named = [
    'ScheduleTabHost',
    'scheduleHubLoader',
    'useCalendarData',
    'EventForm-',
    'prefetchRadarEventForm',
    'scheduleConflictDetector',
    'openCalendarRadarSource',
    'calendarCloudLoader',
    'calendarCloudRuntime',
    'lawyerCalendarCloud',
    'calendarEventsWarm',
    'calendarLocalSnapshot',
    'lawyer-calendar-cache',
    'radarTheme',
    'scheduleIntentWarm',
    'scheduleBootHydrator',
    'LawyerDashboardMainView',
    'scheduleConflict',
    'local-ymd',
    'calendar-cloud-runtime',
    'schedule-chrome-lite',
];

console.log('=== كِسَر باسم التقويم / المضيف ===');
const namedHits = [];
for (const p of named) {
    const hits = rows.filter((r) => r.file.startsWith(p) || r.file.includes(`-${p}-`) || r.file.startsWith(`${p}-`));
    for (const h of hits) {
        if (namedHits.some((x) => x.file === h.file)) continue;
        namedHits.push(h);
        console.log(`${String(h.rawKb).padStart(6)} raw | ${String(h.gzipKb).padStart(5)} gzip | ${h.file}`);
    }
}

const needles = {
    chrome: ['data-schedule-snapshot', 'radar-empty-pending', 'data-schedule-instant'],
    live: ['embedInChrome', 'radar-live-body'],
    conflict: ['detectConflictsFromUnifiedEvents'],
    source: ['requestOpenExecutionVisitationWorkspace'],
    visitBarrel: ['visit_next'],
    sharedPersist: ['lawsuitFilesStorage'],
};

console.log('\n=== أين تسكن العلامات ===');
for (const [label, list] of Object.entries(needles)) {
    const hits = rows
        .filter((r) => r.file.endsWith('.js') && list.some((n) => r.text.includes(n)))
        .map((r) => `${r.file} (${r.rawKb})`);
    const short = hits.filter((h) => !/execution-dashboard|Criminal|SmartFile|Financial|Coercive|archive-portal|CommunityScreen|TasksManager|LawsuitsWorkspace/i.test(h));
    console.log(`${label}:`);
    for (const h of (short.length ? short : hits).slice(0, 8)) console.log(`  ${h}`);
    if (hits.length > 8) console.log(`  … +${hits.length - 8}`);
}

const openSet = rows.filter((r) =>
    /^(ScheduleTabHost|useCalendarData|scheduleHubLoader|calendarEventsWarm|calendarLocalSnapshot|lawyer-calendar-cache|radarTheme|scheduleIntentWarm|scheduleBootHydrator|calendarCloudRuntime)-/.test(r.file) ||
    r.file.startsWith('ScheduleTabHost-') ||
    r.file.startsWith('useCalendarData-') ||
    r.file.startsWith('scheduleHubLoader-') ||
    r.file.startsWith('calendarEventsWarm-') ||
    r.file.startsWith('calendarLocalSnapshot-') ||
    r.file.startsWith('lawyer-calendar-cache-') ||
    r.file.startsWith('radarTheme-') ||
    r.file.startsWith('scheduleIntentWarm-') ||
    r.file.startsWith('scheduleBootHydrator-'),
);
const formSet = rows.filter((r) => r.file.startsWith('EventForm-') || r.file.startsWith('prefetchRadarEventForm-'));
const deferred = rows.filter((r) =>
    r.file.startsWith('scheduleConflictDetector-') ||
    r.file.startsWith('openCalendarRadarSource-') ||
    r.file.startsWith('calendarCloudLoader-') ||
    /ConflictDetector/.test(r.file),
);

const main = rows.find((r) => r.file.startsWith('LawyerDashboardMainView-') && r.file.endsWith('.js'));
console.log('\n=== مجموعات ===');
const o = sum(openSet);
console.log(`فتح تبويب (بدون نموذج/تعارض/مصدر): ${o.raw} raw / ${o.gzip} gzip  (${o.n} ملفات)`);
const f = sum(formSet);
console.log(`نموذج الموعد: ${f.raw} raw / ${f.gzip} gzip`);
const d = sum(deferred);
console.log(`مؤجَّل (تعارض/مصدر/محمّل سحابة إن وُجد كِسرة): ${d.raw} raw / ${d.gzip} gzip`);
if (main) {
    const hasChrome = main.text.includes('data-schedule-snapshot');
    console.log(`MainView: ${main.rawKb} raw / ${main.gzipKb} gzip | صدفة الكروم داخله: ${hasChrome ? 'نعم' : 'لا'}`);
}

const host = rows.find((r) => r.file.startsWith('ScheduleTabHost-'));
if (host) {
    console.log('\n=== Host: هل ما زال يضم الثقيل؟ ===');
    console.log(`lawsuitFilesStorage: ${host.text.includes('lawsuitFilesStorage')}`);
    console.log(`detectConflictsFromUnifiedEvents: ${host.text.includes('detectConflictsFromUnifiedEvents')}`);
    console.log(`requestOpenExecutionVisitationWorkspace: ${host.text.includes('requestOpenExecutionVisitationWorkspace')}`);
    console.log(`embedInChrome: ${host.text.includes('embedInChrome')}`);

    const withoutMap = host.text.replace(/const __vite__mapDeps=[\s\S]*?\);/, '');
    const staticImps = [
        ...withoutMap.matchAll(/(?:from|import)["']\.\/([^"']+\.js)["']/g),
    ].map((m) => m[1]);
    const dynImps = [...withoutMap.matchAll(/import\(["']\.\/([^"']+\.js)["']\)/g)].map((m) => m[1]);
    const uniq = (list) => [...new Set(list)];
    const lookup = (name) => rows.find((r) => r.file === name);

    const interesting = (f) =>
        /calendar|schedule|radar|local-ymd|execution-dashboard|EventForm|visitation/i.test(f);
    console.log('\n=== Host: استيراد ثابت ذو صلة ===');
    const staticUniq = uniq(staticImps);
    for (const f of staticUniq.filter(interesting).sort()) {
        const h = lookup(f);
        console.log(`  ${h ? `${h.rawKb}/${h.gzipKb}` : '?'}  ${f}`);
    }
    console.log(
        `boot-pipeline ثابت: ${staticUniq.some((f) => f.startsWith('execution-dashboard-boot-pipeline-'))}`,
    );
    console.log(
        `persist-pipeline ثابت: ${staticUniq.some((f) => f.startsWith('execution-dashboard-persist-pipeline-'))}`,
    );
    console.log(`عدد الاستيرادات الثابتة كلها: ${staticUniq.length} (معظمها مشترك مع المنزل)`);

    console.log('\n=== Host: import() مؤجَّل ===');
    let dr = 0;
    let dg = 0;
    for (const f of uniq(dynImps).sort()) {
        const h = lookup(f);
        if (!h) {
            console.log(`  missing ${f}`);
            continue;
        }
        dr += h.rawKb;
        dg += h.gzipKb;
        console.log(`  ${h.rawKb}/${h.gzipKb}  ${f}`);
    }
    console.log(`مجموع المؤجَّل من Host: ${+dr.toFixed(1)}/${+dg.toFixed(1)}`);
}

if (main) {
    const mainBody = main.text.replace(/const __vite__mapDeps=[\s\S]*?\);/, '');
    const mainStatic = [
        ...mainBody.matchAll(/(?:from|import)["']\.\/([^"']+\.js)["']/g),
    ].map((m) => m[1]);
    console.log('\n=== MainView: خط أنابيب التنفيذ ===');
    console.log(
        `boot-pipeline ثابت: ${mainStatic.some((f) => f.startsWith('execution-dashboard-boot-pipeline-'))}`,
    );
    console.log(
        `persist-pipeline ثابت: ${mainStatic.some((f) => f.startsWith('execution-dashboard-persist-pipeline-'))}`,
    );
    console.log(`local-ymd ثابت: ${mainStatic.some((f) => f.startsWith('local-ymd-'))}`);
    console.log(
        `schedule-chrome-lite ثابت: ${mainStatic.some((f) => f.startsWith('schedule-chrome-lite-'))}`,
    );
}

if (host) {
    const hostBody = host.text.replace(/const __vite__mapDeps=[\s\S]*?\);/, '');
    const hostStaticAll = [
        ...hostBody.matchAll(/(?:from|import)["']\.\/([^"']+\.js)["']/g),
    ].map((m) => m[1]);
    console.log(
        `\nHost → MainView ثابت: ${hostStaticAll.some((f) => f.startsWith('LawyerDashboardMainView-'))}`,
    );
    console.log(
        `Host → schedule-chrome-lite: ${hostStaticAll.some((f) => f.startsWith('schedule-chrome-lite-'))}`,
    );
    console.log(
        `Host → calendar-cloud-runtime: ${hostStaticAll.some((f) => f.startsWith('calendar-cloud-runtime-'))}`,
    );
    console.log(
        `Host → lawyer-boot-peek-lite: ${hostStaticAll.some((f) => f.startsWith('lawyer-boot-peek-lite-'))}`,
    );
}
