/**
 * أصول pdf.js تُقدَّم من أصل التطبيق حصراً.
 *
 * كان الإنتاج يجلب `pdf.worker` من cdn.jsdelivr.net افتراضياً: شيفرة طرف ثالث
 * تُنفَّذ داخل أصلنا وتمرّ عليها مستندات الموكّلين، بلا SRI (وهي غير ممكنة على
 * العمّال أصلاً). أي اختراق للـCDN أو اختطاف DNS يعني تنفيذاً عن بُعد فوق
 * إضابير محامٍ. الملفات محلية ولا تُجلب إلا عند فتح PDF، فالمقابل معدوم.
 */

/** يُشحن standard_fonts إلا إذا استُثني صراحةً لتصغير حجم النشر */
function shipsStandardFonts(): boolean {
    return import.meta.env.VITE_PDF_MINIMAL_ASSETS !== 'true';
}

/**
 * خرائط CJK (~1.1MB) تُحذف من نشر أندرويد المصغّر.
 * PDF عربي بخط مضمّن يبقى صالحاً؛ مستند CID صيني/ياباني قد يفقد خريطة الحروف.
 */

export function resolvePdfJsWorkerUrl(): string {
    return '/pdfjs-assets/pdf.worker.min.mjs';
}

export function resolvePdfCmapUrl(): string {
    return '/pdfjs-assets/cmaps/';
}

export function resolvePdfStandardFontUrl(): string | undefined {
    return shipsStandardFonts() ? '/pdfjs-assets/standard_fonts/' : undefined;
}
