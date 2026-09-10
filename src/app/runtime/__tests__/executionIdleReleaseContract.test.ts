/**
 * عقد تحرير الخامل — أوّل تغطية له، وأوّل وصلٍ له.
 *
 * ثماني وحدات في نطاق التنفيذ تُعرّف دالّة `cleanup*` تُفكّك الحالة العائمة وتُصفّر
 * معرّف الجلسة. **ولم تكن موصولةً بشيء** — لا مستهلك ولا اختبار، فظهرت في
 * `guard:dead-exports` فبدت بقايا. وهي ليست بقايا: `cleanupExecutionWorkspaceWarm`
 * تُفكّك حالة التنفيذ بـ`reason: 'idle-release'`، وتحريرُ الخامل على هاتفٍ **ذاكرةٌ
 * وبطارية** — وهو ما يسمّيه البند ٥ صراحةً. والتوأم `lawsuitWorkspaceWarm` يصل
 * `import.meta.hot.dispose` منذ البداية، وجانب التنفيذ يُعرّف العقد نفسه ولا يصله.
 *
 * فوُصلت الثماني بـ`dispose` الخاصّ بكلٍّ منها، وهنا تُقاس **ماذا تفعل** لا أنها موجودة.
 *
 * ⚠️ **وما لا يُقاس هنا:** `import.meta.hot` غير معرّف تحت `vitest` (لا خادم تطوير)،
 * فكتلة الوصل نفسها **لا تُنفَّذ في اختبار**. المقيس هو الدوالّ التي تنادي، ووجودُ
 * الوصل يُفحص نصّاً في الحالة الأخيرة — وذلك حدٌّ معلَن لا مطويّ.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tearDown = vi.fn();
vi.mock('@/app/services/execution/tearDownExecutionFloatingState', () => ({
    tearDownExecutionFloatingState: (opts: unknown) => {
        tearDown(opts);
    },
}));

/** الدوالّ تستعمل `void import(...).then(...)` فتُرصد بعد تفريغ الطابور الميكروي */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('عقد تحرير الخامل في نطاق التنفيذ', () => {
    beforeEach(() => {
        tearDown.mockClear();
    });

    it.each([
        ['@/app/runtime/executionOpenContract', 'cleanupExecutionOpenContract', 'execution-shell', 'navigate-away'],
        ['@/app/runtime/executionOverlayEntryLoader', 'cleanupExecutionOverlayEntryLoader', 'execution-dashboard', 'reduced-motion'],
        ['@/app/runtime/executionWorkspaceWarm', 'cleanupExecutionWorkspaceWarm', 'execution-shell', 'idle-release'],
        ['@/app/services/executionWarmCoordinator', 'cleanupExecutionWarmCoordinator', 'execution-shell', 'idle-release'],
        ['@/app/utils/executionDomainIsolationGates', 'cleanupExecutionDomainIsolationGates', 'execution-dashboard', 'unmount'],
        ['@/app/utils/executionStateMachineChrono', 'cleanupExecutionStateMachineChrono', 'execution-dashboard', 'tearDown'],
    ])('%s :: %s تُفكّك %s بسبب %s', async (modPath, fnName, surface, reason) => {
        const mod = (await import(modPath)) as Record<string, () => void>;
        mod[fnName]();
        await flush();

        expect(tearDown).toHaveBeenCalledTimes(1);
        expect(tearDown).toHaveBeenCalledWith({ targetSurface: surface, reason });
    });

    /* الاثنتان اللتان لا تُفكّكان — تُصفّران معرّف جلسةٍ داخليّاً */

    it.each([
        ['@/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationSubmit', 'cleanupExecutionCreationSubmit'],
        ['@/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupController', 'cleanupExecutionFollowupController'],
    ])('%s :: %s تُنفَّذ ولا ترمي ولا تُفكّك شيئاً', async (modPath, fnName) => {
        const mod = (await import(modPath)) as Record<string, () => void>;

        expect(() => mod[fnName]()).not.toThrow();
        await flush();
        expect(tearDown).not.toHaveBeenCalled();
    });

    /*
     * فحصٌ نصّيّ — ولا مخرج منه: `import.meta.hot` غير معرّف تحت `vitest`، فلا سبيل
     * إلى تنفيذ كتلة الوصل. والمقيس هنا **أن الوصل قائم** لا أنه يعمل، ولا يُدّعى غير ذلك.
     */
    it('كل وحدة تُعرّف cleanup* تصلها بـ import.meta.hot.dispose', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const root = process.cwd();
        const pairs: Array<[string, string]> = [
            ['src/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationSubmit.ts', 'cleanupExecutionCreationSubmit'],
            ['src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionFollowupController.ts', 'cleanupExecutionFollowupController'],
            ['src/app/runtime/executionOpenContract.ts', 'cleanupExecutionOpenContract'],
            ['src/app/runtime/executionOverlayEntryLoader.ts', 'cleanupExecutionOverlayEntryLoader'],
            ['src/app/runtime/executionWorkspaceWarm.ts', 'cleanupExecutionWorkspaceWarm'],
            ['src/app/services/executionWarmCoordinator.ts', 'cleanupExecutionWarmCoordinator'],
            ['src/app/utils/executionDomainIsolationGates.ts', 'cleanupExecutionDomainIsolationGates'],
            ['src/app/utils/executionStateMachineChrono.ts', 'cleanupExecutionStateMachineChrono'],
        ];

        const unwired = pairs.filter(([rel, fn]) => {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            return !new RegExp(`import\\.meta\\.hot\\.dispose[\\s\\S]{0,120}${fn}\\(\\)`).test(src);
        });

        expect(unwired.map(([rel]) => rel)).toEqual([]);
    });
});
