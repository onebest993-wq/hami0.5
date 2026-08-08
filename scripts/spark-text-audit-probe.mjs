/**
 * فحص Edge Function spark-text-audit — يقرأ .env محلياً
 * الاستخدام: node scripts/spark-text-audit-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
    const path = resolve(process.cwd(), '.env');
    const raw = readFileSync(path, 'utf8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error('MISSING: VITE_SUPABASE_URL or anon key in .env');
    process.exit(1);
}

const sampleText = `
دعوى مدنية مقامة من المدعي أحمد ضد المدعى عليه محمد
بخصوص مطالبة مالية بمبلغ عشرة ملايين دينار
محكمة البداءة المدنية في بغداد — رقم القضية 120/2026
موعد الجلسة القادمة 2026-08-10 الساعة 10:00
`.trim();

const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/spark-text-audit`;

console.log('Probing:', url);
console.log('Audit enabled flag (client):', env.VITE_SPARK_TEXT_AUDIT_ENABLED ?? '(unset)');

const res = await fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
    },
    body: JSON.stringify({
        text: sampleText,
        fieldType: 'petition',
        caseNo: '120/2026',
        court: 'محكمة البداءة المدنية',
    }),
});

const bodyText = await res.text();
let body;
try {
    body = JSON.parse(bodyText);
} catch {
    body = { raw: bodyText.slice(0, 800) };
}

const report = {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    body,
};

console.log(JSON.stringify(report, null, 2));

if (res.status === 429 || /429|quota|rate/i.test(bodyText)) {
    console.log('\n→ Gemini quota/rate limit — المراجعة عند الطلب ستظهر رسالة تبريد.');
    process.exitCode = 2;
} else if (!res.ok) {
    process.exitCode = 1;
} else {
    process.exitCode = 0;
}
