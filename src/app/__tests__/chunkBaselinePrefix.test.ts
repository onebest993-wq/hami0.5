/**
 * مفتاحُ `chunk-baseline` ينزع البصمةَ كلَّها — ومنها ما فيه `_` و`-`.
 *
 * **العطلُ الذي يحرسه:** بصمةُ Rollup من أبجدية base64url، وكان المفتاحُ يُنزع بـ`-[a-zA-Z0-9]+\.js$`. فالبصمةُ التي
 * فيها `_` لا تُنزع، والتي فيها `-` تُنزع نصفَها — وفي الحالين يُطبع الملفُّ «(new)» **ويخرج من المقارنة بلا سقوط**.
 * قِيس ٢٠٢٦-٠٩-١٤: ١٢ من ٧٠ صفّاً في خطّ الأساس المحفوظ لا يُطابَق مفتاحُها أبداً.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chunkPrefix } from '../../../scripts/lib/chunkPrefix.mjs';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('chunkPrefix — مفتاحُ مقارنة chunk-baseline', () => {
    it('ينزع بصمةً فيها `_` أو `-` كما ينزع الأبجدية الرقمية، ويُبقي الشرطات في الاسم', () => {
        expect(chunkPrefix('LawyerDashboardExecutionDossierOverlayEntry-CkE5rO_B.js')).toBe(
            'LawyerDashboardExecutionDossierOverlayEntry',
        );
        expect(chunkPrefix('LawyerDashboardExecutionCreateOverlayEntry-DR-CZe1w.js')).toBe(
            'LawyerDashboardExecutionCreateOverlayEntry',
        );
        expect(chunkPrefix('execution-dashboard-scope-7VBOZVc8.js')).toBe('execution-dashboard-scope');
        expect(chunkPrefix('execution-handler-cluster-party-_a-b_c-d.js')).toBe('execution-handler-cluster-party');
    });

    it('كلُّ صفٍّ في خطّ الأساس المحفوظ يُنزع منه البصمةُ كاملةً، والمفاتيحُ لا تتكرّر', () => {
        const baseline = JSON.parse(read('scripts/chunk-baseline.json')) as { rows: Array<{ file: string }> };
        expect(baseline.rows.length).toBeGreaterThan(0);
        const notFullyStripped = baseline.rows
            .map((r) => ({ file: r.file, suffix: r.file.slice(chunkPrefix(r.file).length) }))
            .filter(({ suffix }) => !/^-[A-Za-z0-9_-]{8}\.js$/.test(suffix))
            .map(({ file }) => file);
        expect(notFullyStripped).toEqual([]);
        const keys = baseline.rows.map((r) => chunkPrefix(r.file));
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('البصمةُ في vite.config.mts ما زالت `[hash]` بطولها الافتراضي — وإن تغيّرت فالنمطُ يُراجَع معها', () => {
        expect(read('vite.config.mts')).toContain("chunkFileNames: 'assets/[name]-[hash].js'");
    });

    it('chunk-baseline يستعمل المفتاحَ المشترك لا نسخةً محلّية', () => {
        const src = read('scripts/chunk-baseline.mjs');
        expect(src).toContain("from './lib/chunkPrefix.mjs'");
        expect(src).not.toMatch(/function chunkPrefix|\.replace\(\/-\[/);
    });
});
