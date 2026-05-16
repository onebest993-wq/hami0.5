import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type CopilotPriority = 'critical' | 'high' | 'medium';

export interface ExecutionCopilotCitation {
    title: string;
    url: string;
    source: 'iraqi_official' | 'web' | 'rag';
    publishedAt?: string;
    excerpt?: string;
}

export interface ExecutionCopilotSuggestion {
    id: string;
    title: string;
    rationale: string;
    priority: CopilotPriority;
    type?: 'حرج' | 'مهم' | 'تحسيني' | 'استباقي' | 'تحري_مالي' | 'إجراء_فوري';
    deadline?: string;
    draftText?: string;
    citations: ExecutionCopilotCitation[];
}

export interface ExecutionCopilotResult {
    summary: string;
    confidence: number;
    generatedAt: string;
    suggestions: ExecutionCopilotSuggestion[];
}

export interface ExecutionCaseSnapshot {
    executionId: string;
    dossierStatus: string;
    claimType: string;
    executionType: string;
    documentType: string;
    debtorJob: string;
    hasGuarantor: boolean;
    remainingDebt: number;
    generatedAt: string;
    timeline: Array<{
        id: string;
        title: string;
        description?: string;
        date?: string;
        source?: string;
        type?: string;
    }>;
    notes: Array<{ id: string; title: string; body?: string; createdAt: string }>;
    tasks: Array<{ id: string; title: string; dueDate: string }>;
    decisions: Array<{
        id: string;
        title: string;
        appealStatus?: string;
        appealActor?: string;
        appealMethod?: string;
        appealResult?: string;
    }>;
    quickFacts: {
        creditorsCount: number;
        debtorsCount: number;
        pendingTasksCount: number;
        timelineCount: number;
        decisionsCount: number;
        appealedDecisionsCount: number;
        lastTimelineDate?: string;
    };
}

function stableText(input: unknown): string {
    return String(input ?? '').trim();
}

function toNumberHash(text: string): number {
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 33) ^ text.charCodeAt(i);
    }
    return hash >>> 0;
}

