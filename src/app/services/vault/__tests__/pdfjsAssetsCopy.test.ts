import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const copyMod = await import(
    pathToFileURL(path.join(process.cwd(), 'scripts/pdfjs-assets-copy.mjs')).href
);

const { copyPdfjsCmaps, PDFJS_MINIMAL_CMAP_FILES } = copyMod as {
    copyPdfjsCmaps: (src: string, dest: string, opts?: { minimal?: boolean }) => void;
    PDFJS_MINIMAL_CMAP_FILES: string[];
};

describe('copyPdfjsCmaps', () => {
    const tmpDirs: string[] = [];

    afterEach(() => {
        for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
        tmpDirs.length = 0;
    });

    function makeSrc(): string {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hami-cmaps-'));
        tmpDirs.push(dir);
        fs.writeFileSync(path.join(dir, 'H.bcmap'), 'h');
        fs.writeFileSync(path.join(dir, 'V.bcmap'), 'v');
        fs.writeFileSync(path.join(dir, 'LICENSE'), 'lic');
        fs.writeFileSync(path.join(dir, 'UniJIS-UCS2-H.bcmap'), 'cjk');
        fs.writeFileSync(path.join(dir, 'Adobe-GB1-0.bcmap'), 'gb');
        return dir;
    }

    it('المصغّر ينسخ النواة فقط بلا CJK', () => {
        const src = makeSrc();
        const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'hami-cmaps-out-'));
        tmpDirs.push(dest);
        copyPdfjsCmaps(src, dest, { minimal: true });
        const names = fs.readdirSync(dest).sort();
        expect(names).toEqual([...PDFJS_MINIMAL_CMAP_FILES].sort());
        expect(names).not.toContain('UniJIS-UCS2-H.bcmap');
    });

    it('vite ينسخ الخرائط عبر المساعد لا نسخ المجلد كاملاً في المصغّر', () => {
        const vite = fs.readFileSync(path.join(process.cwd(), 'vite.config.mts'), 'utf8');
        expect(vite).toContain('copyPdfjsCmaps');
        expect(vite).toContain('copyPdfjsStandardFonts');
        expect(vite).not.toMatch(/fs\.cpSync\(cmapsDir/);
    });

    it('الكامل ينسخ كل الملفات', () => {
        const src = makeSrc();
        const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'hami-cmaps-out-'));
        tmpDirs.push(dest);
        copyPdfjsCmaps(src, dest, { minimal: false });
        expect(fs.readdirSync(dest)).toContain('UniJIS-UCS2-H.bcmap');
        expect(fs.readdirSync(dest)).toContain('H.bcmap');
    });
});
