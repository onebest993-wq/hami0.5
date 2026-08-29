import type { CriminalCase } from './criminalStore';
import type { InvestigationDossierClosure } from './criminalStore';
import { resolveCaseStageFromRecord } from './criminalStageUtils';
import {
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { hasActiveInvestigationDefendants } from './investigationDefendantScopeUtils';

export type { InvestigationDossierClosure, InvestigationDossierClosureKind } from './criminalStore';

export { isInvestigationFinalClosureTemplate, isInvestigationObjectiveFinalClosureTemplate } from './proceduralRequestTypes';

export function isInvestigationTemporaryClosureTemplate(template: string | undefined): boolean {
    return (
        normalizeProceduralRequestTemplate(String(template ?? '').trim()) ===
        INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE
    );
}

export function investigationDossierSealMessage(
    closure: InvestigationDossierClosure | undefined,
): string | null {
    if (!closure) return null;
    if (closure.kind === 'final') return 'تم غلق الإضبارة';
    if (closure.kind === 'waiver') return 'تم غلق الإضبارة بسبب التنازل';
    return null;
}

export function investigationDossierIsTemporarilyClosed(
    closure: InvestigationDossierClosure | undefined,
): boolean {
    return closure?.kind === 'temporary';
}

/** تشميع الإضبارة فقط عندما لا يبقى أي متهم نشط — لا تُغلق الإضبارة إذا بقي متهم واحد فقط. */
export function shouldSealInvestigationDossierAfterPurge(caseRecord: CriminalCase): boolean {
    return !hasActiveInvestigationDefendants(caseRecord.defendants);
}

/** إضبارة تحقيق مختومة: تجميد + سجل غلق (مؤقت/نهائي/تنازل) ولا متهم نشط. */
export function investigationDossierIsSealed(caseRecord: CriminalCase): boolean {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return false;
    return (
        caseRecord.isFrozen === true &&
        Boolean(caseRecord.investigationDossierClosure) &&
        !hasActiveInvestigationDefendants(caseRecord.defendants)
    );
}

/** يمنع التعديلات على محتوى الإضبارة (ما عدا بطاقات قرار الغلق للتمييز). */
export function investigationDossierMaterialMutationBlocked(caseRecord: CriminalCase): boolean {
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return false;
    if (investigationDossierIsSealed(caseRecord)) return true;
    if (caseRecord.isFrozen === true && !caseRecord.investigationDossierClosure) return true;
    return false;
}

/** أدلة الإثبات الأخرى — لا تُقفل بقفل التحقيق بعد الإحالة. */
export function otherEvidenceMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isArchived === true) return true;
    return false;
}

/** سجل الإفادات — يُقفل مع ختم الإضبارة أو التجميد الاستئنافي. */
export function investigationStatementsMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isInvestigationLocked) return true;
    return investigationDossierMaterialMutationBlocked(caseRecord);
}

/** سجل التحقيق (مفاتحات/مبرزات) — يُقفل خارج مرحلة التحقيق وبنفس قيود الإفادات داخلها. */
export function investigationLogsMutationBlocked(caseRecord: CriminalCase): boolean {
    if (caseRecord.dossierStatus === 'merged' || Boolean(String(caseRecord.mergedIntoCaseId ?? '').trim())) {
        return true;
    }
    if (caseRecord.isArchived === true) return true;
    if (resolveCaseStageFromRecord(caseRecord) !== 'investigation') return true;
    return investigationStatementsMutationBlocked(caseRecord);
}

export function sealInvestigationDossier(
    caseRecord: CriminalCase,
    kind: InvestigationDossierClosure['kind'],
    closedAt: string,
    defendantIds: string[],
    sourceRequestId?: string,
): CriminalCase {
    const patch: Partial<CriminalCase> = {
        isFrozen: true,
        investigationDossierClosure: {
            kind,
            closedAt,
            sourceRequestId,
            defendantIds,
        },
    };
    if (kind === 'waiver') {
        patch.isPrivateRightWaived = true;
        patch.waiverDate = closedAt;
    }
    return { ...caseRecord, ...patch };
}

/** تشميع الإضبارة فقط عندما لا يبقى أي متهم نشط في التحقيق. */
export function maybeSealInvestigationDossier(
    caseRecord: CriminalCase,
    kind: InvestigationDossierClosure['kind'],
    closedAt: string,
    defendantIds: string[],
    sourceRequestId?: string,
): CriminalCase {
    if (!shouldSealInvestigationDossierAfterPurge(caseRecord)) return caseRecord;
    return sealInvestigationDossier(caseRecord, kind, closedAt, defendantIds, sourceRequestId);
}