export function buildExecutionCaseSnapshot(args: {
    executionData: ExecutionFile | null | undefined;
    timelineEvents: TimelineEvent[];
    caseNotesLog?: Array<{ id: string; title: string; body?: string; createdAt: string; trashedAt?: string }>;
    caseTasksPending?: Array<{ id: string; title: string; dueDate: string; trashedAt?: string }>;
    decisions?: Array<Record<string, unknown>>;
    timelineLimit?: number;
}): ExecutionCaseSnapshot | null {
    const {
        executionData,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        decisions,
        timelineLimit = 50,
    } = args;
    if (!executionData?.id) return null;

    const liveNotes = (caseNotesLog ?? []).filter((n) => !n.trashedAt).slice(-20);
    const liveTasks = (caseTasksPending ?? []).filter((t) => !t.trashedAt).slice(-20);
    const trimmedTimeline = [...(timelineEvents ?? [])]
        .slice(0, timelineLimit)
        .map((ev) => ({
            id: stableText(ev.id),
            title: stableText(ev.title),
            description: stableText((ev as any).description || ''),
            date: stableText(ev.timestamp || ev.date || ''),
            source: stableText(ev.source || ''),
            type: stableText(ev.type || ''),
        }));
    const normalizedDecisions = (decisions ?? []).slice(0, 80).map((d, idx) => ({
        id: stableText(d.id || `row-${idx}`),
        title: stableText(d.title || d.requestTitle || 'قرار'),
        appealStatus: stableText(d.appealStatus || ''),
        appealActor: stableText(d.appealActor || ''),
        appealMethod: stableText(d.appealMethod || ''),
        appealResult: stableText(d.appealResult || ''),
    }));
    const appealedDecisionsCount = normalizedDecisions.filter(
        (d) =>
            d.appealStatus ||
            d.appealActor ||
            d.appealMethod ||
            d.appealResult
    ).length;

    return {
        executionId: String(executionData.id),
        dossierStatus: stableText(executionData.dossier_lifecycle_status || executionData.status || 'active'),
        claimType: stableText(executionData.claimType || (executionData as any).executionType || ''),
        executionType: stableText(
            (executionData as any).executionType || executionData.claimType || ''
        ),
        documentType: stableText(
            (executionData as any).docType || (executionData as any).documentType || ''
        ),
        debtorJob: stableText(
            (executionData as any).debtorJob ||
                executionData?.debtors?.[0]?.occupation ||
                executionData?.debtors?.find((d) => stableText((d as any)?.occupation))?.occupation ||
                ''
        ),
        hasGuarantor:
            Boolean((executionData as any).hasGuarantor) ||
            Boolean((executionData as any).guarantor_followup) ||
            Boolean(
                Array.isArray(executionData?.debtors) &&
                    executionData.debtors.some((d) => Boolean((d as any)?.hasGuarantor))
            ),
        remainingDebt: Math.max(
            0,
            Number(
                (executionData as any).remainingDebt ??
                    ((Number((executionData as any).debtAmount || 0) || 0) -
                        (Number((executionData as any).paidDebt || 0) || 0))
            ) || 0
        ),
        generatedAt: new Date().toISOString(),
        timeline: trimmedTimeline,
        notes: liveNotes.map((n) => ({
            id: String(n.id),
            title: stableText(n.title),
            body: stableText((n as any).body || ''),
            createdAt: stableText(n.createdAt),
        })),
        tasks: liveTasks.map((t) => ({
            id: String(t.id),
            title: stableText(t.title),
            dueDate: stableText(t.dueDate),
        })),
        decisions: normalizedDecisions,
        quickFacts: {
            creditorsCount: Array.isArray(executionData.creditors) ? executionData.creditors.length : 0,
            debtorsCount: Array.isArray(executionData.debtors) ? executionData.debtors.length : 0,
            pendingTasksCount: liveTasks.length,
            timelineCount: trimmedTimeline.length,
            decisionsCount: normalizedDecisions.length,
            appealedDecisionsCount,
            lastTimelineDate: trimmedTimeline[0]?.date || '',
        },
    };
}

export function snapshotFingerprint(snapshot: ExecutionCaseSnapshot | null): string {
    if (!snapshot) return 'none';
    const key = JSON.stringify({
        id: snapshot.executionId,
        status: snapshot.dossierStatus,
        claimType: snapshot.claimType,
        executionType: snapshot.executionType,
        documentType: snapshot.documentType,
        debtorJob: snapshot.debtorJob,
        hasGuarantor: snapshot.hasGuarantor,
        remainingDebt: snapshot.remainingDebt,
        timeline: snapshot.timeline.map((t) => `${t.id}:${t.title}:${t.description || ''}:${t.date}`),
        notes: snapshot.notes.map((n) => `${n.id}:${n.title}:${n.body || ''}:${n.createdAt}`),
        tasks: snapshot.tasks.map((t) => `${t.id}:${t.title}:${t.dueDate}`),
        decisions: snapshot.decisions.map(
            (d) => `${d.id}:${d.title}:${d.appealStatus}:${d.appealActor}:${d.appealMethod}:${d.appealResult}`
        ),
    });
    return String(toNumberHash(key));
}

export function shouldAutoRunCopilot(args: {
    enabled: boolean;
    fingerprint: string;
    lastFingerprint: string;
    lastRunAt?: number;
    cooldownMs?: number;
}): boolean {
    const { enabled, fingerprint, lastFingerprint, lastRunAt = 0, cooldownMs = 15000 } = args;
    if (!enabled) return false;
    if (!fingerprint || fingerprint === 'none') return false;
    if (fingerprint === lastFingerprint) return false;
    return Date.now() - lastRunAt >= cooldownMs;
}
