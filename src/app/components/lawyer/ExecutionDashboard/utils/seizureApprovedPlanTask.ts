import type { LegalTask } from '@/app/types/TaskEngine';
import { startOfLocalDay } from '@/app/utils/localDay';
import { newTaskId, pendingTaskShell } from '@/app/services/tasks/quantumPendingTaskFactory';
import {
    invalidateQuantumTasksDiskWarmCache,
    readQuantumTasksFromDiskSync,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_UPSERT_EVENT } from '@/app/utils/quantumTasksEvents';
import { isExecutorRowEffectivelyApproved } from '@/app/utils/executorDecisionRowApproval';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { requestOpenTasksManager } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export const SEIZURE_PLAN_DECISION_MARKER = 'hami-seizure-decision:';

export type SeizureApprovedPlanInput = {
    executionId: string;
    decisionId: string;
    subtype: string;
    requestTitle: string;
    linkedQuantumTaskId?: string;
};

export function seizurePlanMarker(decisionId: string): string {
    return `${SEIZURE_PLAN_DECISION_MARKER}${String(decisionId).trim()}`;
}

export function findTaskLinkedToSeizureDecision(
    tasks: LegalTask[],
    decisionId: string,
): LegalTask | null {
    const marker = seizurePlanMarker(decisionId);
    const id = String(decisionId).trim();
    if (!id) return null;
    return tasks.find((t) => String(t.rawText ?? '').includes(marker)) ?? null;
}

/** موافقة منفذ سارية — تستحق شارة الخطة */
export function isSeizureDecisionApprovedForPlanBadge(
    row: Record<string, unknown> | null | undefined,
): boolean {
    if (!row) return false;
    const id = String(row.id ?? '').trim();
    if (!id) return false;
    return isExecutorRowEffectivelyApproved(row);
}

export function buildSeizureApprovedPlanTask(input: SeizureApprovedPlanInput): LegalTask {
    const executionId = String(input.executionId).trim();
    const decisionId = String(input.decisionId).trim();
    const title = `خطة — ${String(input.requestTitle).trim() || 'طلب حجز'}`;
    const marker = seizurePlanMarker(decisionId);
    const day = startOfLocalDay(new Date());
    return {
        id: newTaskId(),
        rawText: `${marker} — ${title}`,
        title,
        location: null,
        parsedDate: new Date(day.getTime()),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: executionId || null,
        ...pendingTaskShell({
            subTasks: [
                {
                    id: newTaskId(),
                    title: 'متابعة تنفيذ الحجز',
                    location: null,
                    isCompleted: false,
                    kind: 'branch',
                    planStatus: 'pending',
                },
            ],
        }),
    };
}

const sessionDecisionTaskLinks = new Map<string, string>();

function sessionLinkKey(executionId: string, decisionId: string): string {
    return `${executionId}::${decisionId}`;
}

export function ensureSeizureApprovedPlanTask(input: SeizureApprovedPlanInput): {
    taskId: string;
    created: boolean;
} | null {
    const executionId = String(input.executionId).trim();
    const decisionId = String(input.decisionId).trim();
    if (!executionId || !decisionId) return null;

    const sessionKey = sessionLinkKey(executionId, decisionId);
    const fromSession = sessionDecisionTaskLinks.get(sessionKey);
    if (fromSession) return { taskId: fromSession, created: false };

    const existingLinked = String(input.linkedQuantumTaskId ?? '').trim();

    invalidateQuantumTasksDiskWarmCache();
    const tasks = readQuantumTasksFromDiskSync();

    if (existingLinked) {
        const byId = tasks.find((t) => t.id === existingLinked);
        if (byId) {
            sessionDecisionTaskLinks.set(sessionKey, byId.id);
            return { taskId: byId.id, created: false };
        }
    }

    const found = findTaskLinkedToSeizureDecision(tasks, decisionId);
    if (found) {
        sessionDecisionTaskLinks.set(sessionKey, found.id);
        patchExecutorDecisionRow(executionId, decisionId, { linkedQuantumTaskId: found.id });
        return { taskId: found.id, created: false };
    }

    const next = buildSeizureApprovedPlanTask(input);
    sessionDecisionTaskLinks.set(sessionKey, next.id);

    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(QUANTUM_TASKS_UPSERT_EVENT, { detail: { task: next } }),
            );
        }
    } catch {
        /* ignore */
    }

    patchExecutorDecisionRow(executionId, decisionId, { linkedQuantumTaskId: next.id });
    return { taskId: next.id, created: true };
}

export function openSeizureApprovedPlanInTasks(input: SeizureApprovedPlanInput): void {
    const ensured = ensureSeizureApprovedPlanTask(input);
    const focusId = ensured?.taskId;
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => requestOpenTasksManager(focusId));
        return;
    }
    requestOpenTasksManager(focusId);
}

export function seizureRequestTitleForSubtype(subtype: string, fallback?: string): string {
    const s = String(subtype || '').trim();
    if (s === 'property') return 'طلب حجز عقار';
    if (s === 'salary' || s === 'notice') return fallback?.trim() || 'طلب حجز راتب';
    if (s === 'movable' || s === 'movable_auction') return 'طلب حجز مال منقول';
    if (s === 'third_party') return 'طلب حجز مال المدين لدى الغير';
    return fallback?.trim() || 'طلب حجز';
}
