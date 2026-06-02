import {
    formatJudicialPartyScopeNoticeMessage,
    type DecisionsPartyScope,
} from '../juvenileInvestigationRules';

/** حاوية توضيحية — تظهر بعد اختيار القرار في الإضبارة المختلطة فقط. */
export function JudicialPartyScopeNotice({
    scope,
    defendantNames = [],
}: {
    scope: DecisionsPartyScope;
    defendantNames?: readonly string[];
}) {
    const tone =
        scope === 'juvenile'
            ? 'border-violet-400/35 bg-violet-500/10 text-violet-100'
            : 'border-sky-400/35 bg-sky-500/10 text-sky-100';
    return (
        <div
            className={`rounded-lg border px-3 py-2 text-[11px] font-bold leading-relaxed whitespace-normal break-words ${tone}`}
            role="status"
        >
            {formatJudicialPartyScopeNoticeMessage(scope, defendantNames)}
        </div>
    );
}
