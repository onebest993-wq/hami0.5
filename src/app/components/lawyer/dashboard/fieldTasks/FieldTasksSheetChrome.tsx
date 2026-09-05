import { memo, useMemo } from 'react';
import { X } from '@/app/components/ui/icons/X';
import type { LegalTask } from '@/app/types/TaskEngine';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { buildLinkedCaseLookup } from '@/app/workspace/resolveLinkedCaseMeta';
import {
    CURTAIN_CLOSE_BTN,
    CURTAIN_GLASS_INNER,
    CURTAIN_HEADER_ROW,
    TASKS_BRONZE_LINE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { FieldCurtainTaskCard } from '@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainTaskCard';
import { useLiveNow } from '@/app/components/lawyer/dashboard/fieldTasks/useLiveNow';

export const FIELD_TASKS_SCROLLER_CLASS =
    'hami-field-tasks-scroller flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 min-h-0 relative z-[1]';

export const FieldTasksEmptyHint = memo(function FieldTasksEmptyHint() {
    return (
        <div
            className={`${CURTAIN_GLASS_INNER} flex flex-col items-center py-8 px-3 text-center`}
            data-testid="field-tasks-empty"
            role="status"
        >
            <p className="text-[#F4F4F5]/55 text-sm font-medium leading-relaxed max-w-xs">
                لا مهام ميدانية ظاهرة الآن. أضف مهمة من مدير المهام، أو ثبّتها على الستارة، أو اجعل موعدها اليوم أو متأخراً ضمن الأسبوع.
            </p>
            <div className={`mt-4 w-20 ${TASKS_BRONZE_LINE}`} />
        </div>
    );
});

export const FieldTasksSheetHeader = memo(function FieldTasksSheetHeader({
    count = 0,
    closeTabIndex,
    onClose,
}: {
    count?: number;
    closeTabIndex: number;
    onClose: () => void;
}) {
    return (
        <div className={CURTAIN_HEADER_ROW}>
            <div className="min-w-0 text-right">
                <h2 id="field-tasks-sheet-title" className="text-[#F4F4F5] font-semibold text-base truncate">
                    مهام اليوم الميدانية
                </h2>
                {count > 0 ? (
                    <p className="text-[11px] text-white/45 font-medium">{count} مهمة</p>
                ) : null}
            </div>
            <button
                type="button"
                onClick={onClose}
                data-testid="field-tasks-close"
                tabIndex={closeTabIndex}
                className={CURTAIN_CLOSE_BTN}
                aria-label="إغلاق مهام اليوم الميدانية"
            >
                <X size={20} />
            </button>
        </div>
    );
});

type FieldTasksSheetOpenBodyProps = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleSubComplete: (parentId: string, subId: string) => void;
    layerVisible: boolean;
    onClose: () => void;
};

/** يُبقى مُركَّباً أثناء keep-alive حتى يكشف الطلاء الفوري البطاقات الحقيقية لا الهيكل العظمي */
export const FieldTasksSheetOpenBody = memo(function FieldTasksSheetOpenBody({
    lawsuitFiles,
    executionFiles,
    onCompleteRequest,
    onReopenTask,
    onToggleSubComplete,
    layerVisible,
    onClose,
}: FieldTasksSheetOpenBodyProps) {
    const { pendingTasks } = useQuantumTasksData();
    const now = useLiveNow(true);
    const curtainTasks = useMemo(
        () => listFieldDaySheetTasks(pendingTasks, now),
        [pendingTasks, now],
    );
    const pinLookup = useMemo(
        () => buildLinkedCaseLookup(lawsuitFiles, executionFiles),
        [lawsuitFiles, executionFiles],
    );

    return (
        <>
            <FieldTasksSheetHeader
                count={curtainTasks.length}
                closeTabIndex={layerVisible ? 0 : -1}
                onClose={onClose}
            />
            <div dir="rtl" className={FIELD_TASKS_SCROLLER_CLASS}>
                {curtainTasks.length === 0 ? (
                    <FieldTasksEmptyHint />
                ) : (
                    <ul className="space-y-2">
                        {curtainTasks.map((task, i) => (
                            <FieldCurtainTaskCard
                                key={task.id}
                                task={task}
                                listOrdinal={{ index: i, total: curtainTasks.length }}
                                now={now}
                                pinLookup={pinLookup}
                                onCompleteRequest={onCompleteRequest}
                                onReopenTask={onReopenTask}
                                onToggleSubComplete={onToggleSubComplete}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
});
