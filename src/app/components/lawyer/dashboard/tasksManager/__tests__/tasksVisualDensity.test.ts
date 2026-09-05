import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tasksRoot = path.join(root, 'src/app/components/lawyer/dashboard');

function read(rel: string): string {
    return fs.readFileSync(path.join(tasksRoot, rel), 'utf8');
}

function lineCount(rel: string): number {
    return read(rel).split(/\r?\n/).length;
}

describe('كثافة سطح المهام — خفيف احترافي', () => {
    it('الثيم مضغوط: xl لا 2xl، لمس 44px، بلا ظل ستارة وبلا 48px', () => {
        const theme = read('tasksManager/tasksBoucleTheme.ts');
        expect(theme).toContain('rounded-xl border border-white/[0.07] bg-white/[0.02]');
        expect(theme).toContain('min-h-[44px]');
        expect(theme).toContain('px-3 py-2 flex items-center');
        expect(theme).toContain('px-3 py-3 pb-12');
        expect(theme).toContain('space-y-2');
        expect(theme).toContain('rounded-t-[20px]');
        expect(theme).not.toContain('min-h-[48px]');
        expect(theme).not.toContain('rounded-2xl');
        expect(theme).not.toContain('px-4 py-5 pb-16');
        expect(theme).not.toContain('space-y-6');
        expect(theme).not.toContain('shadow-[');
        expect(theme).not.toContain('backdrop-blur');
        expect(theme).not.toContain('CURTAIN_PIN_BADGE');
        expect(theme).not.toContain('CURTAIN_TASK_CARD');
    });

    it('البطاقة والأجندة مقسومة بلا شريط تدرج ولا نبض ميت', () => {
        const card = read('tasksManager/TaskCard.tsx');
        expect(card).toContain('TaskCardToolRow');
        expect(card).toContain('TaskCardStatusRow');
        expect(card).toContain('[contain-intrinsic-size:auto_7rem]');
        expect(card).toContain('p-2.5 text-right space-y-1.5');
        expect(card).not.toContain('bg-gradient-to-b');
        expect(card).not.toContain('taskListStripeToneClass');
        expect(card).not.toContain('backdrop-blur');
        expect(card).not.toContain('animate-pulse');
        expect(card).not.toContain('fatalPulse');
        expect(lineCount('tasksManager/TaskCard.tsx')).toBeLessThan(250);
        expect(lineCount('tasksManager/TaskCardStatusRow.tsx')).toBeLessThan(210);
        expect(lineCount('tasksManager/TaskCardToolRow.tsx')).toBeLessThan(140);
        expect(card).toContain('useTaskCardChrome');
        expect(card).toContain("import('./TaskVoicePlayback')");
        expect(card).not.toMatch(/import \{ TaskVoicePlayback \} from/);

        const brief = read('tasksManager/TaskCardMainBrief.tsx');
        expect(brief).not.toContain('TASKS_INNER_GLASS');
        expect(brief).toContain('text-[13px] font-semibold');

        const header = read('tasksManager/TasksManagerHeader.tsx');
        expect(header).toContain('text-base truncate');
        expect(header).not.toContain('الأسبوع الحالي');
        expect(header).not.toContain('text-lg');

        const week = read('tasksManager/WeeklyAgendaSection.tsx');
        expect(week).toContain('space-y-2');
        expect(week).not.toContain('deferredLists');
        expect(week).not.toContain('TASK_CARD_SLOT_CLASS');
        expect(week).toContain('isAgendaDayPast');
        expect(week).not.toContain('fatalPulse');
        expect(week).toContain('إنشاء خطة');
        expect(week).toContain('TaskPlanChainDraftEditor');
        expect(week).toContain('tasks-week-plan-');
        expect(week).toContain('withPlan: true');
        expect(week).toContain('commitSave');
        expect(week).toContain('type="submit"');
        expect(week).toContain('min-w-0 overflow-x-hidden');
        expect(week).toContain('tasks-week-add-chips');
        expect(week).toContain('tasks-week-chip-details');
        expect(week).toContain('tasks-week-chip-location');
        expect(week).toContain('tasks-week-chip-step');
        expect(week).toContain('detailsOpen');
        expect(week).toContain('locationOpen');
        expect(week).not.toContain('الحفظ يتطلب تفاصيل وموقعاً');

        const planChain = read('tasksManager/TaskPlanChain.tsx');
        expect(planChain).toContain('tasks-plan-chain-draft');
        expect(planChain).toContain('flex-wrap');
        expect(planChain).toContain('flex-row-reverse');
        expect(planChain).toContain('PlanThread');
        expect(planChain).toContain('tasks-plan-chain-add');
        expect(planChain).toContain('سلسلة الخطة');
        expect(planChain).not.toContain('overflow-x-auto');
        expect(planChain).not.toContain('bg-black/30');

        const agendaCard = read('tasksManager/AgendaTaskCard.tsx');
        expect(agendaCard).toContain("from './TaskCard'");
        expect(agendaCard).not.toContain('lazyWithRetry');
        expect(agendaCard).toContain('TASK_CARD_SLOT_CLASS');

        const distant = read('tasksManager/DistantTasksSection.tsx');
        expect(distant).toContain('rounded-xl border border-dashed');
        expect(distant).not.toContain('rounded-2xl');
        expect(distant).not.toContain('px-5 py-6');
        expect(distant).not.toContain('fatalPulse');
    });

    it('الستارة والقشرة الفورية وأندرويد بلا ظل إسقاط ونسختان من نفس الثوابت', () => {
        const curtain = read('fieldTasks/FieldCurtainTaskCard.tsx');
        expect(curtain).toContain('px-2.5 py-2');
        expect(curtain).not.toContain('CURTAIN_PIN_BADGE');
        expect(curtain).not.toContain('PanelBottom');

        const fatal = read('tasksManager/FatalDeadlinesSection.tsx');
        expect(fatal).not.toContain('shadow-[0_0_8px');
        expect(fatal).toContain('size-1.5');

        const chrome = read('tasksManager/TasksManagerOpenInstantChrome.tsx');
        expect(chrome).toContain('TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS');
        expect(chrome).toContain('TASKS_MANAGER_INSTANT_BONE_CLASS');
        expect(chrome).not.toContain('الأسبوع الحالي');
        expect(chrome).not.toContain('rounded-2xl');

        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/tasksManagerInstantPaint.ts'),
            'utf8',
        );
        expect(paint).toContain('buildTasksManagerInstantChromeInnerHtml');
        expect(paint).toContain('TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS');
        expect(paint).not.toContain('h-16 rounded-2xl');

        const markup = fs.readFileSync(
            path.join(root, 'src/app/runtime/tasksManagerInstantChromeMarkup.ts'),
            'utf8',
        );
        expect(markup).toContain('h-12 rounded-xl');
        expect(markup).toContain('TASKS_MANAGER_INSTANT_BONE_STYLE_ATTR');
        expect(markup).toContain('listTasksManagerInstantPeekTitles');
        expect(markup).toContain('HAMI_OVERLAY_SAFE_INSETS_CLASS');

        const android = read('lawyerHomeFx-android.css');
        expect(android).toContain("data-testid^='tasks-task-card-'");
        expect(android).toContain('box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04)');
        expect(android).not.toContain('0 2px 6px rgba(0, 0, 0, 0.32)');
        expect(android).not.toContain('0 2px 6px rgba(0, 0, 0, 0.35)');

        const fieldCss = read('fieldTasks/fieldTasksChrome.css');
        expect(fieldCss).toContain('contain-intrinsic-size: auto 6.5rem');

        const archive = read('tasksManager/CompletedTasksArchiveSection.tsx');
        expect(archive).not.toContain('rounded-2xl');
        expect(archive).toContain('space-y-3');
    });

    it('حوارات الأجندة مؤجّلة والستارة بلا dialog بدائي', () => {
        const manager = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/TasksManager.tsx'),
            'utf8',
        );
        expect(manager).toContain('TasksManagerOverlays');
        expect(manager).toContain('LazyCompletedTasksArchiveSection');
        expect(manager).toContain('blurFocusWithin');
        expect(manager).not.toContain('aria-hidden={ctrl.nestedModalOpen');
        const overlays = read('tasksManager/TasksManagerOverlays.tsx');
        expect(overlays).toContain('LazyTasksManagerModals');
        const sheet = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
            'utf8',
        );
        expect(sheet).toContain('FieldTasksFatalDialog');
        expect(sheet).not.toContain("from '@/app/components/ui/dialog'");
        expect(sheet).toContain('FieldTasksSheetChrome');
        expect(read('fieldTasks/FieldTasksSheetChrome.tsx')).toContain('py-8 px-3');
        expect(fs.existsSync(path.join(tasksRoot, 'fieldTasks/FieldTasksFatalDialog.tsx'))).toBe(true);
    });
});
