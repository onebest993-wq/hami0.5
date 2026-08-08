import React from 'react';
import { Trash2, RotateCcw } from '@/app/components/ui/lucideIcons';
import { preloadActiveOrderFilePanel } from './DeferredActiveOrderFile';
import { UnifiedDossierCard } from './ArchivePortal/components/UnifiedDossierCard';
import { ArchiveDossierIdentityBlock } from './ArchivePortal/components/ArchiveDossierIdentityBlock';
import { formatDateText, formatRequestNumberText } from './Dashboard_Active_Order_File/utils/formatters';

export type UrgentCaseStatus = 'critical' | 'warning' | 'safe' | 'expired' | 'completed';
export type UrgentCaseType = 'urgent_action' | 'state_order';
export type ActionPhase = 'notification_pending' | 'grievance_window' | 'cassation_window' | 'completed';
export type LegalState = 'Awaiting_Grievance' | 'Grievance_Filed' | 'Awaiting_Cassation';

export type CaseNote = {
    id: string;
    text: string;
    createdAt: string;
};

export type CaseAttachment = {
    id: string;
    kind: 'file' | 'link';
    name: string;
    url?: string;
    createdAt: string;
};

export type CaseFollowup = {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    createdAt: string;
};

export type InitialNotificationMethod = 'personal' | 'by_agent' | 'publication';

export type HearingStage = 'pre_decision' | 'grievance';

export type CaseHearing = {
    id: string;
    stage: HearingStage;
    sessionDate: string;
    notes: string;
    nextSessionDate: string;
    createdAt: string;
};

export type ExpertModule = {
    enabled: boolean;
    expertName: string;
    depositAmount: string;
    inspectionDate: string;
    reportDueDate: string;
    reportReceivedDate: string;
};

export type CasePartyEntry = {
    name: string;
    type?: string;
    phone?: string;
    address?: string;
    isRepresented?: boolean;
    /** يُشتق من موكلي المطلوب ضده في النموذج */
    isClient?: boolean;
};

export interface UrgentCase {
    id: string;
    type: UrgentCaseType;
    actionType: string; // "الكشف المستعجل", "الحجز الاحتياطي", etc.
    applicantName: string;
    court: string;
    requestNumber?: string;
    requestDate?: string;
    courtName?: string;
    judgeName?: string;
    specificActionType?: string;
    /** تصنيف ثنائي: أوامر على عرائض | قضاء مستعجل — يتحكم بمسار التظلم والتمييز */
    procedureCategory?: 'petition_orders' | 'urgent_judiciary' | null;
    /** Phase 25 — تفاصيل جوهرية للإجراء (مرتبطة بنوع الطلب) */
    procedureDetails?: string | null;
    requestSubject?: string;
    urgentReason?: string;
    legalBasis?: string;
    requestNotes?: string;
    feeReceiptNumber?: string | null;
    feeReceiptDate?: string | null;
    initialNotificationMethod?: InitialNotificationMethod | null;
    initialNotificationDate?: string | null;
    party1Name?: string;
    party1Phone?: string;
    party1Address?: string;
    party2Name?: string;
    party2Address?: string;
    allParty1?: CasePartyEntry[];
    allParty2?: CasePartyEntry[];
    representedParty?: 'client' | 'opponent' | null;
    /** Phase 22 — وكيل المطلوب ضده: نقطة الدوران */
    defenderEntryPhase?: 1 | 2 | 3 | null;
    clientRole?: 'respondent' | 'applicant' | null;
    /** تاريخ صدور الأمر عند الدخول من مرحلة التظلم */
    stateOrderIssuedDate?: string | null;
    deadlineDate?: Date | null;
    /** يُكتب سلسلة YYYY-MM-DD في كل المشروع؛ الإعلان بـDate وحده كان مخالفاً للواقع */
    sessionDate?: Date | string | null;
    notificationDate?: Date | string | null;
    deadlineDays?: number | null;
    firstHearingDate?: string | null;
    preDecisionClosed?: boolean;
    expectedDecisionDate?: string | null;
    judgeDecision?: 'accepted' | 'rejected' | 'partially_accepted' | null;
    judgeDecisionDate?: string | null;
    hasIntervention?: boolean;
    isMainLawsuitFiled?: boolean;
    guaranteeKind?: 'cash' | 'personal' | 'real_estate' | 'none' | null;
    guaranteeDetailsText?: string | null;
    legalState?: LegalState | null;
    rejectionNotificationDate?: string | null;
    grievanceOutcome?: 'filed' | 'expired' | null;
    grievanceFiledBy?: 'client' | 'opponent' | null;
    grievanceFilingDate?: string | null;
    /** تاريخ أول جلسة تظلم (منفصل تماماً عن firstHearingDate) */
    grievanceFirstHearingDate?: string | null;
    grievanceSessionDate?: string | null;
    grievanceDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    grievanceDecisionDate?: string | null;
    cassationOutcome?: 'filed' | 'expired' | null;
    cassationFiledBy?: 'client' | 'opponent' | null;
    cassationFilingDate?: string | null;
    cassationFileNumber?: string | null;
    cassationDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    cassationDecisionDate?: string | null;
    archived?: boolean;
    archivedAt?: string | null;
    archivedReason?: string | null;
    deleted?: boolean;
    deletedAt?: string | null;
    deletedReason?: string | null;
    guaranteeStatus?: boolean;
    requiresGuarantee?: boolean;
    guaranteeSubmitted?: boolean;
    guaranteeRecovered?: boolean;
    guaranteeRecoveryDate?: string | null;
    orderLifted?: boolean;
    orderLiftDate?: string | null;
    hearings?: CaseHearing[];
    expertModule?: ExpertModule;
    notes?: CaseNote[];
    events?: Array<{ id: string; kind: 'system' | 'action' | 'edit'; message: string; createdAt: string }>;
    attachments?: CaseAttachment[];
    followups?: CaseFollowup[];
    phase: ActionPhase;
    isNotificationConfirmed?: boolean;
    grievanceResult?: 'affirmed' | 'modified' | 'cancelled' | null;
    status: UrgentCaseStatus;
    createdAt: Date;
}

