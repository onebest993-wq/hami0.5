import { SmartToast } from '@/app/components/ui/SmartToast';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import {
    normalizeSpecificDeliveryItemsForSave,
    type SpecificDeliveryItem,
} from '@/app/utils/specificDeliveryItemsUtils';
import { findMissingRequiredMonetaryClaimAmount, findMissingPastAlimonyClaimFieldMessage, parseMoneyInput } from './executionFormUtils';
import { getFinancialSplitHint } from './useImprisonmentEligibility';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import { buildVisitationScheduleBundle } from '@/app/domain/execution/visitation/visitationScheduleEngine';
import type { ForeignJudgmentData } from '../components/ForeignJudgmentSection';
import type {
    AdditionalCreditorDraft,
    AdditionalDebtorDraft,
    CreditorDraft,
    DebtorDraft,
    ExecutionTargetOption,
} from '../types';
import type { AlimonyCalculationResult } from './useAlimonyCalculator';

export type ValidateExecutionCreationSubmitInput = {
    directorate: string;
    fileNumber: string;
    creditors: CreditorDraft[];
    debtors: DebtorDraft[];
    additionalCreditors: AdditionalCreditorDraft[];
    additionalDebtorsForm: AdditionalDebtorDraft[];
    debtorManualDebtClaims: Record<string, string>;
    allowMultipleDebtors: boolean;
    docType: string;
    claimType: string;
    activeClaimTypes: string[];
    claimAmountsByType: Record<string, string>;
    totalAmount: string;
    foreignData: ForeignJudgmentData;
    visitationScheduleDraft: Partial<VisitationScheduleConfig>;
    custodyWardNames: string[];
    evictionPropertyNumber: string;
    evictionDistrict: string;
    evictionPropertyType: string;
    evictionFullAddress: string;
    specificDeliveryItems: SpecificDeliveryItem[];
    executionTarget: ExecutionTargetOption;
    isDocumentBlocked: boolean;
    alimonyLawsuitDate: string;
    alimonyWifeMonthly: string;
    alimonyPastStartDate: string;
    pastWifeAlimonyAmount: string;
    calculatedAlimonyNew: AlimonyCalculationResult | null | undefined;
};

export type ValidateExecutionCreationSubmitResult =
    | { ok: true; pendingClaimTypes: string[] }
    | { ok: false };

/**
 * فحوصات نموذج فتح الإضبارة قبل التجميع والحفظ — بدون تغيير سلوك الرسائل.
 */
