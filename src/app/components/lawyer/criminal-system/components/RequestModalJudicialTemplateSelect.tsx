import {
    formatJudicialTemplateDisplayLabel,
} from '../proceduralRequestTypes';
import {
    buildInvestigationJudicialTemplateGroups,
    decodeInvestigationJudicialSelectValue,
    ADULT_JUDGE_DECISION_OPTGROUP_LABEL,
    COMMON_JUDICIAL_OPTGROUP_LABEL,
    JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL,
    type InvestigationDefendantsPartyMix,
} from '../juvenileInvestigationRules';

export type RequestModalJudicialTemplateSelectProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    reqTypeTemplate: string;
    trialCourtManualOnly?: boolean;
    isInvestigationPhase?: boolean;
    defendantsPartyMix?: InvestigationDefendantsPartyMix;
    isAllDefendantsUnknown?: boolean;
    assetSeizureFugitiveCount: number;
    onApplyJudicialTemplate: (template: string, groupScope?: 'adult' | 'juvenile' | null) => void;
    onClearEntryLane: () => void;
};

export function RequestModalJudicialTemplateSelect({
    reqEntryLane,
    reqTypeTemplate,
    trialCourtManualOnly = false,
    isInvestigationPhase = false,
    defendantsPartyMix = 'adults_only',
    isAllDefendantsUnknown = false,
    assetSeizureFugitiveCount,
    onApplyJudicialTemplate,
    onClearEntryLane,
}: RequestModalJudicialTemplateSelectProps) {
    if (trialCourtManualOnly) return null;

    const judicialTemplateGroups = buildInvestigationJudicialTemplateGroups(trialCourtManualOnly, {
        includeAssetSeizure: assetSeizureFugitiveCount > 0,
        isInvestigationPhase,
        defendantsPartyMix,
        isAllDefendantsUnknown,
    });
    const judicialTemplateSelected =
        reqEntryLane === 'judicial' && Boolean(String(reqTypeTemplate ?? '').trim());
    const judicialSelectValue =
        judicialTemplateSelected && reqTypeTemplate.trim() ? reqTypeTemplate.trim() : '';

    return (
        <select
            className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E6C673]/60 ${
                judicialTemplateSelected ? 'text-white' : 'text-white/40'
            }`}
            value={judicialSelectValue}
            onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) {
                    onClearEntryLane();
                    return;
                }
                const { template, groupScope } = decodeInvestigationJudicialSelectValue(v);
                onApplyJudicialTemplate(template, groupScope);
            }}
        >
            <option value="" disabled hidden className="bg-slate-900 text-white/40">
                قرار القاضي
            </option>
            {judicialTemplateGroups.common.length ? (
                <optgroup
                    label={COMMON_JUDICIAL_OPTGROUP_LABEL}
                    className="bg-slate-900 text-white/80"
                >
                    {judicialTemplateGroups.common.map((opt) => (
                        <option key={`common-${opt}`} value={opt} className="bg-slate-900 text-white">
                            {formatJudicialTemplateDisplayLabel(opt)}
                        </option>
                    ))}
                </optgroup>
            ) : null}
            {judicialTemplateGroups.adult.length ? (
                <optgroup
                    label={ADULT_JUDGE_DECISION_OPTGROUP_LABEL}
                    className="bg-slate-900 text-white/80"
                >
                    {judicialTemplateGroups.adult.map((opt) => (
                        <option key={`adult-${opt}`} value={opt} className="bg-slate-900 text-white">
                            {formatJudicialTemplateDisplayLabel(opt)}
                        </option>
                    ))}
                </optgroup>
            ) : null}
            {judicialTemplateGroups.juvenile.length ? (
                <optgroup
                    label={JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL}
                    className="bg-slate-900 text-white/80"
                >
                    {judicialTemplateGroups.juvenile.map((opt) => (
                        <option
                            key={`jv-${opt}`}
                            value={opt}
                            className="bg-slate-900 text-white"
                        >
                            {formatJudicialTemplateDisplayLabel(opt)}
                        </option>
                    ))}
                </optgroup>
            ) : null}
        </select>
    );
}
