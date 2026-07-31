// @ts-nocheck
/** حفظ خطوات الحجز العقاري/المنقول + التأييد + النشر — chunk execution-hooks */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { patchExecutorDecisionRowEverywhere } from '@/app/utils/executorSeizureDecisionQueue';

export type SaveSeizureMarkConfirmationDeps = {
    seizureMarkModalEntityId: string | null;
    seizureMarkModalEntityKind: 'property' | 'movable';
    seizureMarkLetterNumberDraft: string;
    seizureMarkDateDraft: string;
    seizureMarkEntityDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setSeizureMarkModalOpen: (open: boolean) => void;
    setSeizureMarkModalEntityId: (id: string | null) => void;
    setSeizureMarkLetterNumberDraft: (v: string) => void;
    setSeizureMarkDateDraft: (v: string) => void;
    setSeizureMarkEntityDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export function saveSeizureMarkConfirmation(deps: SaveSeizureMarkConfirmationDeps): void {
    const {
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind: entityKind,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        executionDataRef,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        showToast,
    } = deps;

    const entityId = String(seizureMarkModalEntityId || '').trim();
    if (!entityId) return;
    const letterNo = String(seizureMarkLetterNumberDraft || '').trim();
    if (!letterNo) {
        showToast('أدخل رقم كتاب التأييد.', 'warning');
        return;
    }
    const ymd = String(seizureMarkDateDraft || '').trim();
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        showToast('اختر تاريخ الكتاب بشكل صحيح.', 'warning');
        return;
    }
    const entity = String(seizureMarkEntityDraft || '').trim();
    if (!entity) {
        showToast('أدخل الجهة المجيبة.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = {
            ...(next[idx] as any),
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        } as any;
        persistExecutionMerge({ seizedMovables: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📨 تسجيل كتاب تأييد وضع الإشارة — مال منقول',
            description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
        });
    } else {
        const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = {
            ...(next[idx] as any),
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        } as any;
        persistExecutionMerge({ seizedProperties: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📨 تسجيل كتاب تأييد وضع الإشارة — عقار',
            description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
        });
    }
    setSeizureMarkModalOpen(false);
    setSeizureMarkModalEntityId(null);
    setSeizureMarkLetterNumberDraft('');
    setSeizureMarkDateDraft('');
    setSeizureMarkEntityDraft('');
    showToast('تم تسجيل كتاب التأييد وتحديث البطاقة فوراً.', 'success');
}

export type SaveSeizedPropertyStepDetailsDeps = {
    decisionsStorageExecutionId: string | undefined;
    seizedPropertyStepDecisionId: string | null;
    seizedPropertyStepEntityKind: 'property' | 'movable';
    seizedPropertyStepPropertyId: string | null;
    seizedPropertyStepKind: string | null;
    seizedPropertyExpertsNamesDraft: string;
    seizedPropertyExpertReportDateDraft: string;
    seizedPropertyExpertPriceDraft: string;
    seizedPropertyAuctionDateDraft: string;
    seizedPropertyBuyerNameDraft: string;
    seizedPropertyAwardAmountDraft: string;
    seizedPropertyStepNotesDraft: string;
    linkSeizureAuctionToAppointments: boolean;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams | null>;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    pushSeizureAuctionCalendarAppointment: (args: {
        dossierId: string;
        decisionId: string;
        ymd: string;
        purpose: string;
        linkToAppointments: boolean;
    }) => void;
    setSeizedPropertyStepModalOpen: (open: boolean) => void;
    setSeizedPropertyStepDecisionId: (id: string | null) => void;
    setSeizedPropertyStepPropertyId: (id: string | null) => void;
    setSeizedPropertyStepEntityKind: (kind: 'property' | 'movable') => void;
    setSeizedPropertyStepKind: (kind: string | null) => void;
    setSeizedPropertyExpertsNamesDraft: (v: string) => void;
    setSeizedPropertyExpertReportDateDraft: (v: string) => void;
    setSeizedPropertyExpertPriceDraft: (v: string) => void;
    setSeizedPropertyAuctionDateDraft: (v: string) => void;
    setSeizedPropertyBuyerNameDraft: (v: string) => void;
    setSeizedPropertyAwardAmountDraft: (v: string) => void;
    setSeizedPropertyStepNotesDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

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
    const idx = prev.findIndex((x) => String((x as any).id) === entityId);
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
    const cur = prev[idx] as any;
    const next = [...prev];

    const header =
        entityKind === 'movable'
            ? `وصف المال: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}`
            : `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}`;

    let title = '';
    let desc = '';
    let patch: Record<string, unknown> = {};

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
        const requiredExperts = readExpertCommitteeSize(cur as any);
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

    (next as any)[idx] = { ...(cur as any), ...(patch as any) };

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

    persistExecutionMerge(entityKind === 'movable' ? { seizedMovables: next } : { seizedProperties: next });
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

export type SavePublicationDetailsDeps = {
    publicationModalEntityId: string | null;
    publicationModalEntityKind: 'property' | 'movable';
    publicationNewspaperNameDraft: string;
    publicationDateYmdDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setPublicationModalOpen: (open: boolean) => void;
    setPublicationModalEntityId: (id: string | null) => void;
    setPublicationNewspaperNameDraft: (v: string) => void;
    setPublicationDateYmdDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export function savePublicationDetails(deps: SavePublicationDetailsDeps): void {
    const {
        publicationModalEntityId,
        publicationModalEntityKind: entityKind,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        executionDataRef,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        showToast,
    } = deps;

    const entityId = String(publicationModalEntityId || '').trim();
    if (!entityId) return;
    const newspaperName = String(publicationNewspaperNameDraft || '').trim();
    if (!newspaperName) {
        showToast('أدخل اسم الصحيفة.', 'warning');
        return;
    }
    const ymd = String(publicationDateYmdDraft || '').trim();
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        showToast('اختر تاريخ النشر بشكل صحيح.', 'warning');
        return;
    }
    const nowIso = new Date().toISOString();
    if (entityKind === 'movable') {
        const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
        persistExecutionMerge({ seizedMovables: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📰 توثيق النشر والإعلان — مال منقول',
            description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedMovableId: entityId, newspaperName, publicationDateYmd: ymd },
        });
    } else {
        const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
        const idx = prev.findIndex((x) => String(x.id) === entityId);
        if (idx < 0) return;
        const next = [...prev];
        next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
        persistExecutionMerge({ seizedProperties: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title: '📰 توثيق النشر والإعلان — عقار',
            description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
            type: 'coercive',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata: { seizedPropertyId: entityId, newspaperName, publicationDateYmd: ymd },
        });
    }
    setPublicationModalOpen(false);
    setPublicationModalEntityId(null);
    setPublicationNewspaperNameDraft('');
    setPublicationDateYmdDraft('');
    showToast('تم حفظ بيانات النشر وتحديث البطاقة فوراً.', 'success');
}