export function validateExecutionCreationSubmit(
    input: ValidateExecutionCreationSubmitInput,
): ValidateExecutionCreationSubmitResult {
    const {
        directorate,
        fileNumber,
        creditors,
        debtors,
        additionalCreditors,
        additionalDebtorsForm,
        debtorManualDebtClaims,
        allowMultipleDebtors,
        docType,
        claimType,
        activeClaimTypes,
        claimAmountsByType,
        totalAmount,
        foreignData,
        visitationScheduleDraft,
        custodyWardNames,
        evictionPropertyNumber,
        evictionDistrict,
        evictionPropertyType,
        evictionFullAddress,
        specificDeliveryItems,
        executionTarget,
        isDocumentBlocked,
        alimonyLawsuitDate,
        alimonyWifeMonthly,
        alimonyPastStartDate,
        pastWifeAlimonyAmount,
        calculatedAlimonyNew,
    } = input;

    if (!directorate.trim()) {
        SmartToast.error('⚠️ يرجى كتابة اسم مديرية التنفيذ');
        return { ok: false };
    }

    if (!fileNumber.trim()) {
        SmartToast.error('⚠️ يرجى إدخال رقم الإضبارة والسنة');
        return { ok: false };
    }

    const hasClient =
        creditors.some((c) => c.isClient) ||
        additionalCreditors.some((c) => c.isClient) ||
        debtors.some((d) => d.isClient) ||
        additionalDebtorsForm.some((d) => d.isClient);
    if (!hasClient) {
        SmartToast.error('⚠️ يرجى تحديد موكلك من خلال اختيار "موكلي" لأحد الأطراف على الأقل');
        return { ok: false };
    }

    if (!creditors[0]?.name.trim()) {
        SmartToast.error('⚠️ يرجى إكمال اسم الدائن');
        return { ok: false };
    }

    for (let i = 0; i < additionalCreditors.length; i++) {
        if (!additionalCreditors[i].name.trim()) {
            SmartToast.error(`⚠️ يرجى إكمال اسم ${i + 2}- دائن`);
            return { ok: false };
        }
    }

    if (!debtors[0]?.name.trim()) {
        SmartToast.error('⚠️ يرجى إكمال اسم المدين');
        return { ok: false };
    }

    if (!allowMultipleDebtors && additionalDebtorsForm.length > 0) {
        SmartToast.error('⚠️ مطالبات أحوال شخصية لا تقبل تعدد المدينين — احذف المدينين الإضافيين');
        return { ok: false };
    }

    const pendingClaimTypes =
        activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
    const missingMonetaryClaim = findMissingRequiredMonetaryClaimAmount(
        pendingClaimTypes,
        claimType,
        claimAmountsByType,
        totalAmount,
        { pastAlimonyAccumulation: calculatedAlimonyNew?.pastAccumulation },
    );
    if (missingMonetaryClaim) {
        const message =
            missingMonetaryClaim === 'نفقة ماضية'
                ? findMissingPastAlimonyClaimFieldMessage({
                      alimonyPastStartDate,
                      alimonyLawsuitDate,
                      pastWifeMonthly: pastWifeAlimonyAmount,
                      fallbackWifeMonthly: alimonyWifeMonthly,
                  })
                : `يرجى إدخال المبلغ المطلوب — ${missingMonetaryClaim}`;
        SmartToast.error(`⚠️ ${message}`);
        return { ok: false };
    }

    for (let i = 0; i < additionalDebtorsForm.length; i++) {
        if (!additionalDebtorsForm[i].name.trim()) {
            SmartToast.error(`⚠️ يرجى إكمال اسم المدين الإضافي ${i + 1}`);
            return { ok: false };
        }
    }

    const splitHint = getFinancialSplitHint(claimType, [
        debtors[0] ?? {},
        ...additionalDebtorsForm,
    ]);
    if (splitHint) {
        const independentSlots = [
            { id: String(debtors[0]?.id ?? ''), solidary: Boolean(debtors[0]?.isSolidaryLiability) },
            ...additionalDebtorsForm.map((d) => ({
                id: String(d.id),
                solidary: Boolean(d.isSolidaryLiability),
            })),
        ].filter((s) => !s.solidary);
        const missingIndependent = independentSlots.some(
            (s) => parseMoneyInput(debtorManualDebtClaims[s.id] ?? '') <= 0,
        );
        if (missingIndependent) {
            SmartToast.error(`⚠️ ${splitHint}`);
            return { ok: false };
        }
    }

    if (pendingClaimTypes.includes('تسليم شيء معين')) {
        if (specificDeliveryItems.length === 0) {
            SmartToast.error(
                '⚠️ أضف شيئاً واحداً على الأقل وحدّد نوعه (منقول أو غير منقول)',
            );
            return { ok: false };
        }
        for (const item of specificDeliveryItems) {
            if (!String(item.name || '').trim()) {
                SmartToast.error(
                    item.nature === 'immovable'
                        ? '⚠️ أدخل رقم العقار لكل شيء غير منقول'
                        : '⚠️ أدخل وصف الشيء المنقول',
                );
                return { ok: false };
            }
            if (item.declaredDestroyed && !(Math.trunc(Number(item.judgmentValueIqd) || 0) > 0)) {
                SmartToast.error(
                    `⚠️ أدخل القيمة المحكوم بها للشيء الهالك: ${item.name.trim() || '—'}`,
                );
                return { ok: false };
            }
        }
        const normalizedItems = normalizeSpecificDeliveryItemsForSave(specificDeliveryItems);
        if (normalizedItems.length === 0) {
            SmartToast.error(
                '⚠️ أضف شيئاً واحداً على الأقل وحدّد نوعه (منقول أو غير منقول)',
            );
            return { ok: false };
        }
    }

    if (isEvictionClaim(claimType)) {
        if (!evictionPropertyNumber.trim()) {
            SmartToast.error('⚠️ رقم العقار (أو رقم الدار) مطلوب لتخلية المأجور');
            return { ok: false };
        }
        if (!evictionDistrict.trim()) {
            SmartToast.error('⚠️ المقاطعة مطلوبة');
            return { ok: false };
        }
        if (!evictionPropertyType.trim()) {
            SmartToast.error('⚠️ نوع وجنس العقار مطلوب');
            return { ok: false };
        }
        if (!evictionFullAddress.trim()) {
            SmartToast.error('⚠️ العنوان الكامل للعين مطلوب');
            return { ok: false };
        }
    }

    if (docType === 'تنفيذ الأحكام الأجنبية') {
        if (!foreignData.country.trim()) {
            SmartToast.error('⚠️ يرجى تحديد دولة إصدار الحكم الأجنبي');
            return { ok: false };
        }
        if (!foreignData.court.trim()) {
            SmartToast.error('⚠️ يرجى تحديد اسم المحكمة المصدرة');
            return { ok: false };
        }
    }

    if (docType === 'الأوراق التجارية' && executionTarget === 'المُظَهِّر') {
        SmartToast.error(
            '🛑 يمنع القانون التنفيذ المباشر على المُظَهِّر. يجب إقامة دعوى تجارية في محكمة البداءة أولاً.',
        );
        return { ok: false };
    }

    if (docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل غير متضامن') {
        SmartToast.error(
            '🛑 لا يجوز التنفيذ المباشر. يجب التنفيذ على المدين الأصلي وتجريده من أمواله أولاً.',
        );
        return { ok: false };
    }

    if (isDocumentBlocked) {
        SmartToast.error(
            '🛑 توقف: فقدَ هذا السند قوته التنفيذية المباشرة. يجب إقامة دعوى إثبات دين في محكمة البداءة.',
        );
        return { ok: false };
    }

    if (claimType === 'مشاهدة' || activeClaimTypes.includes('مشاهدة')) {
        const built = buildVisitationScheduleBundle(
            visitationScheduleDraft as VisitationScheduleConfig,
        );
        if ('error' in built) {
            SmartToast.error(`⚠️ ${built.error}`);
            return { ok: false };
        }
    }

    if (claimType === 'تسليم ولد' || pendingClaimTypes.includes('تسليم ولد')) {
        const trimmedWards = custodyWardNames.map((n) => n.trim()).filter(Boolean);
        if (trimmedWards.length === 0) {
            SmartToast.error('⚠️ يرجى إدخال اسم محضون واحد على الأقل (نزع حضانة)');
            return { ok: false };
        }
        for (let i = 0; i < custodyWardNames.length; i++) {
            if (!String(custodyWardNames[i] || '').trim()) {
                SmartToast.error(`⚠️ يرجى إكمال اسم المحضون ${i + 1}`);
                return { ok: false };
            }
        }
    }

    return { ok: true, pendingClaimTypes };
}
