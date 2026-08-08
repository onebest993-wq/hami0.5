import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutionSparkContext,
    type ExecutionSparkContext,
} from '@/app/spark/context/executionSparkContext';
import { buildExecutionSparkRuntimeOverlayFromFile } from '@/app/spark/context/executionSparkRuntimeOverlay';

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

/** يبني سياق سبارك من ملف أرشيف/قائمة دون فتح الإضبارة */
export function buildExecutionSparkContextFromArchiveFile(
    file: Record<string, unknown>,
): ExecutionSparkContext | null {
    const id = String(file.id ?? '').trim();
    if (!id) return null;

    const lifecycle = String(file.dossier_lifecycle_status ?? 'active').trim();
    if (lifecycle === 'finished') return null;

    return buildExecutionSparkContext({
        executionData: file as ExecutionFile,
        executionPaused: lifecycle === 'paused' || lifecycle === 'suspended',
        runtimeOverlay: buildExecutionSparkRuntimeOverlayFromFile(file),
    });
}

export function resolveExecutionArchiveCaseLabel(
    file: Record<string, unknown>,
    dossierKey: string,
): string {
    const caseNo = String(
        file.executionCaseNumber ?? file.caseNo ?? file.fileNumber ?? '',
    ).trim();
    if (caseNo) return caseNo;
    const title = String(file.claimType ?? file.title ?? '').trim();
    if (title) return title;
    return dossierKey.replace(/^execution:/, '');
}

export function isExecutionArchiveFileActive(file: unknown): boolean {
    if (!isRecord(file)) return false;
    const lifecycle = String(file.dossier_lifecycle_status ?? 'active').trim();
    return lifecycle !== 'finished' && file.isArchived !== true;
}
