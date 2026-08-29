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
    if (process.env.E2E_ALLOW_CLOSED_SHELL === '1') return;

    const { distE2eMarkers } = await import('../scripts/e2e-build-env.mjs');
    const markers = distE2eMarkers();
    if (!markers.bootGuard) return; /* لا dist — مسار dev server */
    if (markers.demoBoot) return;

    throw new Error(
        '[e2e] dist/ ليست حزمة E2E (لا data-hami-demo-boot) — شغّل `npm run build:e2e`. ' +
            'غالباً استبدلها `npm run build` عادي بعد آخر بناء E2E.',
    );
}
