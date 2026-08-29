import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ShieldCheck } from '@/app/components/ui/icons/ShieldCheck';
import { ShieldX } from '@/app/components/ui/icons/ShieldX';
import { Clock } from '@/app/components/ui/icons/Clock';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { Ban } from '@/app/components/ui/icons/Ban';
import { Archive } from '@/app/components/ui/icons/Archive';
import type { DecisionCardEnforcementVisual } from './decisionCardGlassShell';
import type { DecisionHubStatusPillTone, ExecutorRequestFollowupBlock } from './utils';
import type { Decision } from './types';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import {
    applyLawyerCassationEntryForExecution,
    openDecisionsAppealsAfterCassation,
} from '@/app/utils/lawyerCassationEntry';
import {
    appealCassationEntryLabels,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from './appealUiLabels';

export { DECISION_CARD_GLASS_SHELL, decisionCardGlassClasses } from './decisionCardGlassShell';

export const DECISION_CARD_LAYOUT = 'flex h-full min-h-0 flex-col justify-between gap-2';

export const DECISION_HUB_PILL_CLASS: Record<DecisionHubStatusPillTone, string> = {
    emerald:
        'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
    red: 'border-rose-400/20 bg-rose-500/[0.08] text-rose-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    amber:
        'border-amber-400/20 bg-amber-500/[0.08] text-amber-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    violet:
        'border-violet-400/20 bg-violet-500/[0.08] text-violet-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
    slate: 'border-white/10 bg-white/[0.05] text-slate-200/90',
    neutral: 'border-white/12 bg-white/[0.06] text-slate-100/90',
};

export const DECISION_HUB_PILL_BASE =
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold backdrop-blur-sm transition-colors';

export const DECISION_ACTION_BTN_PRIMARY =
    'w-full rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/[0.08] px-3 py-2 text-center text-[11px] font-bold text-[#E6C673] backdrop-blur-sm transition-all duration-200 hover:border-[#E6C673]/40 hover:bg-[#E6C673]/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/30 disabled:pointer-events-none disabled:opacity-40';

export const DECISION_ACTION_BTN_SECONDARY =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[11px] font-semibold text-slate-200 backdrop-blur-sm transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40';

/** صف أفقي موحّد لأزرار الطعن الأولي (تظلم / تمييز / استغناء) */
export const DECISION_APPEAL_TOOLBAR_ROW =
    'flex w-full min-w-0 flex-row-reverse items-stretch gap-1.5';

export const DECISION_APPEAL_TOOLBAR_BTN_PRIMARY =
    'flex min-h-[34px] min-w-0 flex-1 basis-0 items-center justify-center rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/[0.08] px-2 py-1.5 text-center text-[10px] font-bold leading-snug text-[#E6C673] backdrop-blur-sm transition-all duration-200 hover:border-[#E6C673]/40 hover:bg-[#E6C673]/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/30 disabled:pointer-events-none disabled:opacity-40';

export const DECISION_APPEAL_TOOLBAR_BTN_SECONDARY =
    'flex min-h-[34px] min-w-0 flex-1 basis-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center text-[10px] font-semibold leading-snug text-slate-200 backdrop-blur-sm transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40';

/** زر إشعار — المدين طعن بالقرار */
export const DECISION_BTN_DEBTOR_APPEAL_NOTICE =
    'w-full rounded-xl border border-sky-400/25 bg-sky-500/[0.08] px-3 py-2.5 text-center text-[11px] font-bold text-sky-100 backdrop-blur-sm transition-all duration-200 hover:border-sky-400/40 hover:bg-sky-500/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/30 disabled:pointer-events-none disabled:opacity-40';

export const DECISION_BTN_GRIEVANCE_ACCEPT =
    'rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-2 text-[11px] font-bold text-emerald-100 backdrop-blur-sm transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/30 disabled:pointer-events-none disabled:opacity-40';

export const DECISION_BTN_GRIEVANCE_REJECT =
    'rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-4 py-2 text-[11px] font-bold text-rose-100 backdrop-blur-sm transition-all duration-200 hover:border-rose-400/40 hover:bg-rose-500/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 disabled:pointer-events-none disabled:opacity-40';

export const DECISION_NOTICE_GLASS =
    'rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-200/95 backdrop-blur-sm';

export const DECISION_META_CHIP =
    'inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm';

function pillIcon(visual: DecisionCardEnforcementVisual) {
    const cls = 'h-3 w-3 shrink-0 opacity-80';
    switch (visual) {
        case 'enforced':
            return <ShieldCheck className={cls} />;
        case 'paused':
            return <Clock className={cls} />;
        case 'lifecycle_reset':
            return <RotateCcw className={cls} />;
        case 'not_enforced':
            return <ShieldX className={cls} />;
        case 'pending':
            return <Clock className={cls} />;
        case 'withdrawn':
            return <Ban className={cls} />;
        case 'neutral':
            return <Scale className={cls} />;
        default:
            return null;
    }
}

export function DecisionStatusBadge({
    label,
    tone,
    visual,
    onClick,
}: {
    label: string;
    tone: DecisionHubStatusPillTone;
    visual: DecisionCardEnforcementVisual;
    onClick?: () => void;
}) {
    const className = `${DECISION_HUB_PILL_BASE} ${DECISION_HUB_PILL_CLASS[tone]} ${
        onClick ? 'cursor-pointer hover:brightness-110' : ''
    }`;
    const content = (
        <>
            {pillIcon(visual)}
            <span>{label}</span>
        </>
    );
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={className}>
                {content}
            </button>
        );
    }
    return <span className={className}>{content}</span>;
}

