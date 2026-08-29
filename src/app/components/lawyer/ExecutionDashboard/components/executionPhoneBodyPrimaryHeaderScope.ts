/** شريحة مكتوبة لرأس بيانات الإضبارة داخل القسم الأساسي — بلا حقيبة عمياء. */

export const EXECUTION_PHONE_BODY_PRIMARY_HEADER_SCOPE_KEYS = [
    'statuteStatus',
    'isAlimonyClaim',
    'executionPaused',
    'handleResumeExecution',
    'stayOfExecutionActive',
    'viewExecutionData',
    'handleLiftStayOfExecution',
    'isHeaderExpanded',
    'toggleHeaderExpanded',
    'headerFields',
    'isEvictionExecutionModule',
    'classificationDisplay',
    'showJudgmentMeta',
    'docNumber',
    'judgmentDateDisplay',
    'claimTypeArabicDisplay',
    'evictionPropertyNumber',
    'evictionPropertyDistrict',
    'evictionPropertyTypeField',
    'evictionFullAddressField',
    'isInabaActive',
    'inabaTargets',
    'executionData',
    'isUnifiedTabActive',
    'persistExecutionMerge',
    'showToast',
    'setLinkedDossierToView',
    'setShowLinkedDossierTimeline',
    'setShowTransferFileNumberChangeModal',
    'activeSubFileId',
    'setExecutionStorageTick',
    'parentExecutionFile',
    'parentHeaderFields',
    'parentClassificationDisplay',
    'parentClaimTypeArabicDisplay',
    'parentShowJudgmentMeta',
    'parentJudgmentDateDisplay',
    'parentIsEvictionForExpandedHeader',
] as const;

export type ExecutionPhoneBodyPrimaryHeaderScopeKey =
    (typeof EXECUTION_PHONE_BODY_PRIMARY_HEADER_SCOPE_KEYS)[number];

export type ExecutionPhoneBodyPrimaryHeaderScope = Record<ExecutionPhoneBodyPrimaryHeaderScopeKey, unknown>;

export function pickExecutionPhoneBodyPrimaryHeaderScope(
    source: Record<string, unknown>,
): ExecutionPhoneBodyPrimaryHeaderScope {
    const out = {} as ExecutionPhoneBodyPrimaryHeaderScope;
    for (const key of EXECUTION_PHONE_BODY_PRIMARY_HEADER_SCOPE_KEYS) {
        out[key] = source[key];
    }
    if (!Array.isArray(out.inabaTargets)) {
        out.inabaTargets = [];
    }
    return out;
}
