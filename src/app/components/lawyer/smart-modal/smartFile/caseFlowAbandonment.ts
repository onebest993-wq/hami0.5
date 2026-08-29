import type { CaseStage } from '../../LawyerShared';

type AbandonmentFlowContext = Pick<
    CaseStage,
    'isVoided' | 'abandonmentDate' | 'isPleadingsClosed' | 'abandonmentCount'
>;

type AbandonmentFlowLabel = {
    show: boolean;
    label: string;
    isSecondAttempt: boolean;
};

/** زر «ترك للمراجعة» — مرة واحدة قابلة للتجديد، والثانية إبطال */
export function resolveAbandonmentFlowAction(
    stage?: AbandonmentFlowContext | null,
): AbandonmentFlowLabel {
    if (!stage || stage.isVoided) {
        return { show: false, label: '', isSecondAttempt: false };
    }
    if (stage.abandonmentDate) {
        return { show: false, label: '', isSecondAttempt: false };
    }
    if (stage.isPleadingsClosed) {
        return { show: false, label: '', isSecondAttempt: false };
    }

    const count = stage.abandonmentCount ?? 0;
    const isSecondAttempt = count >= 1;

    return {
        show: true,
        label: isSecondAttempt
            ? 'ترك الدعوى للمراجعة (إبطال العريضة — المرة الثانية)'
            : 'ترك الدعوى للمراجعة',
        isSecondAttempt,
    };
}
