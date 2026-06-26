// @ts-nocheck
import type { MutableRefObject } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';
import type { TimelineEvent } from '@/app/types/execution';

export type SaveSeizedPropertyAuctionSessionResultDeps = {
    seizedPropertyAuctionResultPropertyId: string | null;
    seizedPropertyAuctionResultEntityKind: 'property' | 'movable';
    seizedPropertyAuctionResultOutcome: string;
    seizedPropertyAuctionResultBuyerNameDraft: string;
    seizedPropertyAuctionResultAmountDraft: string;
    seizedPropertyAuctionDepositAmountDraft: string;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    nextTimelineId: () => string;
    setSeizedPropertyAuctionResultModalOpen: (open: boolean) => void;
    setSeizedPropertyAuctionResultPropertyId: (id: string | null) => void;
    setSeizedPropertyAuctionResultEntityKind: (kind: 'property' | 'movable') => void;
    setSeizedPropertyAuctionResultOutcome: (outcome: string) => void;
    setSeizedPropertyAuctionResultBuyerNameDraft: (v: string) => void;
    setSeizedPropertyAuctionResultAmountDraft: (v: string) => void;
    setSeizedPropertyAuctionDepositAmountDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
};

export function saveSeizedPropertyAuctionSessionResult(
    deps: SaveSeizedPropertyAuctionSessionResultDeps,
): void {
    const {
        seizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind: entityKind,
        seizedPropertyAuctionResultOutcome: outcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        executionDataRef,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        showToast,
    } = deps;

    const entityId = String(seizedPropertyAuctionResultPropertyId || '').trim();
    if (!entityId) return;
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
            ? `وصف المال المنقول: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}\nالحارس القضائي: ${String(cur.judicialCustodianName || '').trim()}`
            : `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}`;

    let title = '';
    let desc = '';
    let patch: Record<string, unknown> = {};

    if (outcome === 'initial_award') {
        const buyerName = String(seizedPropertyAuctionResultBuyerNameDraft || '').trim();
        if (!buyerName) {
            showToast('أدخل اسم المشتري.', 'warning');
            return;
        }
        const amtRaw = String(seizedPropertyAuctionResultAmountDraft || '')
            .replace(/[^\d]/g, '')
            .replace(/,/g, '')
            .trim();
        const amt = amtRaw ? Number(amtRaw) : NaN;
        if (!Number.isFinite(amt) || amt <= 0) {
            showToast('أدخل مبلغ رسو المزاد بشكل صحيح.', 'warning');
            return;
        }
        const depositRaw = String(seizedPropertyAuctionDepositAmountDraft || '')
            .replace(/[^\d]/g, '')
            .replace(/,/g, '')
            .trim();
        const deposit = depositRaw ? Number(depositRaw) : NaN;
        if (!Number.isFinite(deposit) || deposit <= 0) {
            showToast('أدخل مبلغ التأمينات القانونية المدفوعة (10%) بشكل صحيح.', 'warning');
            return;
        }
        title = '⚖️ نتيجة جلسة المزايدة — إحالة أولية';
        desc = `${header}\nالنتيجة: إحالة أولية (رسو المزاد)\nالمشتري: ${buyerName}\nمبلغ رسو المزاد: ${Number(amt).toLocaleString('ar-IQ')} د.ع\nالتأمينات القانونية (10%): ${Number(deposit).toLocaleString('ar-IQ')} د.ع`;
        patch = {
            status: 'initial_award',
            initialAwardBuyerName: buyerName,
            initialAwardAmountIqd: amt,
            auctionDepositAmountIqd: deposit,
            initialAwardRecordedAtIso: nowIso,
            noBiddersRecordedAtIso: undefined,
            lastBidderOrBuyerName: buyerName,
            finalAwardAmountIqd: null,
        };
    } else {
        title = '⚖️ نتيجة جلسة المزايدة — لا راغب بالشراء';
        desc = `${header}\nالنتيجة: عدم حصول راغب بالشراء`;
        patch = {
            status: 'no_bidders',
            noBiddersRecordedAtIso: nowIso,
            initialAwardBuyerName: undefined,
            initialAwardAmountIqd: null,
            initialAwardRecordedAtIso: undefined,
            lastBidderOrBuyerName: undefined,
            finalAwardAmountIqd: null,
        };
    }

    next[idx] = { ...cur, ...(patch as any) } as any;
    persistExecutionMerge(entityKind === 'movable' ? { seizedMovables: next } : { seizedProperties: next });
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
                ? { seizedMovableId: entityId, auctionResultOutcome: outcome }
                : { seizedPropertyId: entityId, auctionResultOutcome: outcome },
    });
    setSeizedPropertyAuctionResultModalOpen(false);
    setSeizedPropertyAuctionResultPropertyId(null);
    setSeizedPropertyAuctionResultEntityKind('property');
    setSeizedPropertyAuctionResultOutcome('initial_award');
    setSeizedPropertyAuctionResultBuyerNameDraft('');
    setSeizedPropertyAuctionResultAmountDraft('');
    setSeizedPropertyAuctionDepositAmountDraft('');
    showToast(
        entityKind === 'movable'
            ? 'تم تسجيل نتيجة جلسة المزايدة وتحديث حالة المال المنقول.'
            : 'تم تسجيل نتيجة جلسة المزايدة وتحديث حالة العقار.',
        'success',
    );
}
