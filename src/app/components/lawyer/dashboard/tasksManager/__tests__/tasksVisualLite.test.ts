import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const theme = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme.ts'),
    'utf8',
);
const homeCss = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
    'utf8',
);
const sheet = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/FieldTasksBottomSheet.tsx'),
    'utf8',
);
const card = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/TaskCard.tsx'),
    'utf8',
);
const panels = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/TaskCardPanels.tsx'),
    'utf8',
);
const helpModal = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/RequestHelpModal.tsx'),
    'utf8',
);
const helpInbox = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/TaskHelpInboxPanel.tsx'),
    'utf8',
);

describe('field tasks visual lite', () => {
    it('بلاطة المهام: عنوان بلا ظل نص', () => {
        expect(homeCss).toContain("[data-hami-block='dockTasks'] .hami-hub-title-crystal");
        const block = homeCss.slice(homeCss.indexOf("[data-hami-block='dockTasks'] .hami-hub-title-crystal"));
        expect(block).toContain('text-shadow: none');
    });

    it('الستارة بلا ظل نصب ولا تدرجات حوار', () => {
        expect(theme).toContain("shadow-[0_-4px_16px_rgba(0,0,0,0.22)]");
        expect(theme).not.toContain("shadow-[0_-12px_40px_rgba(0,0,0,0.38)]");
        expect(theme).not.toContain('bg-gradient-to-b from-[#1A2238]');
        expect(theme).not.toContain('CURTAIN_TASK_CARD');
        expect(sheet).toContain('hami-field-tasks-layer');
        expect(sheet).toContain('CURTAIN_BACKDROP');
    });

    it('بطاقة المهمة: قائمة خيارات مستقلة وأزرار 44px', () => {
        expect(card).toContain('TaskCardOptionsMenu');
        expect(card).not.toContain('backdrop-blur-sm');
        expect(card).not.toContain('shadow-[0_0_14px_rgba(251,191,36,0.4)]');
        expect(theme).toContain('min-h-[44px]');
        expect(theme).not.toContain('TASK_CARD_PILL_BTN');
    });

    it('إضافة مستند ومصروف: أهداف لمس 44px لا 40', () => {
        expect(panels).toContain('min-h-[44px]');
        expect(panels).not.toContain('min-h-[40px]');
        expect(panels).not.toContain('min-w-[40px]');
        expect(panels).toContain('min-w-[44px]');
        expect(panels).not.toContain('min-h-[36px]');
        const fieldBrief = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/TaskCardFieldBrief.tsx'),
            'utf8',
        );
        expect(fieldBrief).toContain('min-h-[44px]');
        expect(fieldBrief).not.toContain('min-h-[36px]');
        const subs = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/tasksManager/TaskSubTasksCollapsible.tsx',
            ),
            'utf8',
        );
        expect(subs).toContain('min-h-[44px]');
        expect(subs).not.toContain('min-h-[36px]');
        const ring = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/dashboard/tasksManager/TaskRingToggle.tsx'),
            'utf8',
        );
        expect(ring).toContain('min-h-[44px]');
        expect(ring).toContain('min-w-[44px]');
    });

    it('طلب المساعدة والصندوق: Navy/Gold بلا توهج كهرماني', () => {
        expect(helpModal).toContain('TASKS_DIALOG_CONTENT');
        expect(helpModal).toContain('TASKS_BTN_BRONZE');
        expect(helpModal).not.toContain('shadow-[0_2px_10px_rgba(217,119,6,0.35)]');
        expect(helpModal).not.toContain('bg-slate-900');
        expect(helpInbox).toContain('TASKS_DIALOG_CONTENT_WIDE');
        expect(helpInbox).not.toContain('bg-slate-900');
        expect(helpInbox).not.toContain('bg-amber-600');
    });

    it('أرشيف المهام المنتهية: Navy بلا slate', () => {
        const archive = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/tasksManager/CompletedTasksArchiveSection.tsx',
            ),
            'utf8',
        );
        expect(archive).toContain('TASKS_DIALOG_BTN_CANCEL');
        expect(archive).toContain('تراجع عن الإنهاء');
        expect(archive).not.toContain('bg-slate-900');
    });

    it('طلب مساعدة من قائمة البطاقة، ستارة بساعة حية، وأزرار تذكير 44px', () => {
        const menu = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/tasksManager/TaskCardOptionsMenu.tsx',
            ),
            'utf8',
        );
        expect(menu).toContain('طلب مساعدة');
        expect(menu).toContain('onRequestHelp');
        expect(sheet).toContain('useLiveNow');
        expect(sheet).toContain('لا مهام ميدانية ظاهرة الآن');
        const modals = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/tasksManager/TasksManagerModals.tsx',
            ),
            'utf8',
        );
        expect(modals).toContain('min-h-[44px]');
    });
});
