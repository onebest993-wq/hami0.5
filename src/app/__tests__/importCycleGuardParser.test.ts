/**
 * محلّل حارس الدوائر.
 *
 * الحارس لا يساوي أكثر من محلّله: نسخته الأولى كانت تبتلع
 * `export const X = [...];` ثم تلتقط الـ`from` التالي، فتنسب إعادة تصدير أنواع
 * إلى استيراد قيمة وتخترع حلقة من 54 ملفاً لا وجود لها. هذه الاختبارات تُثبّت
 * التمييزات الثلاثة التي يقوم عليها الرقم كله: النوع مقابل القيمة، والساكن
 * مقابل الديناميكي، وحدود الجملة.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

type ImportKind = 'static' | 'dynamic';

/** يُستخرج من ملف الحارس نفسه حتى لا ينحرف المُختبَر عن المُشغَّل. */
function loadParser(): (src: string) => Map<string, ImportKind> {
    const guardPath = resolve(process.cwd(), 'scripts/guard-import-cycles.mjs');
    const guard = readFileSync(guardPath, 'utf8');
    const start = guard.indexOf('function stripCommentsAndStrings');
    const end = guard.indexOf('const EXTS =');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('guard-import-cycles.mjs: parser block not found — did the script get restructured?');
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return new Function(`${guard.slice(start, end)}; return readValueImports;`)() as (
        src: string,
    ) => Map<string, ImportKind>;
}

const readValueImports = loadParser();
const kindOf = (src: string, spec: string): ImportKind | null => readValueImports(src).get(spec) ?? null;

describe('import cycle guard — value vs type', () => {
    it('ignores a type-only import', () => {
        expect(kindOf(`import type { A } from './a';`, './a')).toBeNull();
    });

    it('ignores a type-only re-export', () => {
        expect(kindOf(`export type { A } from './a';`, './a')).toBeNull();
    });

    it('ignores a braced import where every name is marked type', () => {
        expect(kindOf(`import { type A, type B } from './a';`, './a')).toBeNull();
    });

    it('counts a braced import that mixes a value in', () => {
        expect(kindOf(`import { type A, realValue } from './a';`, './a')).toBe('static');
    });

    it('counts a default import even when a braced type sits beside it', () => {
        expect(kindOf(`import Def, { type A } from './a';`, './a')).toBe('static');
    });

    it('counts a namespace import', () => {
        expect(kindOf(`import * as ns from './a';`, './a')).toBe('static');
    });

    it('counts a bare side-effect import', () => {
        expect(kindOf(`import './a';`, './a')).toBe('static');
    });
});

describe('import cycle guard — static vs dynamic', () => {
    it('marks import() as dynamic, since it defers past module init', () => {
        expect(kindOf(`const f = () => import('./a');`, './a')).toBe('dynamic');
    });

    it('lets a static import win when the same module is also imported dynamically', () => {
        expect(kindOf(`import { a } from './a';\nconst f = () => import('./a');`, './a')).toBe('static');
    });
});

describe('import cycle guard — statement boundaries', () => {
    it('does not let a preceding export statement swallow the next specifier', () => {
        // هذا هو الخلل بعينه: الحلقة الوهمية جاءت من هذا الشكل تحديداً.
        const src = [
            'export const TEMPLATES = [',
            '    ONE,',
            '    TWO,',
            '] as const;',
            '',
            `export type { Closure } from './store';`,
        ].join('\n');
        expect(kindOf(src, './store')).toBeNull();
    });

    it('still sees a real import that follows such a block', () => {
        const src = [
            'export const TEMPLATES = [ONE] as const;',
            '',
            `import { realValue } from './store';`,
        ].join('\n');
        expect(kindOf(src, './store')).toBe('static');
    });

    it('handles a multi-line braced import', () => {
        const src = ['import {', '    a,', '    b,', `} from './a';`].join('\n');
        expect(kindOf(src, './a')).toBe('static');
    });
});

describe('import cycle guard — comments and literals', () => {
    it('ignores an import written inside a line comment', () => {
        expect(kindOf(`// import { a } from './ghost';`, './ghost')).toBeNull();
    });

    it('ignores an import written inside a block comment', () => {
        expect(kindOf(`/*\n import { a } from './ghost';\n*/`, './ghost')).toBeNull();
    });

    it('ignores a specifier that only appears inside a template literal', () => {
        expect(kindOf('const s = `import { a } from "./ghost"`;', './ghost')).toBeNull();
    });
});

describe('import cycle guard — real files in this repo', () => {
    const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

    it('sees no runtime edge where the store is referenced only as a type', () => {
        const src = read('src/app/components/lawyer/criminal-system/investigationDefendantPurge.ts');
        expect(kindOf(src, './criminalStore')).toBeNull();
    });

    it('treats a lazy route loader as a dynamic boundary, not a cycle', () => {
        const src = read('src/app/runtime/executionDashboardLoader.ts');
        expect(kindOf(src, '@/app/components/lawyer/ExecutionDashboard.tsx')).toBe('dynamic');
    });
});
