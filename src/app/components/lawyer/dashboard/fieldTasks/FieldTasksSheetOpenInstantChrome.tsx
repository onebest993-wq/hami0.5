import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { FIELD_TASKS_INSTANT_CHROME_ID } from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { isFieldTasksCloseSuppressed } from '@/app/runtime/fieldTasksInstantPaint';
import {
    requestFieldTasksInstantComplete,
    requestFieldTasksInstantManage,
} from '@/app/runtime/fieldTasksInstantActions';
import { getPendingFieldTasksCountSnapshot, getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { listFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { FIELD_TASKS_CURTAIN_PEEK_READY_EVENT } from '@/app/utils/quantumTasksCurtainPeek';
import {
    FIELD_TASKS_INSTANT_BACKDROP_CLASS,
    FIELD_TASKS_INSTANT_BONE_CLASS,
    FIELD_TASKS_INSTANT_BONE_COUNT,
    FIELD_TASKS_INSTANT_CARD_CLASS,
    FIELD_TASKS_INSTANT_CARD_FATAL_CLASS,
    FIELD_TASKS_INSTANT_CLOSE_CLASS,
    FIELD_TASKS_INSTANT_COMPLETE_CLASS,
    FIELD_TASKS_INSTANT_COUNT_CLASS,
    FIELD_TASKS_INSTANT_EMPTY_CLASS,
    FIELD_TASKS_INSTANT_FOOTER_CLASS,
    FIELD_TASKS_INSTANT_HANDLE_CLASS,
    FIELD_TASKS_INSTANT_HANDLE_WRAP_CLASS,
    FIELD_TASKS_INSTANT_HEADER_CLASS,
    FIELD_TASKS_INSTANT_LAYER_CLASS,
    FIELD_TASKS_INSTANT_LOCATION_CLASS,
    FIELD_TASKS_INSTANT_MANAGE_CLASS,
    FIELD_TASKS_INSTANT_SCROLLER_CLASS,
    FIELD_TASKS_INSTANT_SHEET_CLASS,
    FIELD_TASKS_INSTANT_TASK_TITLE_CLASS,
    FIELD_TASKS_INSTANT_TITLE_CLASS,
} from '@/app/runtime/fieldTasksInstantChromeMarkup';

function handleInstantDismiss(run: () => void): void {
    if (isFieldTasksCloseSuppressed()) return;
    run();
}

function handleInstantAction(run: () => void): void {
    run();
}

/** قشرة الستارة أثناء انتظار مقطع Entry — بطاقات مطابقة + إنهاء/إدارة تُصفَّان حتى يلحق React */
export function FieldTasksSheetOpenInstantChrome({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement | null {
    const [peekTick, setPeekTick] = useState(0);
    useEffect(() => {
        const onReady = () => setPeekTick((n) => n + 1);
        window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
        return () => window.removeEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
    }, []);
    const curtain = useMemo(
        () => listFieldDaySheetTasks(getQuantumPendingSnapshot(), new Date()),
        [peekTick],
    );
    const waitingForPeek = curtain.length === 0 && getPendingFieldTasksCountSnapshot() > 0;

    if (typeof document === 'undefined') return null;
    if (document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID)) return null;

    return createPortal(
        <div
            className={FIELD_TASKS_INSTANT_LAYER_CLASS}
            data-testid="field-tasks-open-chrome"
            style={{ opacity: 1, visibility: 'visible', pointerEvents: 'auto' }}
            dir="rtl"
        >
            <button
                type="button"
                aria-label="إغلاق الستارة"
                className={FIELD_TASKS_INSTANT_BACKDROP_CLASS}
                onClick={() => handleInstantDismiss(onClose)}
            />
            <div
                role="status"
                aria-busy={waitingForPeek}
                aria-label="مهام اليوم الميدانية"
                className={FIELD_TASKS_INSTANT_SHEET_CLASS}
                data-field-tasks-instant-sheet="1"
            >
                <div className={FIELD_TASKS_INSTANT_HANDLE_WRAP_CLASS} aria-hidden>
                    <div className={FIELD_TASKS_INSTANT_HANDLE_CLASS} />
                </div>
                <div className={FIELD_TASKS_INSTANT_HEADER_CLASS}>
                    <div className="min-w-0 text-right">
                        <h2 className={FIELD_TASKS_INSTANT_TITLE_CLASS}>مهام اليوم الميدانية</h2>
                        {curtain.length > 0 ? (
                            <p className={FIELD_TASKS_INSTANT_COUNT_CLASS}>{curtain.length} مهمة</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={FIELD_TASKS_INSTANT_CLOSE_CLASS}
                        aria-label="إغلاق مهام اليوم الميدانية"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div dir="rtl" className={FIELD_TASKS_INSTANT_SCROLLER_CLASS}>
                    {curtain.length > 0 ? (
                        <ul className="space-y-2">
                            {curtain.map((task) => (
                                <li
                                    key={task.id}
                                    className={`${FIELD_TASKS_INSTANT_CARD_CLASS}${
                                        task.isFatalDeadline ? ` ${FIELD_TASKS_INSTANT_CARD_FATAL_CLASS}` : ''
                                    }`}
                                >
                                    <div className="flex flex-row items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            {task.isFatalDeadline ? (
                                                <div className="flex flex-wrap items-center gap-1 justify-end mb-0.5">
                                                    <span className="text-[10px] font-semibold text-rose-200/90 bg-rose-500/12 px-1.5 py-0.5 rounded-md">
                                                        حتمي
                                                    </span>
                                                </div>
                                            ) : null}
                                            <p className={FIELD_TASKS_INSTANT_TASK_TITLE_CLASS}>{task.title}</p>
                                            {task.location ? (
                                                <p className={FIELD_TASKS_INSTANT_LOCATION_CLASS}>
                                                    <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                                                    {task.location}
                                                </p>
                                            ) : null}
                                        </div>
                                        <button
                                            type="button"
                                            className={FIELD_TASKS_INSTANT_COMPLETE_CLASS}
                                            data-field-tasks-instant-complete={task.id}
                                            aria-label={`إنهاء ${task.title}`}
                                            onClick={() =>
                                                handleInstantAction(() =>
                                                    requestFieldTasksInstantComplete(task.id),
                                                )
                                            }
                                        >
                                            إنهاء
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : waitingForPeek ? (
                        <div className="space-y-2">
                            {Array.from({ length: FIELD_TASKS_INSTANT_BONE_COUNT }, (_, i) => (
                                <div key={i} className={FIELD_TASKS_INSTANT_BONE_CLASS} aria-hidden />
                            ))}
                        </div>
                    ) : (
                        <div className={FIELD_TASKS_INSTANT_EMPTY_CLASS} data-testid="field-tasks-instant-empty" role="status">
                            <p className="text-[#F4F4F5]/55 text-sm font-medium leading-relaxed max-w-xs">
                                لا مهام ميدانية ظاهرة الآن. أضف مهمة من مدير المهام، أو ثبّتها على الستارة، أو اجعل موعدها اليوم أو متأخراً ضمن الأسبوع.
                            </p>
                        </div>
                    )}
                </div>
                <div className={FIELD_TASKS_INSTANT_FOOTER_CLASS}>
                    <button
                        type="button"
                        className={FIELD_TASKS_INSTANT_MANAGE_CLASS}
                        data-field-tasks-instant-manage="1"
                        onPointerDown={() => {
                            void import('@/app/runtime/fieldTasksHubLoader')
                                .then((m) => m.loadTasksManagerModule())
                                .catch(() => undefined);
                        }}
                        onClick={() => handleInstantAction(() => requestFieldTasksInstantManage())}
                    >
                        إدارة جميع المهام
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
