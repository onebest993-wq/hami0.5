import type { SeizedProperty } from '@/app/types/execution';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { patchExecutorDecisionRowEverywhere } from '@/app/utils/executorSeizureDecisionQueue';

export type PropertyInlineSaveContext = {
    dossierId: string;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
    persistProperties: (next: SeizedProperty[]) => void;
    pushTimeline: (event: {
        id: string;
        date: string;
        timestamp: string;
        title: string;
        description: string;
        type: string;
        source: string;
        metadata?: Record<string, unknown>;
    }) => void;
    nextTimelineId: () => string;
    onAuctionCalendar?: (input: {
        dossierId: string;
        decisionId: string;
        ymd: string;
        purpose: string;
    }) => void;
};

const TIMELINE_SOURCE = 'محضر المتابعة — العقارات المحجوزة';

function headerFor(p: SeizedProperty): string {
    return [
        `رقم العقار: ${String(p.propertyNumber || '').trim()}`,
        `المقاطعة: ${String(p.district || '').trim()}`,
        `الجنس: ${String(p.propertyGender || '').trim()}`,
    ]
        .filter(Boolean)
        .join('\n');
}

function patchProperty(
    properties: SeizedProperty[],
    propertyId: string,
    patch: Record<string, unknown>
): SeizedProperty[] | null {
    const idx = properties.findIndex((x) => String(x.id) === propertyId);
    if (idx < 0) return null;
    const next = [...properties];
    next[idx] = { ...next[idx], ...patch } as SeizedProperty;
    return next;
}

export function savePropertyMarkInline(
    properties: SeizedProperty[],
    propertyId: string,
    input: { letterNo: string; ymd: string; entity: string },
    ctx: PropertyInlineSaveContext
): boolean {
    const letterNo = String(input.letterNo || '').trim();
    const ymd = String(input.ymd || '').trim();
    const entity = String(input.entity || '').trim();
    if (!letterNo) {
        ctx.showToast('أدخل رقم كتاب التأييد.', 'warning');
        return false;
    }
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        ctx.showToast('اختر تاريخ الكتاب بشكل صحيح.', 'warning');
        return false;
    }
    if (!entity) {
        ctx.showToast('أدخل الجهة المجيبة.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const next = patchProperty(properties, propertyId, {
        seizureMarkLetterNumber: letterNo,
        seizureMarkDate: ymd,
        seizureMarkEntity: entity,
    });
    if (!next) return false;
    ctx.persistProperties(next);
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📨 تسجيل كتاب تأييد وضع الإشارة — عقار',
        description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
    });
    ctx.showToast('تم حفظ كتاب التأييد.', 'success');
    return true;
}

export function savePropertyExpertReportInline(
    properties: SeizedProperty[],
    propertyId: string,
    decisionId: string,
    input: { expertNamesRaw: string; reportYmd: string; priceDisplay: string },
    ctx: PropertyInlineSaveContext
): boolean {
    const cur = properties.find((x) => String(x.id) === propertyId);
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
            'warning'
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
    const header = headerFor(cur);
    const desc = `${header}\nالسعر المقدر: ${Number(price).toLocaleString('ar-IQ')} د.ع\nتاريخ التقرير: ${reportYmd}\nالخبراء: ${expertNames.join('، ')}`;
    const next = patchProperty(properties, propertyId, {
        status: 'valued',
        estimatedPriceIqd: price,
        expertEstimatedAmountIqd: price,
        expertNames,
        expertCommitteeSize: requiredExperts,
        expertReportDateYmd: reportYmd,
        experts: { expertName: expertNames.join('، '), estimatedPriceIqd: price, recordedAtIso: nowIso },
    });
    if (!next) return false;
    ctx.persistProperties(next);
    patchExecutorDecisionRowEverywhere(decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: desc,
    });
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🧾 تسجيل تقرير الخبراء — عقار',
        description: desc,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, decisionRowId: decisionId },
    });
    ctx.showToast('تم حفظ تقرير الخبراء.', 'success');
    return true;
}

export function savePropertyAuctionDateInline(
    properties: SeizedProperty[],
    propertyId: string,
    decisionId: string,
    ymd: string,
    ctx: PropertyInlineSaveContext
): boolean {
    const cur = properties.find((x) => String(x.id) === propertyId);
    if (!cur) return false;
    const date = String(ymd || '').trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        ctx.showToast('اختر موعد المزايدة بشكل صحيح.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const header = headerFor(cur);
    const desc = `${header}\nموعد المزايدة: ${date}`;
    const next = patchProperty(properties, propertyId, {
        status: 'published',
        auctionDateYmd: date,
        auction: { auctionDateYmd: date, recordedAtIso: nowIso },
        newspaperName: '',
        publicationDateYmd: null,
    });
    if (!next) return false;
    ctx.persistProperties(next);
    patchExecutorDecisionRowEverywhere(decisionId, {
        seizureRequestSavedAt: nowIso,
        seizureRequestDetails: desc,
    });
    ctx.onAuctionCalendar?.({
        dossierId: ctx.dossierId,
        decisionId,
        ymd: date,
        purpose: 'موعد مزايدة — عقار محجوز',
    });
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📅 تسجيل موعد المزايدة — عقار',
        description: desc,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, decisionRowId: decisionId },
    });
    ctx.showToast('تم حفظ موعد المزايدة.', 'success');
    return true;
}

