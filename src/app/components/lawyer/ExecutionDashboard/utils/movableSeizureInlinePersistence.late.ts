import type { SeizedMovable } from '@/app/types/execution';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { patchExecutorDecisionRowEverywhere } from '@/app/utils/executorSeizureDecisionQueue';
import {
    headerForMovable,
    persistMovablePatch,
    TIMELINE_SOURCE,
    type MovableInlineSaveContext,
} from './movableSeizureInlinePersistence';

export function saveMovableExpertReportInline(
    movables: SeizedMovable[],
    movableId: string,
    decisionId: string,
    input: { expertNamesRaw: string; reportYmd: string; priceDisplay: string },
    ctx: MovableInlineSaveContext,
): boolean {
    const cur = movables.find((x) => String(x.id || '').trim() === movableId);
    if (!cur) return false;
    const expertNames = String(input.expertNamesRaw || '')
        .split(/[,\n،]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
    if (expertNames.length === 0) {
        ctx.showToast('أدخل أسماء الخبراء.', 'warning');
        return false;
    }
    const requiredExperts = readExpertCommitteeSize(cur);
    if (expertNames.length !== requiredExperts) {
        ctx.showToast(
            `يجب إدخال ${requiredExperts} ${requiredExperts === 1 ? 'خبير' : 'خبراء'} بالضبط (${expertCommitteeSizeLabelAr(requiredExperts)}).`,
            'warning',
        );
        return false;
    }
    const reportYmd = String(input.reportYmd || '').trim();
    if (!reportYmd || !/^\d{4}-\d{2}-\d{2}$/.test(reportYmd)) {
        ctx.showToast('اختر تاريخ تقرير الخبراء بشكل صحيح.', 'warning');
        return false;
    }
    const priceRaw = String(input.priceDisplay || '').replace(/[^\d]/g, '').replace(/,/g, '').trim();
    const price = priceRaw ? Number(priceRaw) : NaN;
    if (!Number.isFinite(price) || price <= 0) {
        ctx.showToast('أدخل السعر المقدر بشكل صحيح.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const header = headerForMovable(cur);
    const desc = `${header}\nالسعر المقدر: ${Number(price).toLocaleString('ar-IQ')} د.ع\nتاريخ التقرير: ${reportYmd}\nالخبراء: ${expertNames.join('، ')}`;
    const next = persistMovablePatch(
        movables,
        movableId,
        {
            status: 'valued',
            expertEstimatedAmountIqd: price,
            expertNames,
            expertCommitteeSize: requiredExperts,
            expertReportDateYmd: reportYmd,
            experts: { expertName: expertNames.join('، '), estimatedPriceIqd: price, recordedAtIso: nowIso },
        },
        ctx,
    );
    if (!next) return false;
    patchExecutorDecisionRowEverywhere(decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: desc,
    });
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🧾 تسجيل تقرير الخبراء — مال منقول',
        description: desc,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId, decisionRowId: decisionId },
    });
    ctx.showToast('تم حفظ تقرير الخبراء.', 'success');
    return true;
}

export function saveMovableAuctionDateInline(
    movables: SeizedMovable[],
    movableId: string,
    decisionId: string,
    ymd: string,
    ctx: MovableInlineSaveContext,
): boolean {
    const cur = movables.find((x) => String(x.id || '').trim() === movableId);
    if (!cur) return false;
    const date = String(ymd || '').trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        ctx.showToast('اختر موعد المزايدة بشكل صحيح.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const header = headerForMovable(cur);
    const desc = `${header}\nموعد المزايدة: ${date}`;
    const next = persistMovablePatch(
        movables,
        movableId,
        {
            status: 'published',
            auctionDateYmd: date,
            auction: { auctionDateYmd: date, recordedAtIso: nowIso },
            newspaperName: '',
            publicationDateYmd: null,
        },
        ctx,
    );
    if (!next) return false;
    patchExecutorDecisionRowEverywhere(decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: desc,
    });
    ctx.onAuctionCalendar?.({
        dossierId: ctx.dossierId,
        decisionId,
        ymd: date,
        purpose: 'موعد مزايدة — مال منقول محجوز',
    });
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📅 تسجيل موعد المزايدة — مال منقول',
        description: desc,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId, decisionRowId: decisionId },
    });
    ctx.showToast('تم حفظ موعد المزايدة.', 'success');
    return true;
}

export function saveMovableReauctionDefaultInline(
    movables: SeizedMovable[],
    movableId: string,
    decisionId: string,
    notes: string,
    ctx: MovableInlineSaveContext,
): boolean {
    const nowIso = new Date().toISOString();
    const notesTrim = String(notes || '').trim();
    const hit = movables.find((x) => String(x.id || '').trim() === movableId);
    if (!hit) return false;
    const next = persistMovablePatch(
        movables,
        movableId,
        {
            reauctionDefault: { recordedAtIso: nowIso, ...(notesTrim ? { notes: notesTrim } : {}) },
            status: 'published',
            initialAwardBuyerName: undefined,
            initialAwardAmountIqd: null,
            initialAwardRecordedAtIso: undefined,
            noBiddersRecordedAtIso: undefined,
            lastBidderOrBuyerName: undefined,
            finalAwardAmountIqd: null,
        },
        ctx,
    );
    if (!next) return false;
    if (decisionId) {
        const header = headerForMovable(hit);
        patchExecutorDecisionRowEverywhere(decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `🔁 تسجيل النكول / إعادة المزايدة — مال منقول\n${header}${
                notesTrim ? `\nالسبب/الملاحظات:\n${notesTrim}` : ''
            }`,
        });
    }
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🔁 تسجيل النكول / إعادة المزايدة — مال منقول',
        description: `${headerForMovable(hit)}${notesTrim ? `\n${notesTrim}` : ''}`,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId, decisionRowId: decisionId || undefined },
    });
    ctx.showToast('تم تسجيل النكول وإعادة فتح مسار المزايدة.', 'success');
    return true;
}
