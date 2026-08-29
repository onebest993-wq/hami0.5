#!/usr/bin/env node
/**
 * قائمة soak ميداني لقسم الدعاوى — يُشغَّل على جهاز حقيقي بعد worldclass engineering.
 *
 *   DEVICE_SOAK_URL=http://192.168.1.5:4173 npm run soak:lawsuits-device
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DEVICE_SOAK_URL ?? process.argv.find((a) => a.startsWith('--url='))?.split('=')[1];

console.log(`
=== Lawsuits device soak checklist ===

1. بناء preview على LAN:
   npm run build:e2e && npx vite preview --host 0.0.0.0 --port 4173

2. على Pixel/iPad — افتح: ${url ?? 'http://<host-ip>:4173'}

3. تحقق يدوي:
   [ ] أرشيف دعاوى → فتح إضبارة < 5s (شبكة 4G)
   [ ] إنشاء دعوى مدنية جديدة + حفظ
   [ ] إضبارة جنائية من تبويب جزائي
   [ ] إغلاق/رجوع بدون تعليق UI
   [ ] بعد 30 دقيقة استخدام — لا crash / لا بطء شديد

4. قياس TTFI من المضيف (اختياري):
`);

if (url) {
    console.log(`Running TTFI probe against ${url} …\n`);
    const result = spawnSync(
        'node',
        [
            'scripts/lawsuits-dossier-ttfi-probe.mjs',
            `--url=${url}`,
            '--device=iphone14',
            '--throttle=slow-mobile',
            '--samples=5',
        ],
        { stdio: 'inherit', shell: true, cwd: ROOT },
    );
    process.exit(result.status ?? 0);
}

console.log('Set DEVICE_SOAK_URL or pass --url= for automated TTFI sample.\n');
