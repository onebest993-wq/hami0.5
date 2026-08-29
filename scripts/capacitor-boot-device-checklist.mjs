#!/usr/bin/env node
/**
 * قائمة تحقق إقلاع Capacitor على جهاز حقيقي / محاكي.
 * يقرأ تقرير JS من sessionStorage بعد فتح التطبيق.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checklist = `
# قائمة تحقق إقلاع Hami — Android Studio

## قبل التشغيل
1. npm run cap:build:android
2. Uninstall التطبيق من المحاكي/الجهاز (cold start نظيف)
3. Run من Android Studio

## ما يجب أن تراه (مسار سعيد)
- [ ] شاشة واحدة: navy + «حامي» (splash أصلي)
- [ ] انتقال مباشر للوحة المحامي — **بدون** شعار HTML ثانٍ
- [ ] بطاقة Hub بلا مطّ/تكبير للتبويبات
- [ ] data-hub-boot-settling=0 على البطاقة بعد ~2–4 ث

## قراءة المقاييس من WebView (Chrome inspect)
افتح chrome://inspect → التطبيق → Console:

\`\`\`js
JSON.stringify(window.__hamiNativeBootReport ?? 'missing', null, 2)
\`\`\`

أو:

\`\`\`js
JSON.parse(sessionStorage.getItem('hami:native-boot-report:v1') || 'null')
\`\`\`

## عتبات مقبولة (cold start — شبكة عادية)
| المقياس | هدف |
|---|---|
| ttfiMs | < 1200 ms |
| firstTabOpenMs | < 3500 ms |
| hubBootSettling | '0' |
| timeline.hub-boot-stable | موجود |

## إضبارة التنفيذ (بعد فتح مخزن التنفيذ)
- [ ] لوحة المفاتيح لا تغطي حقول الملاحظات / الموعد / المتابعة
- [ ] أزرار الفلاتر والإغلاق ≥ 44px
- [ ] الحواف الآمنة (status bar / home indicator) لا تقطع الهيدر
- [ ] إن وُجد فهرس محجور متعدد الحسابات: الإعدادات → البيانات → استيراد

## إن فشل
- تحقق من Supabase keys في .env.production.local
- Logcat: ابحث عن WebView / Capacitor errors
- أعد cap:build بعد أي تغيير في src/
`;

const outPath = path.join(root, '.audit', 'CAPACITOR_BOOT_DEVICE_CHECKLIST.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${checklist.trim()}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
console.log(checklist);
