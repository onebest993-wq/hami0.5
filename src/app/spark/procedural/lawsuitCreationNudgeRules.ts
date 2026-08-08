import type { SparkNudge } from '@/app/spark/types';
import type { LawsuitCreationSparkContext } from '@/app/spark/context/lawsuitCreationSparkContext';
import { LAWSUIT_CREATION_DOSSIER_KEY } from '@/app/spark/context/lawsuitCreationSparkContext';
import { hasLawyerClientMark } from '@/app/components/lawyer/LawyerNewCase/clientRepresentation';
import {
    getExceptionWarning,
    getStageCourtMismatchErrors,
    isExtraordinaryProcedureStage,
} from '@/app/components/lawyer/LawyerNewCase/validation';
import { validateIncidentalSpawnSave } from '@/app/domain/lawsuit/incidentalSpawnPrefill';

export function collectLawsuitCreationSparkNudges(ctx: LawsuitCreationSparkContext): SparkNudge[] {
    const nudges: SparkNudge[] = [];
    const { caseDetails } = ctx;
    const court = String(caseDetails.court ?? '').trim();
    const stage = String(caseDetails.stage ?? '').trim();
    const type = String(caseDetails.type ?? '').trim();

    if (ctx.incidentalSpawnContext) {
        const spawnErr = validateIncidentalSpawnSave(ctx.incidentalSpawnContext, {
            filingPartyId: ctx.incidentalFilingPartyId,
            opposingPartyId: ctx.incidentalOpposingPartyId,
        });
        if (spawnErr) {
            nudges.push({
                id: `${LAWSUIT_CREATION_DOSSIER_KEY}:incidental-parties`,
                kind: 'lawsuit.creation_incidental_parties',
                surface: 'lawsuit',
                priority: 10,
                message: 'إضبارة فرعية — حدّد الطرف المُقدِّم والطرف المُعارَض قبل الحفظ.',
                presence: { present: [], missing: ['أطراف الإضبارة الفرعية'] },
                source: 'lawsuitCreationNudgeRules',
                dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
                action: { label: 'مراجعة الأطراف', actionId: 'focus_incidental_parties' },
            });
        }
    }

    if (!hasLawyerClientMark(ctx.parties1, ctx.parties2, ctx.thirdParties ?? [])) {
        nudges.push({
            id: `${LAWSUIT_CREATION_DOSSIER_KEY}:client-missing`,
            kind: 'lawsuit.creation_client_missing',
            surface: 'lawsuit',
            priority: 9,
            message: 'لم يُحدَّد موكّلك بعد — عيّن «موكل» أو «مكتبي» على أحد الأطراف.',
            presence: { present: [], missing: ['تمييز الموكل'] },
            source: 'lawsuitCreationNudgeRules',
            dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
            action: { label: 'الانتقال للأطراف', actionId: 'focus_parties' },
        });
    }

    const mismatch = getStageCourtMismatchErrors(court, stage);
    if (Object.keys(mismatch).length > 0) {
        nudges.push({
            id: `${LAWSUIT_CREATION_DOSSIER_KEY}:stage-mismatch`,
            kind: 'lawsuit.creation_stage_mismatch',
            surface: 'lawsuit',
            priority: 8,
            message: 'تعارض بين المحكمة والمرحلة — راجع الاختيار قبل الحفظ.',
            presence: {
                present: court ? [court] : [],
                missing: [mismatch.stage ?? mismatch.court ?? 'تطابق المحكمة والمرحلة'],
            },
            source: 'lawsuitCreationNudgeRules',
            dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
            action: { label: 'مراجعة المرحلة', actionId: 'focus_stage' },
        });
    }

    if (
        isExtraordinaryProcedureStage(stage) &&
        !String(caseDetails.retrialTargetStage ?? '').trim()
    ) {
        nudges.push({
            id: `${LAWSUIT_CREATION_DOSSIER_KEY}:underlying-stage`,
            kind: 'lawsuit.creation_underlying_stage_missing',
            surface: 'lawsuit',
            priority: 7,
            message: 'طعن استثنائي — أدخل مرحلة الحكم الأصلي المطلوب الطعن فيه.',
            presence: { present: [stage], missing: ['مرحلة الحكم الأصلي'] },
            source: 'lawsuitCreationNudgeRules',
            dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال البيانات', actionId: 'focus_underlying_stage' },
        });
    }

    const exceptionHint = getExceptionWarning(caseDetails.claimValue, type);
    if (exceptionHint) {
        nudges.push({
            id: `${LAWSUIT_CREATION_DOSSIER_KEY}:exception-hint`,
            kind: 'lawsuit.creation_exception_hint',
            surface: 'lawsuit',
            priority: 3,
            message: exceptionHint,
            presence: { present: [stage], missing: ['مراجعة اختصاص الطعن'] },
            source: 'lawsuitCreationNudgeRules',
            dossierKey: LAWSUIT_CREATION_DOSSIER_KEY,
        });
    }

    return nudges.sort((a, b) => b.priority - a.priority);
}
