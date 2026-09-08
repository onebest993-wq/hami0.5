import { blurFocusWithin } from '@/app/utils/inertProps';
import { TASKS_TEARDOWN_EVENT } from '@/app/utils/quantumTasksEvents';
import {
    drainFieldTasksInstantCompleteQueue,
    FIELD_TASKS_INSTANT_COMPLETE_EVENT,
} from '@/app/runtime/fieldTasksInstantActions';
import { FIELD_TASKS_CURTAIN_PEEK_READY_EVENT } from '@/app/utils/quantumTasksCurtainPeek';
import { HAMI_OPEN_TASKS_HELP_INBOX_EVENT } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { QUANTUM_TASKS_UPSERT_EVENT } from '@/app/utils/quantumTasksEvents';
import { unblockAllTasksOverlayEscape } from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import {
    clearFieldTasksForceVisible,
    isFieldTasksCloseSuppressed,
    removeFieldTasksInstantChrome,
} from '@/app/runtime/fieldTasksInstantPaint';
import { removeTasksManagerInstantChrome } from '@/app/runtime/tasksManagerInstantPaint';

const CLOSING_ATTR_MANAGER = 'data-tasks-closing';
const CLOSING_ATTR_CURTAIN = 'data-field-tasks-closing';
const ROOT_SELECTORS = [
    '[data-field-tasks-root]',
    '[data-testid="tasks-manager-overlay"]',
    '[data-testid="tasks-manager"]',
    '[data-field-tasks-sheet]',
];

export function tearDownTasksFloatingState(): void {
    try {
        try {
            const nodes: HTMLElement[] = [];
            if (typeof document !== 'undefined') {
                for (const selector of ROOT_SELECTORS) {
                    const el = document.querySelector(selector);
                    if (el instanceof HTMLElement) nodes.push(el);
                }
                for (const node of nodes) {
                    try {
                        blurFocusWithin(node);
                    } catch {
                        /* ignore */
                    }
                }
            }
        } catch {
            /* ignore */
        }

        try {
            if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        } catch {
            /* ignore */
        }

        try {
            void drainFieldTasksInstantCompleteQueue();
        } catch {
            /* ignore */
        }

        try {
            unblockAllTasksOverlayEscape();
        } catch {
            /* ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                const events = [
                    FIELD_TASKS_INSTANT_COMPLETE_EVENT,
                    FIELD_TASKS_CURTAIN_PEEK_READY_EVENT,
                    HAMI_OPEN_TASKS_HELP_INBOX_EVENT,
                    QUANTUM_TASKS_UPSERT_EVENT,
                ];
                for (const ev of events) {
                    try {
                        window.dispatchEvent(new CustomEvent(`${ev}:__teardown`, { cancelable: false }));
                    } catch {
                        /* ignore */
                    }
                }
            }
        } catch {
            /* ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent(TASKS_TEARDOWN_EVENT, {
                        detail: { reason: 'surgical-close', suppressed: isFieldTasksCloseSuppressed() },
                        cancelable: false,
                    }),
                );
            }
        } catch {
            /* ignore */
        }

        try {
            if (typeof window !== 'undefined') {
                const w = window as unknown as Record<string, unknown>;
                const keysToDelete: string[] = [];
                for (const key of Object.keys(w)) {
                    if (
                        key.startsWith('__hamiTasksDraft') ||
                        key.startsWith('__hamiTasksInstant') ||
                        key.startsWith('__hamiTasksPaint') ||
                        key.startsWith('__hamiTasksHelp') ||
                        key.startsWith('__hamiFieldTasks')
                    ) {
                        keysToDelete.push(key);
                    }
                }
                for (const key of keysToDelete) {
                    try {
                        delete (window as unknown as Record<string, unknown>)[key];
                    } catch {
                        /* ignore */
                    }
                }
            }
        } catch {
            /* ignore */
        }

        try {
            if (typeof document !== 'undefined') {
                for (const selector of ROOT_SELECTORS) {
                    const layer = document.querySelector(selector);
                    if (layer instanceof HTMLElement) {
                        layer.setAttribute(CLOSING_ATTR_MANAGER, 'true');
                        layer.setAttribute(CLOSING_ATTR_CURTAIN, 'true');
                    }
                }
            }
        } catch {
            /* ignore */
        }

        try {
            removeFieldTasksInstantChrome();
        } catch {
            /* ignore */
        }

        try {
            removeTasksManagerInstantChrome();
        } catch {
            /* ignore */
        }

        try {
            clearFieldTasksForceVisible();
        } catch {
            /* ignore */
        }

        try {
            clearOverlayEnterSettle('data-hami-tasks-manager-enter');
            clearOverlayEnterSettle('data-hami-field-tasks-enter');
        } catch {
            /* ignore */
        }
    } catch {
        /* ignore */
    }
}
