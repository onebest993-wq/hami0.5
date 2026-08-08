import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import { EXECUTION_CREATION_DOSSIER_KEY } from '@/app/spark/context/executionCreationSparkContext';
import {
    findMissingRequiredMonetaryClaimAmount,
    isDirectorateSectionComplete,
    isInstrumentSectionReadyForParties,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { buildExecutionCreationIntelNudges } from '@/app/spark/procedural/executionCreationIntelligence';

function hasClientCreditor(creditors: ExecutionCreationSparkContext['creditors']): boolean {
    return creditors.some((c) => c.isClient && String(c.name ?? '').trim());
}

export function collectExecutionCreationSparkNudges(
    ctx: ExecutionCreationSparkContext,
): SparkNudge[] {
    const nudges: SparkNudge[] = [];
    const effectiveTypes =
        ctx.activeClaimTypes.length > 0
            ? ctx.activeClaimTypes
            : ctx.claimType
              ? [ctx.claimType]
              : [];

    if (ctx.isDocumentBlocked) {
        nudges.push({
            id: `${EXECUTION_CREATION_DOSSIER_KEY}:document-blocked`,
            kind: 'execution.creation_document_blocked',
            surface: 'execution',
            priority: 10,
            message:
                'السند الحالي لا يصلح للتنفيذ المباشر — راجع مسار الدعوى أو استكمل إجراءات الغياب.',
            presence: { present: [ctx.docType || 'سند'], missing: ['سند قابل للتنفيذ'] },
            source: 'executionCreationNudgeRules',
            dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
        });
    }

    if (!isDirectorateSectionComplete(ctx.directorate, ctx.fileNumber)) {
        nudges.push({
            id: `${EXECUTION_CREATION_DOSSIER_KEY}:directorate`,
            kind: 'execution.creation_directorate_incomplete',
            surface: 'execution',
            priority: 9,
            message: 'أكمل مديرية التنفيذ ورقم الإضبارة قبل متابعة بيانات السند.',
            presence: { present: [], missing: ['مديرية التنفيذ', 'رقم الإضبارة'] },
            source: 'executionCreationNudgeRules',
            dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال البيانات', actionId: 'focus_directorate' },
        });
    }

    const partiesReady = isInstrumentSectionReadyForParties({
        docType: ctx.docType,
        classification: ctx.classification,
        claimType: ctx.claimType,
        effectiveClaimTypes: effectiveTypes,
        requiresClassification: true,
    });

    if (partiesReady) {
        const primaryDebtor = ctx.debtors[0];
        if (!String(primaryDebtor?.address ?? '').trim()) {
            nudges.push({
                id: `${EXECUTION_CREATION_DOSSIER_KEY}:debtor-address`,
                kind: 'execution.creation_debtor_address_missing',
                surface: 'execution',
                priority: 8,
                message: 'عنوان المدين مطلوب للتبليغ — أدخله قبل الحفظ.',
                presence: {
                    present: String(primaryDebtor?.name ?? '').trim() ? [primaryDebtor!.name] : [],
                    missing: ['عنوان المدين'],
                },
                source: 'executionCreationNudgeRules',
                dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
                action: { label: 'إكمال العنوان', actionId: 'focus_debtor_address' },
            });
        }

        if (!hasClientCreditor(ctx.creditors)) {
            nudges.push({
                id: `${EXECUTION_CREATION_DOSSIER_KEY}:client-creditor`,
                kind: 'lawsuit.creation_client_missing',
                surface: 'execution',
                priority: 7,
                message: 'حدّد موكّلك ضمن الدائنين قبل حفظ إضبارة التنفيذ.',
                presence: { present: [], missing: ['دائن موكّل'] },
                source: 'executionCreationNudgeRules',
                dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
                action: { label: 'مراجعة الدائنين', actionId: 'focus_creditors' },
            });
        }

        const missingMonetary = findMissingRequiredMonetaryClaimAmount(
            effectiveTypes,
            ctx.claimType,
            ctx.claimAmountsByType,
            ctx.totalAmount,
        );
        if (missingMonetary) {
            nudges.push({
                id: `${EXECUTION_CREATION_DOSSIER_KEY}:monetary-gap`,
                kind: 'execution.creation_monetary_gap',
                surface: 'execution',
                priority: 6,
                message: `مبلغ المطالبة ناقص — أكمل «${missingMonetary}».`,
                presence: { present: effectiveTypes, missing: [missingMonetary] },
                source: 'executionCreationNudgeRules',
                dossierKey: EXECUTION_CREATION_DOSSIER_KEY,
                action: { label: 'إكمال المبلغ', actionId: 'focus_claim_amount' },
            });
        }
    }

    nudges.push(...buildExecutionCreationIntelNudges(ctx));

    return nudges.sort((a, b) => b.priority - a.priority);
}
