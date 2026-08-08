import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

export function isInvalidSeizureWorkflowDossierId(id: string | undefined | null): boolean {
    const s = String(id ?? '').trim();
    return !s || s === 'default' || s === 'undefined' || s === 'null';
}

/** يوحّد معرّف تخزين القرارات بين إرسال الطلب وقراءة القائمة */
export function resolveSeizureWorkflowDossierId(input: {
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
}): string {
    const seed = String(
        input.decisionsStorageExecutionId ?? input.executionId ?? input.executionDataId ?? '',
    ).trim();
    const data =
        input.executionData ??
        (seed || input.executionDataId || input.executionId
            ? readExecutionDataForDomainGate(seed || input.executionDataId || input.executionId)
            : null);
    const resolved = resolveDecisionsStorageExecutionId(
        seed || undefined,
        data as Record<string, unknown> | undefined,
    );
    if (!isInvalidSeizureWorkflowDossierId(resolved)) return resolved;

    for (const raw of [
        seed,
        input.executionDataId,
        input.executionId,
        (data as { id?: string } | null)?.id,
        (data as { parentDossierId?: string } | null)?.parentDossierId,
        (data as { parentFileId?: string } | null)?.parentFileId,
    ]) {
        const s = String(raw ?? '').trim();
        if (!isInvalidSeizureWorkflowDossierId(s)) return s;
    }
    return '';
}