const defaultMsPerDay = 1000 * 60 * 60 * 24;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const toDate = (v: unknown): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
};

export const computeUrgentCaseStatus = (
    c: Omit<UrgentCase, 'status'> & { status?: UrgentCaseStatus },
    opts?: { now?: Date; msPerDay?: number; grievanceDays?: number },
): UrgentCaseStatus => {
    const msPerDay = typeof opts?.msPerDay === 'number' && opts.msPerDay > 0 ? opts.msPerDay : defaultMsPerDay;
    const now = opts?.now instanceof Date ? opts.now : new Date();
    const grievanceDays = typeof opts?.grievanceDays === 'number' && opts.grievanceDays > 0 ? opts.grievanceDays : 3;

    if (c.phase === 'completed' || c.status === 'completed') return 'completed';
    if (c.type === 'state_order') {
        if (c.judgeDecision === 'accepted' && !c.notificationDate) return 'safe';
        if (!c.notificationDate) return 'safe';
        const hasGrievanceLogged =
            c.legalState === 'Grievance_Filed' ||
            c.grievanceOutcome === 'filed' ||
            c.grievanceDecision === 'confirmed' ||
            c.grievanceDecision === 'modified' ||
            c.grievanceDecision === 'canceled';

        const base = toDate(c.notificationDate);
        if (!base) return 'safe';
        const target = new Date(base.getTime() + grievanceDays * msPerDay);

        if (c.legalState === 'Awaiting_Grievance' && !hasGrievanceLogged) {
            const daysLeft = Math.ceil((startOfDay(target) - startOfDay(now)) / msPerDay);
            if (daysLeft < 0) return 'completed';
            if (daysLeft <= 1) return 'critical';
            if (daysLeft <= 3) return 'warning';
            return 'safe';
        }

        const days = Math.ceil((startOfDay(target) - startOfDay(now)) / msPerDay);
        if (days < 0) return 'expired';
        if (days <= 2) return 'critical';
        if (days <= 7) return 'warning';
        return 'safe';
    }

    const target = (c as any).deadlineDate ?? (c as any).sessionDate;
    const targetDate = toDate(target);
    if (!targetDate) return 'safe';
    const days = Math.ceil((startOfDay(targetDate) - startOfDay(now)) / msPerDay);
    if (days < 0) return 'expired';
    if (days <= 2) return 'critical';
    if (days <= 7) return 'warning';
    return 'safe';
};

