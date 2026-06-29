import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import { hubWithInferredAppealOrigin, isCreditorInitiatedExecutorRequest } from '../../utils/appealRequestOrigin';
import { resolveCassationFilerActor } from '../../utils/appeal-engine/appealWorkflowActors';
import type { DecisionsAppealsAppealSlot } from '../../utils';
import { DECISION_BTN_PRIMARY_FLEX, DECISION_BTN_SECONDARY_FLEX } from './appealRendererButtonClasses';

export function useAppealTamyeezPhaseRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        applyCassationCourtDecision,
        tamyeezNumberDraftById,
        setTamyeezNumberDraftById,
        tamyeezEditOpenById,
        setTamyeezEditOpenById,
    } = args;

    const renderAppealTamyeezPhasePanel = (
        decision: Decision,
        variant: DecisionsAppealsAppealSlot,
        cassTips: { rad: string; naqd: string },
        onCommitTamyeezNumber: (trimmed: string) => void
    ) => {
        const outerClass = variant === 'appealsTab' ? 'space-y-2' : 'mb-3 space-y-2';
        const editLabel =
            variant === 'appealsTab' ? 'تعديل رقم القرار التمييزي' : 'تعديل رقم التمييز';
        const hasNum = Boolean(decision.tamyeezDecisionNumber?.trim());
        const showNumberSavedRow = hasNum && !tamyeezEditOpenById[decision.id];
        const hub = hubWithInferredAppealOrigin(decision);
        const cassationFiler = resolveCassationFilerActor(decision);
        const cassationNumberOptional =
            cassationFiler === 'debtor' && !isCreditorInitiatedExecutorRequest(hub);

        return (
            <div className={outerClass}>
                <label className="block text-[11px] text-slate-400 text-right">
                    رقم التمييز
                    {cassationNumberOptional ? (
                        <span className="text-slate-500 mr-1">(اختياري)</span>
                    ) : null}
                </label>
                <div className="flex flex-row-reverse flex-wrap items-center gap-2">
                    {showNumberSavedRow ? (
                        <>
                            <button
                                type="button"
                                title={cassTips.naqd}
                                onClick={() => applyCassationCourtDecision(decision, 'naqd')}
                                className={DECISION_BTN_PRIMARY_FLEX}
                            >
                                نقض القرار
                            </button>
                            <button
                                type="button"
                                title={cassTips.rad}
                                onClick={() => applyCassationCourtDecision(decision, 'rad_laheeza')}
                                className={DECISION_BTN_SECONDARY_FLEX}
                            >
                                تصديق القرار
                            </button>
                            <button
                                type="button"
                                onClick={() => setTamyeezEditOpenById((p) => ({ ...p, [decision.id]: true }))}
                                className={DECISION_BTN_SECONDARY_FLEX}
                            >
                                {editLabel}
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={
                                    tamyeezNumberDraftById[decision.id] ??
                                    decision.tamyeezDecisionNumber ??
                                    ''
                                }
                                onChange={(e) =>
                                    setTamyeezNumberDraftById((p) => ({
                                        ...p,
                                        [decision.id]: e.target.value,
                                    }))
                                }
                                className="flex-1 border-b border-white/10 bg-transparent py-2 text-[11px] text-gray-100 text-right outline-none focus:border-purple-500/40"
                                placeholder="أدخل رقم القرار"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const v = String(
                                        tamyeezNumberDraftById[decision.id] ??
                                            decision.tamyeezDecisionNumber ??
                                            ''
                                    ).trim();
                                    if (!cassationNumberOptional && !v) return;
                                    setTamyeezNumberDraftById((p) => ({ ...p, [decision.id]: v }));
                                    setTamyeezEditOpenById((p) => ({ ...p, [decision.id]: false }));
                                    if (v) onCommitTamyeezNumber(v);
                                }}
                                className={DECISION_BTN_PRIMARY_FLEX}
                            >
                                حفظ
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return { renderAppealTamyeezPhasePanel };
}
