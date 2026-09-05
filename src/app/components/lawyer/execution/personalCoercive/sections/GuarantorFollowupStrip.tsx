import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type GuarantorFollowupStripProps = PickPersonalCoerciveSectionProps<
    | 'allDecisionRows'
    | 'coerciveUiLocked'
    | 'exId'
    | 'executionId'
    | 'findLatestGuarantorDecisionId'
    | 'findLatestGuarantorDecisionRow'
    | 'guarantorAwaitingSave'
    | 'guarantorDec'
    | 'guarantorFollowupBlock'
    | 'onGuarantorRequest'
    | 'onOpenDecisions'
    | 'onOpenGuarantorDetails'
    | 'renderRejectedExecutorAppealSection'
>;

/** مسار الكفيل أصبح شارة تسوية فقط — الشريط القديم مُلغى */
export function GuarantorFollowupStrip(_props: GuarantorFollowupStripProps) {
    return null;
}
