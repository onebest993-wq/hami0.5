#!/usr/bin/env node
/**
 * بوابة تكامل الأقسام المغلقة (dashboard header/dock/home).
 * تشغّل gate:* لكل قسم وتُخرج مصفوفة صادقة.
 *
 * Usage:
 *   npm run gate:closed-sections
 */
import { spawnSync } from 'node:child_process';

const sections = [
    { id: 'settings', label: 'الإعدادات', script: 'gate:settings' },
    { id: 'notifications', label: 'الإشعارات', script: 'gate:notifications' },
    { id: 'global-search', label: 'البحث', script: 'gate:global-search' },
    { id: 'tasks', label: 'المهام', script: 'gate:tasks' },
    { id: 'calendar', label: 'التقويم', script: 'gate:calendar' },
    { id: 'repository', label: 'المستودع', script: 'gate:repository' },
    { id: 'forum', label: 'المنتدى', script: 'gate:forum' },
    { id: 'homeHub', label: 'التنبيهات/التثبيت', script: 'gate:homeHub' },
    { id: 'profile', label: 'الملف المهني', script: 'gate:profile' },
];

console.log('=== Closed dashboard sections — integrity gate ===\n');

const results = [];

for (const section of sections) {
    console.log(`\n--- ${section.label} (${section.script}) ---\n`);
    const started = Date.now();
    const result = spawnSync('npm', ['run', section.script], {
        stdio: 'inherit',
        shell: true,
    });
    const ms = Date.now() - started;
    const passed = result.status === 0;
    results.push({ ...section, passed, ms });
}

console.log('\n\n=== Integrity matrix (unit gates) ===\n');
console.log('| القسم | البوابة | النتيجة | المدة |');
console.log('|------|---------|---------|-------|');
for (const r of results) {
    const status = r.passed ? 'PASSED' : 'FAILED';
    console.log(`| ${r.label} | ${r.script} | ${status} | ${(r.ms / 1000).toFixed(1)}s |`);
}

const failed = results.filter((r) => !r.passed);
const passed = results.filter((r) => r.passed);

console.log(`\n${passed.length}/${results.length} sections passed unit gates.`);

if (failed.length > 0) {
    console.error('\nFailed:', failed.map((f) => f.label).join(', '));
    console.error('\n=== Gate result ===\nFAILED');
    process.exit(1);
}

console.log('\nملاحظة: هذه البوابة = unit/honesty فقط. E2E عبر release:check:* لكل قسم.');
console.log('\n=== Gate result ===\nPASSED');
process.exit(0);
