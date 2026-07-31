import type { JourneyNode } from '@/app/types/criminal';
import type { Statement } from '../criminalCaseModel';
import { StatementHighlightedContent } from './StatementHighlightedContent';
import { JourneyStageBadge } from './JourneyStageBadge';

const statementRoleLabel = (giverType: Statement['giverType']) => {
    if (giverType === 'complainant') return 'مشتكي/مجني عليه';
    if (giverType === 'defendant') return 'مشكو منه/متهم';
    if (giverType === 'witness') return 'شاهد';
    if (giverType === 'informant') return 'مخبر';
    return '—';
};

const statementRoleStyle = (giverType: Statement['giverType']) => {
    if (giverType === 'complainant') return 'border-sky-500/40 bg-sky-500/15 text-sky-200';
    if (giverType === 'defendant') return 'border-red-500/40 bg-red-500/15 text-red-200';
    if (giverType === 'witness') return 'border-violet-400/50 bg-violet-500/20 text-violet-100';
    return 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200';
};

type NamedParty = { id: string; fullName?: string };

export type StatementLogCardProps = {
    statement: Statement;
    stageJourney: JourneyNode[] | undefined;
    complainants: NamedParty[];
    defendants: NamedParty[];
    readOnly: boolean;
    /** يفتح مودال تأكيد النقل إلى سلة المهملات — يُدار في الأعلى. */
    onRequestTrash: () => void;
};

/**
 * بطاقة إفادة في سجل الإفادات (مشتكي/متهم/شاهد/مخبر)
 * — مستخرَجة من CriminalDashboardResolvedRuntime ضمن تفكيك المكوّن العملاق.
 */
export function StatementLogCard({
    statement: st,
    stageJourney,
    complainants,
    defendants,
    readOnly,
    onRequestTrash,
}: StatementLogCardProps) {
    const roleLabel = statementRoleLabel(st.giverType);
    const roleStyle = statementRoleStyle(st.giverType);
    const isRatified = Boolean(st.isJudiciallyRatified);
    const isWitness = st.giverType === 'witness';
    const witnessDisplayName = String(st.witnessName ?? '').trim() || st.giverName.trim();
    const witnessScopeLabel = (() => {
        if (!isWitness) return '';
        const side = st.witnessPartySide;
        const ids = st.witnessPartyIds ?? [];
        const pool = side === 'complainant' ? complainants : side === 'defendant' ? defendants : [];
        const names = ids
            .map((pid) => pool.find((p) => p.id === pid)?.fullName?.trim())
            .filter(Boolean);
        if (names.length) {
            return side === 'complainant'
                ? `يخص المشتكي/المجني عليه: ${names.join('، ')}`
                : `يخص المشكو منه/المتهم: ${names.join('، ')}`;
        }
        if (st.witnessKind === 'prosecution') return 'يخص المشتكي/المجني عليه';
        if (st.witnessKind === 'defense') return 'يخص المشكو منه/المتهم';
        return '';
    })();

    return (
        <div
            className={
                isRatified
                    ? 'w-full rounded-2xl border border-[#E6C673]/60 bg-[#E6C673]/5 p-4'
                    : isWitness
                      ? 'w-full rounded-2xl border border-violet-500/45 bg-violet-950/40 p-4'
                      : 'w-full rounded-2xl border border-slate-700 bg-slate-800/40 p-4'
            }
        >
            <div className="flex flex-wrap items-center gap-2">
                <div className="text-white/70 font-bold text-xs whitespace-normal break-words">
                    {st.date}
                </div>
                <div
                    className={
                        isWitness
                            ? 'text-violet-200 font-black text-base whitespace-normal break-words'
                            : 'text-white font-black text-sm whitespace-normal break-words'
                    }
                >
                    {isWitness ? witnessDisplayName : st.giverName}
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${roleStyle}`}
                    >
                        {roleLabel}
                    </div>
                    <JourneyStageBadge
                        stageJourney={stageJourney}
                        item={{ date: st.date, proceduralNodeId: st.proceduralNodeId }}
                    />
                    {isRatified ? (
                        <div className="rounded-full border border-[#E6C673]/60 bg-[#E6C673]/10 px-2.5 py-1 text-[11px] font-black text-[#E6C673] whitespace-normal break-words">
                            ✓ مُصدّقة قضائياً
                        </div>
                    ) : null}
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRequestTrash();
                            }}
                            className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition print:hidden"
                            aria-label="حذف الإفادة"
                        >
                            🗑️
                        </button>
                    ) : null}
                </div>
            </div>

            {isWitness && witnessScopeLabel ? (
                <div className="mt-1 text-violet-200/85 text-[11px] font-bold whitespace-normal break-words print:text-black">
                    {witnessScopeLabel}
                </div>
            ) : null}

            {isWitness && st.witnessDetails?.trim() ? (
                <div className="mt-2 text-violet-200/90 text-xs font-bold whitespace-normal break-words print:text-black">
                    {st.witnessDetails.trim()}
                </div>
            ) : null}

            <div className="mt-3 text-white/90 text-sm whitespace-normal break-words leading-relaxed print:text-black">
                <span className="text-white/60 font-black ml-2">❝</span>
                <StatementHighlightedContent
                    content={st.content}
                    highlights={st.contentHighlights}
                />
            </div>
        </div>
    );
}
