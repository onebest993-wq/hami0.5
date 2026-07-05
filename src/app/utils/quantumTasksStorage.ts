import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { countFieldDaySheetTasks } from '@/app/services/tasks/fieldCurtainTasks';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { scheduleProtectedBackupFromRaw } from '@/app/services/dossierPersistence/protectedBackupService';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';

export const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

function mapSubTasks(raw: unknown): LegalSubTask[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            return {
                id: String(o.id ?? ''),
                title: String(o.title ?? ''),
                location: o.location == null ? null : String(o.location),
                isCompleted: !!o.isCompleted,
                kind: o.kind === 'field' || o.kind === 'branch' ? o.kind : undefined,
            } as LegalSubTask;
        })
        .filter((s) => s.id.length > 0 && s.title.length > 0);
}

function mapDocumentRequirements(raw: unknown): DocumentRequirementItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            return {
                id: String(o.id ?? ''),
                text: String(o.text ?? ''),
                isChecked: !!o.isChecked,
            } as DocumentRequirementItem;
        })
        .filter((s) => s.id.length > 0 && s.text.length > 0);
}

function mapExpenses(raw: unknown): TaskExpenseEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            const amt = typeof o.amount === 'number' ? o.amount : Number(o.amount);
            return {
                id: String(o.id ?? ''),
                amount: Number.isFinite(amt) ? amt : 0,
                label: String(o.label ?? ''),
            } as TaskExpenseEntry;
        })
        .filter((s) => s.id.length > 0 && s.amount > 0);
}

function readRawFromDiskSync(): string | null {
    try {
        if (typeof localStorage !== 'undefined') {
            const fromLs = localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY);
            if (fromLs?.trim()) return fromLs;
        }
    } catch {
        /* ignore */
    }
    return SecureStoreService.getItemSync(QUANTUM_TASKS_STORAGE_KEY);
}

function shouldRejectQuantumTasksWipe(incomingSerialized: string): boolean {
    const existing = readRawFromDiskSync();
    if (!existing?.trim()) return false;
    return shouldRejectDossierWipe(QUANTUM_TASKS_STORAGE_KEY, incomingSerialized, existing);
}

/** قراءة فورية عند الإقلاع — localStorage أولاً (يبقى بعد F5) */
export function readQuantumTasksFromDiskSync(now = new Date()): LegalTask[] {
    const raw = readRawFromDiskSync();
    if (!raw?.trim()) return [];
    try {
        const blob: unknown = JSON.parse(raw);
        return prepareAgendaTasks(deserializeQuantumTasks(blob), now, { skipRetentionPurge: true });
    } catch {
        return [];
    }
}

