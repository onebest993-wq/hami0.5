import { Bell } from '@/app/components/ui/icons/Bell';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Newspaper } from '@/app/components/ui/icons/Newspaper';
import { Shield } from '@/app/components/ui/icons/Shield';
import { Timer } from '@/app/components/ui/icons/Timer';
import { UserX } from '@/app/components/ui/icons/UserX';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { resolvePrimaryDebtorCoerciveStack } from '../coerciveStackUtils';
import { formatDateAr } from './badgeDisplayHelpers';
import type { ExecutionPartyInteractiveBadgesProps, PartyInteractiveBadge } from './types';

export type BuildExtraPartyBadgeDefinitionsInput = {
    party: ExecutionPartyInteractiveBadgesProps['party'];
    isPrimaryDebtor: boolean;
    executionData: ExecutionPartyInteractiveBadgesProps['executionData'] | null | undefined;
    memoBadge: ExecutionPartyInteractiveBadgesProps['memoBadge'];
    publicationNoticeBadge: ExecutionPartyInteractiveBadgesProps['publicationNoticeBadge'];
    regularTablighBadge: ExecutionPartyInteractiveBadgesProps['regularTablighBadge'];
    absenceBadge: ExecutionPartyInteractiveBadgesProps['absenceBadge'];
    taklifAssignmentBadge: ExecutionPartyInteractiveBadgesProps['taklifAssignmentBadge'];
    evictionGraceBadge: ExecutionPartyInteractiveBadgesProps['evictionGraceBadge'];
    policeAssistanceBadge: ExecutionPartyInteractiveBadgesProps['policeAssistanceBadge'];
    showSummonsBadge: boolean;
    onMemoActivate?: ExecutionPartyInteractiveBadgesProps['onMemoActivate'];
    onPublicationNoticeActivate?: ExecutionPartyInteractiveBadgesProps['onPublicationNoticeActivate'];
    onEvictionGraceActivate?: ExecutionPartyInteractiveBadgesProps['onEvictionGraceActivate'];
    onPoliceAssistanceActivate?: ExecutionPartyInteractiveBadgesProps['onPoliceAssistanceActivate'];
    onSummonsActivate?: ExecutionPartyInteractiveBadgesProps['onSummonsActivate'];
    onDismissPublicationNoticeBadge?: ExecutionPartyInteractiveBadgesProps['onDismissPublicationNoticeBadge'];
    onDismissRegularTablighBadge?: ExecutionPartyInteractiveBadgesProps['onDismissRegularTablighBadge'];
    onDismissAbsence?: ExecutionPartyInteractiveBadgesProps['onDismissAbsence'];
    onDismissTaklifAssignmentBadge?: ExecutionPartyInteractiveBadgesProps['onDismissTaklifAssignmentBadge'];
    onCompleteEvictionGrace?: ExecutionPartyInteractiveBadgesProps['onCompleteEvictionGrace'];
    onCompletePoliceAssistance?: ExecutionPartyInteractiveBadgesProps['onCompletePoliceAssistance'];
    executionBadgeKey: string;
    executionId: string | undefined;
    debtorAttendedVoluntarilyProp: ExecutionPartyInteractiveBadgesProps['debtorAttendedVoluntarily'];
    voluntaryAttendanceCountProp: ExecutionPartyInteractiveBadgesProps['voluntaryAttendanceCount'];
    personalCoerciveDecisionBadges: ExecutionPartyInteractiveBadgesProps['personalCoerciveDecisionBadges'];
    debtorArrested: boolean;
    forcedAttendancePending: boolean;
    taklifAssignmentSignalKey: string;
    onTaklifAssignmentActivate?: ExecutionPartyInteractiveBadgesProps['onTaklifAssignmentActivate'];
    activeDebtorKey: string | undefined;
    primaryDebtorKey: string | undefined;
};

