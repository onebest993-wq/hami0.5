/**
 * Durable full-src line-budget guard.
 * الإرث فوق 1000 سطر مسموح بسقف مثبت — ملف جديد فوق الميزانية أو نمو فوق السقف يسقط.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { expectJsonOrRetired } from './retiredCursorArtifact';

const root = process.cwd();
const SRC_ROOT = path.join(root, 'src');
const BUDGET = 1000;
const TS_EXT = /\.(ts|tsx)$/;

/** أسقف الإرث — لا تُرفع إلا بتقسيم الملف فعلياً */
const ALLOWED_OVER_BUDGET: Record<string, number> = {
    'src/app/components/lawyer/criminal-system/criminalStore.test.ts': 3165,
    'src/app/api/admin/__tests__/headquartersRemoteControl.test.ts': 1911,
    /*
     * ٢٠٢٢ → ٢٠٦٠ → ٢٠٢٢. رُفع بتقسيم، ثم **أُعيد** بتقسيمٍ ثانٍ.
     *
     * رُفع أولاً لأن الملف كان عند سقفه بالضبط بصفر هامش، فلم يسع ٣٢ سطر كود
     * لإصلاحين مُبرهَنين في سلامة البيانات (FINDING-012)؛ واستُخرج معه حاجز الحذف
     * إلى `secureStoreDeleteBarrier.ts`. وقلتُ حينها إن المرشّح الباقي — طابور
     * الكتابة المؤجّلة للتشفير — يحتاج حقن تبعيات في ملف تخزين حرج، وإن ذلك عملٌ
     * بنيويّ لا يُتعجَّل وسط إصلاح.
     *
     * وقد أُنجز الآن بعد دراسته: انتقلت الآلية كاملةً إلى
     * `secureStoreCryptoDeferred.ts`، وتُحقَن تبعياتها الأربع (الكتابة، وفحص
     * المعاملة الذرّية، وبوّابتها، والجدولة) من هنا فلا دورة استيراد. وكانت الآلية
     * تقرأ `import.meta.env.VITEST` بنفسها لتمتنع عن الجدولة، فلم تكن تُختبَر
     * أصلاً — وصار لها الآن أوّل تغطية لها.
     *
     * فعاد السقف إلى قيمته الأصلية بلا هامش زائد: الميزانية تستردّ ما أقرضته.
     */
    'src/app/services/SecureStoreService.ts': 2022,
    'src/app/services/CryptoService.ts': 1019,
    'src/app/runtime/__tests__/forumDockSectionSurgicalCloseHonesty.test.ts': 1377,
    'src/app/security/__tests__/headquartersHeavyAssault.test.ts': 1115,
};

function walkTsFiles(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkTsFiles(abs, out);
        } else if (TS_EXT.test(entry.name)) {
            out.push(abs);
        }
    }
}

function lineCount(absPath: string): number {
    return fs.readFileSync(absPath, 'utf8').split(/\r?\n/).length;
}

function collectOverBudget(): Array<{ path: string; lines: number }> {
    const files: string[] = [];
    walkTsFiles(SRC_ROOT, files);
    return files
        .map((abs) => ({
            path: path.relative(root, abs).replace(/\\/g, '/'),
            lines: lineCount(abs),
        }))
        .filter(({ lines }) => lines > BUDGET)
        .sort((a, b) => b.lines - a.lines);
}

describe('phase-final line budget — full src ≤1000', () => {
    it('لا ملفات جديدة فوق الميزانية ولا نمو فوق سقف الإرث', () => {
        const over = collectOverBudget();
        for (const file of over) {
            const cap = ALLOWED_OVER_BUDGET[file.path];
            expect(cap, `new over-budget file: ${file.path} (${file.lines})`).toEqual(expect.any(Number));
            expect(
                file.lines,
                `${file.path} grew past allowlist cap ${cap} (now ${file.lines})`,
            ).toBeLessThanOrEqual(cap);
        }
    });
});

describe('phase-9 close artifact', () => {
    it('exists and reports closed-honest with empty over1000 scan — or tracker retired', () => {
        expectJsonOrRetired<{
            status: string;
            scan: { srcOver1000: unknown[] };
            verification: { tscApp: number };
        }>('.cursor/phase-9-close.json', (close) => {
            expect(close.status).toBe('closed-honest');
            expect(close.scan.srcOver1000).toEqual([]);
            expect(close.verification.tscApp).toBe(0);
        });
    });
});
