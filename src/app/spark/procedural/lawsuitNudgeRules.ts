import type { SparkNudge } from '@/app/spark/types';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import {
    canOfferAbsentObjectionToDefendant,
    daysRemainingUntil,
    hasAbsentJudgmentNotificationRecorded,
    isAwaitingAbsentJudgmentNotification,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
} from '@/app/components/lawyer/smart-modal/smartFile/absentJudgmentFlow';
import { resolveAbandonmentReviewDeadline } from '@/app/components/lawyer/smart-modal/smartFile/caseFlowStatusDisplay';
import { resolveStageCassationDeadline } from '@/app/components/lawyer/smart-modal/smartFile/appealDeadlineEngine';
import { isAppealStageName } from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';
import { shouldShowFirstInstancePleadingLockUi } from '@/app/components/lawyer/smart-modal/smartFile/stageInit';
import { resolveCrossAppealEligibility } from '@/app/components/lawyer/smart-modal/smartFile/crossAppealEngine';
import {
    daysRemainingPetitionVoidRevival,
    shouldShowPetitionVoidFooterPanel,
} from '@/app/components/lawyer/smart-modal/smartFile/petitionVoidFlow';

function hasUpcomingHearingWithinHours(timeline: LawsuitSparkContext['timeline'], hours: number): {
    eventDate: string;
    hoursLeft: number;
} | null {
    const now = Date.now();
    const upcoming = timeline
        .filter((t) => t.type === 'appointment' && !t.isDeleted)
        .map((t) => {
            const iso = `${t.date}T${t.time ? t.time : '09:00'}`;
            const ms = Date.parse(iso);
            return { event: t, ms };
        })
        .filter((item) => Number.isFinite(item.ms) && item.ms > now)
        .sort((a, b) => a.ms - b.ms);

    const next = upcoming[0];
    if (!next) return null;
    const hoursLeft = (next.ms - now) / (1000 * 60 * 60);
    if (hoursLeft > hours) return null;
    return { eventDate: next.event.date, hoursLeft };
}

function hasCourtFeeReceiptInTimeline(timeline: LawsuitSparkContext['timeline']): boolean {
    return timeline.some(
        (t) =>
            t.type === 'document' &&
            !t.isDeleted &&
            (t.title.includes('وصل') ||
                t.title.includes('رسم') ||
                t.title.includes('قضائي') ||
                t.docCategory === 'evidence'),
    );
}

function isPlaintiffSide(representedParty: string | null): boolean {
    const rp = String(representedParty ?? '').trim();
    return rp === 'المدعي' || rp === 'plaintiff' || rp === 'client';
}

function isDefendantSide(representedParty: string | null): boolean {
    const rp = String(representedParty ?? '').trim();
    return rp === 'المدعى عليه' || rp === 'defendant' || rp === 'opponent';
}