export function AppealResultChip({
    result,
    flowGateKind = 'continue',
    perspective = 'creditor_agent',
    appealActor = null,
}: {
    result: NonNullable<Decision['appealResult']>;
    flowGateKind?: 'continue' | 'paused' | 'lifecycle_reset' | 'revoked';
    perspective?: AppealUiPerspective;
    appealActor?: 'lawyer' | 'debtor' | null;
}) {
    const tone = (() => {
        if (flowGateKind === 'lifecycle_reset') {
            return 'border-violet-400/18 bg-violet-500/[0.07] text-violet-100/85';
        }
        if (perspective === 'debtor_agent') {
            const favorable = isAppealResultFavorableToDebtorClient(result, appealActor);
            return favorable
                ? 'border-emerald-400/18 bg-emerald-500/[0.07] text-emerald-100/85'
                : 'border-rose-400/18 bg-rose-500/[0.07] text-rose-100/85';
        }
        if (
            result === 'قبول التظلم' &&
            (flowGateKind === 'paused' || flowGateKind === 'revoked' || appealActor === 'debtor')
        ) {
            return 'border-rose-400/18 bg-rose-500/[0.07] text-rose-100/85';
        }
        if (result === 'تصديق القرار' || result === 'رد اللائحة' || result === 'قبول التظلم') {
            return 'border-emerald-400/18 bg-emerald-500/[0.07] text-emerald-100/85';
        }
        if (result === 'نقض القرار') {
            return 'border-rose-400/18 bg-rose-500/[0.07] text-rose-100/85';
        }
        if (result === 'رد التظلم') {
            return 'border-amber-400/18 bg-amber-500/[0.07] text-amber-100/85';
        }
        return 'border-white/10 bg-white/[0.04] text-slate-300';
    })();
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone}`}
        >
            <Scale className="h-3.5 w-3.5 opacity-70" />
            <span>{result}</span>
        </span>
    );
}

export type FollowupShellTone = 'emerald' | 'sky' | 'violet' | 'rose' | 'amber';

/** عناوين وألوان حاوية الإكمال عند إيقاف متابعة الطلب بعد الطعن */
export function followupBlockShellMeta(
    block: ExecutorRequestFollowupBlock | null | undefined,
    defaultTitle: string,
    defaultTone: FollowupShellTone,
    perspective: AppealUiPerspective = 'creditor_agent'
): { title: string; tone: FollowupShellTone; defaultExpanded: boolean } {
    if (!block) {
        return { title: defaultTitle, tone: defaultTone, defaultExpanded: false };
    }
    const title =
        block.kind === 'lifecycle_reset'
            ? 'أُعيدت الدورة — الطعن'
            : block.kind === 'revoked'
              ? 'غير نافذ — الطعن'
              : perspective === 'debtor_agent'
                ? 'متوقف مؤقتاً — قبول تظلم موكّلنا'
                : 'متوقف مؤقتاً — قبول تظلم المدين';
    const tone: FollowupShellTone =
        block.kind === 'lifecycle_reset' ? 'violet' : block.kind === 'revoked' ? 'rose' : 'amber';
    return { title, tone, defaultExpanded: true };
}

function followupBlockToneClass(kind: ExecutorRequestFollowupBlock['kind']): string {
    switch (kind) {
        case 'paused':
            return 'border-amber-400/15 text-amber-100/90';
        case 'lifecycle_reset':
            return 'border-violet-400/15 text-violet-100/90';
        case 'revoked':
            return 'border-rose-400/15 text-rose-100/90';
        default:
            return '';
    }
}

/** لوحة موحّدة لإيقاف متابعة الطلب بعد الطعن — تظلم المدين / نقض / إعادة دورة */
export function ExecutorRequestFollowupBlockPanel({
    gate,
    executionId,
    decisionId,
    appealPerspective = 'creditor_agent',
    onOpenAppeals,
    onWaiveCassation,
    onStartCassation,
}: {
    gate: ExecutorRequestFollowupBlock;
    executionId: string;
    decisionId: string;
    appealPerspective?: AppealUiPerspective;
    onOpenAppeals?: (decisionId: string) => void;
    /** يُفضَّل على حدث النافذة — يعمل من المحضر دون فتح مركز القرارات */
    onWaiveCassation?: (decisionId: string) => void;
    onStartCassation?: (decisionId: string) => void;
}) {
    const tone = followupBlockToneClass(gate.kind);
    const cassationLabel = appealCassationEntryLabels(appealPerspective, 'lawyer').button;
    return (
        <div className={`${DECISION_NOTICE_GLASS} space-y-2 ${tone}`}>
            <p className="text-[11px] font-medium leading-relaxed">{gate.message}</p>
            <div className="flex flex-col gap-2">
                {gate.kind === 'paused' && gate.showWaiveCassation && decisionId ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                if (onStartCassation) {
                                    onStartCassation(decisionId);
                                    return;
                                }
                                const result = applyLawyerCassationEntryForExecution({
                                    executionId,
                                    decisionId,
                                    appealPerspective,
                                });
                                if (result.ok) {
                                    openDecisionsAppealsAfterCassation({
                                        executionId,
                                        scrollDecisionId: result.scrollDecisionId ?? decisionId,
                                    });
                                    return;
                                }
                                if (result.scrollDecisionId) {
                                    openDecisionsAppealsAfterCassation({
                                        executionId,
                                        scrollDecisionId: result.scrollDecisionId,
                                    });
                                }
                            }}
                            className={DECISION_ACTION_BTN_PRIMARY}
                        >
                            {cassationLabel}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (onWaiveCassation) {
                                    onWaiveCassation(decisionId);
                                    return;
                                }
                                try {
                                    window.dispatchEvent(
                                        new CustomEvent('hami-waive-cassation-for-decision', {
                                            detail: { executionId, decisionId },
                                        })
                                    );
                                } catch {
                                    /* ignore */
                                }
                            }}
                            className={DECISION_ACTION_BTN_SECONDARY}
                        >
                            لا حاجة للتمييز
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}

/** استغناء عن مهلة الطعن (تظلم/تمييز) — متزامن بين القرارات والمحضر */
export function WaiveInitialAppealButton({
    executionId,
    decisionId,
    allDecisions,
    disabled,
    onApplied,
    appealPerspective = 'creditor_agent',
}: {
    executionId: string | undefined;
    decisionId: string | undefined;
    allDecisions: Decision[];
    disabled?: boolean;
    onApplied?: (result: { ok: boolean; message?: string }) => void;
    appealPerspective?: AppealUiPerspective;
}) {
    const did = String(decisionId ?? '').trim();
    const exId = String(executionId ?? '').trim();
    const row = allDecisions.find((d) => String(d.id ?? '').trim() === did);
    if (!row || !canWaiveInitialAppeal(row, allDecisions, appealPerspective)) return null;

    return (
        <button
            type="button"
            disabled={Boolean(disabled)}
            onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                const result = applyWaiveInitialAppealForExecution({
                    executionId: exId,
                    decisionId: did,
                });
                onApplied?.(result);
            }}
            className={DECISION_ACTION_BTN_SECONDARY}
        >
            لا حاجة للطعن
        </button>
    );
}

export function ArchiveDecisionButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-400 backdrop-blur-sm transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-slate-200"
            title="أرشفة القرار"
        >
            <Archive className="h-3 w-3 opacity-70" />
            <span>أرشفة</span>
        </button>
    );
}
