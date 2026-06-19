import { DECISION_META_CHIP } from '../decisionCardPresentation';

type DecisionDebtorFateLineProps = {
    enforcementState: {
        enforced: boolean;
        pillLabel: string;
    };
    fateLine: string;
};

export function DecisionDebtorFateLine({ enforcementState, fateLine }: DecisionDebtorFateLineProps) {
    return (
        <p
            className={`${DECISION_META_CHIP} inline-flex w-full justify-end text-[10px] leading-relaxed ${
                enforcementState.enforced
                    ? 'border-rose-400/20 text-rose-200/90'
                    : enforcementState.pillLabel.includes('لصالح موكّلنا')
                      ? 'border-emerald-400/20 text-emerald-100/90'
                      : 'border-white/12 text-slate-200/90'
            }`}
        >
            {fateLine}
        </p>
    );
}