/** قواعد محلية — بدون LLM */
export function collectLawsuitSparkNudges(ctx: LawsuitSparkContext): SparkNudge[] {
    const stage = ctx.displayStage;
    const nudges: SparkNudge[] = [];

    if (
        ctx.status === 'منقطعة' &&
        stage.interruptionDate &&
        !stage.abandonmentDate
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:interruption-resume`,
            kind: 'lawsuit.interruption_resume',
            surface: 'lawsuit',
            priority: 8,
            message:
                'الدعوى منقطعة في السجل — هل تود استئناف السير أو مراجعة الخيارات؟',
            presence: {
                present: ['حالة انقطاع', `منذ ${String(stage.interruptionDate).slice(0, 10)}`],
                missing: ['استئناف السير'],
            },
            source: 'caseStatus.interrupted',
            dossierKey: ctx.dossierKey,
            action: { label: 'استئناف السير', actionId: 'resume_interruption' },
        });
    }

    if (ctx.isPaused) {
        nudges.push({
            id: `${ctx.dossierKey}:pause-active`,
            kind: 'lawsuit.pause_active',
            surface: 'lawsuit',
            priority: 9,
            message: ctx.pauseReason
                ? `الدعوى مستأخرة (${ctx.pauseReason}) — هل تود استئناف السير؟`
                : 'الدعوى مستأخرة في السجل — هل تود استئناف السير؟',
            presence: {
                present: ['حالة إيقاف/تأخير'],
                missing: ['استئناف السير'],
            },
            source: 'caseStatus.paused',
            dossierKey: ctx.dossierKey,
            action: { label: 'استئناف السير', actionId: 'resume_pause' },
        });
    }

    if (shouldShowPetitionVoidFooterPanel(stage)) {
        const flow = stage.petitionVoidFlow;
        const revivalDays =
            flow?.status === 'quash_revived'
                ? daysRemainingPetitionVoidRevival(flow.revivalDeadline)
                : null;
        nudges.push({
            id: `${ctx.dossierKey}:petition-void`,
            kind: 'lawsuit.petition_void_followup',
            surface: 'lawsuit',
            priority: 12,
            message:
                revivalDays !== null && revivalDays >= 0
                    ? `مسار إبطال العريضة مفتوح — متبقٍ نحو ${revivalDays} يوم لإحياء الدعوى. هل يهمك متابعته؟`
                    : 'مسار إبطال العريضة مفتوح في السجل — هل تود مراجعة الخطوة التالية؟',
            presence: {
                present: [flow?.voidLabel ?? 'إبطال عريضة', `الحالة: ${flow?.status ?? '—'}`],
                missing:
                    revivalDays !== null && revivalDays < 0 ? ['إحياء ضمن المهلة'] : ['متابعة المسار'],
            },
            source: 'petitionVoidFlow.active',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة المسار', actionId: 'review_petition_void' },
        });
    }

    const pendingIncidental = (stage.incidentalCases ?? []).filter(
        (c) => c.entryDecision === 'pending',
    );
    if (pendingIncidental.length > 0) {
        const first = pendingIncidental[0];
        nudges.push({
            id: `${ctx.dossierKey}:incidental-pending`,
            kind: 'lawsuit.incidental_entry_pending',
            surface: 'lawsuit',
            priority: 25,
            message:
                pendingIncidental.length === 1
                    ? `طلب إدخال طرف ثالث (${first.partyName}) بانتظار قرار — هل يهمك الأمر؟`
                    : `${pendingIncidental.length} طلبات إدخال بانتظار قرار — هل تود مراجعتها؟`,
            presence: {
                present: ['طلب إدخال مسجّل'],
                missing: ['قرار القبول أو الرد'],
            },
            source: 'incidentalCases.entryDecision',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة الطلب', actionId: 'review_incidental' },
        });
    }

    if (isAppealStageName(stage.stageName)) {
        const stageIndex = ctx.stages.findIndex((s) => s.id === stage.id);
        const crossAppeal = resolveCrossAppealEligibility({
            appealStage: stage,
            stages: ctx.stages,
            appealStageIndex: stageIndex >= 0 ? stageIndex : undefined,
        });
        if (crossAppeal.showButton && crossAppeal.pendingCrossAppellants.length > 0) {
            nudges.push({
                id: `${ctx.dossierKey}:cross-appeal`,
                kind: 'lawsuit.cross_appeal_available',
                surface: 'lawsuit',
                priority: 26,
                message:
                    crossAppeal.pendingCrossAppellants.length === 1
                        ? 'يبدو أن مسار الطعن المتقابل متاح لأحد الأطراف — هل يهمك متابعته؟'
                        : `مسار الطعن المتقابل قد يكون متاحاً لـ ${crossAppeal.pendingCrossAppellants.length} أطراف — هل تود المراجعة؟`,
                presence: {
                    present: ['مرحلة استئناف', 'أطراف على جانب الخصم'],
                    missing: ['طعن متقابل مسجّل'],
                },
                source: 'crossAppealEngine.pendingCrossAppellants',
                dossierKey: ctx.dossierKey,
                action: { label: 'مراجعة الطعن المتقابل', actionId: 'cross_appeal' },
            });
        }
    }

    if (isAwaitingAbsentJudgmentNotification(stage, ctx.stages)) {
        nudges.push({
            id: `${ctx.dossierKey}:absent-notification`,
            kind: 'lawsuit.absent_notification_missing',
            surface: 'lawsuit',
            priority: 10,
            message:
                'الحكم مسجّل غيابياً، لكن تاريخ التبليغ غير مسجّل بعد. هل يهمك تسجيله الآن؟',
            presence: {
                present: ['حكم غيابي', 'إغلاق المرافعة'],
                missing: ['تاريخ تبليغ الحكم الغيابي'],
            },
            source: 'absentJudgmentFlow.isAwaitingAbsentJudgmentNotification',
            dossierKey: ctx.dossierKey,
            action: { label: 'تسجيل التبليغ', actionId: 'absent_notification' },
        });
    }

    if (
        canOfferAbsentObjectionToDefendant({
            currentStage: stage.stageName,
            stages: ctx.stages,
            judgmentForm: stage.judgmentForm,
            lastJudgmentType: stage.lastJudgmentType,
            finalDecision: stage.finalDecision,
        }) &&
        isDefendantSide(ctx.representedParty)
    ) {
        const hasNotification = hasAbsentJudgmentNotificationRecorded(stage);
        nudges.push({
            id: `${ctx.dossierKey}:defendant-objection`,
            kind: 'lawsuit.defendant_objection_available',
            surface: 'lawsuit',
            priority: 20,
            message: hasNotification
                ? 'يبدو أن مسار الاعتراض على الحكم الغيابي متاح — هل تود متابعته؟'
                : 'الحكم غيابي لصالح الخصم، ومسار الاعتراض قد يكون متاحاً بعد تسجيل التبليغ. هل يهمك الأمر؟',
            presence: {
                present: [
                    'حكم غيابي',
                    hasNotification ? 'تاريخ تبليغ' : 'إغلاق المرافعة',
                ],
                missing: hasNotification ? [] : ['تاريخ التبليغ'],
            },
            source: 'absentJudgmentFlow.canOfferAbsentObjectionToDefendant',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة الإجراء', actionId: 'defendant_objection' },
        });
    }

    if (
        shouldShowAbsentJudgmentFooter(stage, ctx.stages) &&
        isPlaintiffSide(ctx.representedParty) &&
        !isAwaitingAbsentJudgmentNotification(stage, ctx.stages)
    ) {
        const deadline = resolveAbsentObjectionDeadline(stage);
        const daysLeft = deadline ? daysRemainingUntil(deadline) : null;
        nudges.push({
            id: `${ctx.dossierKey}:plaintiff-absent-watch`,
            kind: 'lawsuit.plaintiff_absent_monitoring',
            surface: 'lawsuit',
            priority: 30,
            message:
                daysLeft !== null && daysLeft >= 0
                    ? `الحكم غيابي لصالح موكلك. قد يعارض الخصم خلال الفترة القادمة — هل تريد متابعة الحالة؟`
                    : 'الحكم غيابي لصالح موكلك. راقب ما إذا كان الخصم سيعترض — هل يهمك متابعة ذلك؟',
            presence: {
                present: ['حكم غيابي', 'تبليغ مسجّل'],
                missing: deadline ? [] : ['مهلة الاعتراض المحسوبة'],
            },
            source: 'absentJudgmentFlow.shouldShowAbsentJudgmentFooter',
            dossierKey: ctx.dossierKey,
            action: { label: 'عرض التفاصيل', actionId: 'view_absent_footer' },
        });
    }

    const absentFlowActive =
        isAwaitingAbsentJudgmentNotification(stage, ctx.stages) ||
        shouldShowAbsentJudgmentFooter(stage, ctx.stages);

    if (!absentFlowActive && shouldShowFirstInstancePleadingLockUi(stage)) {
        const appealDeadline = String(stage.appealDeadline ?? '').trim().slice(0, 10);
        if (appealDeadline) {
            const daysLeft = daysRemainingUntil(appealDeadline);
            if (daysLeft <= 5) {
                nudges.push({
                    id: `${ctx.dossierKey}:appeal-deadline`,
                    kind: 'lawsuit.appeal_deadline_near',
                    surface: 'lawsuit',
                    priority: 22,
                    message:
                        daysLeft < 0
                            ? 'مهلة الطعن في المرحلة الحالية قد تكون منتهية — هل تريد مراجعة الخيارات؟'
                            : `مهلة الطعن تقترب (${daysLeft} يوم متبقٍ) — هل يهمك متابعتها؟`,
                    presence: {
                        present: ['حكم ومرافعة مغلقة', `مهلة: ${appealDeadline}`],
                        missing: daysLeft < 0 ? ['طعن ضمن المهلة'] : [],
                    },
                    source: 'appealDeadlineEngine.appealDeadline',
                    dossierKey: ctx.dossierKey,
                    action: { label: 'مراجعة الطعن', actionId: 'open_appeal' },
                });
            }
        }
    }

    if (!absentFlowActive && isAppealStageName(stage.stageName) && stage.isPleadingsClosed) {
        const cassationDeadline = resolveStageCassationDeadline(stage);
        if (cassationDeadline) {
            const daysLeft = daysRemainingUntil(cassationDeadline);
            if (daysLeft <= 7) {
                nudges.push({
                    id: `${ctx.dossierKey}:cassation-deadline`,
                    kind: 'lawsuit.cassation_deadline_near',
                    surface: 'lawsuit',
                    priority: 24,
                    message:
                        daysLeft < 0
                            ? 'مهلة التمييز قد تكون منتهية — هل تريد مراجعة الخيارات؟'
                            : `مهلة التمييز تقترب (${daysLeft} يوم متبقٍ) — هل يهمك الأمر؟`,
                    presence: {
                        present: ['مرحلة استئناف/تمييز', `مهلة: ${cassationDeadline}`],
                        missing: daysLeft < 0 ? ['تمييز ضمن المهلة'] : [],
                    },
                    source: 'appealDeadlineEngine.cassationDeadline',
                    dossierKey: ctx.dossierKey,
                    action: { label: 'مراجعة التمييز', actionId: 'open_appeal' },
                });
            }
        }
    }

    const hearing = hasUpcomingHearingWithinHours(ctx.timeline, 48);
    if (hearing && !hasCourtFeeReceiptInTimeline(ctx.timeline)) {
        nudges.push({
            id: `${ctx.dossierKey}:hearing-receipt`,
            kind: 'lawsuit.hearing_document_gap',
            surface: 'lawsuit',
            priority: 40,
            message: `جلسة قريبة (${hearing.eventDate})، ولم أجد وصل رسم قضائي في السجل. هل تود إرفاقه؟`,
            presence: {
                present: ['موعد جلسة في السجل'],
                missing: ['وصل الرسم القضائي في السجل الزمني'],
            },
            source: 'timeline.hearing_without_receipt',
            dossierKey: ctx.dossierKey,
            action: { label: 'إرفاق وثيقة', actionId: 'attach_document' },
        });
    }

    const abandonmentYmd = stage.abandonmentDate?.slice(0, 10);
    if (ctx.status === 'متروكة للمراجعة' && abandonmentYmd) {
        const reviewDeadline = resolveAbandonmentReviewDeadline(abandonmentYmd);
        const daysLeft = daysRemainingUntil(reviewDeadline);
        if (daysLeft !== null && daysLeft <= 5) {
            nudges.push({
                id: `${ctx.dossierKey}:abandonment-renewal`,
                kind: 'lawsuit.abandonment_renewal',
                surface: 'lawsuit',
                priority: 50,
                message:
                    daysLeft < 0
                        ? 'مهلة تجديد الدعوى المتروكة قد تكون منتهية — هل تريد مراجعة الخيارات؟'
                        : `الدعوى متروكة للمراجعة — متبقٍ نحو ${daysLeft} يوم للتجديد. هل يهمك الأمر؟`,
                presence: {
                    present: ['حالة ترك للمراجعة', `تاريخ الترك: ${abandonmentYmd}`],
                    missing: daysLeft < 0 ? ['تجديد ضمن المهلة'] : [],
                },
                source: 'caseFlowStatusDisplay.abandonment',
                dossierKey: ctx.dossierKey,
                action: { label: 'مراجعة التجديد', actionId: 'abandonment_renewal' },
            });
        }
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
