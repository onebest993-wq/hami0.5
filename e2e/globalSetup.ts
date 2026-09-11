/**
 * حارس سريع قبل أي بوابة تعمل على preview.
 *
 * `npm run build` عادي يستبدل `dist/` بحزمة إنتاج بينما
 * `.audit/e2e-dist-stamp.json` يبقى يدّعي E2E — فتفشل كل البوابات بعد دقيقة
 * برسالة «ظهرت بوابة تسجيل الدخول» بلا سبب ظاهر. الفحص هنا يكشفها في ثانية.
 *
 * للتخطي عمداً (سيناريو بوابة دخول مغلقة): `E2E_ALLOW_CLOSED_SHELL=1`.
 */
export default async function globalSetup(): Promise<void> {
    if (process.env.E2E_SKIP_WEBSERVER === '1') return;

    const { distE2eMarkers, sourceFingerprint } = await import('../scripts/e2e-build-env.mjs');

    if (process.env.E2E_ALLOW_CLOSED_SHELL !== '1') {
        const markers = distE2eMarkers();
        if (markers.bootGuard && !markers.demoBoot) {
            throw new Error(
                '[e2e] dist/ ليست حزمة E2E (لا data-hami-demo-boot) — شغّل `npm run build:e2e`. ' +
                    'غالباً استبدلها `npm run build` عادي بعد آخر بناء E2E.',
            );
        }
        if (!markers.bootGuard) return; /* لا dist — مسار dev server */
    }

    /*
     * هل يمثّل هذا الـdist الشجرة التي سنحكم عليها؟
     *
     * وقع هذا فعلاً في ٢٠٢٦-٠٩-١١: أُرجع ملفّا إصلاحٍ إلى التزامٍ أقدم لتجربة A/B،
     * ثمّ بُني dist، ثمّ أُعيد الملفّان بلا إعادة بناء. المواصفتان على ذلك الـdist
     * ٣ ساقطة/٦، وعلى بناءٍ من HEAD ٩/٩ — و`HEAD` لم يكن قد تغيّر، فالالتزام وحده
     * كان سيمرّ. لذلك تُقارن بصمةُ الفرق عن HEAD أيضاً.
     * (.audit/REVIEW_REPORT_2026-09-11.md — F1)
     *
     * وللتخطّي عمداً عند مقارنة بناءٍ قديم قصداً: `E2E_ALLOW_STALE_DIST=1`.
     */
    if (process.env.E2E_ALLOW_STALE_DIST === '1') return;

    const fs = await import('node:fs');
    const path = await import('node:path');
    const stampPath = path.join(process.cwd(), '.audit', 'e2e-dist-stamp.json');
    if (!fs.existsSync(stampPath)) return;

    let stamp: Record<string, unknown>;
    try {
        stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8')) as Record<string, unknown>;
    } catch {
        return;
    }

    /* طابعٌ من قبل إدخال البصمة — لا يُحاكم بما لم يكن يسجّله */
    if (typeof stamp.commit !== 'string' || typeof stamp.worktreeDigest !== 'string') return;

    const now = sourceFingerprint();
    if (stamp.commit === now.commit && stamp.worktreeDigest === now.worktreeDigest) return;

    const why =
        stamp.commit !== now.commit
            ? `الالتزام: بُني من ${String(stamp.commit).slice(0, 8)} والشجرة الآن ${String(now.commit).slice(0, 8)}`
            : 'شجرة العمل: تغيّر مصدرٌ في src/ أو إعدادات البناء بعد آخر بناء';

    throw new Error(
        `[e2e] dist/ لا يمثّل الشجرة الحالية — ${why}.\n` +
            '  شغّل `npm run build:e2e` قبل الحكم على نتيجة، أو `E2E_ALLOW_STALE_DIST=1` إن كان القِدَم مقصوداً.',
    );
}
