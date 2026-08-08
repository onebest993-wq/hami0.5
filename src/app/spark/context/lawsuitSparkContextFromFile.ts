import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import { resolveLawsuitSparkJurisdiction } from '@/app/spark/context/resolveLawsuitSparkJurisdiction';

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

function resolveActiveStageIndex(file: Record<string, unknown>, stages: CaseStage[]): number {
    const raw = file.activeStageIndex;
    if (typeof raw === 'number' && raw >= 0 && raw < stages.length) return raw;
    return Math.max(0, stages.length - 1);
}

function resolveTimeline(stage: CaseStage | undefined, file: Record<string, unknown>): TimelineEvent[] {
    if (stage?.timeline?.length) return stage.timeline;
    const history = Array.isArray(file.history) ? file.history : [];
    return history as TimelineEvent[];
}

/** يبني سياق سبارك من ملف أرشيف/قائمة دون فتح الإضبارة */
export function buildLawsuitSparkContextFromArchiveFile(
    file: Record<string, unknown>,
): LawsuitSparkContext | null {
    const jurisdiction = resolveLawsuitSparkJurisdiction(file);
    if (jurisdiction === 'criminal') return null;

    const stages = (Array.isArray(file.stages) ? file.stages : []) as CaseStage[];
    if (!stages.length) return null;

    const activeStageIndex = resolveActiveStageIndex(file, stages);
    const displayStage = stages[activeStageIndex] ?? stages[stages.length - 1];
    if (!displayStage) return null;

    const fileId = String(file.id ?? 'unknown');
    const caseNo = String(
        displayStage.caseNo ?? file.caseNo ?? file.caseNumber ?? file.fileNumber ?? '',
    ).trim();
    const dossierKey = caseNo ? `lawsuit:${caseNo}` : `lawsuit:${fileId}`;

    const representedParty =
        (isRecord(file.parentData) ? String(file.parentData.representedParty ?? '') : '') ||
        String(file.representedParty ?? '').trim() ||
        null;

    const status = String(file.status ?? 'نشطة');
    const isPaused = status === 'مستأخرة' || status === 'موقوفة اتفاقياً';

    return {
        dossierKey,
        fileId,
        jurisdiction,
        representedParty,
        status,
        isPaused,
        pauseReason: String(displayStage.stayReason ?? file.stayReason ?? '').trim(),
        displayStage,
        stages,
        timeline: resolveTimeline(displayStage, file),
    };
}
