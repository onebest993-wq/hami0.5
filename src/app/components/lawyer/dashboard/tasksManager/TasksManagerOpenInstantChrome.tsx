import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import {
    listTasksManagerInstantPeekTitles,
    TASKS_MANAGER_INSTANT_BONE_CLASS,
    TASKS_MANAGER_INSTANT_BONE_COUNT,
    TASKS_MANAGER_INSTANT_BONE_INLINE_STYLE,
    TASKS_MANAGER_INSTANT_BODY_CLASS,
    TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS,
    TASKS_MANAGER_INSTANT_HEADER_CLASS,
    TASKS_MANAGER_INSTANT_INNER_CLASS,
} from '@/app/runtime/tasksManagerInstantChromeMarkup';
import { TASKS_MANAGER_INSTANT_CHROME_ID } from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { FIELD_TASKS_CURTAIN_PEEK_READY_EVENT } from '@/app/utils/quantumTasksCurtainPeek';

function getOverlayPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
}

/** قشرة أجندة المهام — خارج مقطع TasksManager حتى تظهر قبل تحميل الـ chunk */
export function TasksManagerOpenInstantChrome(): React.ReactElement | null {
    const [peekTick, setPeekTick] = useState(0);
    useEffect(() => {
        const onReady = () => setPeekTick((n) => n + 1);
        window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
        return () => window.removeEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, onReady);
    }, []);
    const titles = useMemo(
        () => listTasksManagerInstantPeekTitles(getQuantumPendingSnapshot()),
        [peekTick],
    );

    if (typeof document !== 'undefined' && document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)) {
        return null;
    }

    const peekTitles = titles.slice(0, TASKS_MANAGER_INSTANT_BONE_COUNT);
    const content = (
        <div
            className={TASKS_MANAGER_INSTANT_CHROME_ROOT_CLASS}
            data-testid="tasks-manager-open-chrome"
            data-hami-overlay-safe="1"
            role="status"
            aria-busy={peekTitles.length === 0}
            aria-label="أجندة المهام"
            dir="rtl"
        >
            <div className={TASKS_MANAGER_INSTANT_INNER_CLASS}>
                <header className={TASKS_MANAGER_INSTANT_HEADER_CLASS}>
                    <div className="min-w-0 text-right">
                        <h1 className="truncate text-base font-semibold text-[#F4F4F5]">أجندة المهام</h1>
                    </div>
                </header>
                <div className={TASKS_MANAGER_INSTANT_BODY_CLASS} data-tasks-manager-instant-body="1">
                    {peekTitles.length > 0
                        ? peekTitles.map((title) => (
                              <div
                                  key={title}
                                  className={`${TASKS_MANAGER_INSTANT_BONE_CLASS} px-3 py-3 text-right`}
                                  data-tasks-manager-instant-bone="1"
                                  style={TASKS_MANAGER_INSTANT_BONE_INLINE_STYLE}
                              >
                                  <p className="truncate text-sm font-semibold text-[#F4F4F5]">{title}</p>
                              </div>
                          ))
                        : Array.from({ length: TASKS_MANAGER_INSTANT_BONE_COUNT }, (_, day) => (
                              <div
                                  key={day}
                                  className={TASKS_MANAGER_INSTANT_BONE_CLASS}
                                  data-tasks-manager-instant-bone="1"
                                  style={TASKS_MANAGER_INSTANT_BONE_INLINE_STYLE}
                              />
                          ))}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, getOverlayPortalRoot());
}
