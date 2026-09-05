import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const tasksUi = join(root, 'src/app/components/lawyer/dashboard/tasksManager');
const fieldUi = join(root, 'src/app/components/lawyer/dashboard/fieldTasks');

function src(...parts: string[]): string {
    return readFileSync(join(root, ...parts), 'utf8');
}

function collectSourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__') return [];
            return collectSourceFiles(full);
        }
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
}

describe('نظافة قسم المهام — بلا ميت ولا تكرار براميل', () => {
    it('ملفات ودوال ميتة لا تعود', () => {
        expect(existsSync(join(tasksUi, 'nlpAddFeedback.ts'))).toBe(false);
        expect(existsSync(join(tasksUi, '__tests__/nlpAddFeedback.test.ts'))).toBe(false);
        expect(existsSync(join(tasksUi, 'useAgendaNow.ts'))).toBe(false);
        expect(existsSync(join(tasksUi, 'index.ts'))).toBe(false);
        expect(existsSync(join(fieldUi, 'FieldTasksWarmSheetBridge.tsx'))).toBe(false);
        expect(existsSync(join(fieldUi, 'index.ts'))).toBe(false);

        const panels = src('src/app/components/lawyer/dashboard/tasksManager/TaskCardPanels.tsx');
        expect(panels).not.toContain('TaskCardExpensePanel');
        expect(panels).not.toContain('parseAmountInput');

        const utils = src('src/app/components/lawyer/dashboard/tasksManager/utils.ts');
        expect(utils).not.toContain('isWeeklyPastDayCompact');
        expect(utils).not.toContain('parseAmountInput');
        expect(utils).not.toMatch(/^export \{/m);

        const theme = src('src/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme.ts');
        expect(theme).not.toContain('TASKS_INK');
        expect(theme).toContain('export const CURTAIN_GLASS_INNER = TASKS_GLASS_PANEL');
        expect(theme).toContain('TASK_CARD_SLOT_CLASS');

        const curtain = src('src/app/services/tasks/fieldCurtainTasks.ts');
        expect(curtain).not.toContain('listActiveFieldCurtainTasks');
        expect(curtain).not.toContain('countActiveFieldCurtainTasks');
        expect(curtain).not.toContain('countFieldDaySheetTasksLite');
        expect(curtain).toContain('listFieldDaySheetTasks');
    });

    it('ساعة واحدة للأجندة والستارة، بلا تكرار تسخين القرص', () => {
        const controller = src(
            'src/app/components/lawyer/dashboard/tasksManager/useTasksManagerController.tsx',
        );
        expect(controller).toContain('useLiveNow(true)');
        expect(controller).not.toContain('useAgendaNow');
        expect(controller).toContain("from '@/app/utils/localDay'");
        expect(controller).not.toMatch(/from ['"][^'"]*nlpParser['"]/);
        expect(controller).toContain('AgendaTaskCard');
        expect(controller).not.toMatch(/from ['"]\.\/TaskCard['"]/);

        const warm = src('src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts');
        expect(warm).toContain('warmQuantumTasksDiskRead');
        expect(warm).toContain("from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports'");
        expect(warm).not.toContain("from '@/app/utils/quantumTasksStorage'");
    });

    it('لا mutation مصروف بلا واجهة، ولا lucide في سطح المهام', () => {
        const quantum = src('src/app/hooks/useQuantumTasks.ts');
        expect(quantum).not.toContain('addExpense');
        const nested = src('src/app/hooks/useQuantumTaskNestedMutations.ts');
        expect(nested).not.toContain('addExpense');
        const provider = src('src/app/context/QuantumTasksProvider.tsx');
        expect(provider).not.toContain('addExpense');

        const files = [...collectSourceFiles(tasksUi), ...collectSourceFiles(fieldUi)];
        expect(files.length).toBeGreaterThan(20);
        for (const file of files) {
            const text = readFileSync(file, 'utf8');
            expect(text.includes('lucide-react'), `lucide: ${file}`).toBe(false);
        }

        const overlays = src(
            'src/app/components/lawyer/dashboard/tasksManager/TasksManagerOverlays.tsx',
        );
        expect(overlays).not.toContain('[ctrl]');
        expect(overlays).not.toContain('useCallback');
        expect(overlays).toContain('ctrl.dismissEdit');
        expect(overlays).toContain('ctrl.onReminderMoveToDay');
        const dialogHook = src(
            'src/app/components/lawyer/dashboard/tasksManager/useTasksManagerDialogActions.ts',
        );
        expect(dialogHook).toContain('reminderAt: snoozeAfterDays(days)');
    });

    it('موجة 2: لا دوال ميتة ولا شارة مصروف ولا براميل سياق', () => {
        const storage = src('src/app/utils/quantumTasksStorage.ts');
        expect(storage).not.toContain('persistQuantumTasksImmediate');

        const ctx = src('src/app/hooks/useQuantumTasksContext.ts');
        expect(ctx).not.toContain('useQuantumPendingSnapshot');
        expect(ctx).not.toContain('useQuantumTasksSnapshot');
        expect(ctx).not.toContain('getQuantumPendingSnapshot');
        expect(ctx).not.toContain('getQuantumTasksSnapshot');

        const perf = src('src/app/services/fieldTasks/fieldTasksPerfMetrics.ts');
        expect(perf).not.toContain('reportFieldTasksPerfIfDev');
        expect(perf).toContain('reportFieldTasksPerf');

        const hub = src('src/app/runtime/fieldTasksHubLoader.ts');
        expect(hub).not.toContain('isTasksManagerModuleResolved');
        expect(hub).toContain('getCachedTasksManagerOverlay');
        expect(hub).not.toContain("tasksManager/TaskCard");
        const agendaCard = src('src/app/components/lawyer/dashboard/tasksManager/AgendaTaskCard.tsx');
        expect(agendaCard).toContain("from './TaskCard'");
        expect(agendaCard).not.toContain('lazyWithRetry');

        const provider = src('src/app/context/QuantumTasksProvider.tsx');
        expect(provider).not.toMatch(/^export type \{ QuantumTasksContextValue \}/m);
        expect(provider).not.toMatch(/^export \{ QuantumTasksContext \}/m);
        expect(provider).toContain('useQuantumTasksBackgroundFlush');

        const quantum = src('src/app/hooks/useQuantumTasks.ts');
        expect(quantum).not.toContain('export type { RequestTaskHelpParams }');
        expect(quantum).not.toContain('export { MAX_TASK_RAW_LENGTH }');
        expect(quantum).not.toContain('export type AddTaskOptions');
        expect(quantum).not.toContain('export type UseQuantumTasksOptions');

        const utils = src('src/app/components/lawyer/dashboard/tasksManager/utils.ts');
        expect(utils).not.toContain('formatIqd');
        expect(utils).not.toContain('export function snoozedTaskAgendaWeekStart');

        const lite = src('src/app/services/tasks/taskAgendaStatusLite.ts');
        expect(lite).not.toContain('export function getTaskAgendaDay');

        const guard = src('src/app/services/tasks/taskInputGuard.ts');
        expect(guard).not.toContain('export function sanitizeTaskVoiceRef');

        const card = src('src/app/components/lawyer/dashboard/tasksManager/TaskCard.tsx');
        expect(card).not.toContain('expenseSum');
        expect(card).not.toContain('onToggleFieldSub');
        expect(card).not.toContain('embedded');
        expect(card).not.toContain('export type { TaskCardProps }');

        const status = src('src/app/components/lawyer/dashboard/tasksManager/TaskCardStatusRow.tsx');
        expect(status).not.toContain('formatIqd');
        expect(status).not.toContain('expenseSum');
        expect(status).not.toContain('export type TaskCardStatusRowProps');

        const panels = src('src/app/components/lawyer/dashboard/tasksManager/TaskCardPanels.tsx');
        expect(panels).not.toContain('embedded');
        expect(panels).not.toContain('حقيبة المستندات');
        expect(panels).not.toContain('export type TaskCardDocPanelProps');
        expect(panels).not.toContain('taskId: string');

        const sheet = src('src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx');
        expect(sheet).toContain('FieldTasksSheetChrome');
        expect(sheet).not.toContain('function FieldTasksEmptyHint');
        expect(sheet).not.toContain('CURTAIN_SHEET_Z');
    });
});