export function savePropertyPublicationInline(
    properties: SeizedProperty[],
    propertyId: string,
    input: { newspaperName: string; ymd: string },
    ctx: PropertyInlineSaveContext
): boolean {
    const newspaperName = String(input.newspaperName || '').trim();
    const ymd = String(input.ymd || '').trim();
    if (!newspaperName) {
        ctx.showToast('أدخل اسم الصحيفة.', 'warning');
        return false;
    }
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        ctx.showToast('اختر تاريخ النشر بشكل صحيح.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const next = patchProperty(properties, propertyId, {
        newspaperName,
        publicationDateYmd: ymd,
    });
    if (!next) return false;
    ctx.persistProperties(next);
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📰 توثيق النشر والإعلان — عقار',
        description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, newspaperName, publicationDateYmd: ymd },
    });
    ctx.showToast('تم حفظ بيانات النشر.', 'success');
    return true;
}

export function savePropertyAuctionResultInline(
    properties: SeizedProperty[],
    propertyId: string,
    input: {
        outcome: 'initial_award' | 'no_bidders';
        buyerName?: string;
        amountDisplay?: string;
        depositDisplay?: string;
    },
    ctx: PropertyInlineSaveContext
): boolean {
    const cur = properties.find((x) => String(x.id) === propertyId);
    if (!cur) return false;
    const nowIso = new Date().toISOString();
    const header = headerFor(cur);
    let title = '';
    let desc = '';
    let patch: Record<string, unknown> = {};

    if (input.outcome === 'initial_award') {
        const buyerName = String(input.buyerName || '').trim();
        if (!buyerName) {
            ctx.showToast('أدخل اسم المشتري.', 'warning');
            return false;
        }
        const amtRaw = String(input.amountDisplay || '').replace(/[^\d]/g, '').replace(/,/g, '').trim();
        const amt = amtRaw ? Number(amtRaw) : NaN;
        if (!Number.isFinite(amt) || amt <= 0) {
            ctx.showToast('أدخل مبلغ رسو المزاد بشكل صحيح.', 'warning');
            return false;
        }
        const depositRaw = String(input.depositDisplay || '').replace(/[^\d]/g, '').replace(/,/g, '').trim();
        const deposit = depositRaw ? Number(depositRaw) : NaN;
        title = '⚖️ نتيجة جلسة المزايدة — إحالة أولية (عقار)';
        desc = `${header}\nالنتيجة: إحالة أولية\nالمشتري: ${buyerName}\nمبلغ رسو المزاد: ${Number(amt).toLocaleString('ar-IQ')} د.ع`;
        patch = {
            status: 'initial_award',
            initialAwardBuyerName: buyerName,
            initialAwardAmountIqd: amt,
            ...(Number.isFinite(deposit) && deposit > 0
                ? { auctionDepositAmountIqd: deposit }
                : {}),
            initialAwardRecordedAtIso: nowIso,
            lastBidderOrBuyerName: buyerName,
        };
    } else {
        title = '⚖️ نتيجة جلسة المزايدة — لا راغب (عقار)';
        desc = `${header}\nالنتيجة: عدم حصول راغب بالشراء`;
        patch = {
            status: 'no_bidders',
            noBiddersRecordedAtIso: nowIso,
        };
    }
    const next = patchProperty(properties, propertyId, patch);
    if (!next) return false;
    ctx.persistProperties(next);
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title,
        description: desc,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId },
    });
    ctx.showToast('تم حفظ نتيجة المزايدة.', 'success');
    return true;
}

export function savePropertyReauctionDefaultInline(
    properties: SeizedProperty[],
    propertyId: string,
    decisionId: string,
    notes: string,
    ctx: PropertyInlineSaveContext
): boolean {
    const nowIso = new Date().toISOString();
    const notesTrim = String(notes || '').trim();
    const hit = properties.find((x) => String(x.id) === propertyId);
    if (!hit) return false;
    const next = patchProperty(properties, propertyId, {
        reauctionDefault: { recordedAtIso: nowIso, ...(notesTrim ? { notes: notesTrim } : {}) },
        status: 'published',
        initialAwardBuyerName: undefined,
        initialAwardAmountIqd: null,
        initialAwardRecordedAtIso: undefined,
        noBiddersRecordedAtIso: undefined,
        lastBidderOrBuyerName: undefined,
        finalAwardAmountIqd: null,
    });
    if (!next) return false;
    ctx.persistProperties(next);
    if (decisionId) {
        const header = headerFor(hit);
        patchExecutorDecisionRowEverywhere(decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: `🔁 تسجيل النكول / إعادة المزايدة — عقار\n${header}${
                notesTrim ? `\nالسبب/الملاحظات:\n${notesTrim}` : ''
            }`,
        });
    }
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '🔁 تسجيل النكول / إعادة المزايدة — عقار',
        description: `${headerFor(hit)}${notesTrim ? `\n${notesTrim}` : ''}`,
        type: 'decision',
        source: TIMELINE_SOURCE,
        metadata: { seizedPropertyId: propertyId, decisionRowId: decisionId || undefined },
    });
    ctx.showToast('تم تسجيل النكول وإعادة فتح مسار المزايدة.', 'success');
    return true;
}

export { formatNumberInput };