/** استعادة المهام من blob التخزين (localStorage). */
export function deserializeQuantumTasks(raw: unknown): LegalTask[] {
    if (raw === null || typeof raw !== 'object') return [];
    const tasksUnknown = (raw as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksUnknown)) return [];

    return tasksUnknown
        .map((row) => {
            const r = row as Record<string, unknown>;
            const status = r.status;
            const normalizedStatus =
                status === 'completed' || status === 'delegated' || status === 'pending'
                    ? status
                    : 'pending';

            let parsedDate: Date | null = null;
            if (r.parsedDate != null && typeof r.parsedDate === 'string') {
                const d = new Date(r.parsedDate);
                parsedDate = Number.isNaN(d.getTime()) ? null : d;
            }

            let reminderAt: Date | null = null;
            if (r.reminderAt != null && typeof r.reminderAt === 'string') {
                const rd = new Date(r.reminderAt);
                reminderAt = Number.isNaN(rd.getTime()) ? null : rd;
            }

            let completedAt: Date | null = null;
            if (r.completedAt != null && typeof r.completedAt === 'string') {
                const cd = new Date(r.completedAt);
                completedAt = Number.isNaN(cd.getTime()) ? null : cd;
            } else if (normalizedStatus === 'completed') {
                completedAt = parsedDate ?? new Date();
            }

            let fieldCurtainPinnedAt: Date | null = null;
            if (r.fieldCurtainPinnedAt != null && typeof r.fieldCurtainPinnedAt === 'string') {
                const pd = new Date(r.fieldCurtainPinnedAt);
                fieldCurtainPinnedAt = Number.isNaN(pd.getTime()) ? null : pd;
            }

            return {
                id: String(r.id ?? ''),
                rawText: String(r.rawText ?? ''),
                title: String(r.title ?? ''),
                location: r.location == null ? null : String(r.location),
                parsedDate,
                reminderAt,
                isFatalDeadline: !!r.isFatalDeadline,
                linkedCaseId: r.linkedCaseId == null ? null : String(r.linkedCaseId),
                status: normalizedStatus,
                completedAt,
                pinnedToFieldCurtain: !!r.pinnedToFieldCurtain,
                fieldCurtainPinnedAt,
                subTasks: mapSubTasks(r.subTasks),
                documentRequirements: mapDocumentRequirements(r.documentRequirements),
                expenses: mapExpenses(r.expenses),
                voiceRef: r.voiceRef == null ? null : String(r.voiceRef),
                voiceTranscript: r.voiceTranscript == null ? null : String(r.voiceTranscript),
                voiceDurationSec:
                    typeof r.voiceDurationSec === 'number' && Number.isFinite(r.voiceDurationSec)
                        ? r.voiceDurationSec
                        : null,
            } as LegalTask;
        })
        .filter((t) => t.id.length > 0);
}

/** تسلسل للحفظ — تواريخ ISO. */
export function serializeQuantumTasks(tasks: LegalTask[]): { tasks: Record<string, unknown>[] } {
    return {
        tasks: tasks.map((t) => ({
            ...t,
            parsedDate: t.parsedDate ? t.parsedDate.toISOString() : null,
            reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
            completedAt: t.completedAt ? t.completedAt.toISOString() : null,
            fieldCurtainPinnedAt: t.fieldCurtainPinnedAt ? t.fieldCurtainPinnedAt.toISOString() : null,
        })),
    };
}

/** عداد شارة الدوك — مهام مثبتة على الستارة فقط */
export function countPendingFieldTasks(pendingTasks: LegalTask[]): number {
    return countFieldDaySheetTasks(pendingTasks);
}

/** حفظ متزامن — يُكتب فوراً في localStorage قبل أي إعادة تحميل */
export function persistQuantumTasksSync(tasks: LegalTask[]): boolean {
    const blob = serializeQuantumTasks(tasks);
    const serialized = JSON.stringify(blob);
    if (shouldRejectQuantumTasksWipe(serialized)) return false;

    persistenceRepository.primeEntry(QUANTUM_TASKS_STORAGE_KEY, serialized, blob);
    SecureStoreService.setItemSync(QUANTUM_TASKS_STORAGE_KEY, serialized);
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, serialized);
        }
    } catch {
        /* ignore quota / private mode */
    }
    return true;
}

function readPersistedQuantumTasksRaw(tasks: LegalTask[]): string {
    return (
        (typeof localStorage !== 'undefined'
            ? localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY)
            : null) ??
        SecureStoreService.getItemSync(QUANTUM_TASKS_STORAGE_KEY) ??
        JSON.stringify(serializeQuantumTasks(tasks))
    );
}

/** IndexedDB + نسخة احتياطية — بعد persistQuantumTasksSync */
export async function persistQuantumTasksBackground(tasks: LegalTask[]): Promise<void> {
    const serialized = readPersistedQuantumTasksRaw(tasks);
    scheduleProtectedBackupFromRaw(QUANTUM_TASKS_STORAGE_KEY, serialized);
    await SecureStoreService.setItem(QUANTUM_TASKS_STORAGE_KEY, serialized);
}

/** حفظ كامل — sync فوري + IndexedDB + نسخة احتياطية */
export async function persistQuantumTasksImmediate(tasks: LegalTask[]): Promise<void> {
    if (!persistQuantumTasksSync(tasks)) return;
    await persistQuantumTasksBackground(tasks);
}
