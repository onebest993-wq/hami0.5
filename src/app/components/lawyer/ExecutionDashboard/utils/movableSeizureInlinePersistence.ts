import type { SeizedMovable } from '@/app/types/execution';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export type MovableInlineSaveContext = {
    dossierId: string;
    showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
    persistMovables: (next: SeizedMovable[]) => boolean;
    readMovables: () => SeizedMovable[];
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

export const TIMELINE_SOURCE = 'محضر المتابعة — الأموال المحجوزة';

export function headerForMovable(m: SeizedMovable): string {
    return [
        `وصف المال: ${String(m.movableDescription || '').trim()}`,
        `المكان: ${String(m.movableLocation || '').trim()}`,
        m.judicialCustodianName ? `الحارس القضائي: ${String(m.judicialCustodianName).trim()}` : null,
    ]
        .filter(Boolean)
        .join('\n');
}

function patchMovable(
    movables: SeizedMovable[],
    movableId: string,
    patch: Record<string, unknown>,
): SeizedMovable[] | null {
    const idx = movables.findIndex((x) => String(x.id || '').trim() === movableId);
    if (idx < 0) return null;
    const next = [...movables];
    next[idx] = { ...next[idx], ...patch } as SeizedMovable;
    return next;
}

/** يضمن وجود الصف الحالي في القائمة — ضروري بعد الحفظ الأول المتفائل */
export function ensureMovableInList(movables: SeizedMovable[], movable: SeizedMovable): SeizedMovable[] {
    const id = String(movable.id || '').trim();
    if (!id) return movables;
    if (movables.some((row) => String(row.id || '').trim() === id)) return movables;
    return [movable, ...movables];
}

export function persistMovablePatch(
    movables: SeizedMovable[],
    movableId: string,
    patch: Record<string, unknown>,
    ctx: MovableInlineSaveContext,
): SeizedMovable[] | null {
    const next = patchMovable(movables, movableId, patch);
    if (!next) {
        ctx.showToast('تعذّر تحديث سجل المنقول — أعد فتح السجل أو أعد المحاولة', 'error');
        return null;
    }
    const persisted = ctx.persistMovables(next);
    if (persisted === false) {
        ctx.showToast('تعذّر حفظ التغيير على الإضبارة — أعد المحاولة', 'error');
        return null;
    }
    try {
        window.dispatchEvent(
            new CustomEvent('hami-seized-movable-inline-updated', {
                detail: { movableId, movable: next.find((x) => String(x.id) === movableId) },
            }),
        );
    } catch {
        /* ignore */
    }
    return next;
}

export function saveMovableMarkInline(
    movables: SeizedMovable[],
    movableId: string,
    input: { letterNo: string; ymd: string; entity: string },
    ctx: MovableInlineSaveContext,
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
    const next = persistMovablePatch(
        movables,
        movableId,
        {
            seizureMarkLetterNumber: letterNo,
            seizureMarkDate: ymd,
            seizureMarkEntity: entity,
        },
        ctx,
    );
    if (!next) return false;
    const hit = next.find((x) => String(x.id) === movableId)!;
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📨 تسجيل كتاب تأييد وضع الإشارة — مال منقول',
        description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}\n${headerForMovable(hit)}`,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
    });
    ctx.showToast('تم تسجيل كتاب التأييد.', 'success');
    return true;
}

export function saveMovablePublicationInline(
    movables: SeizedMovable[],
    movableId: string,
    input: { newspaperName: string; publicationDateYmd: string },
    ctx: MovableInlineSaveContext,
): boolean {
    const newspaperName = String(input.newspaperName || '').trim();
    const ymd = String(input.publicationDateYmd || '').trim();
    if (!newspaperName) {
        ctx.showToast('أدخل اسم الصحيفة.', 'warning');
        return false;
    }
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        ctx.showToast('اختر تاريخ النشر بشكل صحيح.', 'warning');
        return false;
    }
    const nowIso = new Date().toISOString();
    const next = persistMovablePatch(
        movables,
        movableId,
        {
            newspaperName,
            publicationDateYmd: ymd,
            status: 'published',
        },
        ctx,
    );
    if (!next) return false;
    const hit = next.find((x) => String(x.id) === movableId)!;
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title: '📰 توثيق النشر والإعلان — مال منقول',
        description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}\n${headerForMovable(hit)}`,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId, newspaperName, publicationDateYmd: ymd },
    });
    ctx.showToast('تم حفظ بيانات النشر.', 'success');
    return true;
}

export function saveMovableAuctionResultInline(
    movables: SeizedMovable[],
    movableId: string,
    input: {
        outcome: 'initial_award' | 'no_bidders';
        buyerName?: string;
        amountDisplay?: string;
        depositDisplay?: string;
    },
    ctx: MovableInlineSaveContext,
): boolean {
    const cur = movables.find((x) => String(x.id) === movableId);
    if (!cur) {
        ctx.showToast('تعذّر تحديث سجل المنقول — أعد فتح السجل', 'error');
        return false;
    }
    const nowIso = new Date().toISOString();
    const header = headerForMovable(cur);
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
        title = '⚖️ نتيجة جلسة المزايدة — إحالة أولية (مال منقول)';
        desc = `${header}\nالنتيجة: إحالة أولية\nالمشتري: ${buyerName}\nمبلغ رسو المزاد: ${Number(amt).toLocaleString('ar-IQ')} د.ع`;
        patch = {
            status: 'initial_award',
            initialAwardBuyerName: buyerName,
            initialAwardAmountIqd: amt,
            ...(Number.isFinite(deposit) && deposit > 0 ? { auctionDepositAmountIqd: deposit } : {}),
            initialAwardRecordedAtIso: nowIso,
            lastBidderOrBuyerName: buyerName,
        };
    } else {
        title = '⚖️ نتيجة جلسة المزايدة — لا راغب (مال منقول)';
        desc = `${header}\nالنتيجة: عدم حصول راغب بالشراء`;
        patch = {
            status: 'no_bidders',
            noBiddersRecordedAtIso: nowIso,
        };
    }
    const next = persistMovablePatch(movables, movableId, patch, ctx);
    if (!next) return false;
    ctx.pushTimeline({
        id: ctx.nextTimelineId(),
        date: nowIso.slice(0, 10),
        timestamp: nowIso,
        title,
        description: desc,
        type: 'coercive',
        source: TIMELINE_SOURCE,
        metadata: { seizedMovableId: movableId },
    });
    ctx.showToast('تم حفظ نتيجة المزايدة.', 'success');
    return true;
}

export { formatNumberInput };