/** Extra (non-base) interactive badge definitions for the party strip. */
export function buildExtraPartyBadgeDefinitions(
    input: BuildExtraPartyBadgeDefinitionsInput,
): PartyInteractiveBadge[] {
    const {
        party,
        isPrimaryDebtor,
        executionData: ed,
        memoBadge,
        publicationNoticeBadge,
        regularTablighBadge,
        absenceBadge,
        taklifAssignmentBadge,
        evictionGraceBadge,
        policeAssistanceBadge,
        showSummonsBadge,
        onMemoActivate,
        onPublicationNoticeActivate,
        onEvictionGraceActivate,
        onPoliceAssistanceActivate,
        onSummonsActivate,
        onDismissPublicationNoticeBadge,
        onDismissRegularTablighBadge,
        onDismissAbsence,
        onDismissTaklifAssignmentBadge,
        onCompleteEvictionGrace,
        onCompletePoliceAssistance,
        executionBadgeKey,
        executionId,
        debtorAttendedVoluntarilyProp,
        voluntaryAttendanceCountProp,
        personalCoerciveDecisionBadges,
        debtorArrested,
        forcedAttendancePending,
        taklifAssignmentSignalKey,
        onTaklifAssignmentActivate,
        activeDebtorKey,
        primaryDebtorKey,
    } = input;

    return (() => {
        const extra: PartyInteractiveBadge[] = [];
        /* ed from input */
        const nowMs = Date.now();
        const isAttendedGlobal =
            Boolean(debtorAttendedVoluntarilyProp ?? ed?.debtorAttendedVoluntarily) ||
            (voluntaryAttendanceCountProp ?? ed?.voluntaryAttendanceCount ?? 0) > 0;
        const dossierUpdatedAt = String(ed?.updatedAt ?? '').trim();
        const isOneDayPassedFrom = (isoOrYmd: string): boolean => {
            const s = String(isoOrYmd || '').trim();
            if (!s) return false;
            const d = s.includes('T') ? new Date(s) : parseLocalNotificationDate(s);
            if (Number.isNaN(d.getTime())) return false;
            return nowMs - d.getTime() >= 24 * 60 * 60 * 1000;
        };
        const hasNewRequestSince = (periodEndedAt?: string): boolean => {
            const p = String(periodEndedAt ?? '').trim();
            if (!p || !dossierUpdatedAt) return false;
            const a = new Date(dossierUpdatedAt);
            const b = new Date(p);
            if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
            return a.getTime() - b.getTime() > 2000;
        };
        const shouldShowStrict = (opts: {
            isAttended: boolean;
            isPeriodEnded: boolean;
            periodEndedAt?: string;
            isBadgeManuallyHidden: boolean;
            isOneDayPassed: boolean;
        }): boolean => {
            if (opts.isAttended) return false;
            if (opts.isPeriodEnded) return !hasNewRequestSince(opts.periodEndedAt);
            if (opts.isBadgeManuallyHidden) return false;
            if (opts.isOneDayPassed) return false;
            return true;
        };
        const suppressAbsenceCoercive =
            party === 'debtor' && isPrimaryDebtor
                ? resolvePrimaryDebtorCoerciveStack({
                      executionData: ed,
                      decisionsExecutionId: executionId,
                      personalCoerciveDecisionBadges,
                      debtorArrested,
                      forcedAttendancePending,
                      activeDebtorKey,
                      primaryDebtorKey,
                  }).suppressDebtorAbsence
                : false;
        if (party === 'debtor' && isPrimaryDebtor && memoBadge) {
            extra.push({
                id: 'memo_notice',
                shortLabel: 'تبليغ بالمذكرة',
                Icon: FileText,
                tone: memoBadge.graceExpired ? 'amber' : 'emerald',
                dismissMode: 'local',
                onActivate: onMemoActivate,
                detailLines: [
                    { k: 'مرجع التاريخ', v: memoBadge.anchor },
                    {
                        k: 'المتبقي',
                        v: memoBadge.graceExpired ? 'انتهت المهلة' : `${memoBadge.remaining} يوماً`,
                    },
                ],
            });
        }
        if (party === 'debtor' && publicationNoticeBadge) {
            const isPeriodEnded = Boolean(String(publicationNoticeBadge.periodEndedAt ?? '').trim());
            const isBadgeManuallyHidden = Boolean(String(publicationNoticeBadge.badgeHiddenAt ?? '').trim());
            const recordedAt = String(publicationNoticeBadge.recordedAt ?? '').trim();
            const isOneDayPassed = recordedAt ? isOneDayPassedFrom(recordedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: publicationNoticeBadge.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                extra.push({
                    id: 'publication_notice',
                    shortLabel: 'مُبلَّغ بالصحف',
                    Icon: Newspaper,
                    tone: publicationNoticeBadge.graceExpired ? 'amber' : 'violet',
                    dismissMode: 'callback',
                    onDismiss: onDismissPublicationNoticeBadge,
                    onActivate: onPublicationNoticeActivate,
                    detailLines: [
                        { k: 'تاريخ النشر', v: publicationNoticeBadge.publicationDateYmd },
                        { k: 'الجريدة ١', v: publicationNoticeBadge.newspaper1 },
                        { k: 'الجريدة ٢', v: publicationNoticeBadge.newspaper2 },
                        {
                            k: 'آخر يوم للمدة',
                            v: publicationNoticeBadge.deadlineYmd,
                        },
                        {
                            k: 'المتبقي',
                            v: publicationNoticeBadge.graceExpired
                                ? 'انتهت المدة'
                                : `${publicationNoticeBadge.remaining} يوماً`,
                        },
                    ],
                });
            }
        }
        if (
            party === 'debtor' &&
            isPrimaryDebtor &&
            absenceBadge &&
            !suppressAbsenceCoercive &&
            !isAttendedGlobal
        ) {
            extra.push({
                id: 'debtor_absence',
                shortLabel: 'عدم حضور المدين',
                Icon: UserX,
                tone: 'rose',
                dismissMode: 'callback',
                onDismiss: onDismissAbsence,
                detailLines: [
                    {
                        k: 'الوصف',
                        v: 'بعد إعلان انتهاء المدة الرضائية دون حضور — راجع مسار التبليغ اللاحق',
                    },
                ],
            });
        }
        if (party === 'debtor' && showSummonsBadge && regularTablighBadge) {
            const isPeriodEnded = Boolean(String(regularTablighBadge.periodEndedAt ?? '').trim());
            const isBadgeManuallyHidden = Boolean(String(regularTablighBadge.badgeHiddenAt ?? '').trim());
            const recordedAt = String(regularTablighBadge.recordedAt ?? '').trim();
            const isOneDayPassed = recordedAt ? isOneDayPassedFrom(recordedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: regularTablighBadge.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                extra.push({
                    id: 'summons_attendance',
                    shortLabel: 'مُبلَّغ',
                    Icon: Bell,
                    tone: 'indigo',
                    dismissMode: 'callback',
                    onDismiss: onDismissRegularTablighBadge,
                    onActivate: onSummonsActivate,
                    detailLines: [
                        {
                            k: 'تاريخ التبليغ',
                            v: formatDateAr(regularTablighBadge.noticeDateYmd),
                        },
                        { k: 'الغاية', v: regularTablighBadge.purpose.trim() || 'تبليغ' },
                    ],
                });
            }
        }
        if (party === 'debtor' && taklifAssignmentBadge) {
            const tb = taklifAssignmentBadge;
            const isPeriodEnded =
                Boolean(String(tb.periodEndedAt ?? '').trim()) || tb.phase === 'absent_declared';
            const isBadgeManuallyHidden = Boolean(String(tb.badgeHiddenAt ?? '').trim());
            const confirmedAt = String(tb.confirmedAt ?? '').trim();
            const isOneDayPassed = confirmedAt ? isOneDayPassedFrom(confirmedAt) : false;
            if (
                shouldShowStrict({
                    isAttended: false,
                    isPeriodEnded,
                    periodEndedAt: tb.periodEndedAt,
                    isBadgeManuallyHidden,
                    isOneDayPassed,
                })
            ) {
                const phaseAr =
                    tb.phase === 'active'
                        ? 'تكليف سارٍ'
                        : tb.phase === 'absent_declared'
                          ? 'عدم حضور — متابعة مفاتحة/تنفيذ'
                          : tb.phase === 'investigation_pending'
                            ? 'مفاتحة التحقيق قيد البتّ'
                            : 'أمر قبض — إحضار أو إنهاء';
                const remAr =
                    tb.remainingDays === null
                        ? '—'
                        : tb.remainingDays === 0
                          ? 'انتهت المدة التقويمية'
                          : `${tb.remainingDays} يوماً`;
                extra.push({
                    id: 'taklif_attendance',
                    shortLabel: 'مكلف بالحضور',
                    Icon: Calendar,
                    tone: 'amber',
                    dismissMode: 'callback',
                    onDismiss: onDismissTaklifAssignmentBadge,
                    onActivate: onTaklifAssignmentActivate,
                    detailLines: [
                        { k: 'الغاية', v: tb.purpose.trim() || '—' },
                        { k: 'تاريخ التكليف', v: formatDateAr(tb.notifyDateYmd) },
                        { k: 'آخر أجل للمدة', v: formatDateAr(tb.deadlineYmd) },
                        { k: 'المتبقي', v: remAr },
                        { k: 'المرحلة', v: phaseAr },
                        ...(typeof tb.durationDays === 'number' && tb.durationDays > 0
                            ? [{ k: 'المدة', v: `${tb.durationDays} يوماً` }]
                            : []),
                        ...(typeof tb.cycleGeneration === 'number' && tb.cycleGeneration > 0
                            ? [{ k: 'دورة التكليف', v: String(tb.cycleGeneration) }]
                            : []),
                    ],
                });
            }
        }

        if (party === 'debtor' && isPrimaryDebtor && evictionGraceBadge) {
            extra.push({
                id: 'eviction_grace',
                shortLabel: 'المهلة',
                Icon: Timer,
                tone: 'sky',
                dismissMode: 'callback',
                dismissLabel: 'إتمام المهلة',
                dismissVariant: 'complete',
                onDismiss: onCompleteEvictionGrace,
                onActivate: onEvictionGraceActivate,
                detailLines: [
                    { k: 'من', v: evictionGraceBadge.startYmd },
                    { k: 'إلى', v: evictionGraceBadge.endYmd },
                    { k: 'المدة', v: `${evictionGraceBadge.daysTotal} يوماً` },
                    { k: 'المتبقي', v: `${Math.max(0, evictionGraceBadge.remainingDays)} يوماً` },
                ],
            });
        }

        if (party === 'debtor' && isPrimaryDebtor && policeAssistanceBadge) {
            extra.push({
                id: 'eviction_police_assistance',
                shortLabel: 'القوة الجبرية',
                Icon: Shield,
                tone: 'amber',
                dismissMode: 'callback',
                dismissLabel: 'إتمام الطلب',
                dismissVariant: 'complete',
                onDismiss: onCompletePoliceAssistance,
                onActivate: onPoliceAssistanceActivate,
                detailLines: [
                    { k: 'الجهة المرافقة', v: policeAssistanceBadge.agencyName || '—' },
                    ...(policeAssistanceBadge.dueYmd
                        ? [{ k: 'تاريخ المتابعة', v: policeAssistanceBadge.dueYmd }]
                        : []),
                    ...(typeof policeAssistanceBadge.remainingDays === 'number'
                        ? [{ k: 'المتبقي', v: `${Math.max(0, policeAssistanceBadge.remainingDays)} يوماً` }]
                        : []),
                ],
            });
        }
        return extra;
    })();
}
