/**
 * نسخ أصول pdf.js إلى dist.
 * الوضع المصغّر (أندرويد): بلا standard_fonts وبلا خرائط CJK (~1.1MB).
 * المستندات العربية عادةً تضمّ الخط؛ الخرائط تُطلب لخطوط CID شرق-آسيوية.
 */
import fs from 'node:fs';
import path from 'node:path';

/** الترميز الأفقي/العمودي الافتراضي + الرخصة — لا UniJIS/GB/CNS/KS */
export const PDFJS_MINIMAL_CMAP_FILES = ['H.bcmap', 'V.bcmap', 'LICENSE'];

export function copyPdfjsCmaps(srcDir, destDir, { minimal = false } = {}) {
    fs.mkdirSync(destDir, { recursive: true });
    if (!minimal) {
        fs.cpSync(srcDir, destDir, { recursive: true });
        return;
    }
    for (const name of PDFJS_MINIMAL_CMAP_FILES) {
        const from = path.join(srcDir, name);
        if (!fs.existsSync(from)) continue;
        fs.copyFileSync(from, path.join(destDir, name));
    }
}

export function copyPdfjsStandardFonts(srcDir, destDir, { minimal = false } = {}) {
    if (minimal) return;
    if (!fs.existsSync(srcDir)) return;
    fs.cpSync(srcDir, destDir, { recursive: true });
}