export const isUrgentCaseClosed = (c: Partial<UrgentCase>) => {
    if (!c || typeof c !== 'object') return false;
    if (c.phase === 'completed') return true;
    const judge = c.judgeDecision;
    if (judge !== 'accepted' && judge !== 'rejected') return false;
    const grievanceExpired = c.grievanceOutcome === 'expired';
    const grievanceDecided = c.grievanceDecision === 'confirmed' || c.grievanceDecision === 'modified' || c.grievanceDecision === 'canceled';
    const cassationExpired = c.cassationOutcome === 'expired';
    const cassationDecided = c.cassationDecision === 'confirmed' || c.cassationDecision === 'modified' || c.cassationDecision === 'canceled';

    if (judge === 'accepted' && !c.notificationDate) return false;
    if (grievanceExpired) return true;
    if (grievanceDecided && (cassationExpired || cassationDecided)) return true;
    return false;
};

interface Props {
    case_data: UrgentCase;
    onQuickAction?: (actionType: 'notification' | 'grievance' | 'cassation', caseId: string) => void;
    onCaseClick?: (caseId: string) => void;
    onArchive?: (caseId: string) => void;
    onUnarchive?: (caseId: string) => void;
    onTrash?: (caseId: string) => void;
    onRestore?: (caseId: string) => void;
    onPermanentDelete?: (caseId: string) => void;
    scope?: 'active' | 'archive' | 'trash';
}

