/**
 * FINDING-024 — تفكيك المستودع كان يستدعي نفسه بلا نهاية.
 *
 * المرحلة السابعة من `tearDownRepoFloatingState` كانت تستدعي الغلاف الكامل
 * `concealRepositoryWarmShell`، وهو وحده — دون كل نظائره — يجدول
 * `tearDownRepoFloatingState` من جديد. والاستدعاء العائد غير متزامن
 * (`import().then`) فلا يُفجّر المكدّس، بل يدور أبداً بنحو ألفَي دورة في
 * الثانية، وكلّ دورة تبدأ بـ`p1BlurAllFocusSurfaces` أي **نزع التركيز من
 * العنصر النشط**. فيصير التطبيق كلّه لا يقبل الكتابة، بلا خطأٍ واحد في السجلّ.
 *
 * الشرط المحروس هنا: التفكيك لا يمسّ المسار الذي يُجدول تفكيكاً آخر.
 * ولأن الحلقة الحقيقية تُجوّع حلقة الأحداث (فتُعلّق العملية بدل أن تفشل)،
 * يُحاكى الغلافُ هنا بحدٍّ أعلى — فيفشل الاختبار سريعاً بدل أن يعلّق.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { REPOSITORY_TEARDOWN_EVENT } from '@/app/services/repository/repositoryCloseEvents';

const hoisted = vi.hoisted(() => ({ reentries: 0 }));

vi.mock('@/app/runtime/repositoryInstantPaint', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        concealRepositoryWarmShellChrome: vi.fn(),
        /** يُحاكي الغلاف الحقيقي: يجدول تفكيكاً آخر — مع حدٍّ يمنع تعليق الاختبار */
        concealRepositoryWarmShell: vi.fn(() => {
            hoisted.reentries += 1;
            if (hoisted.reentries > 3) return;
            void import('@/app/services/repository/tearDownRepoFloatingState').then((m) => {
                m.tearDownRepoFloatingState({ targetSurface: 'repository-hub', reason: 'tearDown' });
            });
        }),
    };
});

const { tearDownRepoFloatingState } = await import(
    '@/app/services/repository/tearDownRepoFloatingState'
);

async function drain(rounds = 40): Promise<void> {
    for (let i = 0; i < rounds; i += 1) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

describe('tearDownRepoFloatingState — لا يستدعي نفسه', () => {
    let teardowns = 0;
    const count = () => {
        teardowns += 1;
    };

    beforeEach(() => {
        teardowns = 0;
        hoisted.reentries = 0;
        window.addEventListener(REPOSITORY_TEARDOWN_EVENT, count);
    });

    afterEach(() => {
        window.removeEventListener(REPOSITORY_TEARDOWN_EVENT, count);
        vi.restoreAllMocks();
    });

    it('لا يمرّ عبر الغلاف الذي يجدول تفكيكاً آخر', async () => {
        tearDownRepoFloatingState();
        await drain();

        expect(hoisted.reentries).toBe(0);
    });

    it('استدعاءٌ واحد يُنتج حدث تفكيكٍ واحداً', async () => {
        tearDownRepoFloatingState();
        await drain();

        expect(teardowns).toBe(1);
    });

    it('لا ينزع التركيز إلا مرّة واحدة عن الحقل النشط', async () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        const blurs = vi.spyOn(input, 'blur');

        tearDownRepoFloatingState();
        await drain();

        expect(blurs.mock.calls.length).toBeLessThanOrEqual(1);
        input.remove();
    });
});
