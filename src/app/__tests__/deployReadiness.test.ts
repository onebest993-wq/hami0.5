/**
 * حُكمُ جاهزية النشر — كلُّ شرطٍ يُسقط الحكمَ وحده.
 *
 * **العطلُ الذي يحرسه:** الإنتاجُ بُني من شجرةٍ لم تُلتزم ولم يمرّ على CI (الموجز §١٣·١). فالحكمُ يشترط: الرأسُ هو
 * `origin/main` · الشجرةُ نظيفةٌ تماماً · وكلُّ سيرِ CI على الرأس `success`.
 */
import { describe, expect, it } from 'vitest';
import { evaluateDeployReadiness } from '../../../scripts/lib/deployReadiness.mjs';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const GREEN = [
    { name: 'Quality Gate', status: 'completed', conclusion: 'success' },
    { name: 'Execution Gate', status: 'completed', conclusion: 'success' },
];

function facts(overrides: Record<string, unknown> = {}) {
    return { headSha: SHA, originMainSha: SHA, statusEntries: [] as string[], workflowRuns: GREEN, ...overrides };
}

describe('evaluateDeployReadiness', () => {
    it('ضابطة: main بعينه، شجرةٌ نظيفة، وCI أخضر ← جاهز', () => {
        expect(evaluateDeployReadiness(facts())).toEqual({ ready: true, reasons: [] });
    });

    it('رأسٌ ليس origin/main ← لا يُنشر', () => {
        const v = evaluateDeployReadiness(facts({ originMainSha: OTHER }));
        expect(v.ready).toBe(false);
        expect(v.reasons.join('\n')).toContain('ليس origin/main');
    });

    it('origin/main مجهول ← لا يُنشر', () => {
        expect(evaluateDeployReadiness(facts({ originMainSha: null })).ready).toBe(false);
    });

    it('أيُّ مدخلٍ في git status يُسقط — المعدَّلُ والغريبُ سواء، بلا قائمة استثناء', () => {
        for (const entry of [' M src/app/x.tsx', '?? public/extra.js', ' M .audit/e2e-dist-stamp.json', '?? .claude/settings.local.json']) {
            const v = evaluateDeployReadiness(facts({ statusEntries: [entry] }));
            expect(v.ready, entry).toBe(false);
            expect(v.reasons.join('\n')).toContain('غيرُ نظيفة');
        }
    });

    it('CI: غيابُ Quality Gate · سيرٌ ساقط · سيرٌ جارٍ · تعذّرُ القراءة — كلٌّ يُسقط وحده', () => {
        expect(evaluateDeployReadiness(facts({ workflowRuns: [GREEN[1]] })).ready).toBe(false);
        expect(
            evaluateDeployReadiness(
                facts({ workflowRuns: [GREEN[0], { name: 'Execution Gate', status: 'completed', conclusion: 'failure' }] }),
            ).ready,
        ).toBe(false);
        expect(
            evaluateDeployReadiness(facts({ workflowRuns: [{ name: 'Quality Gate', status: 'in_progress', conclusion: null }] }))
                .ready,
        ).toBe(false);
        expect(evaluateDeployReadiness(facts({ workflowRuns: null })).ready).toBe(false);
    });
});
