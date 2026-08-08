import type { SparkNudge } from '@/app/spark/types';
import type { CriminalCreationSparkContext } from '@/app/spark/context/criminalCreationSparkContext';
import { CRIMINAL_CREATION_DOSSIER_KEY } from '@/app/spark/context/criminalCreationSparkContext';
import { isInvestigationStoredStage } from '@/app/components/lawyer/criminal-system/criminalStageUtils';

export function collectCriminalCreationSparkNudges(ctx: CriminalCreationSparkContext): SparkNudge[] {
    const nudges: SparkNudge[] = [];
    const { draft } = ctx;

    if (
        ctx.isSeveranceMode &&
        ctx.pendingSeveranceReason === 'other' &&
        !String(ctx.pendingSeveranceReasonDetail ?? '').trim()
    ) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:severance-reason`,
            kind: 'criminal.creation_severance_reason',
            surface: 'criminal',
            priority: 10,
            message: 'حدّد سبب التفريق قبل إنشاء الإضبارة المفرّقة.',
            presence: { present: [], missing: ['سبب التفريق'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال السبب', actionId: 'focus_severance_reason' },
        });
    }

    if (!ctx.ourRepresentation) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:client-missing`,
            kind: 'criminal.creation_client_missing',
            surface: 'criminal',
            priority: 9,
            message: 'عيّن موكّلك — فعّل «موكل» أو «مكتبي» على مشتكٍ أو متهم.',
            presence: { present: [], missing: ['تمييز الموكل'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'مراجعة الأطراف', actionId: 'focus_parties' },
        });
    }

    if (ctx.mixedUnknownWithIdentified) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:unknown-mix`,
            kind: 'criminal.creation_investigation_location_incomplete',
            surface: 'criminal',
            priority: 8,
            message:
                'لا يجوز الجمع بين متهم مجهول ومتهم معلوم في مرحلة غير التحقيق — راجع الأطراف والمرحلة.',
            presence: { present: ['متهم مجهول'], missing: ['توحيد هوية المتهمين'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
        });
    }

    if (ctx.investigationLocationIncomplete && isInvestigationStoredStage(ctx.stage)) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:investigation-location`,
            kind: 'criminal.creation_investigation_location_incomplete',
            surface: 'criminal',
            priority: 8,
            message: 'أكمل بيانات مكان التحقيق — المحكمة، الجهة، واسم المركز أو المكتب.',
            presence: {
                present: ctx.stage ? [ctx.stage] : [],
                missing: ['محكمة التحقيق', 'مركز الشرطة / مكتب التحقيق'],
            },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال الموقع', actionId: 'focus_investigation_location' },
        });
    }

    if (ctx.isReferralStage) {
        const missing: string[] = [];
        if (!draft.basics.legalArticle.trim()) missing.push('المادة القانونية');
        if (!draft.location.baseRegisterNumberAndDate.trim()) missing.push('رقم وسجل القضية');
        if (!draft.location.investigationCourtName.trim()) missing.push('محكمة التحقيق');
        if (ctx.isTrialCourtStage) {
            if (!draft.location.courtName.trim()) missing.push('المحكمة');
            if (!draft.location.caseNumber.trim()) missing.push('رقم القضية');
        }
        if (missing.length) {
            nudges.push({
                id: `${CRIMINAL_CREATION_DOSSIER_KEY}:referral-fields`,
                kind: 'criminal.creation_referral_fields_incomplete',
                surface: 'criminal',
                priority: 7,
                message: 'مرحلة الإحالة — أكمل الحقول الإلزامية قبل الحفظ.',
                presence: { present: [ctx.stage], missing },
                source: 'criminalCreationNudgeRules',
                dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
                action: { label: 'إكمال البيانات', actionId: 'focus_referral_fields' },
            });
        }
    }

    if (ctx.complainantGuardianDataIncomplete) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:guardian`,
            kind: 'criminal.creation_guardian_incomplete',
            surface: 'criminal',
            priority: 6,
            message: 'مشتكٍ قاصر — أدخل اسم ولي الأمر وصلة القرابة.',
            presence: { present: [], missing: ['ولي الأمر', 'صلة القرابة'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال الولي', actionId: 'focus_guardian' },
        });
    }

    if (draft.isArticle3Offense && !String(draft.crimeDiscoveryDate ?? '').trim()) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:article3`,
            kind: 'criminal.creation_article3_discovery',
            surface: 'criminal',
            priority: 5,
            message: 'جريمة المادة ٣ — سجّل تاريخ اكتشاف الجريمة لاحتساب المهلة.',
            presence: { present: ['مادة ٣'], missing: ['تاريخ الاكتشاف'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'إدخال التاريخ', actionId: 'focus_discovery_date' },
        });
    }

    if (ctx.identifiedDefendantSaveIncomplete) {
        nudges.push({
            id: `${CRIMINAL_CREATION_DOSSIER_KEY}:defendant-name`,
            kind: 'criminal.creation_client_missing',
            surface: 'criminal',
            priority: 4,
            message: 'أدخل اسم المتهم المعرّف قبل حفظ الإضبارة.',
            presence: { present: [], missing: ['اسم المتهم'] },
            source: 'criminalCreationNudgeRules',
            dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
            action: { label: 'إكمال المتهم', actionId: 'focus_defendant' },
        });
    }

    return nudges.sort((a, b) => b.priority - a.priority);
}
