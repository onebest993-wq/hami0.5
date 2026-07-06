import React from 'react';
import {
    readExecutorDecisionsArray,
    isExecutorHubRowSuperseded,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    resolveSpecialFollowupStatusLabel,
    shouldShowSpecialFollowupExecutorStrip,
} from '@/app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions';
import { ChevronDown } from 'lucide-react';

const DOSSIER_CONTROLS_ONLY = new Set([
    'طلب توحيد الأضابير',
    'طلب نقل الإضبارة',
    'طلب الإنابة التنفيذية',
    'طلب مخاطبة مديرية الانابة',
    'طلب تجديد الإضبارة',
]);

const LEGACY_ADMIN_TEMPLATES = [
    'طلب تصحيح خطأ مادي',
    'طلب تجديد الإضبارة',
    'طلب انتداب خبير/خبراء',
    'الاعتراض على تقرير الخبراء',
    'تحديد موعد المزايدة العلنية',
    'الإحالة القطعية',
] as const;

export interface RequestsTabLatestDecisionPanelProps {
    executionId: string;
    decisions: Record<string, unknown>[];
    appealPerspective?: AppealUiPerspective;
}

export const RequestsTabLatestDecisionPanel: React.FC<RequestsTabLatestDecisionPanelProps> = ({
    executionId,
    decisions,
    appealPerspective = 'creditor_agent',
}) => {
    const exId = String(executionId || '').trim();
    const [latestRequestExpanded, setLatestRequestExpanded] = React.useState(false);

    const isAdminTemplateDecision = React.useCallback((d: any): boolean => {
        if (String(d?.requestKind || '') !== 'special_followup') return false;
        const raw = String(d?.payloadJson || '').trim();
        if (raw) {
            try {
                const v = JSON.parse(raw) as any;
                const kind = String(v?.kind || '').trim();
                if (kind === 'admin_template' || kind === 'manual_followup') return true;
            } catch {}
        }
        const title = String(d?.title || '').trim();
        if (DOSSIER_CONTROLS_ONLY.has(title)) return false;
        return (
            Boolean(title) &&
            (LEGACY_ADMIN_TEMPLATES.includes(title as (typeof LEGACY_ADMIN_TEMPLATES)[number]) ||
                title.length > 0)
        );
    }, []);

    const latestAdminDecision = React.useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        const sorted = list
            .filter((d: any) => isAdminTemplateDecision(d))
            .sort((a: any, b: any) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        return (sorted[0] as any) || null;
    }, [decisions, isAdminTemplateDecision]);

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        const row = latestAdminDecision;
        if (!row?.id) return [];
        const decisionId = String(row.id || '').trim();
        const requestTitle = String(row.title || 'طلب إداري').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const rejectedClosed = rejected && isExecutorHubRowSuperseded(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approved = !rejected && !pending;
        const creditorPartyApproved =
            appealPerspective === 'debtor_agent' &&
            approved &&
            isCreditorInitiatedExecutorRequest(
                hubWithInferredAppealOrigin(row as Decision)
            );
        return [
            {
                id: 'admin:submit',
                title: requestTitle,
                subtitle: 'تم إرسال الطلب إلى مركز القرارات',
                status: 'done',
                tone: 'success',
            },
            {
                id: 'admin:executor',
                title: 'قرار المنفذ',
                subtitle: rejected
                    ? 'تم رفض الطلب'
                    : pending
                      ? 'قيد البت لدى المنفذ'
                      : approved
                        ? creditorPartyApproved
                            ? 'موافقة ضد موكّلك'
                            : 'تمت الموافقة'
                        : '—',
                status: rejectedClosed ? 'done' : rejected || pending ? 'active' : 'done',
                tone: rejected
                    ? 'danger'
                    : approved
                      ? creditorPartyApproved
                          ? 'danger'
                          : 'success'
                      : 'neutral',
                content:
                    rejected && !rejectedClosed ? (
                        <ExecutorDecisionFollowupMirror
                            executionId={exId}
                            row={row as Record<string, unknown>}
                            requestKind="special_followup"
                            compact
                            appealPerspective={appealPerspective}
                        />
                    ) : pending ? (
                        <ExecutionInlineExecutorDecisionActions
                            executionId={exId}
                            decisionId={decisionId}
                            requestKind="special_followup"
                        />
                    ) : approved && creditorPartyApproved ? (
                        <ExecutorDecisionFollowupMirror
                            executionId={exId}
                            row={row as Record<string, unknown>}
                            requestKind="special_followup"
                            compact
                            appealPerspective={appealPerspective}
                        />
                    ) : undefined,
            },
        ];
    }, [appealPerspective, exId, latestAdminDecision]);

    const latestAdminExecutorStripVisible = React.useMemo(
        () =>
            Boolean(
                latestAdminDecision &&
                    shouldShowSpecialFollowupExecutorStrip(latestAdminDecision, {
                        allDecisions: decisions,
                        appealPerspective,
                    })
            ),
        [appealPerspective, decisions, latestAdminDecision]
    );

    const latestAdminStatusLabel = React.useMemo(
        () => resolveSpecialFollowupStatusLabel(latestAdminDecision, appealPerspective),
        [appealPerspective, latestAdminDecision]
    );

    React.useEffect(() => {
        if (!latestAdminDecision?.id) {
            setLatestRequestExpanded(false);
        }
    }, [latestAdminDecision?.id]);

    if (!exId || !latestAdminDecision?.id || steps.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-950/10 text-right">
            <button
                type="button"
                aria-expanded={latestRequestExpanded}
                onClick={() => setLatestRequestExpanded((v) => !v)}
                className="flex w-full cursor-pointer flex-row-reverse items-center justify-between gap-2 px-4 py-3 text-right transition-colors hover:bg-white/[0.03]"
            >
                <span className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[12px] font-bold text-emerald-100">
                        {String(latestAdminDecision.title || 'طلب إداري').trim()}
                    </p>
                    <p className="text-[10px] text-emerald-200/70">{latestAdminStatusLabel}</p>
                </span>
                {!latestAdminExecutorStripVisible ? (
                    <ChevronDown
                        size={18}
                        className={`shrink-0 text-emerald-300/70 transition-transform duration-200 ${latestRequestExpanded ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                ) : null}
            </button>
            {latestAdminExecutorStripVisible ? (
                <div className="border-t border-white/10 px-3 pb-2 pt-2">
                    <ExecutorDecisionFollowupMirror
                        executionId={exId}
                        row={latestAdminDecision as Record<string, unknown>}
                        requestKind="special_followup"
                        appealPerspective={appealPerspective}
                    />
                </div>
            ) : null}
            {latestRequestExpanded ? (
                <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                    {String(latestAdminDecision.body || '').trim() ? (
                        <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-slate-300">
                            {String(latestAdminDecision.body || '').trim()}
                        </p>
                    ) : null}
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            ) : null}
        </div>
    );
};