const Component_Urgent_CardInner: React.FC<Props> = ({
    case_data, 
    onQuickAction, 
    onCaseClick,
    onArchive,
    onUnarchive,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
}) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const grievanceDays = 3;

    const submitted =
        typeof case_data.guaranteeSubmitted === 'boolean'
            ? case_data.guaranteeSubmitted
            : typeof case_data.guaranteeStatus === 'boolean'
              ? case_data.guaranteeStatus
              : false;
    const requires =
        typeof case_data.requiresGuarantee === 'boolean' ? case_data.requiresGuarantee : false;
    const isWaitingNotification =
        case_data.type === 'state_order' &&
        case_data.judgeDecision === 'accepted' &&
        (!case_data.notificationDate || (requires && !submitted));
    const notificationBase = case_data.notificationDate ? new Date(case_data.notificationDate) : null;
    const deadlineDays = typeof case_data.deadlineDays === 'number' && case_data.deadlineDays > 0 ? case_data.deadlineDays : 3;
    const grievanceDeadline = notificationBase ? new Date(notificationBase.getTime() + deadlineDays * msPerDay) : null;
    const targetDate =
        case_data.type === 'state_order'
            ? grievanceDeadline
            : case_data.sessionDate
              ? new Date(case_data.sessionDate)
              : case_data.deadlineDate
                ? new Date(case_data.deadlineDate)
                : null;
    const targetLabel = case_data.sessionDate ? 'موعد الجلسة' : 'الموعد النهائي';
    const targetText = targetDate ? targetDate.toLocaleDateString('ar-IQ') : null;

    const getPhaseLabel = (): string => {
        if (case_data.status === 'completed' || case_data.phase === 'completed') return 'مكتسب الدرجة القطعية';
        if (case_data.type === 'state_order') {
            if (case_data.judgeDecision === 'accepted' && !case_data.notificationDate) return 'بانتظار التبليغ الأصولي';
            if (case_data.judgeDecision !== 'accepted') return 'بانتظار قرار القاضي';
            if (case_data.legalState === 'Awaiting_Grievance' && case_data.notificationDate) {
                const base = new Date(case_data.notificationDate);
                const target = new Date(base.getTime() + grievanceDays * msPerDay);
                const remainingDays = Math.ceil((startOfDay(target) - startOfDay(new Date())) / msPerDay);
                if (remainingDays < 0) return 'مكتسب الدرجة القطعية';
                if (remainingDays === 0) return 'اليوم آخر يوم للتظلم';
                if (remainingDays === 1) return 'متبقي يوم واحد للتظلم';
                return `متبقي ${remainingDays} أيام للتظلم`;
            }
            return `مدة التظلم (${grievanceDays} أيام)`;
        }
        switch (case_data.phase) {
            case 'notification_pending':
                return 'بانتظار التبليغ الأصولي';
            case 'grievance_window':
                return `مدة التظلم (${deadlineDays} أيام)`;
            case 'cassation_window':
                return 'مدة التمييز (7 أيام)';
            default:
                return '';
        }
    };

    const phaseLabel = getPhaseLabel();

    const courtLabel = (case_data.courtName?.trim() || case_data.court?.trim() || '').trim();
    const applicantName =
        case_data.applicantName?.trim() || case_data.party1Name?.trim() || '';
    const opponentName = case_data.party2Name?.trim() || '';
    const applicantIsClient = case_data.clientRole === 'applicant';
    const opponentIsClient = case_data.clientRole === 'respondent';

    const metaRows = [
        case_data.requestNumber
            ? {
                  label: 'رقم الطلب',
                  value: formatRequestNumberText(case_data.requestNumber, case_data.requestDate),
              }
            : null,
        courtLabel ? { label: 'المحكمة', value: courtLabel } : null,
        case_data.requestDate ? { label: 'تاريخ الطلب', value: formatDateText(case_data.requestDate) } : null,
        case_data.judgeName?.trim()
            ? { label: 'القاضي', value: case_data.judgeName.trim() }
            : null,
        case_data.feeReceiptNumber?.trim()
            ? {
                  label: 'وصل الرسوم',
                  value: `${case_data.feeReceiptNumber.trim()}${
                      case_data.feeReceiptDate
                          ? ` · ${formatDateText(case_data.feeReceiptDate)}`
                          : ''
                  }`,
              }
            : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    const hearing =
        case_data.sessionDate
            ? {
                  label: 'موعد الجلسة',
                  ymd: formatDateText(case_data.sessionDate),
              }
            : targetText
              ? { label: targetLabel, ymd: targetText }
              : null;

    const parties =
        applicantName || opponentName
            ? {
                  left: applicantName
                      ? {
                            name: applicantName,
                            role: 'الطالب',
                            isClient: applicantIsClient,
                        }
                      : null,
                  right: opponentName
                      ? {
                            name: opponentName,
                            role: 'المطلوب ضده',
                            isClient: opponentIsClient,
                        }
                      : null,
                  leftTone: 'primary' as const,
                  rightTone: 'defendant' as const,
              }
            : null;

    const subtitle = case_data.requestNumber
        ? `رقم الطلب ${formatRequestNumberText(case_data.requestNumber, case_data.requestDate)}`
        : applicantName || undefined;

    const statusBadgeClass = (status: UrgentCaseStatus): string => {
        switch (status) {
            case 'critical':
                return 'text-rose-300';
            case 'warning':
                return 'text-amber-300';
            case 'safe':
                return 'text-[#E6C673]';
            case 'expired':
                return 'text-slate-300';
            case 'completed':
                return 'text-emerald-300';
            default:
                return 'text-white/70';
        }
    };

    const footerIcons =
        scope === 'trash'
            ? [
                  {
                      id: 'restore',
                      label: 'استعادة',
                      icon: <RotateCcw size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onRestore?.(case_data.id);
                      },
                      tone: 'default' as const,
                  },
                  {
                      id: 'delete',
                      label: 'حذف نهائي',
                      icon: <Trash2 size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onPermanentDelete?.(case_data.id);
                      },
                      tone: 'danger' as const,
                  },
              ]
            : [
                  {
                      id: 'trash',
                      label: 'نقل إلى سلة المهملات',
                      icon: <Trash2 size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onTrash?.(case_data.id);
                      },
                      tone: 'danger' as const,
                  },
              ];

    return (
        <div onPointerEnter={() => preloadActiveOrderFilePanel()}>
            <UnifiedDossierCard
                kind="urgent"
                statusBadge={{
                    label: phaseLabel || case_data.status,
                    className: statusBadgeClass(case_data.status),
                }}
                title={case_data.actionType}
                subtitle={subtitle}
                bodyExtra={
                    <ArchiveDossierIdentityBlock
                        hearing={hearing}
                        metaRows={metaRows}
                        parties={parties}
                    />
                }
                onOpen={() => onCaseClick?.(case_data.id)}
                openLabel="فتح الطلب المستعجل"
                footerIcons={footerIcons}
                testId={`urgent-case-${case_data.id}`}
            />
        </div>
    );
};

export const Component_Urgent_Card = React.memo(Component_Urgent_CardInner);
