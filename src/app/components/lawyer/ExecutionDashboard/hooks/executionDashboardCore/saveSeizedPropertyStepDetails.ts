import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { patchExecutorDecisionRowEverywhere } from '@/app/utils/executorSeizureDecisionQueue';
import type { SaveSeizedPropertyStepDetailsDeps } from './executionDashboardSeizedPropertyModals.types';
import type { SeizedEntityRow } from './executionDashboardSeizedPropertyModals.types';

export function saveSeizedPropertyStepDetails(deps: SaveSeizedPropertyStepDetailsDeps): void {
    const {
        decisionsStorageExecutionId,
        seizedPropertyStepDecisionId,
        seizedPropertyStepEntityKind: entityKind,
        seizedPropertyStepPropertyId,
        seizedPropertyStepKind: step,
        seizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        seizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        linkSeizureAuctionToAppointments,
        executionDataRef,
        seizureMatrixLedgerParamsRef,
        setUnifiedLedgerRevision,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        pushSeizureAuctionCalendarAppointment,
        setSeizedPropertyStepModalOpen,
        setSeizedPropertyStepDecisionId,
        setSeizedPropertyStepPropertyId,
        setSeizedPropertyStepEntityKind,
        setSeizedPropertyStepKind,
        setSeizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertPriceDraft,
        setSeizedPropertyAuctionDateDraft,
        setSeizedPropertyBuyerNameDraft,
        setSeizedPropertyAwardAmountDraft,
        setSeizedPropertyStepNotesDraft,
        showToast,
    } = deps;

    const exId = String(decisionsStorageExecutionId ?? '').trim();
    const decisionId = String(seizedPropertyStepDecisionId || '').trim();
    const entityId = String(seizedPropertyStepPropertyId || '').trim();
    if (!exId || exId === 'undefined' || !decisionId || !entityId || !step) return;
    const prev =
        entityKind === 'movable'
            ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
            : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
    const idx = prev.findIndex((x) => String(x.id) === entityId);
    if (idx < 0) {
        showToast(
            entityKind === 'movable'
                ? 'لم يتم العثور على المال المنقول داخل الإضبارة.'
                : 'لم يتم العثور على العقار داخل الإضبارة.',
            'warning',
        );
        return;
    }
    const nowIso = new Date().toISOString();
    const cur = prev[idx] as SeizedEntityRow;
    const next = [...prev] as SeizedEntityRow[];

    const header =
        entityKind === 'movable'
            ? `وصف المال: ${String((cur as SeizedMovable).movableDescription || '').trim()}\nالمكان: ${String((cur as SeizedMovable).movableLocation || '').trim()}`
            : `رقم العقار: ${String((cur as SeizedProperty).propertyNumber || '').trim()}\nالجنس: ${String((cur as SeizedProperty).propertyGender || '').trim()}`;

    let title = '';
    let desc = '';
    let patch: Partial<SeizedEntityRow> = {};

    if (step === 'experts') {
        const expertNamesRaw = String(seizedPropertyExpertsNamesDraft || '').trim();
        const expertNames = expertNamesRaw
            ? expertNamesRaw
                  .split(/[,\n،]+/g)
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [];
        if (expertNames.length === 0) {
            showToast('أدخل أسماء الخبراء.', 'warning');
            return;
        }
        const requiredExperts = readExpertCommitteeSize(cur);
        if (expertNames.length !== requiredExperts) {
            showToast(
                `يجب إدخال ${requiredExperts} ${requiredExperts === 1 ? 'خبير' : 'خبراء'} بالضبط (${expertCommitteeSizeLabelAr(requiredExperts)}).`,
                'warning',
            );
            return;
        }
        const reportYmd = String(seizedPropertyExpertReportDateDraft || '').trim();
        if (!reportYmd || !/^\d{4}-\d{2}-\d{2}$/.test(reportYmd)) {
            showToast('اختر تاريخ تقرير الخبراء بشكل صحيح.', 'warning');
            return;
        }
        const priceRaw = String(seizedPropertyExpertPriceDraft || '')
            .replace(/[^\d]/g, '')
            .replace(/,/g, '')
            .trim();
        const price = priceRaw ? Number(priceRaw) : NaN;
        if (!Number.isFinite(price) || price <= 0) {
            showToast('أدخل السعر المقدر بشكل صحيح.', 'warning');
            return;
        }
        title = '🧾 تسجيل تقرير الخبراء';
        desc = `${header}\nالسعر المقدر: ${Number(price).toLocaleString('ar-IQ')} د.ع\nتاريخ التقرير: ${reportYmd}\nالخبراء: ${expertNames.join('، ')}`;
        patch = {
            status: 'valued',
            ...(entityKind === 'movable' ? {} : { estimatedPriceIqd: price }),
            expertEstimatedAmountIqd: price,
            expertNames,
            expertCommitteeSize: requiredExperts,
            expertReportDateYmd: reportYmd,
            experts: { expertName: expertNames.join('، '), estimatedPriceIqd: price, recordedAtIso: nowIso },
        };
    } else if (step === 'auction') {
        const ymd = String(seizedPropertyAuctionDateDraft || '').trim();
        if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('اختر موعد المزايدة بشكل صحيح.', 'warning');
            return;
        }
        title = '📅 تسجيل موعد المزايدة';
        desc = `${header}\nموعد المزايدة: ${ymd}`;
        patch = {
            status: 'published',
            auctionDateYmd: ymd,
            auction: { auctionDateYmd: ymd, recordedAtIso: nowIso },
            newspaperName: '',
            publicationDateYmd: null,
        };
        const auctionPurpose =
            entityKind === 'movable' ? 'موعد مزايدة — مال منقول محجوز' : 'موعد مزايدة — عقار محجوز';
        pushSeizureAuctionCalendarAppointment({
            dossierId: exId,
            decisionId,
            ymd,
            purpose: auctionPurpose,
            linkToAppointments: linkSeizureAuctionToAppointments,
        });
    } else if (step === 'award') {
        const buyerName = String(seizedPropertyBuyerNameDraft || '').trim();
        if (!buyerName) {
            showToast('أدخل اسم المزايد الأخير/المشتري.', 'warning');
            return;
        }
        const amtRaw = String(seizedPropertyAwardAmountDraft || '')
            .replace(/[^\d]/g, '')
            .replace(/,/g, '')
            .trim();
        const amt = amtRaw ? Number(amtRaw) : NaN;
        if (!Number.isFinite(amt) || amt <= 0) {
            showToast('أدخل مبلغ الإحالة بشكل صحيح.', 'warning');
            return;
        }
        title = '✅ تسجيل الإحالة القطعية';
        desc = `${header}\nالمشتري: ${buyerName}\nمبلغ الإحالة: ${Number(amt).toLocaleString('ar-IQ')} د.ع`;
        patch = {
            status: 'sold',
            lastBidderOrBuyerName: buyerName,
            finalAwardAmountIqd: amt,
            award: { buyerName, awardAmountIqd: amt, recordedAtIso: nowIso },
        };
    } else if (step === 'reauction_default') {
        const notes = String(seizedPropertyStepNotesDraft || '').trim();
        title = '🔁 تسجيل النكول / إعادة المزايدة';
        desc = `${header}${notes ? `\nالسبب/الملاحظات:\n${notes}` : ''}`;
        patch = {
            reauctionDefault: { recordedAtIso: nowIso, ...(notes ? { notes } : {}) },
            status: 'published',
            initialAwardBuyerName: undefined,
            initialAwardAmountIqd: null,
            initialAwardRecordedAtIso: undefined,
            noBiddersRecordedAtIso: undefined,
            lastBidderOrBuyerName: undefined,
            finalAwardAmountIqd: null,
        };
    }

    next[idx] = { ...cur, ...patch } as SeizedEntityRow;

    if (entityKind === 'movable' && step === 'award') {
        const soldMovable = next[idx] as SeizedMovable;
        const ledgerParams = seizureMatrixLedgerParamsRef.current;
        const trustCredit = ledgerParams
            ? creditMovableProceedsForExecution(exId, soldMovable, ledgerParams, nowIso)
            : creditMovableSaleProceedsToTrustLedger({
                  executionId: exId,
                  movable: soldMovable,
                  at: nowIso,
              });
        if (trustCredit.created || trustCredit.updated) {
            desc += `\n\n💰 تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع في الأمانات.`;
            setUnifiedLedgerRevision((v) => v + 1);
            showToast(
                trustCredit.updated
                    ? `تم تصحيح حصيلة البيع في الأمانات: ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع`
                    : `تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع (حصيلة البيع) في الأمانات.`,
                'success',
            );
        }
    }

    persistExecutionMerge(
        entityKind === 'movable'
            ? { seizedMovables: next as SeizedMovable[] }
            : { seizedProperties: next as SeizedProperty[] },
    );
    patchExecutorDecisionRowEverywhere(decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: desc,
    });
    try {
        window.dispatchEvent(
            new CustomEvent('hami-seizure-decision-step-saved', {
                detail: { executionId: exId, decisionId },
            }),
        );
    } catch {
        /* ignore */
    }
    pushTimelineEvent({
        id: nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title,
        description: desc,
        type: 'decision',
        source: 'محضر المتابعة — الأموال المحجوزة',
        metadata:
            entityKind === 'movable'
                ? { seizedMovableId: entityId, decisionRowId: decisionId }
                : { seizedPropertyId: entityId, decisionRowId: decisionId },
    });
    setSeizedPropertyStepModalOpen(false);
    setSeizedPropertyStepDecisionId(null);
    setSeizedPropertyStepPropertyId(null);
    setSeizedPropertyStepEntityKind('property');
    setSeizedPropertyStepKind(null);
    setSeizedPropertyExpertsNamesDraft('');
    setSeizedPropertyExpertReportDateDraft('');
    setSeizedPropertyExpertPriceDraft('');
    setSeizedPropertyAuctionDateDraft('');
    setSeizedPropertyBuyerNameDraft('');
    setSeizedPropertyAwardAmountDraft('');
    setSeizedPropertyStepNotesDraft('');
    showToast(
        entityKind === 'movable'
            ? 'تم حفظ نتيجة الخطوة وتحديث بطاقة المال المنقول.'
            : 'تم حفظ نتيجة الخطوة وتحديث بطاقة العقار.',
        'success',
    );
}
