import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import type { DocumentRequirementItem, LegalSubTask, LegalTask, TaskExpenseEntry } from '@/app/types/TaskEngine';

const STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

export type QuantumTasksContextValue = ReturnType<typeof useQuantumTasks>;

const QuantumTasksContext = createContext<QuantumTasksContextValue | null>(null);

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

function deserializeTasks(raw: unknown): LegalTask[] {
    if (raw === null || typeof raw !== 'object') return [];
    const tasksUnknown = (raw as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksUnknown)) return [];

    return tasksUnknown
        .map((row) => {
            const r = row as Record<string, unknown>;
            const status = r.status;
            const normalizedStatus =
                status === 'completed' || status === 'delegated' || status === 'pending' ? status : 'pending';

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
                pinnedToFieldCurtain: !!r.pinnedToFieldCurtain,
                subTasks: mapSubTasks(r.subTasks),
                documentRequirements: mapDocumentRequirements(r.documentRequirements),
                expenses: mapExpenses(r.expenses),
            } as LegalTask;
        })
        .filter((t) => t.id.length > 0);
}

export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const initial = useMemo(() => {
        const blob = persistenceRepository.load<unknown>(STORAGE_KEY);
        return deserializeTasks(blob);
    }, []);

    const value = useQuantumTasks(initial);

    useEffect(() => {
        persistenceRepository.save(STORAGE_KEY, {
            tasks: value.tasks.map((t) => ({
                ...t,
                parsedDate: t.parsedDate ? t.parsedDate.toISOString() : null,
                reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
            })),
        });
    }, [value.tasks]);

    return <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>;
}

export function useQuantumTasksContext(): QuantumTasksContextValue {
    const ctx = useContext(QuantumTasksContext);
    if (!ctx) {
        throw new Error('useQuantumTasksContext must be used within QuantumTasksProvider');
    }
    return ctx;
}
